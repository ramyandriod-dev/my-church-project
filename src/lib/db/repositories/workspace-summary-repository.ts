/**
 * Workspace Summary Repository. The few counts the top bar and the dashboard
 * banner show: the live service, and what is waiting for staff. Every query is
 * tenant-scoped.
 */

import prisma from "../prisma";

/** How long after its start a service without an end time still counts as live. */
const DEFAULT_SERVICE_HOURS = 3;

export interface LiveServiceRow {
  id: string;
  name: string;
  checkedIn: number;
}

export class WorkspaceSummaryRepository {
  /**
   * The service happening right now, or null. "Now" means marked live, or the
   * clock is between its start and end (start + 3 hours when no end is set).
   */
  async findLiveService(tenantId: string, now: Date): Promise<LiveServiceRow | null> {
    const earliestStart = new Date(now.getTime() - DEFAULT_SERVICE_HOURS * 3600_000);
    const candidates = await prisma.service.findMany({
      where: {
        tenantId,
        status: { notIn: ["cancelled", "completed"] },
        OR: [{ status: "live" }, { startTime: { lte: now, gte: earliestStart } }, { startTime: { lte: now }, endTime: { gte: now } }],
      },
      orderBy: { startTime: "desc" },
      take: 5,
    });
    const live =
      candidates.find((s) => s.status === "live") ??
      candidates.find((s) => {
        const end = s.endTime ?? new Date(s.startTime.getTime() + DEFAULT_SERVICE_HOURS * 3600_000);
        return s.startTime <= now && now <= end;
      });
    if (!live) return null;

    const checkedIn = await prisma.attendanceRecord.count({ where: { tenantId, serviceId: live.id } });
    return { id: live.id, name: live.name, checkedIn };
  }

  async countPendingPrayers(tenantId: string): Promise<number> {
    return prisma.prayerWallPost.count({ where: { tenantId, status: "pending" } });
  }

  /** Open follow-ups due by the end of today, including overdue ones. */
  async countFollowUpsDue(tenantId: string, now: Date): Promise<number> {
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return prisma.followUp.count({
      where: { tenantId, status: { in: ["open", "in_progress", "pending"] }, dueDate: { lte: endOfDay } },
    });
  }

  async countPendingRoleRequests(tenantId: string): Promise<number> {
    try {
      return await prisma.roleRequest.count({ where: { tenantId, status: "pending" } });
    } catch (err) {
      // The table arrives with `npm run db:apply`; until then there are none.
      if ((err as { code?: string })?.code === "P2021") return 0;
      throw err;
    }
  }

  async countNewMembers(tenantId: string, since: Date): Promise<number> {
    return prisma.member.count({ where: { tenantId, createdAt: { gte: since } } });
  }
}

export const workspaceSummaryRepository = new WorkspaceSummaryRepository();
