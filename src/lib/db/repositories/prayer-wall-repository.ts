/**
 * Prayer Wall Repository. Tenant-scoped data access; every query filters on the
 * server-resolved tenantId.
 *
 * Rows come back as `PrayerWallRow`, which still carries the author. Turning a row
 * into something the wall may show is the job of `toWallItem` in
 * `lib/prayer-wall/rules`, never of a caller picking fields.
 */

import prisma from "../prisma";
import type { PrayerWallRow } from "../../prayer-wall/rules";

/** A row plus who reviewed it, for the moderation screen only. */
export interface ModerationRow extends PrayerWallRow {
  reviewedByName: string | null;
}

type LoadedPost = {
  id: string;
  kind: string;
  body: string;
  status: string;
  authorMemberId: string;
  showName: boolean;
  author: { firstName: string; lastName: string };
  createdAt: Date;
  reviewedAt: Date | null;
  _count: { prayers: number };
  prayers?: { id: string }[];
};

function toRow(p: LoadedPost): PrayerWallRow {
  return {
    id: p.id,
    kind: p.kind,
    body: p.body,
    status: p.status,
    authorMemberId: p.authorMemberId,
    authorName: `${p.author.firstName} ${p.author.lastName}`.trim(),
    showName: p.showName,
    createdAt: p.createdAt,
    reviewedAt: p.reviewedAt,
    prayedCount: p._count.prayers,
    prayedByViewer: (p.prayers?.length ?? 0) > 0,
  };
}

const AUTHOR = { select: { firstName: true, lastName: true } } as const;

/** The `include` that loads the author, the counter and whether this login prayed. */
function withPrayers(viewerUserId: string) {
  return {
    author: AUTHOR,
    _count: { select: { prayers: true } },
    prayers: { where: { userId: viewerUserId }, select: { id: true }, take: 1 },
  } as const;
}

export class PrayerWallRepository {
  async listApproved(tenantId: string, viewerUserId: string, kind: string, limit = 100): Promise<PrayerWallRow[]> {
    const rows = await prisma.prayerWallPost.findMany({
      where: { tenantId, status: "approved", kind },
      include: withPrayers(viewerUserId),
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRow);
  }

  async listByAuthor(tenantId: string, memberId: string, viewerUserId: string): Promise<PrayerWallRow[]> {
    const rows = await prisma.prayerWallPost.findMany({
      where: { tenantId, authorMemberId: memberId, status: { not: "archived" } },
      include: withPrayers(viewerUserId),
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map(toRow);
  }

  async listForModeration(
    tenantId: string,
    status: string,
    viewerUserId: string,
    limit = 200,
  ): Promise<ModerationRow[]> {
    const rows = await prisma.prayerWallPost.findMany({
      where: { tenantId, status },
      include: {
        ...withPrayers(viewerUserId),
        reviewedBy: { select: { name: true, email: true } },
      },
      // The queue is answered oldest first; history reads newest first.
      orderBy: { createdAt: status === "pending" ? "asc" : "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      ...toRow(r),
      reviewedByName: r.reviewedBy ? r.reviewedBy.name?.trim() || r.reviewedBy.email : null,
    }));
  }

  async countByStatus(tenantId: string): Promise<Record<string, number>> {
    const groups = await prisma.prayerWallPost.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true },
    });
    return Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
  }

  async countPendingByAuthor(tenantId: string, memberId: string): Promise<number> {
    return prisma.prayerWallPost.count({
      where: { tenantId, authorMemberId: memberId, status: "pending" },
    });
  }

  async getById(tenantId: string, id: string, viewerUserId: string): Promise<PrayerWallRow | null> {
    const row = await prisma.prayerWallPost.findFirst({
      where: { id, tenantId },
      include: withPrayers(viewerUserId),
    });
    return row ? toRow(row) : null;
  }

  async create(
    tenantId: string,
    data: { authorMemberId: string; kind: string; body: string; showName: boolean },
  ): Promise<PrayerWallRow> {
    const row = await prisma.prayerWallPost.create({
      data: { tenantId, ...data },
      include: { author: AUTHOR, _count: { select: { prayers: true } } },
    });
    return toRow(row);
  }

  async setStatus(tenantId: string, id: string, status: string, reviewerUserId: string): Promise<void> {
    await prisma.prayerWallPost.updateMany({
      where: { id, tenantId },
      data: { status, reviewedByUserId: reviewerUserId, reviewedAt: new Date() },
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await prisma.prayerWallPost.deleteMany({ where: { id, tenantId } });
  }

  /** Idempotent: praying twice for the same prayer still counts once. */
  async addPrayer(tenantId: string, postId: string, userId: string): Promise<void> {
    await prisma.prayerWallPrayer.upsert({
      where: { postId_userId: { postId, userId } },
      create: { tenantId, postId, userId },
      update: {},
    });
  }

  async removePrayer(tenantId: string, postId: string, userId: string): Promise<void> {
    await prisma.prayerWallPrayer.deleteMany({ where: { tenantId, postId, userId } });
  }

  async countPrayers(postId: string): Promise<number> {
    return prisma.prayerWallPrayer.count({ where: { postId } });
  }
}

export const prayerWallRepository = new PrayerWallRepository();
