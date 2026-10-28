/**
 * Authentication Module
 *
 * Single import point for all authentication utilities.
 * Usage: import { requireAuth, requirePermission } from "@/lib/auth"
 */

// Session management
export {
  signSession,
  verifySession,
  verifySessionIsLive,
  invalidateLiveSessionCache,
  createSession,
  issueSession,
  revokeSession,
  revokeAllSessions,
  listActiveSessions,
  destroySession,
  getCurrentSession,
  getSessionToken,
  setSessionCookie,
  clearSessionCookie,
  extractBearerToken,
} from "./session";
export type { SessionPayload, SessionKind } from "./session";

// Password hashing
export { hashPassword, verifyPassword, needsRehash } from "./password";

// Login throttling
export { getLockoutState, recordFailedAttempt, clearFailures } from "./throttle";

// User context resolution
export {
  resolveTenantContext,
  invalidateUserContextCache,
  getPermissionsForRole,
  hasPermission,
  hasRoleLevel,
  getRoleLevel,
} from "./user-context";

// Authentication enforcement
export {
  getSession,
  requireAuth,
  requirePermission,
  requireAnyPermission,
  checkPermission,
} from "./require-auth";
