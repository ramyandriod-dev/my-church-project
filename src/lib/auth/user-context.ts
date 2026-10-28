/**
 * User Context Resolution
 *
 * Resolves the authenticated user's full context from the database.
 * This is the bridge between JWT session and TenantContext.
 *
 * Flow:
 *   JWT Session → Database lookup → User + Tenant → TenantContext
 *
 * CRITICAL: Never trust client-supplied tenant/user/role values.
 * Always resolve server-side from the authenticated session.
 */

import prisma from "../db/prisma";
import type { TenantContext, UserRole, Permission } from "../backend/types";
import { UnauthorizedError, TenantError } from "../backend/errors";
import type { SessionPayload } from "./session";
import { ALL_PERMISSIONS } from "./permission-catalog";

// ─── Permission Definitions ──────────────────────────────────

/**
 * Permission matrix by role.
 * Higher roles inherit all permissions of lower roles.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    "members.read", "members.create", "members.update", "members.delete",
    "groups.read", "groups.create", "groups.update", "groups.delete",
    "ministries.read", "ministries.create", "ministries.update", "ministries.delete",
    "attendance.read", "attendance.checkin", "attendance.create", "attendance.update", "attendance.delete",
    "events.read", "events.create", "events.update", "events.delete",
    "followups.read", "followups.create", "followups.update", "followups.delete",
    "families.read", "families.create", "families.update", "families.delete",
    "talent.read", "talent.update",
    "ideas.read", "ideas.create", "ideas.manage",
    "messages.read", "messages.send", "announcements.send",
    "prayer_wall.read", "prayer_wall.post", "prayer_wall.moderate",
    "seating.reserve", "seating.manage",
    "shepherding.read", "shepherding.create", "shepherding.update", "shepherding.delete",
    "prayers.read", "prayers.create", "prayers.update", "prayers.delete",
    "reports.read", "reports.generate",
    "settings.read", "settings.update",
    "users.read", "users.create", "users.update", "users.delete",
    "audit.read",
    "roles.manage",
    "ai.use",
  ],
  // Admins and pastors start with full access, as the church asked; any of it
  // can be switched off per role in Settings → Access & roles.
  admin: [...ALL_PERMISSIONS],
  pastor: [...ALL_PERMISSIONS],
  leader: [
    "members.read", "members.update",
    "groups.read", "groups.update",
    "ministries.read",
    "attendance.read", "attendance.checkin", "attendance.create",
    "events.read", "events.create",
    "followups.read", "followups.create", "followups.update",
    "families.read", "families.update",
    "talent.read",
    "ideas.read", "ideas.create", "ideas.manage",
    "messages.read", "messages.send", "announcements.send",
    "prayer_wall.read", "prayer_wall.post", "prayer_wall.moderate",
    "seating.reserve", "seating.manage",
    "shepherding.read", "shepherding.update",
    "prayers.read", "prayers.create",
    "reports.read",
    "ai.use",
  ],
  // Ushers welcome people at the door: they check people in and can look up
  // members and families to do it, on top of everything a member can do.
  usher: [
    "members.read",
    "groups.read",
    "ministries.read",
    "attendance.read", "attendance.checkin", "attendance.create",
    "events.read",
    "families.read",
    "prayers.create",
    "ideas.read", "ideas.create",
    "prayer_wall.read", "prayer_wall.post",
    "seating.reserve", "seating.manage",
  ],
  // Members start with NO feature access: an admin ticks what members may do in
  // Settings → Access and roles. `messages.self` is not a feature on that screen;
  // it is the member's own conversation (the service resolves which member this is
  // from the login and rejects any other memberId), so it stays.
  member: ["messages.self"],
};

// ─── Role Hierarchy ──────────────────────────────────────────

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  pastor: 60,
  leader: 40,
  usher: 30,
  member: 20,
};

// ─── Context Resolution ──────────────────────────────────────

// In-memory cache for resolved tenant contexts to eliminate redundant DB lookups
// on rapid requests within the same Worker isolate (60s TTL).
interface CachedTenantContext {
  context: TenantContext;
  expiresAt: number;
}
const userContextCache = new Map<string, CachedTenantContext>();
const USER_CONTEXT_TTL_MS = 60_000;

export function invalidateUserContextCache(userId?: string): void {
  if (userId) {
    userContextCache.delete(userId);
  } else {
    userContextCache.clear();
  }
}

/**
 * Resolve the full TenantContext from a JWT session payload.
 *
 * This function:
 * 1. Takes the JWT payload (already verified)
 * 2. Looks up the user in the database
 * 3. Verifies the user exists, is active, and belongs to the tenant
 * 4. Resolves role-based permissions
 * 5. Returns a fully populated TenantContext
 *
 * CRITICAL: This is the ONLY way to create a TenantContext.
 * Never create TenantContext from client-supplied values.
 */
export async function resolveTenantContext(session: SessionPayload): Promise<TenantContext> {
  const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
  const now = Date.now();
  if (!isTest) {
    const cached = userContextCache.get(session.userId);
    if (cached && cached.expiresAt > now && cached.context.tenantId === session.tenantId) {
      return cached.context;
    }
  }

  // 1. Look up the user in the database
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      tenantId: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      memberId: true,
    },
  });

  // 2. Verify user exists
  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  // 3. Verify user is active
  if (!user.isActive) {
    throw new UnauthorizedError("User account is deactivated");
  }

  // 4. Verify user belongs to the claimed tenant (prevents JWT tampering)
  if (user.tenantId !== session.tenantId) {
    throw new TenantError("User does not belong to this tenant");
  }

  // 5. Verify role is valid
  const validRole = ROLE_HIERARCHY[user.role] !== undefined ? user.role : "member";

  // 6. Resolve permissions from role: the church's saved choice for this role
  // (Settings → Access & roles), or the defaults when it has not changed them.
  const { resolveRolePermissions } = await import("./role-permission-store");
  const permissions = await resolveRolePermissions(user.tenantId, validRole);

  // If the user is linked to a church member record, they also have self-service member rights
  if (user.memberId && !permissions.includes("messages.self")) {
    permissions.push("messages.self");
  }

  const tenantContext: TenantContext = {
    userId: user.id,
    tenantId: user.tenantId,
    role: validRole,
    permissions,
    email: user.email,
  };

  if (!isTest) {
    userContextCache.set(session.userId, {
      context: tenantContext,
      expiresAt: now + USER_CONTEXT_TTL_MS,
    });
  }

  return tenantContext;
}

// ─── Permission Utilities ────────────────────────────────────

/**
 * Get all permissions for a role.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return DEFAULT_ROLE_PERMISSIONS[role] ?? DEFAULT_ROLE_PERMISSIONS.member;
}

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Check if a role meets or exceeds a minimum role level.
 */
export function hasRoleLevel(role: string, minimumRole: string): boolean {
  const roleLevel = ROLE_HIERARCHY[role] ?? 0;
  const minimumLevel = ROLE_HIERARCHY[minimumRole] ?? 0;
  return roleLevel >= minimumLevel;
}

/**
 * Get the numeric level for a role.
 */
export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role] ?? 0;
}
