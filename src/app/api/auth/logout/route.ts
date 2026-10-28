/**
 * POST /api/auth/logout
 *
 * Revokes the current session and clears the session cookie.
 *
 * Handles both transports, because a phone has nothing else to revoke:
 *
 * - **Bearer** — the token comes from `Authorization`. There is no cookie to clear,
 *   so the row is soft-revoked and the response carries no `Set-Cookie`. A
 *   previous version read only the cookie, which meant logout from the mobile app
 *   did nothing at all: the row was never found, the token stayed live, and the
 *   app reported success anyway.
 * - **Cookie** — the web path, unchanged apart from now revoking the row properly
 *   rather than deleting it.
 *
 * Always returns success. Reporting whether a session existed would turn this
 * endpoint into a token oracle, and a caller with no valid session has nothing to
 * be told.
 *
 * Note this revokes the *current* session only. A user with a phone and a laptop
 * keeps the other one, which is the right default — signing out on one device
 * should not sign you out everywhere. `revokeAllSessions` backs the "sign out
 * everywhere" control, which is not exposed here yet.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { extractBearerToken, revokeSession } from "@/lib/auth/session";
import { requestDatabaseContext } from "@/lib/db/prisma";

export async function POST(request: Request) {
  return requestDatabaseContext.run({}, async () => {
  const bearer = extractBearerToken(request.headers.get("authorization"));

  if (bearer) {
    // Mobile: no cookie involved. Soft-revoke so the row survives as evidence.
    await revokeSession(bearer).catch(() => {
      // Reported as success regardless — see the header note on token oracles.
    });
    return NextResponse.json({
      success: true,
      data: { message: "Logged out successfully" },
    });
  }

  // Web: revoke the cookie's session, then clear the cookie.
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("church_session")?.value;

  if (cookieToken) {
    await revokeSession(cookieToken).catch(() => {
      // The cookie is cleared regardless. A row that outlives its token is inert:
      // verification refuses it once `expires_at` passes.
    });
  }

  const response = NextResponse.json({
    success: true,
    data: { message: "Logged out successfully" },
  });
  response.cookies.delete("church_session");
  return response;
  });
}
