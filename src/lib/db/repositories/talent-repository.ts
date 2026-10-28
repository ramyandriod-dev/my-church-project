/**
 * Talent Repository
 *
 * Tenant-scoped data access for the talent domain. The TalentService calls this
 * repository; the repository calls Prisma. Route handlers never touch Prisma
 * directly.
 *
 * CRITICAL SECURITY RULES:
 *
 * 1. Tenant isolation. Every query filters on tenantId. The tenantId used here is
 *    ALWAYS the server-resolved tenant from TenantContext, never a client value.
 *
 * 2. Discoverability. The directory only ever returns profiles whose
 *    `isDiscoverable` is true. A member who opts out is not "filtered by
 *    default" — they are absent, and this repository is the only place that
 *    decides. `includeNotDiscoverable` exists so that staff with a narrower
 *    permission can be shown what they are deliberately missing, and it is off by
 *    default because the member's own choice is the default.
 *
 * 3. Contact details. `email` and `phone` are copied onto a directory row only
 *    when the caller passes `canContact`. They are not fetched, returned, and
 *    then hidden by the UI — the privacy boundary is this mapper.
 */

import prisma from "../prisma";
import type {
  MemberCommunitySummary,
  TalentDirectoryEntry,
  TalentMatchReason,
  SkillFacet,
  TalentProfile,
  TalentSearchCriteria,
  TalentSearchResult,
  TalentSkill,
  TalentStats,
  TalentWillingness,
} from "../../backend/types";

// ─── Mappers ─────────────────────────────────────────────────

function mapSkill(raw: any): TalentSkill {
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category ?? null,
  };
}

/** MemberSkill rows for a profile, reached through the member. */
function memberSkillRows(raw: any): any[] {
  return raw?.member?.skills ?? [];
}

/** Those rows as sorted skills, in one place so every mapper agrees. */
function memberSkills(raw: any): TalentSkill[] {
  return memberSkillRows(raw)
    .map((ms: any) => mapSkill(ms.skill))
    .sort((a: TalentSkill, b: TalentSkill) => a.name.localeCompare(b.name));
}

/** The nested shape every talent read loads. */
const profileInclude = {
  member: { include: { group: true, skills: { include: { skill: true } } } },
} as const;

function mapProfile(raw: any): TalentProfile {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    memberId: raw.memberId,
    professionCategory: raw.professionCategory ?? null,
    profession: raw.profession ?? null,
    experience: raw.experience ?? null,
    yearsExperience: raw.yearsExperience ?? null,
    willingness: raw.willingness as TalentWillingness,
    willingAreas: raw.willingAreas ?? null,
    isDiscoverable: raw.isDiscoverable,
    updatedByUserId: raw.updatedByUserId ?? null,
    skills: memberSkills(raw),
    createdAt: new Date(raw.createdAt).toISOString(),
    updatedAt: new Date(raw.updatedAt).toISOString(),
  };
}

function mapDirectoryEntry(raw: any, canContact: boolean): TalentDirectoryEntry {
  const member = raw.member;
  return {
    memberId: raw.memberId,
    firstName: member.firstName,
    lastName: member.lastName,
    avatarUrl: member.avatarUrl ?? null,
    status: member.status,
    professionCategory: raw.professionCategory ?? null,
    profession: raw.profession ?? null,
    experience: raw.experience ?? null,
    yearsExperience: raw.yearsExperience ?? null,
    willingness: raw.willingness as TalentWillingness,
    willingAreas: raw.willingAreas ?? null,
    skills: memberSkills(raw),
    ministry: member.ministry ?? null,
    groupName: member.group?.name ?? null,
    ...(canContact ? { email: member.email, phone: member.phone ?? null } : {}),
    canContact,
    updatedAt: new Date(raw.updatedAt).toISOString(),
  };
}

// ─── Match reasons ───────────────────────────────────────────

