/**
 * POST /api/auth/change-password
 *
 * Changes the current user's password.
 *
 * ## Why this is its own endpoint rather than a field on the user update route
 *
 * Two properties are specific to passwords and neither belongs in a generic
 * update:
 *
 *   1. **It requires the current password.** Every other profile field can be
 *      changed by whoever is holding a session. If a session is stolen, a password
 *      change without re-authenticating would let the attacker *lock the real
 *      owner out permanently* while keeping access. Re-entering the current
 *      password means a stolen session alone cannot take the account over.
 *   2. **It revokes other sessions.** Changing a password is what someone does
 *      because they think something is wrong. Leaving other devices signed in
 *      afterwards would ignore the reason they did it.
 *
 * ## Other sessions
 *
 * Every other live session for the user is revoked; the one making the request
 * survives so they are not logged out of the tab they are standing in. A stolen
 * token is therefore dead within one successful change.
 *
 * The failure count is cleared on success — the person just proved they know the
 * password.
 *
 * ## Strength rules
 *
 * Length is the dominant factor in password strength, so the floor is 12
 * characters rather than a composition rule demanding a symbol. The one hard
 * exclusion is a password that is identical to the one being replaced, which would
 * otherwise let a "change" silently succeed while changing nothing.
 */

import { NextResponse } from "next/server";
import { withErrorHandling, successResponse, errorResponse } from "@/lib/backend";
import { UnauthorizedError, AppError } from "@/lib/backend/errors";
import prisma from "@/lib/db/prisma";
import { config } from "@/lib/backend/config";
import { extractBearerToken, revokeAllSessions } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/require-auth";
import { hashPassword, verifyPassword, needsRehash } from "@/lib/auth/password";
import { clearFailures } from "@/lib/auth/throttle";

const MIN_LENGTH = 12;
const MAX_LENGTH = 200;

interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword?: string;
}

export const POST = withErrorHandling(async (request) => {
  const session = await getSession(request);
  if (!session) {
    throw new UnauthorizedError("Authentication required");
  }

  const body: ChangePasswordRequest = await request.json();
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!currentPassword || !newPassword) {
    throw new AppError("VALIDATION_ERROR", "Current and new password are both required", 400);
  }

  if (newPassword.length < MIN_LENGTH) {
    throw new AppError("VALIDATION_ERROR", `New password must be at least ${MIN_LENGTH} characters`, 400);
  }
  if (newPassword.length > MAX_LENGTH) {
    // Bound the work: a 10 MB "password" would be an unpleasant amount of PBKDF2
    // for no benefit, and this endpoint is authenticated but still rate-limited by
    // nothing else.
    throw new AppError("VALIDATION_ERROR", `New password must be at most ${MAX_LENGTH} characters`, 400);
  }
  if (newPassword === currentPassword) {
    throw new AppError("VALIDATION_ERROR", "New password must be different from the current one", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, passwordHash: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError("Authentication required");
  }

  if (!user.passwordHash) {
    // No hash to verify against. Someone has to bootstrap this account before it
    // can have a password changed; refusing is the only honest answer.
    throw new AppError(
      "CONFLICT",
      "This account has no password set. Ask an administrator to reset it.",
      409
    );
  }

  // Re-authenticate. This is the step that stops a stolen session from taking the
  // account over: without it, an attacker who lifted a token could change the
  // password and lock the owner out for good.
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  // Signed-in elsewhere? That session is now suspect by definition.
  // Keep the session that made this request alive so the user is not logged out
  // of the tab they are standing in. Read the same way `getSession` did.
  const cookieToken = request.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("church_session="))
    ?.slice("church_session=".length);
  const currentToken =
    extractBearerToken(request.headers.get("authorization")) ?? cookieToken ?? undefined;
  const revoked = await revokeAllSessions(user.id, currentToken);

  // The user just proved they know the password, so any lockout is stale.
  await clearFailures(user.email);

  return successResponse({
    message: "Password changed successfully",
    // Surfaced so the UI can tell the user what actually happened to their other
    // devices, rather than silently signing them out and leaving them confused.
    otherSessionsRevoked: revoked,
  });
});
