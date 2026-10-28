/**
 * Announcements Repository. Tenant-scoped data access; every query filters on the
 * server-resolved tenantId.
 */

import prisma from "../prisma";
import { normalizeChurchRole } from "../../members/church-role";
import type { AudienceCandidate, AudienceSpec } from "../../announcements/audience";

export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  audience: AudienceSpec;
  audienceSummary: string;
  recipientCount: number;
  pushDelivered: number;
  senderUserId: string | null;
  senderName: string;
  createdAt: string;
}

function toRecord(r: {
  id: string;
  title: string;
  body: string;
  audience: unknown;
  audienceSummary: string;
  recipientCount: number;
  pushDelivered: number;
  senderUserId: string | null;
  senderName: string;
  createdAt: Date;
}): AnnouncementRecord {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    audience: (r.audience ?? {}) as AudienceSpec,
    audienceSummary: r.audienceSummary,
    recipientCount: r.recipientCount,
    pushDelivered: r.pushDelivered,
    senderUserId: r.senderUserId,
    senderName: r.senderName,
    createdAt: r.createdAt.toISOString(),
  };
}

export class AnnouncementRepository {
  /** Everyone an audience could reach, with the few fields the resolver needs. */
  async listCandidates(tenantId: string): Promise<AudienceCandidate[]> {
    const rows = await prisma.member.findMany({
      where: { tenantId },
      select: {
        id: true,
        status: true,
        ministry: true,
        groupId: true,
        userAccount: { select: { role: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      ministry: r.ministry ?? null,
      groupId: r.groupId ?? null,
      role: normalizeChurchRole(r.userAccount?.role),
    }));
  }

  async listGroups(tenantId: string): Promise<{ id: string; name: string; leaderId: string | null }[]> {
    return prisma.group.findMany({
      where: { tenantId, status: "active" },
      select: { id: true, name: true, leaderId: true },
      orderBy: { name: "asc" },
    });
  }

  async create(
    tenantId: string,
    data: {
      title: string;
      body: string;
      audience: AudienceSpec;
      audienceSummary: string;
      recipientCount: number;
      senderUserId: string | null;
      senderName: string;
    },
  ): Promise<AnnouncementRecord> {
    const row = await prisma.announcement.create({
      data: { tenantId, ...data, audience: data.audience as object },
    });
    return toRecord(row);
  }

  async setPushDelivered(tenantId: string, id: string, pushDelivered: number): Promise<void> {
    await prisma.announcement.updateMany({ where: { id, tenantId }, data: { pushDelivered } });
  }

  /** Writes one in-app message per recipient, in chunks, tagged with the announcement. */
  async deliver(
    tenantId: string,
    announcementId: string,
    memberIds: string[],
    message: { senderUserId: string | null; senderName: string; body: string },
  ): Promise<number> {
    let created = 0;
    for (let i = 0; i < memberIds.length; i += 500) {
      const chunk = memberIds.slice(i, i + 500);
      const res = await prisma.message.createMany({
        data: chunk.map((memberId) => ({
          tenantId,
          memberId,
          senderKind: "staff",
          senderUserId: message.senderUserId,
          senderName: message.senderName,
          body: message.body,
          channel: "in_app",
          announcementId,
        })),
      });
      created += res.count;
    }
    return created;
  }

  async list(tenantId: string, limit = 50): Promise<AnnouncementRecord[]> {
    const rows = await prisma.announcement.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }
}

export const announcementRepository = new AnnouncementRepository();