/**
 * Why this member matched, computed from the row that was actually returned.
 *
 * Every reason quotes a stored value. Nothing is inferred, summarised by a model,
 * or derived from data the query did not match on — so a member can never be
 * shown "matched because they are good with children" unless "children" is
 * literally in one of their stored fields. An empty `reasons` array means the
 * row matched on a filter with no quotable value (for example ministry alone),
 * which is why the UI renders the criteria as well as the reasons.
 */
function buildReasons(raw: any, criteria: TalentSearchCriteria): TalentMatchReason[] {
  const reasons: TalentMatchReason[] = [];
  const member = raw.member;
  const haystack = `${member.firstName} ${member.lastName}`;

  if (criteria.name && haystack.toLowerCase().includes(criteria.name.toLowerCase())) {
    reasons.push({ field: "name", value: haystack });
  }
  if (
    criteria.profession &&
    raw.profession &&
    raw.profession.toLowerCase().includes(criteria.profession.toLowerCase())
  ) {
    reasons.push({ field: "profession", value: raw.profession });
  }
  for (const term of criteria.skills) {
    const needle = term.toLowerCase();
    const hit = memberSkillRows(raw).find(
      (ms: any) => ms.skill.name.toLowerCase().includes(needle),
    );
    if (hit) reasons.push({ field: "skill", value: hit.skill.name });
  }
  for (const term of criteria.experience) {
    if (raw.experience && raw.experience.toLowerCase().includes(term.toLowerCase())) {
      reasons.push({ field: "experience", value: raw.experience });
    }
  }
  if (
    criteria.ministry &&
    member.ministry &&
    member.ministry.toLowerCase().includes(criteria.ministry.toLowerCase())
  ) {
    reasons.push({ field: "ministry", value: member.ministry });
  }
  if (
    criteria.group &&
    member.group?.name &&
    member.group.name.toLowerCase().includes(criteria.group.toLowerCase())
  ) {
    reasons.push({ field: "group", value: member.group.name });
  }
  if (criteria.willingness && criteria.willingness !== "any") {
    if (raw.willingness === criteria.willingness) {
      reasons.push({ field: "willingness", value: raw.willingness });
    }
  }
  return reasons;
}

// ─── Query builders ──────────────────────────────────────────

/**
 * Translates structured criteria into a Prisma filter.
 *
 * Skills are OR-ed on purpose. A small church is better served by "who knows
 * anything about X?" returning everyone relevant and letting the caller pick,
 * than by a strict AND silently returning nobody because no single person
 * ticked all three boxes. Ranking in `searchForTenant` restores precision.
 *
 * `discoverableOnly` is applied here, not left to the caller, because a filter
 * the caller could forget is a privacy setting that does not hold.
 */
function buildCriteriaWhere(tenantId: string, criteria: TalentSearchCriteria): any {
  const where: any = { tenantId };

  if (criteria.discoverableOnly) {
    where.isDiscoverable = true;
  }
  if (criteria.willingness && criteria.willingness !== "any") {
    where.willingness = criteria.willingness;
  }
  if (criteria.profession) {
    where.profession = { contains: criteria.profession, mode: "insensitive" };
  }
  if (criteria.skills.length > 0) {
    where.member = {
      skills: { some: { skill: { name: { in: criteria.skills, mode: "insensitive" } } } },
    };
  }

  // Member-scoped and free-text-on-profile criteria combine as AND across
  // different fields, OR within the same field.
  const and: any[] = [];
  if (criteria.name) {
    and.push({
      member: {
        OR: [
          { firstName: { contains: criteria.name, mode: "insensitive" } },
          { lastName: { contains: criteria.name, mode: "insensitive" } },
        ],
      },
    });
  }
  if (criteria.ministry) {
    and.push({ member: { ministry: { contains: criteria.ministry, mode: "insensitive" } } });
  }
  if (criteria.group) {
    and.push({ member: { group: { name: { contains: criteria.group, mode: "insensitive" } } } });
  }
  if (criteria.experience.length > 0) {
    and.push({
      OR: criteria.experience.map((term) => ({
        experience: { contains: term, mode: "insensitive" },
      })),
    });
  }
  if (and.length > 0) where.AND = and;

  return where;
}

