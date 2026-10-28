/**
 * Role permission store
 *
 * Which permissions each role has in a church: the saved choice from Settings →
 * Access & roles when there is one, otherwise the code defaults. Read on every
 * request (through resolveTenantContext), so it is cached per tenant for 60
 * seconds; a save clears the cache in the isolate that made it, and other
 * isolates catch up within the minute.
 *
 * `super_admin` is never read from the database: it always has everything, so
 * nobody can lock the church out of its own settings.
 */

import prisma from "../db/prisma";
import type { Permission, UserRole } from "../backend/types";
import { DEFAULT_ROLE_PERMISSIONS } from "./user-context";
import { ALL_PERMISSIONS, isKnownPermission } from "./permission-catalog";

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; overrides: Map<string, Permission[]> }>();

export function invalidateRolePermissionCache(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}

/** Saved per-role choices for a tenant. Empty when nothing has been changed. */
export async function loadRolePermissionOverrides(tenantId: string): Promise<Map<string, Permission[]>> {
  const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
  const hit = cache.get(tenantId);
  if (!isTest && hit && Date.now() - hit.at < TTL_MS) return hit.overrides;

  let rows: { role: string; permissions: unknown }[] = [];
  try {
    rows = await prisma.rolePermission.findMany({ where: { tenantId }, select: { role: true, permissions: true } });
  } catch (err) {
    // Before `npm run db:apply` has added the table, behave as if nothing was
    // customised rather than failing every sign-in. Any other error is real.
    if ((err as { code?: string })?.code !== "P2021") throw err;
  }

  const overrides = new Map<string, Permission[]>();
  for (const r of rows ?? []) {
    const list = Array.isArray(r.permissions) ? r.permissions.filter((p): p is Permission => typeof p === "string" && isKnownPermission(p)) : [];
    overrides.set(r.role, list);
  }
  if (!isTest) cache.set(tenantId, { at: Date.now(), overrides });
  return overrides;
}

export function defaultPermissionsFor(role: string): Permission[] {
  if (role === "super_admin") return [...ALL_PERMISSIONS];
  return [...(DEFAULT_ROLE_PERMISSIONS[role as UserRole] ?? DEFAULT_ROLE_PERMISSIONS.member)];
}

/** The permissions a role has in this church right now. */
export async function resolveRolePermissions(tenantId: string, role: string): Promise<Permission[]> {
  if (role === "super_admin") return defaultPermissionsFor(role);
  const overrides = await loadRolePermissionOverrides(tenantId);
  const saved = overrides.get(role);
  if (!saved) return defaultPermissionsFor(role);
  // `messages.self` is not on the settings screen (it is the member's own
  // conversation, not a role choice), so a saved list never contains it. Keep
  // it for any role that has it by default rather than silently dropping it.
  const keep = defaultPermissionsFor(role).filter((p) => p === "messages.self");
  return Array.from(new Set([...saved, ...keep]));
}
