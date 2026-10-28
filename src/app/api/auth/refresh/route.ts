/**
 * POST /api/auth/refresh
 *
 * Exchanges a still-valid mobile access token for a fresh one.
 *
 * ## Why this is a re-issue rather than a rotating refresh token
 *
 * The textbook design is a short-lived access token plus a long-lived refresh
 * token, with the refresh token rotated and the old one invalidated on every use
 * so a stolen refresh token is usable at most once. That needs a second token
 * column on `sessions` and a client retry contract, and a partial version of it is
 * worse than none: a client that cannot tell "expired, refresh me" from "revoked,
 * stop" will either loop or log the user out at random.
 *
 * So this does the simpler, fully-correct thing: **the access token is its own
 * refresh token**. The client sends the token it already has, and if the session
 * row is still live a new token is issued and the old one is revoked in the same
 * exchange.
 *
 * That still closes the main hole. A stolen token is useful for at most one
 * exchange after the legitimate client refreshes, because the exchange revokes
 * it. What it does not give is revocation of one device without touching the
 * others, or detection of a token replayed after it was already rotated. Both need
 * the second column. `sessions.revoked_at` and `listActiveSessions` are the hooks
 * that work already.
 *
 * The rotation here is genuinely single-use: the previous token is revoked as the
 * new one is minted, so a token observed in transit after the client has refreshed
 * is dead.
 */

import { NextResponse } from "next/server";
import { withErrorHandling, successResponse } from "@/lib/backend";
import { UnauthorizedError } from "@/lib/backend/errors";
import prisma from "@/lib/db/prisma";
import { config } from "@/lib/backend/config";
import { issueSession, extractBearerToken, revokeSession } from "@/lib/auth/session";

export const POST = withErrorHandling(async (request: Request) => {
  const token = extractBearerToken(request.headers.get("authorization"));

  if (!token) {
    throw new UnauthorizedError("Authentication required");
  }

  // Confirm the session row is still live *before* minting anything. The JWT may
  // still be inside its own expiry and still be dead, because it was revoked.
  const row = await prisma.session.findUnique({
    where: { token },
    select: { id: true, userId: true, revokedAt: true, expiresAt: true, kind: true },
  });

  if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError("Session expired");
  }

  const user = await prisma.user.findFirst({
    where: { id: row.userId, isActive: true },
    select: { id: true, tenantId: true, email: true, role: true },
  });

  if (!user) {
    // The account was deactivated after the token was issued. Revoking here stops
    // the client retrying a token that will never be accepted again.
    await revokeSession(token).catch(() => {});
    throw new UnauthorizedError("Session expired");
  }

  // Mint the replacement first. If this throws, the client's existing token is
  // still valid and nothing has been lost; if it were done the other way round, a
  // failure here would log the user out.
  const issued = await issueSession(user, {
    kind: row.kind === "mobile" ? "mobile" : "web",
    expiresInSeconds: config.mobileAccessTokenExpiry,
  });

  // Single-use rotation: the presented token stops working immediately.
  await revokeSession(token);

  return successResponse({
    accessToken: issued.token,
    tokenType: "Bearer",
    expiresIn: config.mobileAccessTokenExpiry,
    expiresAt: issued.expiresAt.toISOString(),
  });
});