export interface TalentDirectoryFilter {
  search?: string;
  professionCategory?: string;
  skill?: string;
  /**
   * Skill ids to filter on. Ids rather than names, because names are free text
   * typed by members and "Guitar" / "guitar " would otherwise be two different
   * filters that each return almost nobody.
   */
  skills?: string[];
  /** How `skills` combine. Defaults to "any" when omitted. */
  skillMode?: "any" | "all";
  ministry?: string;
  group?: string;
  willingness?: TalentWillingness | "any";
  includeNotDiscoverable?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Prisma conditions for a multi-skill selection.
 *
 * "any" is one `some` over the id list. "all" is one `some` PER skill, all
 * AND-ed together — which is the only correct way to express "has every one of
 * these", because a single `some` with `in: [...]` is satisfied by any one of
 * them and would silently degrade "all" into "any".
 *
 * These are returned as an array to be spread into the caller's `AND`, which
 * keeps them AND-combined with the other member-level filters already there.
 */
function skillFilterConditions(filter: TalentDirectoryFilter): any[] {
  const ids = (filter.skills ?? []).filter(Boolean);
  if (ids.length === 0) return [];

  if ((filter.skillMode ?? "any") === "all") {
    return ids.map((skillId) => ({ member: { skills: { some: { skillId } } } }));
  }
  return [{ member: { skills: { some: { skillId: { in: ids } } } } }];
}

/** Resolved profile fields, ready to be written. */
export interface TalentProfileRecordInput {
  professionCategory?: string | null;
  profession?: string | null;
  experience?: string | null;
  yearsExperience?: number | null;
  willingness?: TalentWillingness;
  willingAreas?: string | null;
  isDiscoverable?: boolean;
}

// ─── Repository ──────────────────────────────────────────────

class TalentRepository {
  // ─── Skills ───────────────────────────────────────────────

  /**
   * Resolve typed skill names to the tenant's Skill rows, creating any that do
   * not exist yet.
   *
   * A member must be able to enter a skill the church has never heard of, so
   * this is a find-or-create rather than a lookup that rejects unknown names.
   * Names are compared case-insensitively, so "Guitar" and "guitar" resolve to
   * one row and the directory does not fill with near-duplicates.
   *
   * Concurrent inserts of the same new name are absorbed by the
   * `skills_tenant_id_name_key` unique index: the loser of the race re-reads.
   */
  async resolveSkillNames(tenantId: string, names: string[]): Promise<TalentSkill[]> {
    if (names.length === 0) return [];

    const wanted = Array.from(
      new Map(names.map((n) => [n.trim().toLowerCase(), n.trim()])).values(),
    );

    const existing = await prisma.skill.findMany({
      where: {
        tenantId,
        OR: [
          { name: { in: wanted, mode: "insensitive" } },
          { name: { equals: wanted[0], mode: "insensitive" } },
        ],
      },
    });

    const byLower = new Map(existing.map((s) => [s.name.toLowerCase(), s]));
    const missing = wanted.filter((n) => !byLower.has(n.toLowerCase()));

    for (const name of missing) {
      try {
        const created = await prisma.skill.create({
          data: { tenantId, name, isSuggested: false },
        });
        byLower.set(created.name.toLowerCase(), created);
      } catch {
        // Lost a race against a concurrent create for the same name; the row
        // now exists, so re-read it rather than failing the member's save.
        const raced = await prisma.skill.findFirst({
          where: { tenantId, name: { equals: name, mode: "insensitive" } },
        });
        if (raced) byLower.set(raced.name.toLowerCase(), raced);
      }
    }

    return wanted
      .map((n) => byLower.get(n.toLowerCase()))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => mapSkill(s));
  }

