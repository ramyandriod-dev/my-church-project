/**
 * Authorization Utilities
 *
 * Role-based access control and tenant isolation.
 * Enforced server-side — never rely on frontend visibility.
 *
 * IMPORTANT: The `createTenantContext` function is DEPRECATED.
 * Use `requireAuth()` from "@/lib/auth" instead.
 * This file only contains authorization checks, not authentication.
 */

import { ForbiddenError, TenantError } from "./errors";
import type { TenantContext, UserRole } from "./types";

// ─── Role Hierarchy ──────────────────────────────────────────

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  pastor: 60,
  leader: 40,
  usher: 30,
  member: 20,
};

// ─── Permission Checks ───────────────────────────────────────

/**
 * Require the user to have at least the specified role.
 */
export function requireRole(ctx: TenantContext, minimumRole: string) {
  const userLevel = ROLE_HIERARCHY[ctx.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

  if (userLevel < requiredLevel) {
    throw new ForbiddenError(
      `This action requires ${minimumRole} role or higher`
    );
  }
}

/**
 * Require the user to be a super admin.
 */
export function requireSuperAdmin(ctx: TenantContext) {
  requireRole(ctx, "super_admin");
}

/**
 * Require the user to be an admin or pastor.
 */
export function requireAdmin(ctx: TenantContext) {
  requireRole(ctx, "admin");
}

/**
 * Require the user to be a pastor or higher.
 */
export function requirePastor(ctx: TenantContext) {
  requireRole(ctx, "pastor");
}

/**
 * Require the user to be a leader or higher.
 */
export function requireLeader(ctx: TenantContext) {
  requireRole(ctx, "leader");
}

// ─── Permission-Based Checks ─────────────────────────────────

/**
 * Require a specific permission.
 */
export function requirePermission(ctx: TenantContext, permission: string) {
  if (!ctx.permissions || !ctx.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing required permission: ${permission}`);
  }
}

/**
 * Require one of several permissions (OR logic).
 */
export function requireAnyPermission(ctx: TenantContext, permissions: string[]) {
  if (!ctx.permissions) {
    throw new ForbiddenError(`Missing required permission: one of ${permissions.join(", ")}`);
  }
  const hasAny = permissions.some((p) => ctx.permissions.includes(p));
  if (!hasAny) {
    throw new ForbiddenError(`Missing required permission: one of ${permissions.join(", ")}`);
  }
}

/**
 * Require all of several permissions (AND logic).
 */
export function requireAllPermissions(ctx: TenantContext, permissions: string[]) {
  if (!ctx.permissions) {
    throw new ForbiddenError(`Missing required permissions: ${permissions.join(", ")}`);
  }
  const hasAll = permissions.every((p) => ctx.permissions.includes(p));
  if (!hasAll) {
    throw new ForbiddenError(`Missing required permissions: ${permissions.join(", ")}`);
  }
}

/**
 * Check if the context has a specific permission (non-throwing).
 */
export function hasPermission(ctx: TenantContext, permission: string): boolean {
  return ctx.permissions?.includes(permission) ?? false;
}

// ─── Tenant Isolation ────────────────────────────────────────

/**
 * Validate that a tenant context exists and is valid.
 */
export function validateTenantContext(ctx: TenantContext | null): TenantContext {
  if (!ctx || !ctx.tenantId || !ctx.userId) {
    throw new TenantError("Valid tenant context is required");
  }
  return ctx;
}

// ─── Resource Ownership ──────────────────────────────────────

/**
 * Check if a user owns a resource or has admin/pastor privileges.
 * Used for member self-service (e.g., member updating their own profile).
 */
export function requireOwnershipOrRole(
  ctx: TenantContext,
  resourceOwnerId: string,
  minimumRole: string = "admin"
) {
  if (ctx.userId === resourceOwnerId) return;

  const userLevel = ROLE_HIERARCHY[ctx.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

  if (userLevel < requiredLevel) {
    throw new ForbiddenError("You can only modify your own resources");
  }
}

/**
 * Get the numeric level for a role.
 */
export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role] ?? 0;
}
