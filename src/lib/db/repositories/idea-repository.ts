/**
 * Ideas Repository
 *
 * Tenant-scoped data access for the Ideas Bank. The IdeaService calls this
 * repository; the repository calls Prisma. Route handlers never touch Prisma
 * directly.
 *
 * CRITICAL SECURITY RULES:
 *
 * 1. Tenant isolation. Every query filters on tenantId, always the
 *    server-resolved tenant.
 *
 * 2. Internal notes. Staff-only working notes must never reach a member who
 *    submitted the idea. `internalNotes` is a parameter of the projection, not a
 *    field of the mapper: if `includeInternalNotes` is false the value is not
 *    selected at all, so it cannot be leaked by a forgotten UI check.
 */

import prisma from "../prisma";
import {
  IDEA_STATUS_TRANSITIONS,
  type Idea,
  type IdeaCategory,
  type IdeaStatus,
  type IdeaStats,
} from "../../backend/types";

export interface IdeaListFilter {
  search?: string;
  category?: IdeaCategory;
  status?: IdeaStatus | IdeaStatus[];
  submittedByMemberId?: string;
  page?: number;
  limit?: number;
}

export interface CreateIdeaRecordInput {
  submittedByMemberId: string;
  title: string;
  description: string;
  category: IdeaCategory;
  categoryOther?: string | null;
}

export interface UpdateIdeaRecordInput {
  title?: string;
  description?: string;
  category?: IdeaCategory;
  categoryOther?: string | null;
}

// ─── Mappers ─────────────────────────────────────────────────

/**
 * Project an Idea row.
 *
 * `internalNotes` is omitted from the returned object when not requested, so a
 * caller's payload is structurally incapable of carrying staff notes. `ownerName`
 * is resolved from the owner login because an idea should stay readable after
 * that account is removed.
 */
function mapIdea(raw: any, includeInternalNotes: boolean): Idea {
  const status = raw.status as IdeaStatus;

  return {
    id: raw.id,
    tenantId: raw.tenantId,
    submittedByMemberId: raw.submittedByMemberId,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    categoryOther: raw.categoryOther ?? null,
    status,
    ...(includeInternalNotes ? { internalNotes: raw.internalNotes ?? null } : {}),
    ownerId: raw.ownerId ?? null,
    ownerName: raw.owner?.name ?? null,
    statusChangedAt: raw.statusChangedAt ? new Date(raw.statusChangedAt).toISOString() : null,
    statusChangedById: raw.statusChangedById ?? null,
    implementedAt: raw.implementedAt ? new Date(raw.implementedAt).toISOString() : null,
    createdAt: new Date(raw.createdAt).toISOString(),
    updatedAt: new Date(raw.updatedAt).toISOString(),
    submitter: raw.submittedBy
      ? {
          id: raw.submittedBy.id,
          firstName: raw.submittedBy.firstName,
          lastName: raw.submittedBy.lastName,
          avatarUrl: raw.submittedBy.avatarUrl ?? null,
        }
      : null,
    allowedTransitions: [...(IDEA_STATUS_TRANSITIONS[status] ?? [])],
  };
}

/**
 * The exact column set an Idea read is allowed to fetch.
 *
 * Written with `select` rather than `include` on purpose: `include` always
 * returns every scalar column, so it would fetch `internalNotes` even when the
 * caller is a member and must not see it. Naming the scalars makes the omission
 * structural, and lets `internalNotes` be the one field that appears only when
 * requested.
 */
function ideaSelect(includeInternalNotes: boolean) {
  return {
    id: true,
    tenantId: true,
    submittedByMemberId: true,
    title: true,
    description: true,
    category: true,
    categoryOther: true,
    status: true,
    ...(includeInternalNotes ? { internalNotes: true } : {}),
    ownerId: true,
    statusChangedAt: true,
    statusChangedById: true,
    implementedAt: true,
    createdAt: true,
    updatedAt: true,
    submittedBy: {
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    },
    owner: { select: { id: true, name: true } },
  } as const;
}

// ─── Query builder ───────────────────────────────────────────

function buildWhere(tenantId: string, filter: IdeaListFilter): any {
  const where: any = { tenantId };

  if (filter.category) where.category = filter.category;
  if (filter.status) {
    where.status = Array.isArray(filter.status) ? { in: filter.status } : filter.status;
  }
  if (filter.submittedByMemberId) {
    where.submittedByMemberId = filter.submittedByMemberId;
  }
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: "insensitive" } },
      { description: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  return where;
}

// ─── Repository ──────────────────────────────────────────────

class IdeaRepository {
  async listForTenant(
    tenantId: string,
    filter: IdeaListFilter,
    includeInternalNotes: boolean,
  ): Promise<{ items: Idea[]; total: number }> {
    const where = buildWhere(tenantId, filter);
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      prisma.idea.findMany({
        where,
        select: ideaSelect(includeInternalNotes),
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.idea.count({ where }),
    ]);

    return { items: rows.map((r) => mapIdea(r, includeInternalNotes)), total };
  }