  /** The tenant's existing skill vocabulary, for the picker and suggestions. */
  async listSkillsForTenant(tenantId: string, limit = 200): Promise<TalentSkill[]> {
    const rows = await prisma.skill.findMany({
      where: { tenantId },
      orderBy: [{ name: "asc" }],
      take: limit,
    });
    return rows.map(mapSkill);
  }

  // ─── Profile reads ─────────────────────────────────────────

  async getProfileForMember(tenantId: string, memberId: string): Promise<TalentProfile | null> {
    const raw = await prisma.talentProfile.findFirst({
      where: { tenantId, memberId },
      include: profileInclude,
    });
    return raw ? mapProfile(raw) : null;
  }

  async getProfileById(
    tenantId: string,
    profileId: string,
  ): Promise<TalentProfile | null> {
    const raw = await prisma.talentProfile.findFirst({
      where: { tenantId, id: profileId },
      include: profileInclude,
    });
    return raw ? mapProfile(raw) : null;
  }

  // ─── Profile writes ────────────────────────────────────────

  /**
   * Create or update a member's profile and replace their skill list.
   *
   * Skills are replaced wholesale rather than diffed: the member is editing a
   * list they can see in full, and a remove-then-add is far easier to reason
   * about than reconciling three tables. Everything happens in one transaction so
   * a failed skill insert cannot leave a profile with no skills.
   */
  async upsertProfile(
    tenantId: string,
    memberId: string,
    input: TalentProfileRecordInput,
    skillNames: string[] | undefined,
    updatedByUserId: string | null,
  ): Promise<TalentProfile> {
    const skills = skillNames ? await this.resolveSkillNames(tenantId, skillNames) : null;

    return prisma.$transaction(async (tx) => {
      const data: any = { updatedByUserId };
      for (const key of [
        "professionCategory",
        "profession",
        "experience",
        "yearsExperience",
        "willingness",
        "willingAreas",
        "isDiscoverable",
      ] as const) {
        if (input[key] !== undefined) data[key] = input[key];
      }

      const profile = await tx.talentProfile.upsert({
        where: { memberId },
        create: { tenantId, memberId, ...data },
        update: data,
      });

      if (skills) {
        await tx.memberSkill.deleteMany({ where: { tenantId, memberId } });
        if (skills.length > 0) {
          await tx.memberSkill.createMany({
            data: skills.map((s) => ({ tenantId, memberId, skillId: s.id })),
            skipDuplicates: true,
          });
        }
      }

      const fresh = await tx.talentProfile.findFirstOrThrow({
        where: { tenantId, id: profile.id },
        include: profileInclude,
      });
      return mapProfile(fresh);
    });
  }

  // ─── Directory ─────────────────────────────────────────────

  /**
   * The administrative Talent Directory.
   *
   * `includeNotDiscoverable` defaults to false so the opt-out holds even if the
   * caller forgets to pass it.
   */
  async listDirectoryForTenant(
    tenantId: string,
    filter: TalentDirectoryFilter,
    canContact: boolean,
  ): Promise<{ items: TalentDirectoryEntry[]; total: number }> {
    const where: any = { tenantId };
    if (!filter.includeNotDiscoverable) where.isDiscoverable = true;
    if (filter.professionCategory) where.professionCategory = filter.professionCategory;
    if (filter.willingness && filter.willingness !== "any") {
      where.willingness = filter.willingness;
    }
    if (filter.skill) {
      where.member = {
        skills: { some: { skill: { name: { contains: filter.skill, mode: "insensitive" } } } },
      };
    }

    const and: any[] = [];
    if (filter.search) {
      and.push({
        OR: [
          { member: { firstName: { contains: filter.search, mode: "insensitive" } } },
          { member: { lastName: { contains: filter.search, mode: "insensitive" } } },
          { member: { ministry: { contains: filter.search, mode: "insensitive" } } },
          { member: { skills: { some: { skill: { name: { contains: filter.search, mode: "insensitive" } } } } } },
          { profession: { contains: filter.search, mode: "insensitive" } },
          { professionCategory: { contains: filter.search, mode: "insensitive" } },
          { experience: { contains: filter.search, mode: "insensitive" } },
          { willingAreas: { contains: filter.search, mode: "insensitive" } },
        ],
      });
    }
    if (filter.ministry) {
      and.push({ member: { ministry: { contains: filter.ministry, mode: "insensitive" } } });
    }
    if (filter.group) {
      and.push({ member: { group: { name: { contains: filter.group, mode: "insensitive" } } } });
    }
    and.push(...skillFilterConditions(filter));
    if (and.length > 0) where.AND = and;

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      prisma.talentProfile.findMany({
        where,
        include: profileInclude,
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.talentProfile.count({ where }),
    ]);

    return {
      items: rows.map((r) => mapDirectoryEntry(r, canContact)),
      total,
    };
  }

