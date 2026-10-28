/**
 * Authentication Enforcement
 *
 * Provides functions to ensure requests are authenticated.
 * These are the security gatekeepers for all protected routes.
 *
 * Usage in API routes:
 *   const ctx = await requireAuth(request);
 *   // ctx is guaranteed to be a valid TenantContext
 */

import type { NextRequest } from "next/server";
import type { TenantContext, Permission } from "../backend/types";
import { UnauthorizedError, ForbiddenError } from "../backend/errors";
import {
  verifySession,
  verifySessionIsLive,
  extractBearerToken,
  touchSession,
  type SessionPayload,
} from "./session";
import { resolveTenantContext } from "./user-context";
import prisma from "../db/prisma";

// ─── Development Bypass ──────────────────────────────────────

/**
 * In development mode, allow bypassing authentication via headers.
 * This is ONLY for local development and testing.
 * NEVER enabled in production.
 */
function getDevBypassCredentials(request: Request): SessionPayload | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  // Only allow dev bypass if explicitly enabled
  const devBypassEnabled = request.headers.get("x-dev-auth-bypass");
  if (devBypassEnabled !== "enabled") {
    return null;
  }

  const userId = request.headers.get("x-dev-user-id");
  const tenantId = request.headers.get("x-dev-tenant-id");
  const role = request.headers.get("x-dev-user-role") ?? "admin";

  if (!userId || !tenantId) {
    return null;
  }

  console.warn(
    `[DEV AUTH BYPASS] User: ${userId}, Tenant: ${tenantId}, Role: ${role}`
  );

  return {
    userId,
    tenantId,
    email: "dev@example.com",
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: "church-management-platform",
  };
}

// ─── Authentication Functions ────────────────────────────────

/**
 * Read a cookie from a request.
 *
 * Route handlers receive a `NextRequest`, which has a parsed `.cookies` map. Not
 * every caller does — a plain `Request` (and the unit tests that build one) has
 * only the raw header. Rather than forcing every call site to construct a
 * `NextRequest` or cast, fall back to parsing the header.
 *
 * Returns undefined rather than throwing, because "no cookie" is a normal answer
 * for an unauthenticated request, not an error.
 */
function readCookie(request: Request, name: string): string | undefined {
  const parsed = (request as NextRequest).cookies?.get(name)?.value;
  if (parsed) return parsed;

  const header = request.headers?.get("cookie");
  if (!header) return undefined;

  for (const pair of header.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq).trim() === name) {
      return pair.slice(eq + 1).trim();
    }
  }
  return undefined;
}

/**
 * Get the current session from the request.
 * Returns null if not authenticated.
 *
 * This is the one place a session is located for every protected route, so both
 * supported transports are resolved here and nowhere else:
 *
 *   1. `Authorization: Bearer <token>` — mobile and any non-browser client.
 *   2. `church_session` cookie — the web app.
 *
 * Bearer is checked first. A request that presents both is a client that has a
 * token and is relying on it, and honouring the cookie instead would quietly
 * authenticate as a different identity than the one the caller believes it is
 * using — the sort of thing that is invisible until it is a security problem.
 *
 * The token's signature and expiry are checked first because that is a local
 * HMAC verification with no I/O, and a forged or stale token should not cost a
 * database round trip. Only a token that passes is then checked against its
 * session row, which is what makes revocation real.
 */
export async function getSession(request: Request | NextRequest): Promise<SessionPayload | null> {
  // 1. Check for development bypass
  const devSession = getDevBypassCredentials(request);
  if (devSession) return devSession;

  // 2. Bearer token, for clients with no cookie jar.
  const bearer = extractBearerToken(request.headers.get("authorization"));
  if (bearer) {
    const payload = await verifySession(bearer);
    if (!payload) return null;
    // Signature alone is not enough: the session may have been revoked.
    if (!(await verifySessionIsLive(bearer))) return null;
    await touchSession(bearer).catch(() => {});
    return payload;
  }

  // 3. Cookie, for the browser.
  const cookieToken = readCookie(request, "church_session");
  if (!cookieToken) return null;

  const payload = await verifySession(cookieToken);
  if (!payload) return null;
  if (!(await verifySessionIsLive(cookieToken))) return null;
  await touchSession(cookieToken).catch(() => {});
  return payload;
}


/**
 * Require authentication for a request.
 * Throws UnauthorizedError if not authenticated.
 * Returns a valid TenantContext.
 */
export async function requireAuth(request: NextRequest): Promise<TenantContext> {
  const session = await getSession(request);
  if (!session) {
    throw new UnauthorizedError("Authentication required");
  }

  // Resolve full tenant context from database
  return resolveTenantContext(session);
}

/**
 * Require a specific permission for a request.
 * Checks authentication + permission in one step.
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<TenantContext> {
  const ctx = await requireAuth(request);

  // Checked against the permissions resolved for this person (their role as
  // configured in Settings → Access & roles), never the code defaults: a gate
  // that read the defaults would ignore every change a church makes.
  if (!ctx.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing required permission: ${permission}`);
  }

  return ctx;
}

/**
 * Require one of several permissions (OR logic).
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: Permission[]
): Promise<TenantContext> {
  const ctx = await requireAuth(request);

  const hasAny = permissions.some((p) => ctx.permissions.includes(p));

  if (!hasAny) {
    throw new ForbiddenError(
      `Missing required permission: one of ${permissions.join(", ")}`
    );
  }

  return ctx;
}

/**
 * Check if the current user has a specific permission.
 * Does not throw — returns boolean.
 */
export async function checkPermission(
  request: NextRequest,
  permission: Permission
): Promise<{ hasPermission: boolean; ctx: TenantContext | null }> {
  try {
    const ctx = await requireAuth(request);
    return {
      hasPermission: ctx.permissions.includes(permission),
      ctx,
    };
  } catch {
    return { hasPermission: false, ctx: null };
  }
}