  async getById(tenantId: string, id: string, includeInternalNotes: boolean): Promise<Idea | null> {
    const raw = await prisma.idea.findFirst({
      where: { tenantId, id },
      select: ideaSelect(includeInternalNotes),
    });
    return raw ? mapIdea(raw, includeInternalNotes) : null;
  }

  async create(tenantId: string, input: CreateIdeaRecordInput): Promise<Idea> {
    const raw = await prisma.idea.create({
      data: {
        tenantId,
        submittedByMemberId: input.submittedByMemberId,
        title: input.title,
        description: input.description,
        category: input.category,
        // Only persisted for a custom category, so the column never holds a
        // meaningless leftover.
        categoryOther: input.category === "other" ? (input.categoryOther ?? null) : null,
        status: "new",
      },
      select: ideaSelect(false),
    });
    return mapIdea(raw, false);
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateIdeaRecordInput,
  ): Promise<Idea | null> {
    const existing = await prisma.idea.findFirst({ where: { tenantId, id } });
    if (!existing) return null;

    const data: any = {};
    for (const key of ["title", "description"] as const) {
      if (input[key] !== undefined) data[key] = input[key];
    }
    if (input.category !== undefined) {
      data.category = input.category;
      // Re-derive this whenever the category changes, otherwise switching away
      // from "other" would leave a stale custom label attached.
      data.categoryOther = input.category === "other" ? (input.categoryOther ?? null) : null;
    } else if (input.categoryOther !== undefined) {
      data.categoryOther = existing.category === "other" ? input.categoryOther : null;
    }

    const raw = await prisma.idea.update({ where: { id }, data, select: ideaSelect(false) });
    return mapIdea(raw, false);
  }

  /**
   * Apply a workflow change.
   *
   * The transition is validated here against the row that was just read, so the
   * check and the write are decided from one consistent state rather than from a
   * status the client may have already seen change.
   *
   * `implementedAt` is derived from the status rather than accepted from the
   * client: an idea is stamped on the transition into Implemented and the stamp
   * is cleared if the idea later moves back, so the field cannot disagree with
   * the status it is supposed to record.
   */
  async applyWorkflowChange(
    tenantId: string,
    id: string,
    change: {
      status?: IdeaStatus;
      internalNotes?: string | null;
      ownerId?: string | null;
    },
    changedByUserId: string,
  ): Promise<Idea | null> {
    const existing = await prisma.idea.findFirst({ where: { tenantId, id } });
    if (!existing) return null;

    const data: any = {};

    if (change.status !== undefined && change.status !== existing.status) {
      const allowed = IDEA_STATUS_TRANSITIONS[existing.status as IdeaStatus] ?? [];
      if (!allowed.includes(change.status)) return null;
      data.status = change.status;
      data.statusChangedAt = new Date();
      data.statusChangedById = changedByUserId;
      data.implementedAt = change.status === "implemented" ? new Date() : null;
    }
    if (change.internalNotes !== undefined) data.internalNotes = change.internalNotes;
    if (change.ownerId !== undefined) data.ownerId = change.ownerId;

    const raw = await prisma.idea.update({
      where: { id },
      data,
      select: ideaSelect(true),
    });
    return mapIdea(raw, true);
  }

  async getStats(tenantId: string): Promise<IdeaStats> {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [total, byStatusRows, byCategoryRows, submittedThisMonth] = await Promise.all([
      prisma.idea.count({ where: { tenantId } }),
      prisma.idea.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { _all: true },
      }),
      prisma.idea.groupBy({
        by: ["category"],
        where: { tenantId },
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
      }),
      prisma.idea.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
    ]);

    const byStatus = {
      new: 0,
      under_review: 0,
      planned: 0,
      implemented: 0,
      declined: 0,
    } as Record<IdeaStatus, number>;
    for (const row of byStatusRows as any[]) {
      const key = row.status as IdeaStatus;
      if (key in byStatus) byStatus[key] = row._count._all;
    }

    return {
      total,
      byStatus,
      byCategory: (byCategoryRows as any[]).map((r) => ({
        category: r.category,
        count: r._count._all,
      })),
      submittedThisMonth,
    };
  }

  /** How many ideas each member has submitted, for the dashboard and Member 360. */
  async countByMember(tenantId: string, memberIds: string[]): Promise<Map<string, number>> {
    if (memberIds.length === 0) return new Map();
    const rows: any = await prisma.idea.groupBy({
      by: ["submittedByMemberId"],
      where: { tenantId, submittedByMemberId: { in: memberIds } },
      _count: { _all: true },
    });
    return new Map((rows as any[]).map((r: any) => [r.submittedByMemberId, r._count._all]));
  }
}

export const ideaRepository = new IdeaRepository();
export { buildWhere as buildIdeaWhere, mapIdea };