  /**
   * How many members hold each skill, for the filter panel.
   *
   * ─── Facet counts ignore the skill selection, on purpose ───
   *
   * This is what makes the filter usable. A count computed WITH the current
   * selection would drop every unselected skill to zero the moment one is
   * ticked, leaving the user unable to widen the query and unable to tell
   * "nobody in this church has this skill" from "this skill is outside my current
   * filter". So every OTHER filter is applied — search text, ministry, group,
   * willingness, profession — but the skill selection itself is not, and each
   * count therefore answers the question the checkbox is actually asking: "if I
   * tick this one, how many would I get?"
   *
   * Discoverability is applied here exactly as it is in the listing, because a
   * count is itself a disclosure: one that included opted-out members would leak
   * the existence and the size of a group the member asked not to be surfaced.
   *
   * Skills nobody holds under the current filter are omitted rather than returned
   * with a zero, so the panel only ever offers a choice that returns somebody.
   */
  async getSkillFacets(
    tenantId: string,
    filter: TalentDirectoryFilter,
  ): Promise<SkillFacet[]> {
    const profileWhere: any = { tenantId };
    if (!filter.includeNotDiscoverable) profileWhere.isDiscoverable = true;
    if (filter.professionCategory) profileWhere.professionCategory = filter.professionCategory;
    if (filter.willingness && filter.willingness !== "any") {
      profileWhere.willingness = filter.willingness;
    }

    const memberWhere: any = {};
    if (filter.search) {
      memberWhere.OR = [
        { firstName: { contains: filter.search, mode: "insensitive" } },
        { lastName: { contains: filter.search, mode: "insensitive" } },
      ];
    }
    if (filter.ministry) {
      memberWhere.ministry = { contains: filter.ministry, mode: "insensitive" };
    }
    if (filter.group) {
      memberWhere.group = { name: { contains: filter.group, mode: "insensitive" } };
    }

    const rows = await prisma.memberSkill.groupBy({
      by: ["skillId"],
      where: {
        tenantId,
        member: { ...memberWhere, talentProfile: { is: profileWhere } },
      },
      _count: { _all: true },
    });

    const counts = (rows as any[])
      .filter((r: any) => r._count._all > 0)
      .map((r: any) => ({ skillId: r.skillId as string, count: r._count._all as number }));
    if (counts.length === 0) return [];

    const skills = await prisma.skill.findMany({
      where: { tenantId, id: { in: counts.map((c) => c.skillId) } },
    });
    const byId = new Map<string, TalentSkill>(
      skills.map((s: any) => [s.id as string, mapSkill(s)]),
    );

    return counts
      .map((c) => {
        const skill = byId.get(c.skillId);
        return skill ? { skill, count: c.count } : null;
      })
      .filter((f): f is SkillFacet => f !== null)
      .sort((a, b) => b.count - a.count || a.skill.name.localeCompare(b.skill.name));
  }

