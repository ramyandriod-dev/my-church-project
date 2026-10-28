/**
 * Talent Service
 *
 * Business logic and the security boundary for the talent domain.
 *
 * Responsibilities:
 * - Tenant scoping derived from the server-resolved TenantContext
 * - Authorization on every operation, including self-service
 * - Ownership checks for member-edited profiles
 * - Audit logging for mutations
 * - Deciding who may see member contact details
 *
 * ─── Who may do what ────────────────────────────────────────────
 *
 * A member edits only their own profile, and does so through ownership rather
 * than through a permission: the `member` role deliberately has no
 * `talent.update`, because a blanket write permission would also let any member
 * rewrite anyone else's profile. The same rule applies to the idea bank.
 *
 * Staff with `talent.update` may correct any profile, and the write is audited
 * with the user who did it, so a staff edit to a member's own words is always
 * attributable.
 */

import { BaseService } from "./base-service";
import {
  mapDirectoryEntry,
  talentRepository,
} from "../../db/repositories/talent-repository";
import { resolveOwnMember } from "./own-member";
import { ideaRepository } from "../../db/repositories/idea-repository";
import { prisma } from "../../db/prisma";
import {
  interpretTalentQuestion,
  type CommunityVocabulary,
} from "../../community/query-interpreter";
import { hasPermission, requirePermission } from "../authorization";
import { NotFoundError } from "../errors";
import type {
  CommunityStats,
  MemberCommunitySummary,
  SkillFacet,
  TalentDirectoryEntry,
  TalentProfile,
  TalentSearchResponse,
  TalentSkill,
  TalentStats,
  TenantContext,
} from "../types";
import type {
  TalentDirectoryQuery,
  TalentSearchRequest,
  UpsertTalentProfileInput,
} from "../validation";

/**
 * Whether the caller may read member contact details.
 *
 * Reuses the permission that already governs the member directory rather than
 * inventing a second, looser rule. Anyone without it gets rows with no email and
 * no phone at all — not rows with the values present and hidden by the UI.
 */
const canSeeContact = (ctx: TenantContext): boolean =>
  hasPermission(ctx, "members.read") && hasPermission(ctx, "talent.read");


export class TalentService extends BaseService {
  // ─── Self-service ───────────────────────────────────────────

  /**
   * The caller's own talent profile, for the mobile "My Skills & Expertise" screen.
   *
   * A profile that does not exist yet is a normal state, not an error, so this
   * returns null rather than throwing and the screen renders an empty form.
   */
  async getMyProfile(ctx: TenantContext): Promise<TalentProfile | null> {
    this.ensureTenant(ctx);
    const member = await resolveOwnMember(ctx);
    return talentRepository.getProfileForMember(ctx.tenantId, member.id);
  }

  /**
   * Create or update the caller's own profile.
   *
   * Anyone authenticated may write their own profile, which is why this does not
   * call `requirePermission("talent.update")`.
   */
  async saveMyProfile(
    ctx: TenantContext,
    input: UpsertTalentProfileInput,
  ): Promise<TalentProfile> {
    this.ensureTenant(ctx);
    const member = await resolveOwnMember(ctx);
    const before = await talentRepository.getProfileForMember(ctx.tenantId, member.id);

    const profile = await talentRepository.upsertProfile(
      ctx.tenantId,
      member.id,
      input,
      input.skills,
      ctx.userId,
    );

    await this.audit(
      ctx,
      before ? "talent_profile.update_self" : "talent_profile.create_self",
      "talent_profile",
      profile.id,
      undefined,
      {
        memberId: member.id,
        // Skill names, not ids: the audit trail should be readable, and the ids
        // are already recorded by the row itself.
        skills: profile.skills.map((s) => s.name),
        isDiscoverable: profile.isDiscoverable,
        profession: profile.profession,
      },
    );

    await this.emitRealtimeEvent(ctx, "member.profile_updated", {
      memberId: member.id,
      skills: profile.skills.map((s) => s.name),
      profession: profile.profession,
      timestamp: new Date().toISOString(),
    });

    return profile;
  }

