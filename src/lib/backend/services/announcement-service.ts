/**
 * Announcement Service
 *
 * Staff send one announcement to a chosen audience (everyone, church roles,
 * groups, ministries). Each recipient gets it in their in-app notification centre,
 * and a push notification goes to their phone when they have the app.
 *
 * Authorisation: `announcements.send` is held by admins, pastors and group leaders.
 * Leaders are further limited to the groups they lead, enforced here against the
 * database, never against anything the client claims.
 */

import { BaseService } from "./base-service";
import { announcementRepository, type AnnouncementRecord } from "../../db/repositories/announcement-repository";
import { prisma } from "../../db/prisma";
import { requirePermission } from "../authorization";
import { ForbiddenError, ValidationError } from "../errors";
import { sendFcmPushToMembers } from "@/lib/push/fcm-service";
import {
  describeAudience,
  hasSelector,
  leaderAudienceProblem,
  resolveAudience,
  type AudienceSpec,
} from "@/lib/announcements/audience";
import type { TenantContext } from "../types";
import type { SendAnnouncementInput } from "../validation";

export interface AudienceOptions {
  groups: { id: string; name: string }[];
  ministries: string[];
  /** Group leaders see only their own groups and cannot use the other selectors. */
  restrictedToGroups: boolean;
}

export class AnnouncementService extends BaseService {
  private async assertAudienceAllowed(ctx: TenantContext, audience: AudienceSpec): Promise<void> {
    if (ctx.role !== "leader") return;
    const groups = await announcementRepository.listGroups(ctx.tenantId);
    const led = groups.filter((g) => g.leaderId === ctx.userId).map((g) => g.id);
    const problem = leaderAudienceProblem(audience, led);
    if (problem) throw new ForbiddenError(problem);
  }

  /** What the compose form can offer this sender. */
  async getOptions(ctx: TenantContext): Promise<AudienceOptions> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "announcements.send");

    const [groups, candidates] = await Promise.all([
      announcementRepository.listGroups(ctx.tenantId),
      announcementRepository.listCandidates(ctx.tenantId),
    ]);
    const restricted = ctx.role === "leader";
    const visible = restricted ? groups.filter((g) => g.leaderId === ctx.userId) : groups;
    const ministries = restricted
      ? []
      : Array.from(new Set(candidates.map((c) => c.ministry).filter((m): m is string => !!m && m !== "—"))).sort();

    return {
      groups: visible.map((g) => ({ id: g.id, name: g.name })),
      ministries,
      restrictedToGroups: restricted,
    };
  }

  /** How many people an audience would reach, before anything is sent. */
  async previewAudience(ctx: TenantContext, audience: AudienceSpec): Promise<{ recipientCount: number }> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "announcements.send");
    if (!hasSelector(audience)) return { recipientCount: 0 };
    await this.assertAudienceAllowed(ctx, audience);

    const candidates = await announcementRepository.listCandidates(ctx.tenantId);
    return { recipientCount: resolveAudience(candidates, audience).length };
  }

  async send(ctx: TenantContext, input: SendAnnouncementInput): Promise<AnnouncementRecord> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "announcements.send");

    const audience = input.audience as AudienceSpec;
    if (!hasSelector(audience)) {
      throw new ValidationError({ audience: ["Choose who should receive this announcement"] });
    }
    await this.assertAudienceAllowed(ctx, audience);

    const [candidates, groups] = await Promise.all([
      announcementRepository.listCandidates(ctx.tenantId),
      announcementRepository.listGroups(ctx.tenantId),
    ]);
    const memberIds = resolveAudience(candidates, audience);
    if (memberIds.length === 0) {
      throw new ValidationError({ audience: ["No one matches this audience. Adjust the filters and try again."] });
    }

    const sender = await this.getSenderName(ctx);
    const groupNames = Object.fromEntries(groups.map((g) => [g.id, g.name]));
    const title = input.title.trim();
    const body = input.body.trim();

    const record = await announcementRepository.create(ctx.tenantId, {
      title,
      body,
      audience,
      audienceSummary: describeAudience(audience, groupNames),
      recipientCount: memberIds.length,
      senderUserId: ctx.userId,
      senderName: sender,
    });

    await announcementRepository.deliver(ctx.tenantId, record.id, memberIds, {
      senderUserId: ctx.userId,
      senderName: sender,
      body: `📢 ${title}\n\n${body}`,
    });

    let pushDelivered = 0;
    try {
      const res = await sendFcmPushToMembers({
        targetMemberIds: memberIds,
        title: `📢 ${title}`,
        body,
        type: "announcement",
        url: "/mobile?open=messages",
        data: { type: "announcement", announcementId: record.id },
      });
      pushDelivered = res.deliveredCount ?? 0;
      if (pushDelivered > 0) await announcementRepository.setPushDelivered(ctx.tenantId, record.id, pushDelivered);
    } catch {
      // Push is best-effort: the announcement is already in every recipient's inbox.
    }

    await this.audit(ctx, "announcement.send", "announcement", record.id, undefined, {
      recipientCount: memberIds.length,
      audience: record.audienceSummary,
    });

    return { ...record, pushDelivered };
  }

  async list(ctx: TenantContext): Promise<AnnouncementRecord[]> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "announcements.send");
    const all = await announcementRepository.list(ctx.tenantId);
    // Leaders see their own sends only; admins and pastors see the whole church's.
    return ctx.role === "leader" ? all.filter((a) => a.senderUserId === ctx.userId) : all;
  }

  private async getSenderName(ctx: TenantContext): Promise<string> {
    const user = await prisma.user.findFirst({
      where: { id: ctx.userId, tenantId: ctx.tenantId },
      select: { name: true, email: true },
    });
    return user?.name?.trim() || user?.email || "Church team";
  }
}

export const announcementService = new AnnouncementService();