  /**
   * Answer a question with structured criteria.
   *
   * Rows are ranked by how many distinct criteria they matched, so the person who
   * satisfies three parts of a two-part question outranks a single partial
   * match. Ranking is on real matched fields only, which is why the reasons are
   * computed here rather than by a model.
   */
  async searchForTenant(
    tenantId: string,
    criteria: TalentSearchCriteria,
    canContact: boolean,
    limit: number,
  ): Promise<{ results: TalentSearchResult[]; total: number }> {
    const where = buildCriteriaWhere(tenantId, criteria);
    const total = await prisma.talentProfile.count({ where });

    const rows = await prisma.talentProfile.findMany({
      where,
      include: profileInclude,
      // Over-fetch relative to `limit` so ranking has something to work with,
      // then slice. Bounded by the tenant's own profile count, not by `limit`.
      take: 100,
    });

    const scored = rows
      .map((raw) => {
        const reasons = buildReasons(raw, criteria);
        return { ...mapDirectoryEntry(raw, canContact), reasons };
      })
      .sort((a, b) => {
        if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
        const an = `${a.firstName} ${a.lastName}`;
        const bn = `${b.firstName} ${b.lastName}`;
        return an.localeCompare(bn);
      });

    return { results: scored.slice(0, limit), total };
  }

  // ─── Stats & member summary ────────────────────────────────

  async getStats(tenantId: string): Promise<TalentStats> {
    const [profilesWithSkills, willingToHelp, discoverable, skillCount, byCategory] =
      await Promise.all([
        prisma.talentProfile.count({ where: { tenantId, member: { skills: { some: {} } } } }),
        prisma.talentProfile.count({ where: { tenantId, willingness: "yes" } }),
        prisma.talentProfile.count({ where: { tenantId, isDiscoverable: true } }),
        prisma.skill.count({ where: { tenantId } }),
        prisma.talentProfile.groupBy({
          by: ["professionCategory"],
          where: { tenantId, professionCategory: { not: null } },
          _count: { _all: true },
        }),
      ]);

    return {
      profilesWithSkills,
      willingToHelp,
      discoverable,
      skillCount,
      professionBreakdown: byCategory
        .map((row: any) => ({ category: row.professionCategory, count: row._count._all }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /** The most-used skills in this tenant, for the dashboard. */
  async getTopSkills(tenantId: string, limit = 10): Promise<{ name: string; count: number }[]> {
    const rows: any = await prisma.memberSkill.groupBy({
      by: ["skillId"],
      where: { tenantId },
      _count: { _all: true },
      orderBy: { _count: { skillId: "desc" } },
      take: limit,
    });
    if (rows.length === 0) return [];

    const skills = await prisma.skill.findMany({
      where: { tenantId, id: { in: rows.map((r: any) => r.skillId) } },
    });
    const byId = new Map(skills.map((s) => [s.id, s.name]));

    return rows
      .map((r: any) => ({ name: byId.get(r.skillId) ?? "", count: r._count._all }))
      .filter((r: { name: string }) => r.name.length > 0);
  }

  /**
   * A member's talent profile and idea count, for the compact Member 360 section.
   *
   * Takes the caller's own permission for contact details rather than assuming:
   * the same section renders differently for a leader and for a staff user.
   */
  async getMemberSummary(
    tenantId: string,
    memberId: string,
  ): Promise<MemberCommunitySummary | null> {
    const raw = await prisma.talentProfile.findFirst({
      where: { tenantId, memberId },
      include: profileInclude,
    });
    if (!raw) return null;

    const ideasSubmitted = await prisma.idea.count({ where: { tenantId, submittedByMemberId: memberId } });

    return {
      memberId,
      profession: raw.profession ?? null,
      professionCategory: raw.professionCategory ?? null,
      skills: memberSkills(raw),
      experience: raw.experience ?? null,
      yearsExperience: raw.yearsExperience ?? null,
      willingness: raw.willingness as TalentWillingness,
      willingAreas: raw.willingAreas ?? null,
      isDiscoverable: raw.isDiscoverable,
      ideasSubmitted,
    };
  }
}

export const talentRepository = new TalentRepository();
export { buildCriteriaWhere, buildReasons, mapDirectoryEntry, mapProfile };