  /**
   * Save a profile for any member. Requires `talent.update`.
   *
   * Separate from `saveMyProfile` on purpose: a staff correction is a different
   * action with a different audit entry, and a leader can help a member fill in
   * a profile without being able to remove anyone's skills.
   */
  async saveProfileForMember(
    ctx: TenantContext,
    memberId: string,
    input: UpsertTalentProfileInput,
  ): Promise<TalentProfile> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "talent.update");

    const member = await prisma.member.findFirst({
      where: { id: memberId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!member) throw new NotFoundError("Member not found");

    const before = await talentRepository.getProfileForMember(ctx.tenantId, memberId);
    const profile = await talentRepository.upsertProfile(
      ctx.tenantId,
      memberId,
      input,
      input.skills,
      ctx.userId,
    );

    await this.audit(
      ctx,
      before ? "talent_profile.update_by_staff" : "talent_profile.create_by_staff",
      "talent_profile",
      profile.id,
      before
        ? { memberId, isDiscoverable: before.isDiscoverable, skills: before.skills.map((s) => s.name) }
        : undefined,
      { memberId, isDiscoverable: profile.isDiscoverable, skills: profile.skills.map((s) => s.name) },
    );

    await this.emitRealtimeEvent(ctx, "member.profile_updated", {
      memberId,
      skills: profile.skills.map((s) => s.name),
      profession: profile.profession,
      timestamp: new Date().toISOString(),
    });

    return profile;
  }

  // ─── Directory ──────────────────────────────────────────────

  /**
   * The staff-facing Talent Directory.
   *
   * Requires `talent.read`, which ordinary members do not have: the directory is
   * an administrative view, not something a member can browse.
   *
   * Returns the skill facets alongside the rows so the filter panel and the result
   * list can never disagree — both are derived from the same call, so the counts
   * beside the checkboxes describe the people actually on screen.
   */
  async listDirectory(
    ctx: TenantContext,
    query: TalentDirectoryQuery,
  ): Promise<{ items: TalentDirectoryEntry[]; total: number; facets: SkillFacet[] }> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "talent.read");

    // `includeNotDiscoverable` reaches past the opt-out a member set for
    // themselves, so it is not merely a wider filter. Only a supervisor who can
    // correct a profile (`talent.update`) may use it — otherwise a leader with
    // `talent.read` could list every hidden member by adding this one flag.
    // The flag is dropped rather than rejected so a shared admin screen that
    // always sends it still works for a leader, just without the hidden rows.
    if (query.includeNotDiscoverable && !hasPermission(ctx, "talent.update")) {
      query = { ...query, includeNotDiscoverable: false };
    }

    const [listing, facets] = await Promise.all([
      talentRepository.listDirectoryForTenant(ctx.tenantId, query, canSeeContact(ctx)),
      talentRepository.getSkillFacets(ctx.tenantId, query),
    ]);

    return { ...listing, facets };
  }

  /** One member's directory row, for the "who is this person" panel. */
  async getDirectoryEntry(
    ctx: TenantContext,
    memberId: string,
  ): Promise<TalentDirectoryEntry | null> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "talent.read");

    const raw = await prisma.talentProfile.findFirst({
      where: { tenantId: ctx.tenantId, memberId },
      include: {
        member: { include: { group: true, skills: { include: { skill: true } } } },
      },
    });
    if (!raw) return null;
    // An opt-out hides a member from the directory entirely, including the
    // single-row lookup, so the opt-out cannot be bypassed by guessing an id.
    if (!raw.isDiscoverable && !queryAllowsNonDiscoverable(ctx)) return null;

    return mapDirectoryEntry(raw, canSeeContact(ctx));
  }

  // ─── Natural-language search ────────────────────────────────

  /**
   * Answer a question about the church's skills.
   *
   * The AI is optional and its absence changes nothing about the result shape:
   * `interpretation.source` and `aiUsed` let the UI disclose which path ran, and
   * `fallbackReason` explains why the deterministic parser was used.
   */
  async search(ctx: TenantContext, request: TalentSearchRequest): Promise<TalentSearchResponse> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "talent.read");

    const vocabulary = await this.loadVocabulary(ctx.tenantId);
    const interpretation = await interpretTalentQuestion(
      request.question,
      vocabulary,
      {
        allowAi: hasPermission(ctx, "ai.use"),
        context: { tenantId: ctx.tenantId, userId: ctx.userId, feature: "talent_search" },
      },
    );

    const { results, total } = await talentRepository.searchForTenant(
      ctx.tenantId,
      interpretation.criteria,
      canSeeContact(ctx),
      request.limit,
    );

    return { interpretation, results, total };
  }

  /**
   * The tenant's own vocabulary, for interpretation and the skill picker.
   *
   * Read from the database and passed into the interpreter, which never queries
   * anything itself. That is what keeps the interpreter pure, testable, and
   * keeps the church's internal vocabulary out of any AI prompt.
   */
  async loadVocabulary(tenantId: string): Promise<CommunityVocabulary> {
    const [skills, ministries, groups] = await Promise.all([
      prisma.skill.findMany({ where: { tenantId }, select: { name: true }, take: 500 }),
      prisma.member.findMany({
        where: { tenantId, ministry: { not: null } },
        select: { ministry: true },
        distinct: ["ministry"],
        take: 200,
      }),
      prisma.group.findMany({ where: { tenantId }, select: { name: true }, take: 200 }),
    ]);

    return {
      skills: skills.map((s) => s.name),
      ministries: ministries.map((m) => m.ministry).filter((m): m is string => Boolean(m)),
      groups: groups.map((g) => g.name),
    };
  }

  // ─── Stats & summaries ──────────────────────────────────────

  async getStats(ctx: TenantContext): Promise<TalentStats> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "talent.read");
    return talentRepository.getStats(ctx.tenantId);
  }

  /**
   * A member's talent summary and idea count, for the Member 360 section.
   *
   * Readable with `members.read` rather than `talent.read`, because the section
   * is part of the member record a leader already has open. It returns only what
   * the member chose to submit and never contact details.
   */
  async getMemberSummary(
    ctx: TenantContext,
    memberId: string,
  ): Promise<MemberCommunitySummary | null> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "members.read");

    const member = await prisma.member.findFirst({
      where: { id: memberId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!member) throw new NotFoundError("Member not found");

    return talentRepository.getMemberSummary(ctx.tenantId, memberId);
  }

  /** The tenant's skill vocabulary, for the picker's suggestions. */
  async listSkills(ctx: TenantContext): Promise<TalentSkill[]> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "talent.read");
    return talentRepository.listSkillsForTenant(ctx.tenantId);
  }

  /**
   * Combined counts for the Community dashboard.
   *
   * Needs both `talent.read` and `ideas.read`, because the dashboard shows one
   * combined picture and a leader who cannot see the directory should not see a
   * half-populated card that leaks its numbers.
   */
  async getCommunityStats(ctx: TenantContext): Promise<CommunityStats> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "talent.read");
    requirePermission(ctx, "ideas.read");

    const [talent, ideaStats, topSkills] = await Promise.all([
      talentRepository.getStats(ctx.tenantId),
      ideaRepository.getStats(ctx.tenantId),
      talentRepository.getTopSkills(ctx.tenantId, 10),
    ]);

    return {
      membersWithSkills: talent.profilesWithSkills,
      membersWillingToHelp: talent.willingToHelp,
      discoverableMembers: talent.discoverable,
      ideasSubmitted: ideaStats.total,
      ideasUnderReview: ideaStats.byStatus.new + ideaStats.byStatus.under_review,
      ideasImplemented: ideaStats.byStatus.implemented,
      topSkills,
      topCategories: ideaStats.byCategory.slice(0, 6),
    };
  }
}

/**
 * Whether this caller is allowed to look past the discoverability opt-out for a
 * single member.
 *
 * Only `talent.update` holders — admin and super admin — because seeing a
 * non-discoverable profile is a supervisory act, not a directory browse. A
 * leader, who can otherwise read the whole directory, does not get this.
 */
function queryAllowsNonDiscoverable(ctx: TenantContext): boolean {
  return hasPermission(ctx, "talent.update");
}

export const talentService = new TalentService();
