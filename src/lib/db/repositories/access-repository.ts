/**
 * Access Repository. Role permissions, logins' roles, and role requests.
 * Tenant-scoped data access; every query filters on the server-resolved tenantId.
 */

import prisma from "../prisma";
import type { Permission } from "../../backend/types";

export interface AccessUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  memberId: string | null;
  lastLoginAt: string | null;
}

export interface RoleRequestRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: string;
  requestedRole: string;
  note: string | null;
  status: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

type RequestWithUsers = {
  id: string;
  userId: string;
  requestedRole: string;
  note: string | null;
  status: string;
  reviewedAt: Date | null;
  createdAt: Date;
  user: { name: string; email: string; role: string };
  reviewedBy: { name: string; email: string } | null;
};

function toRequestRow(r: RequestWithUsers): RoleRequestRow {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    currentRole: r.user.role,
    requestedRole: r.requestedRole,
    note: r.note,
    status: r.status,
    reviewedByName: r.reviewedBy ? r.reviewedBy.name || r.reviewedBy.email : null,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

const REQUEST_INCLUDE = {
  user: { select: { name: true, email: true, role: true } },
  reviewedBy: { select: { name: true, email: true } },
} as const;

export class AccessRepository {
  // ─── Role permissions ──────────────────────────────────────

  async saveRolePermissions(tenantId: string, role: string, permissions: Permission[], userId: string): Promise<void> {
    await prisma.rolePermission.upsert({
      where: { tenantId_role: { tenantId, role } },
      create: { tenantId, role, permissions, updatedByUserId: userId },
      update: { permissions, updatedByUserId: userId },
    });
  }

  async resetRolePermissions(tenantId: string, role: string): Promise<void> {
    await prisma.rolePermission.deleteMany({ where: { tenantId, role } });
  }

  // ─── Logins ────────────────────────────────────────────────

  async listUsers(tenantId: string, search?: string): Promise<AccessUserRow[]> {
    const q = search?.trim();
    const rows = await prisma.user.findMany({
      where: {
        tenantId,
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, memberId: true, lastLoginAt: true },
      // Staff first, so the people who matter here are on screen without searching.
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 60,
    });
    return rows.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null }));
  }

  async getUser(tenantId: string, id: string): Promise<{ id: string; role: string; name: string } | null> {
    return prisma.user.findFirst({ where: { id, tenantId }, select: { id: true, role: true, name: true } });
  }

  async setUserRole(tenantId: string, id: string, role: string): Promise<void> {
    await prisma.user.updateMany({ where: { id, tenantId }, data: { role } });
  }

  // ─── Role requests ─────────────────────────────────────────

  /** One open request per person: a new one replaces an older pending one. */
  async createRequest(tenantId: string, userId: string, requestedRole: string, note: string | null): Promise<RoleRequestRow> {
    await prisma.roleRequest.updateMany({
      where: { tenantId, userId, status: "pending" },
      data: { status: "cancelled" },
    });
    const row = await prisma.roleRequest.create({
      data: { tenantId, userId, requestedRole, note },
      include: REQUEST_INCLUDE,
    });
    return toRequestRow(row);
  }

  async latestForUser(tenantId: string, userId: string): Promise<RoleRequestRow | null> {
    const row = await prisma.roleRequest.findFirst({
      where: { tenantId, userId, status: { not: "cancelled" } },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return row ? toRequestRow(row) : null;
  }

  async listRequests(tenantId: string, status: string): Promise<RoleRequestRow[]> {
    const rows = await prisma.roleRequest.findMany({
      where: { tenantId, status },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: status === "pending" ? "asc" : "desc" },
      take: 100,
    });
    return rows.map(toRequestRow);
  }

  async countPending(tenantId: string): Promise<number> {
    return prisma.roleRequest.count({ where: { tenantId, status: "pending" } });
  }

  async getRequest(tenantId: string, id: string): Promise<RoleRequestRow | null> {
    const row = await prisma.roleRequest.findFirst({ where: { id, tenantId }, include: REQUEST_INCLUDE });
    return row ? toRequestRow(row) : null;
  }

  async closeRequest(tenantId: string, id: string, status: "approved" | "rejected", reviewerId: string): Promise<void> {
    await prisma.roleRequest.updateMany({
      where: { id, tenantId, status: "pending" },
      data: { status, reviewedByUserId: reviewerId, reviewedAt: new Date() },
    });
  }
}

export const accessRepository = new AccessRepository();
