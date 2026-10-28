/**
 * Follow-Up Repository
 *
 * Tenant-scoped data access for the follow-up and pastoral care domain.
 * The FollowUpService calls this repository; repositories call Prisma.
 * Route handlers never touch Prisma directly.
 *
 * CRITICAL SECURITY RULE (tenant isolation):
 * Every query includes tenantId and resolves objects ONLY within the
 * authenticated tenant. No query ever reads across tenants.
 */

import prisma from "../prisma";
import type {
  FollowUp,
  FollowUpActivity,
  FollowUpStats,
  FollowUpStatus,
  FollowUpPriority,
  FollowUpType,
  FollowUpContactType,
} from "../../backend/types";

export interface ListFollowUpsFilter {
  status?: string;
  priority?: string;
  type?: string;
  assignedTo?: string;
  memberId?: string;
  /**
   * Restrict to several members at once, tenant-scoped. Used by the family
   * domain to read the open follow-ups of a whole household in one query
   * without duplicating any follow-up logic.
   */
  memberIds?: string[];
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateFollowUpInput {
  memberId: string;
  assignedTo?: string;
  type?: FollowUpType;
  reason: string;
  notes?: string;
  priority?: FollowUpPriority;
  status?: FollowUpStatus;
  dueDate?: Date | null;
  nextAction?: string | null;
}

export interface UpdateFollowUpInput {
  assignedTo?: string | null;
  reason?: string;
  notes?: string;
  priority?: FollowUpPriority;
  status?: FollowUpStatus;
  dueDate?: Date | null;
  nextAction?: string | null;
  lastContact?: Date | null;
  completedAt?: Date | null;
}

export interface AddActivityInput {
  contactType: FollowUpContactType;
  notes: string;
  contactDate?: Date;
  createdById: string;
}

function mapPrismaFollowUp(raw: any): FollowUp {
  const memberName = raw.member
    ? `${raw.member.firstName} ${raw.member.lastName}`.trim()
    : undefined;

  const activities: FollowUpActivity[] = (raw.activities || []).map((act: any) => ({
    id: act.id,
    tenantId: act.tenantId,
    followUpId: act.followUpId,
    contactType: act.contactType as FollowUpContactType,
    notes: act.notes,
    contactDate: act.contactDate ? new Date(act.contactDate).toISOString() : new Date().toISOString(),
    createdById: act.createdById,
    createdByName: act.createdBy ? act.createdBy.name : undefined,
    createdAt: act.createdAt ? new Date(act.createdAt).toISOString() : new Date().toISOString(),
  }));

  // Normalize legacy status 'pending' -> 'open'
  const normalizedStatus = (raw.status === "pending" ? "open" : raw.status) as FollowUpStatus;

  return {
    id: raw.id,
    tenantId: raw.tenantId,
    memberId: raw.memberId,
    memberName,
    memberAvatar: raw.member?.avatarUrl ?? undefined,
    assignedTo: raw.assignedTo ?? undefined,
    assignedToName: raw.assignee ? raw.assignee.name : undefined,
    type: (raw.type ?? "general") as FollowUpType,
    reason: raw.reason,
    notes: raw.notes ?? undefined,
    priority: (raw.priority ?? "medium") as FollowUpPriority,
    status: normalizedStatus,
    dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString() : undefined,
    completedAt: raw.completedAt ? new Date(raw.completedAt).toISOString() : undefined,
    lastContact: raw.lastContact ? new Date(raw.lastContact).toISOString() : undefined,
    nextAction: raw.nextAction ?? undefined,
    activities,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export const followUpRepository = {
  /**
   * Find a single follow-up for a tenant by id.
   */
  async findForTenant(tenantId: string, id: string): Promise<FollowUp | null> {
    const raw = await prisma.followUp.findFirst({
      where: { id, tenantId },
      include: {
        member: true,
        assignee: true,
        activities: {
          include: { createdBy: true },
          orderBy: { contactDate: "desc" },
        },
      },
    });

    if (!raw) return null;
    return mapPrismaFollowUp(raw);
  },

  /**
   * List follow-ups with tenant-scoped filtering and search.
   */
  async listForTenant(
    tenantId: string,
    filter: ListFollowUpsFilter = {}
  ): Promise<{ items: FollowUp[]; total: number }> {
    const where: any = { tenantId };

    if (filter.status && filter.status !== "all" && filter.status !== "All") {
      const s = filter.status.toLowerCase().replace(" ", "_").replace("-", "_");
      if (s === "open") {
        where.status = { in: ["open", "pending"] };
      } else {
        where.status = s;
      }
    }

    if (filter.priority && filter.priority !== "all" && filter.priority !== "All") {
      where.priority = filter.priority.toLowerCase();
    }

    if (filter.type && filter.type !== "all" && filter.type !== "All") {
      where.type = filter.type.toLowerCase();
    }

    if (filter.assignedTo && filter.assignedTo !== "all") {
      where.assignedTo = filter.assignedTo;
    }

    if (filter.memberId) {
      where.memberId = filter.memberId;
    }

    if (filter.memberIds && filter.memberIds.length > 0) {
      where.memberId = { in: filter.memberIds };
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { reason: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        {
          member: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          member: true,
          assignee: true,
          activities: {
            include: { createdBy: true },
            orderBy: { contactDate: "desc" },
            take: 3,
          },
        },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.followUp.count({ where }),
    ]);

    return {
      items: items.map(mapPrismaFollowUp),
      total,
    };
  },

  /**
   * Find an existing open or in-progress follow-up for a member and situation.
   * Used for duplicate prevention.
   */
  async findOpenByMemberAndSituation(
    tenantId: string,
    memberId: string,
    reasonHint?: string
  ): Promise<FollowUp | null> {
    const where: any = {
      tenantId,
      memberId,
      status: { in: ["open", "in_progress", "pending"] },
    };

    if (reasonHint && reasonHint.trim()) {
      const q = reasonHint.trim();
      where.reason = { contains: q, mode: "insensitive" };
    }

    const raw = await prisma.followUp.findFirst({
      where,
      include: {
        member: true,
        assignee: true,
        activities: {
          include: { createdBy: true },
          orderBy: { contactDate: "desc" },
        },
      },
    });

    if (!raw) return null;
    return mapPrismaFollowUp(raw);
  },

  /**
   * Create a new follow-up.
   */
  async create(tenantId: string, input: CreateFollowUpInput): Promise<FollowUp> {
    const created = await prisma.followUp.create({
      data: {
        tenantId,
        memberId: input.memberId,
        assignedTo: input.assignedTo ?? null,
        type: input.type ?? "general",
        reason: input.reason,
        notes: input.notes ?? null,
        priority: input.priority ?? "medium",
        status: input.status ?? "open",
        dueDate: input.dueDate ?? null,
        nextAction: input.nextAction ?? null,
      },
      include: {
        member: true,
        assignee: true,
        activities: true,
      },
    });

    return mapPrismaFollowUp(created);
  },

  /**
   * Update an existing follow-up.
   */
  async update(tenantId: string, id: string, input: UpdateFollowUpInput): Promise<FollowUp | null> {
    const existing = await prisma.followUp.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return null;

    const data: any = {};
    if (input.assignedTo !== undefined) data.assignedTo = input.assignedTo;
    if (input.reason !== undefined) data.reason = input.reason;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === "completed" && !existing.completedAt) {
        data.completedAt = input.completedAt ?? new Date();
      } else if (input.status !== "completed") {
        data.completedAt = null;
      }
    }
    if (input.dueDate !== undefined) data.dueDate = input.dueDate;
    if (input.nextAction !== undefined) data.nextAction = input.nextAction;
    if (input.lastContact !== undefined) data.lastContact = input.lastContact;
    if (input.completedAt !== undefined) data.completedAt = input.completedAt;

    const updated = await prisma.followUp.update({
      where: { id },
      data,
      include: {
        member: true,
        assignee: true,
        activities: {
          include: { createdBy: true },
          orderBy: { contactDate: "desc" },
        },
      },
    });

    return mapPrismaFollowUp(updated);
  },

  /**
   * Record a contact activity and update the follow-up's lastContact timestamp.
   * If the follow-up is currently 'open' or 'pending', auto-transitions to 'in_progress'.
   */
  async addActivity(
    tenantId: string,
    followUpId: string,
    input: AddActivityInput
  ): Promise<{ activity: FollowUpActivity; followUp: FollowUp }> {
    const contactDate = input.contactDate ?? new Date();

    const activity = await prisma.followUpActivity.create({
      data: {
        tenantId,
        followUpId,
        contactType: input.contactType,
        notes: input.notes,
        contactDate,
        createdById: input.createdById,
      },
      include: {
        createdBy: true,
      },
    });

    // Update parent follow-up
    const existing = await prisma.followUp.findFirst({
      where: { id: followUpId, tenantId },
    });

    const updateData: any = {
      lastContact: contactDate,
    };

    if (existing && (existing.status === "open" || existing.status === "pending")) {
      updateData.status = "in_progress";
    }

    const updatedFollowUp = await prisma.followUp.update({
      where: { id: followUpId },
      data: updateData,
      include: {
        member: true,
        assignee: true,
        activities: {
          include: { createdBy: true },
          orderBy: { contactDate: "desc" },
        },
      },
    });

    const mappedActivity: FollowUpActivity = {
      id: activity.id,
      tenantId: activity.tenantId,
      followUpId: activity.followUpId,
      contactType: activity.contactType as FollowUpContactType,
      notes: activity.notes,
      contactDate: new Date(activity.contactDate).toISOString(),
      createdById: activity.createdById,
      createdByName: activity.createdBy ? activity.createdBy.name : undefined,
      createdAt: new Date(activity.createdAt).toISOString(),
    };

    return {
      activity: mappedActivity,
      followUp: mapPrismaFollowUp(updatedFollowUp),
    };
  },

  /**
   * Compute workflow KPIs for follow-up dashboard.
   */
  async getStats(tenantId: string, now: Date = new Date()): Promise<FollowUpStats> {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const [openCount, inProgressCount, dueTodayCount, overdueCount, completedThisWeekCount, totalCount] =
      await Promise.all([
        // Open
        prisma.followUp.count({
          where: { tenantId, status: { in: ["open", "pending"] } },
        }),
        // In Progress
        prisma.followUp.count({
          where: { tenantId, status: "in_progress" },
        }),
        // Due Today
        prisma.followUp.count({
          where: {
            tenantId,
            status: { in: ["open", "in_progress", "pending"] },
            dueDate: { gte: todayStart, lte: todayEnd },
          },
        }),
        // Overdue
        prisma.followUp.count({
          where: {
            tenantId,
            status: { in: ["open", "in_progress", "pending"] },
            dueDate: { lt: todayStart },
          },
        }),
        // Completed This Week
        prisma.followUp.count({
          where: {
            tenantId,
            status: "completed",
            completedAt: { gte: weekAgo },
          },
        }),
        // Total
        prisma.followUp.count({
          where: { tenantId },
        }),
      ]);

    return {
      open: openCount,
      inProgress: inProgressCount,
      dueToday: dueTodayCount,
      overdue: overdueCount,
      completedThisWeek: completedThisWeekCount,
      total: totalCount,
    };
  },
};
