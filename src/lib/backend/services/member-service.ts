/**
 * Member Service
 *
 * Business logic and security boundary for the Member domain.
 *
 * Responsibilities:
 * - Server-enforced tenant isolation from TenantContext
 * - Authorization enforcement via requirePermission
 * - Duplicate email prevention per tenant
 * - Audit logging for mutations
 * - Delegating data access to memberRepository
 */

import { BaseService } from "./base-service";
import type { TenantContext } from "../types";
import { NotFoundError, ConflictError } from "../errors";
import { requirePermission } from "../authorization";
import prisma from "../../db/prisma";
import {
  memberRepository,
  type ListMembersFilter,
} from "../../db/repositories/member-repository";
import { talentRepository } from "../../db/repositories/talent-repository";
import { familyRepository } from "../../db/repositories/family-repository";
import type {
  CreateMemberInput,
  UpdateMemberInput,
  UpdateMyProfileInput,
  MemberQuery,
  ImportMembersInput,
  ExportMembersQuery,
  RequestProfileDeletionInput,
  ResolveMemberDeletionInput,
} from "../validation";

export class MemberService extends BaseService {
  /**
   * List members within the authenticated tenant.
   * Requires `members.read`.
   */
  async listMembers(ctx: TenantContext, params: Partial<MemberQuery> = {}) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "members.read");

    const filter: ListMembersFilter = {
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      ministry: params.ministry,
    };

    return memberRepository.listMembers(tenant.tenantId, filter);
  }

  /**
   * Find a single member by ID within the authenticated tenant.
   * Requires `members.read`.
   * Throws `NotFoundError` if the member does not exist or belongs to another tenant.
   */
  async getMemberById(ctx: TenantContext, memberId: string) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "members.read");

    const member = await memberRepository.findMemberById(tenant.tenantId, memberId);
    if (!member) {
      throw new NotFoundError("Member", memberId);
    }

    return member;
  }

  /**
   * Get the current authenticated user's linked member record.
   * Requires authenticated session (any role).
   * Does NOT require members.read permission.
   * Auto-links or creates member if user exists but has no member linked.
   */
  async getMyMemberProfile(ctx: TenantContext) {
    const tenant = this.ensureTenant(ctx);

    const member = await memberRepository.findMemberByUserId(tenant.tenantId, ctx.userId);
    if (!member) {
      throw new NotFoundError("Member profile for user", ctx.userId);
    }

    const [talentProfile, familyId] = await Promise.all([
      talentRepository.getProfileForMember(tenant.tenantId, member.id).catch(() => null),
      familyRepository.findFamilyIdForMember(tenant.tenantId, member.id).catch(() => null),
    ]);

    let familyName: string | null = null;
    let familyMembers: Array<{
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string | null;
      relationship?: string | null;
      isSelf: boolean;
    }> = [];

    if (familyId) {
      const fam = await familyRepository.findForTenant(tenant.tenantId, familyId).catch(() => null);
      if (fam?.name) {
        familyName = fam.name;
      }
      if (fam) {
        const rels = await familyRepository.listRelationshipsForFamily(tenant.tenantId, familyId).catch(() => []);
        const memberIds = new Set<string>();
        for (const r of rels) {
          memberIds.add(r.fromMemberId);
          memberIds.add(r.toMemberId);
        }
        if (fam.headMemberId) memberIds.add(fam.headMemberId);
        memberIds.add(member.id);

        const loadedMembers = await familyRepository.getMembersForTenant(tenant.tenantId, [...memberIds]).catch(() => []);
        familyMembers = loadedMembers.map((m) => {
          const relRow = rels.find(
            (r) => (r.fromMemberId === member.id && r.toMemberId === m.id) || (r.fromMemberId === m.id && r.toMemberId === member.id)
          );
          return {
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            avatarUrl: m.avatarUrl ?? null,
            relationship: relRow?.type || (m.id === fam.headMemberId ? "head" : "member"),
            isSelf: m.id === member.id,
          };
        });
      }
    }

    return {
      ...member,
      talentProfile,
      familyId,
      familyName,
      familyMembers,
    };
  }

  /**
   * Self-service profile update by the authenticated user.
   * Does NOT require general members.update permission because members own their profile.
   * Updates core info, talents, family, and dispatches real-time member.profile_updated event.
   */
  async updateMyProfile(ctx: TenantContext, data: UpdateMyProfileInput, request?: Request) {
    const tenant = this.ensureTenant(ctx);

    // 1. Resolve member for this user in this tenant
    let member: any = await memberRepository.findMemberByUserId(tenant.tenantId, ctx.userId);

    if (!member) {
      const user = await prisma.user.findFirst({
        where: { id: ctx.userId, tenantId: tenant.tenantId },
      });
      if (!user) {
        throw new NotFoundError("User", ctx.userId);
      }

      let existing = await memberRepository.findMemberByEmail(tenant.tenantId, user.email);
      if (!existing) {
        const parts = (user.name || "Member").trim().split(/\s+/);
        const firstName = parts[0] || "Member";
        const lastName = parts.slice(1).join(" ") || "";
        existing = await memberRepository.createMember(tenant.tenantId, {
          firstName,
          lastName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          status: "active",
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { memberId: existing.id },
      }).catch(() => {});
      member = { ...existing, group: null };
    }

    if (!member) {
      throw new NotFoundError("Member profile for user", ctx.userId);
    }

    const memberId: string = member.id;

    // Check duplicate phone if changing phone
    if (data.phone && data.phone.trim()) {
      const duplicatePhone = await memberRepository.findMemberByPhone(tenant.tenantId, data.phone, memberId);
      if (duplicatePhone && duplicatePhone.id !== memberId) {
        throw new ConflictError("This mobile number is already registered to another member in your church");
      }
    }

    // 2. Update Member core fields
    const memberUpdate: any = {};
    if (data.firstName !== undefined) memberUpdate.firstName = data.firstName;
    if (data.lastName !== undefined) memberUpdate.lastName = data.lastName;
    if (data.phone !== undefined) memberUpdate.phone = data.phone || null;
    if (data.avatarUrl !== undefined) memberUpdate.avatarUrl = data.avatarUrl || null;
    if (data.ministry !== undefined) memberUpdate.ministry = data.ministry || null;
    if (data.groupId !== undefined) memberUpdate.groupId = data.groupId || null;

    let updatedMember: any = member;
    if (Object.keys(memberUpdate).length > 0) {
      updatedMember = await memberRepository.updateMember(tenant.tenantId, memberId, memberUpdate);
    }

    // Also update User avatar/name if changed
    if (data.avatarUrl || data.firstName || data.lastName) {
      const updatedName = `${data.firstName ?? member.firstName} ${data.lastName ?? member.lastName}`.trim();
      await prisma.user.update({
        where: { id: ctx.userId },
        data: {
          name: updatedName,
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
        },
      }).catch(() => {});
    }

    // 3. Update Talents & Skills if provided
    if (
      data.skills !== undefined ||
      data.profession !== undefined ||
      data.professionCategory !== undefined ||
      data.willingAreas !== undefined
    ) {
      await talentRepository.upsertProfile(
        tenant.tenantId,
        memberId,
        {
          profession: data.profession || null,
          professionCategory: data.professionCategory || null,
          willingAreas: data.willingAreas || null,
        },
        data.skills,
        ctx.userId
      );
    }

    // 4. Update Family Linkage if requested
    let familyInfo: any = null;
    if (data.createFamilyName && data.createFamilyName.trim()) {
      const createdFamily = await familyRepository.create(tenant.tenantId, {
        name: data.createFamilyName.trim(),
        headMemberId: memberId,
      });
      familyInfo = createdFamily;
    } else if (data.familyId) {
      const fam = await familyRepository.findForTenant(tenant.tenantId, data.familyId);
      if (fam) {
        if (data.familyRelationshipType === "head") {
          await familyRepository.update(tenant.tenantId, fam.id, { headMemberId: memberId });
          familyInfo = fam;
        } else if (data.familyRelationshipType) {
          let targetMemberId = data.relatedMemberId;
          if (!targetMemberId && fam.headMemberId && fam.headMemberId !== memberId) {
            targetMemberId = fam.headMemberId;
          }
          if (targetMemberId && targetMemberId !== memberId) {
            const existingRels = await familyRepository.listRelationshipsForFamily(tenant.tenantId, fam.id);
            const exists = existingRels.some(
              (r) =>
                (r.fromMemberId === memberId && r.toMemberId === targetMemberId) ||
                (r.fromMemberId === targetMemberId && r.toMemberId === memberId)
            );
            if (!exists) {
              await familyRepository.createRelationship(tenant.tenantId, {
                familyId: fam.id,
                fromMemberId: memberId,
                toMemberId: targetMemberId,
                type: data.familyRelationshipType as any,
              });
            }
          }
          familyInfo = fam;
        }
      }
    }

    // 4.1 Process multiple family members (Son, Daughter, Wife, Husband, Father, Mother, etc.)
    const activeFamilyId = familyInfo?.id || data.familyId || (await familyRepository.findFamilyIdForMember(tenant.tenantId, memberId));

    if (activeFamilyId && Array.isArray(data.newFamilyMembers) && data.newFamilyMembers.length > 0) {
      for (const item of data.newFamilyMembers) {
        if (!item.firstName?.trim() || !item.lastName?.trim()) continue;

        const fName = item.firstName.trim();
        const lName = item.lastName.trim();
        const cleanPhone = item.phone?.trim() || null;
        const cleanEmail = item.email?.trim() || null;

        // Resolve or create relative member
        let relative: any = null;
        if (cleanPhone) {
          relative = await memberRepository.findMemberByPhone(tenant.tenantId, cleanPhone);
        }
        if (!relative && cleanEmail) {
          relative = await memberRepository.findMemberByEmail(tenant.tenantId, cleanEmail);
        }
        if (!relative) {
          relative = await prisma.member.findFirst({
            where: {
              tenantId: tenant.tenantId,
              firstName: { equals: fName, mode: "insensitive" },
              lastName: { equals: lName, mode: "insensitive" },
            },
          });
        }
        if (!relative) {
          const fallbackEmail = cleanEmail || `${fName.toLowerCase().replace(/[^a-z0-9]/g, "")}.${Date.now().toString().slice(-6)}@grace.community`;
          relative = await memberRepository.createMember(tenant.tenantId, {
            firstName: fName,
            lastName: lName,
            email: fallbackEmail,
            phone: cleanPhone,
            status: "active",
          });
        }

        if (relative && relative.id !== memberId) {
          let fromId = memberId;
          let toId = relative.id;
          let relType: any = "child";

          switch (item.relationship) {
            case "son":
            case "daughter":
            case "child":
              fromId = relative.id;
              toId = memberId;
              relType = "child";
              break;
            case "wife":
            case "husband":
            case "spouse":
              fromId = memberId;
              toId = relative.id;
              relType = "spouse";
              break;
            case "father":
              fromId = relative.id;
              toId = memberId;
              relType = "father";
              break;
            case "mother":
              fromId = relative.id;
              toId = memberId;
              relType = "mother";
              break;
            case "brother":
            case "sister":
            case "sibling":
              fromId = memberId;
              toId = relative.id;
              relType = "sibling";
              break;
            case "guardian":
              fromId = relative.id;
              toId = memberId;
              relType = "guardian";
              break;
            default:
              fromId = memberId;
              toId = relative.id;
              relType = "other";
              break;
          }

          const existingRels = await familyRepository.listRelationshipsForFamily(tenant.tenantId, activeFamilyId);
          const alreadyLinked = existingRels.some(
            (r) =>
              (r.fromMemberId === fromId && r.toMemberId === toId && r.type === relType) ||
              (r.fromMemberId === toId && r.toMemberId === fromId && (relType === "spouse" || relType === "sibling" || relType === "other"))
          );

          if (!alreadyLinked && fromId !== toId) {
            await familyRepository.createRelationship(tenant.tenantId, {
              familyId: activeFamilyId,
              fromMemberId: fromId,
              toMemberId: toId,
              type: relType,
            });
          }
        }
      }

      // Reload full family with newly created relationships
      familyInfo = await familyRepository.findForTenant(tenant.tenantId, activeFamilyId);
    }

    // 4.2 Process updated family members (correct relationship types or relative name/phone)
    if (activeFamilyId && Array.isArray(data.updatedFamilyMembers) && data.updatedFamilyMembers.length > 0) {
      for (const item of data.updatedFamilyMembers) {
        if (!item.memberId || item.memberId === memberId) continue;

        // If member details were corrected
        const relMemberUpdate: any = {};
        if (item.firstName?.trim()) relMemberUpdate.firstName = item.firstName.trim();
        if (item.lastName?.trim()) relMemberUpdate.lastName = item.lastName.trim();
        if (item.phone !== undefined) relMemberUpdate.phone = item.phone?.trim() || null;
        if (Object.keys(relMemberUpdate).length > 0) {
          await memberRepository.updateMember(tenant.tenantId, item.memberId, relMemberUpdate).catch(() => {});
        }

        // Determine orientation & relationship type
        let fromId = memberId;
        let toId = item.memberId;
        let relType: any = "child";

        switch (item.relationship) {
          case "son":
          case "daughter":
          case "child":
            fromId = item.memberId;
            toId = memberId;
            relType = "child";
            break;
          case "wife":
          case "husband":
          case "spouse":
            fromId = memberId;
            toId = item.memberId;
            relType = "spouse";
            break;
          case "father":
            fromId = item.memberId;
            toId = memberId;
            relType = "father";
            break;
          case "mother":
            fromId = item.memberId;
            toId = memberId;
            relType = "mother";
            break;
          case "brother":
          case "sister":
          case "sibling":
            fromId = memberId;
            toId = item.memberId;
            relType = "sibling";
            break;
          case "guardian":
            fromId = item.memberId;
            toId = memberId;
            relType = "guardian";
            break;
          default:
            fromId = memberId;
            toId = item.memberId;
            relType = "other";
            break;
        }

        const existingRels = await familyRepository.listRelationshipsForFamily(tenant.tenantId, activeFamilyId);
        const relToUpdate = existingRels.find(
          (r) =>
            (r.fromMemberId === memberId && r.toMemberId === item.memberId) ||
            (r.fromMemberId === item.memberId && r.toMemberId === memberId)
        );

        if (relToUpdate) {
          await familyRepository.updateRelationship(tenant.tenantId, relToUpdate.id, {
            fromMemberId: fromId,
            toMemberId: toId,
            type: relType,
          });
        } else {
          await familyRepository.createRelationship(tenant.tenantId, {
            familyId: activeFamilyId,
            fromMemberId: fromId,
            toMemberId: toId,
            type: relType,
          });
        }
      }
      familyInfo = await familyRepository.findForTenant(tenant.tenantId, activeFamilyId);
    }

    // 4.3 Process removed family members (unlinking mistaken relatives)
    if (activeFamilyId && Array.isArray(data.removedFamilyMemberIds) && data.removedFamilyMemberIds.length > 0) {
      const existingRels = await familyRepository.listRelationshipsForFamily(tenant.tenantId, activeFamilyId);
      for (const remMemberId of data.removedFamilyMemberIds) {
        if (!remMemberId || remMemberId === memberId) continue;
        const relsToDelete = existingRels.filter(
          (r) => r.fromMemberId === remMemberId || r.toMemberId === remMemberId
        );
        for (const r of relsToDelete) {
          await familyRepository.deleteRelationshipForTenant(tenant.tenantId, r.id);
        }
      }
      familyInfo = await familyRepository.findForTenant(tenant.tenantId, activeFamilyId);
    }

    // 5. Audit log
    await this.audit(
      ctx,
      "member.self_updated",
      "member",
      memberId,
      {
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone,
        ministry: member.ministry,
        groupId: member.groupId,
      },
      {
        firstName: updatedMember.firstName,
        lastName: updatedMember.lastName,
        phone: updatedMember.phone,
        ministry: updatedMember.ministry,
        groupId: updatedMember.groupId,
      },
      this.getRequestMetadata(request)
    );

    // 6. Realtime Dispatch
    const eventPayload = {
      memberId: member.id,
      memberName: `${updatedMember.firstName} ${updatedMember.lastName}`.trim(),
      email: updatedMember.email,
      phone: updatedMember.phone,
      avatarUrl: updatedMember.avatarUrl,
      ministry: updatedMember.ministry,
      groupId: updatedMember.groupId,
      groupName: updatedMember.group?.name,
      familyId: familyInfo?.id,
      familyName: familyInfo?.name,
      skills: data.skills,
      updatedFields: Object.keys(data),
      timestamp: new Date().toISOString(),
    };

    await this.emitRealtimeEvent(ctx, "member.profile_updated", eventPayload);

    // Fetch refreshed talent profile & family ID
    const [talentProfile, finalFamilyId] = await Promise.all([
      talentRepository.getProfileForMember(tenant.tenantId, memberId).catch(() => null),
      familyRepository.findFamilyIdForMember(tenant.tenantId, memberId).catch(() => null),
    ]);

    return {
      ...updatedMember,
      talentProfile,
      familyId: finalFamilyId ?? familyInfo?.id ?? null,
      familyName: familyInfo?.name ?? null,
      family: familyInfo,
    };
  }

  /**
   * Create a new member within the authenticated tenant.
   * Requires `members.create`.
   * Enforces unique email per tenant.
   */
  async createMember(ctx: TenantContext, data: CreateMemberInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "members.create");

    // Enforce 1,000 member capacity limit
    if (typeof memberRepository.countMembers === "function") {
      const currentCount = await memberRepository.countMembers(tenant.tenantId);
      if (currentCount >= 1000) {
        throw new ConflictError("Member limit reached. A church cannot exceed 1,000 members.");
      }
    }

    // Check duplicate email within the same tenant
    const existing = await memberRepository.findMemberByEmail(tenant.tenantId, data.email);
    if (existing) {
      throw new ConflictError("A member with this email address already exists in your church");
    }

    // Check duplicate phone within the same tenant if provided
    if (data.phone && data.phone.trim()) {
      const existingPhone = await memberRepository.findMemberByPhone(tenant.tenantId, data.phone);
      if (existingPhone) {
        throw new ConflictError("A member with this mobile number already exists in your church");
      }
    }

    const member = await memberRepository.createMember(tenant.tenantId, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      avatarUrl: data.avatarUrl || null,
      status: data.status || "active",
      ministry: data.ministry || null,
      groupId: data.groupId || null,
      joinedAt: data.joinedAt ? new Date(data.joinedAt) : null,
    });

    await this.audit(
      ctx,
      "member.created",
      "member",
      member.id,
      undefined,
      {
        email: member.email,
        name: `${member.firstName} ${member.lastName}`,
        status: member.status,
        ministry: member.ministry,
      }
    );

    return member;
  }

  /**
   * Update an existing member within the authenticated tenant.
   * Requires `members.update`.
   * Throws `NotFoundError` if the member is not found in the caller's tenant.
   * Enforces email and phone uniqueness if changed.
   */
  async updateMember(ctx: TenantContext, memberId: string, data: UpdateMemberInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "members.update");

    const existing = await memberRepository.findMemberById(tenant.tenantId, memberId);
    if (!existing) {
      throw new NotFoundError("Member", memberId);
    }

    if (data.email && data.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const duplicate = await memberRepository.findMemberByEmail(tenant.tenantId, data.email);
      if (duplicate && duplicate.id !== memberId) {
        throw new ConflictError("A member with this email address already exists in your church");
      }
    }

    if (data.phone && data.phone.trim()) {
      const duplicatePhone = await memberRepository.findMemberByPhone(tenant.tenantId, data.phone, memberId);
      if (duplicatePhone && duplicatePhone.id !== memberId) {
        throw new ConflictError("A member with this mobile number already exists in your church");
      }
    }

    const updated = await memberRepository.updateMember(tenant.tenantId, memberId, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone !== undefined ? data.phone || null : undefined,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl || null : undefined,
      status: data.status,
      ministry: data.ministry !== undefined ? data.ministry || null : undefined,
      groupId: data.groupId !== undefined ? data.groupId || null : undefined,
      joinedAt: data.joinedAt ? new Date(data.joinedAt) : undefined,
    });

    await this.audit(
      ctx,
      "member.updated",
      "member",
      memberId,
      {
        email: existing.email,
        name: `${existing.firstName} ${existing.lastName}`,
        status: existing.status,
        ministry: existing.ministry,
      },
      {
        email: updated.email,
        name: `${updated.firstName} ${updated.lastName}`,
        status: updated.status,
        ministry: updated.ministry,
      }
    );

    return updated;
  }

  /**
   * Deactivate a member within the authenticated tenant.
   * Requires `members.delete`.
   * Preserves data integrity by changing status to 'inactive'.
   */
  async deactivateMember(ctx: TenantContext, memberId: string) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "members.delete");

    const existing = await memberRepository.findMemberById(tenant.tenantId, memberId);
    if (!existing) {
      throw new NotFoundError("Member", memberId);
    }

    const deactivated = await memberRepository.deactivateMember(tenant.tenantId, memberId);

    await this.audit(
      ctx,
      "member.deactivated",
      "member",
      memberId,
      { status: existing.status },
      { status: "inactive" }
    );

    const eventPayload = {
      memberId,
      memberName: `${existing.firstName} ${existing.lastName}`.trim(),
      status: "inactive",
      timestamp: new Date().toISOString(),
    };
    await this.emitRealtimeEvent(ctx, "member.profile_updated", eventPayload);

    return deactivated;
  }

  /**
   * Self-service member profile deletion request from the Mobile App.
   * Does NOT require members.delete permission, because any authenticated user
   * can request deletion of their own account.
   */
  async requestProfileDeletion(
    ctx: TenantContext,
    input: RequestProfileDeletionInput = {},
    request?: Request
  ) {
    const tenant = this.ensureTenant(ctx);

    const member = await memberRepository.findMemberByUserId(tenant.tenantId, ctx.userId);
    if (!member) {
      throw new NotFoundError("Member profile for user", ctx.userId);
    }

    const memberId = member.id;
    const previousStatus = member.status;

    // 1. Update Member status to 'deletion_requested'
    const updatedMember = await memberRepository.updateMember(tenant.tenantId, memberId, {
      status: "deletion_requested",
    });

    // 2. Deactivate User account & revoke active sessions
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { isActive: false },
    }).catch(() => {});

    await prisma.session.updateMany({
      where: { userId: ctx.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => {});

    // 3. Create urgent FollowUp / Care task for pastoral investigation
    const reasonText = input.reason?.trim()
      ? `طلب العضو حذف حسابه: ${input.reason.trim()}`
      : "طلب العضو حذف حسابه من تطبيق الموبايل";
    const noteText = `قام العضو ${member.firstName} ${member.lastName} (${member.email}) بطلب حذف حسابه عبر تطبيق الموبايل بتاريخ ${new Date().toLocaleDateString("ar-EG")}. يتطلب الأمر تدخلاً ومتابعة رعوية وافتقاداً عاجلاً للتحقق من الأسباب قبل تأكيد الحذف النهائي أو الاستبقاء.`;

    await prisma.followUp.create({
      data: {
        tenantId: tenant.tenantId,
        memberId,
        type: "member_deletion_request",
        reason: reasonText,
        notes: noteText,
        priority: "urgent",
        status: "open",
      },
    }).catch((err) => {
      console.error("Failed creating followUp for deletion request:", err);
    });

    // 4. Audit Log
    await this.audit(
      ctx,
      "member.deletion_requested",
      "member",
      memberId,
      { status: previousStatus },
      { status: "deletion_requested", reason: input.reason || null },
      this.getRequestMetadata(request)
    );

    // 5. Realtime Events Dispatch
    const eventPayload = {
      memberId,
      memberName: `${member.firstName} ${member.lastName}`.trim(),
      email: member.email,
      phone: member.phone,
      status: "deletion_requested",
      reason: input.reason || null,
      requestedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    await this.emitRealtimeEvent(ctx, "member.deletion_requested", eventPayload);
    await this.emitRealtimeEvent(ctx, "member.profile_updated", eventPayload);

    return {
      success: true,
      memberId,
      status: "deletion_requested",
      message: "Profile deletion request submitted successfully",
    };
  }

  /**
   * Resolve a pending member deletion request from the CRM.
   * Can either:
   *   a) 'delete_permanently': Permanently removes the member and any linked user account.
   *   b) 'keep_for_followup': Sets status to 'inactive', keeps records, and sets up pastoral follow-up.
   * Requires `members.delete`.
   */
  async resolveMemberDeletion(
    ctx: TenantContext,
    memberId: string,
    input: ResolveMemberDeletionInput,
    request?: Request
  ) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "members.delete");

    const member = await memberRepository.findMemberById(tenant.tenantId, memberId);
    if (!member) {
      throw new NotFoundError("Member", memberId);
    }

    if (input.action === "delete_permanently") {
      // 1. Delete linked User login if exists
      await prisma.user.deleteMany({
        where: { memberId, tenantId: tenant.tenantId },
      }).catch(() => {});

      // 2. Delete member record
      await memberRepository.deleteMember(tenant.tenantId, memberId);

      // 3. Audit log
      await this.audit(
        ctx,
        "member.permanently_deleted",
        "member",
        memberId,
        {
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          status: member.status,
        },
        { action: "deleted_permanently", reason: input.reason || null },
        this.getRequestMetadata(request)
      );

      // 4. Realtime Dispatch
      const eventPayload = {
        memberId,
        memberName: `${member.firstName} ${member.lastName}`.trim(),
        status: "deleted",
        action: "deleted_permanently",
        timestamp: new Date().toISOString(),
      };
      await this.emitRealtimeEvent(ctx, "member.deleted", eventPayload);
      await this.emitRealtimeEvent(ctx, "member.deletion_resolved", eventPayload);
      await this.emitRealtimeEvent(ctx, "member.profile_updated", eventPayload);

      return {
        success: true,
        action: "deleted_permanently",
        memberId,
      };
    }

    // action === 'keep_for_followup'
    const updated = await memberRepository.updateMember(tenant.tenantId, memberId, {
      status: "inactive",
    });

    // Ensure linked user remains inactive
    await prisma.user.updateMany({
      where: { memberId, tenantId: tenant.tenantId },
      data: { isActive: false },
    }).catch(() => {});

    // Add or update pastoral follow-up
    const pastoralNotes = input.notes?.trim()
      ? `قرار الإدارة: الاحتفاظ بالعضو للمتابعة الرعوية. ملاحظات: ${input.notes.trim()}`
      : "تقرر الاحتفاظ ببيانات العضو وسجلاته لتمكين فريق الافتقاد والرعاة من المتابعة الدورية.";

    await prisma.followUp.create({
      data: {
        tenantId: tenant.tenantId,
        memberId,
        type: "pastoral_investigation",
        reason: "استبقاء العضو بعد طلب حذف الحساب للمتابعة والافتقاد",
        notes: pastoralNotes,
        priority: "high",
        status: "open",
      },
    }).catch(() => {});

    // Audit log
    await this.audit(
      ctx,
      "member.kept_for_followup",
      "member",
      memberId,
      { status: member.status },
      { status: "inactive", notes: pastoralNotes },
      this.getRequestMetadata(request)
    );

    // Realtime Dispatch
    const eventPayload = {
      memberId,
      memberName: `${member.firstName} ${member.lastName}`.trim(),
      status: "inactive",
      action: "kept_for_followup",
      timestamp: new Date().toISOString(),
    };
    await this.emitRealtimeEvent(ctx, "member.deletion_resolved", eventPayload);
    await this.emitRealtimeEvent(ctx, "member.profile_updated", eventPayload);

    return {
      success: true,
      action: "kept_for_followup",
      member: updated,
    };
  }

  /**
   * Permanently delete a member directly from CRM (Admin action).
   * Requires `members.delete`.
   */
  async deleteMemberPermanently(ctx: TenantContext, memberId: string, request?: Request) {
    return this.resolveMemberDeletion(
      ctx,
      memberId,
      { action: "delete_permanently" },
      request
    );
  }

  /**
   * Batch import members within the authenticated tenant.
   * Requires `members.create`.
   * Supports 'skip' or 'update' for existing email duplicates.
   */
  async importMembers(ctx: TenantContext, input: ImportMembersInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "members.create");

    // Enforce 1,000 member capacity limit
    if (typeof memberRepository.countMembers === "function") {
      const currentCount = await memberRepository.countMembers(tenant.tenantId);
      if (currentCount + input.members.length > 1000) {
        throw new ConflictError(
          `Cannot import ${input.members.length} members. Current count is ${currentCount}, which would exceed the maximum capacity of 1,000 members.`
        );
      }
    }

    const result = await memberRepository.importMembersBatch(
      tenant.tenantId,
      input.members,
      input.onDuplicate
    );

    await this.audit(
      ctx,
      "member.imported",
      "member",
      tenant.tenantId,
      undefined,
      {
        totalRows: input.members.length,
        importedCount: result.imported,
        updatedCount: result.updated,
        skippedCount: result.skipped,
        errorCount: result.errors,
        onDuplicate: input.onDuplicate,
      }
    );

    return result;
  }

  /**
   * Export all members matching optional filters for the authenticated tenant.
   * Requires `members.read`.
   * Returns RFC 4180 CSV string with UTF-8 BOM.
   */
  async exportMembersCsv(ctx: TenantContext, query: ExportMembersQuery = {}) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "members.read");

    const members = await memberRepository.listAllMembersForExport(tenant.tenantId, query);

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Status",
      "Ministry",
      "Group Name",
      "Joined Date",
      "Photo URL",
    ];

    const lines = members.map((m) =>
      [
        escapeCsv(m.firstName),
        escapeCsv(m.lastName),
        escapeCsv(m.email),
        escapeCsv(m.phone || ""),
        escapeCsv(m.status),
        escapeCsv(m.ministry || ""),
        escapeCsv(m.group?.name || ""),
        escapeCsv(m.joinedAt ? m.joinedAt.toISOString().slice(0, 10) : ""),
        escapeCsv(m.avatarUrl || ""),
      ].join(",")
    );

    const csv = "\uFEFF" + [headers.join(","), ...lines].join("\r\n");

    await this.audit(
      ctx,
      "member.exported",
      "member",
      tenant.tenantId,
      undefined,
      {
        exportedCount: members.length,
        filters: query,
      }
    );

    return {
      csv,
      count: members.length,
    };
  }
}

export const memberService = new MemberService();
