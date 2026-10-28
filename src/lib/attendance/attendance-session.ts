/**
 * Attendance Session (QR) Concept
 *
 * The Friday attendance QR represents a SESSION, never a member.
 *
 *   QR → signed session token → backend validation → attendance record
 *
 * Flow:
 *   1. Server mints an attendance session token for a tenant's Service
 *      (e.g. "Friday Main Service"). The QR the member scans encodes THIS token.
 *   2. The token payload contains ONLY the session/service identifier — NO
 *      member identity, NO private member data.
 *   3. The member authenticates independently (existing JWT session). The
 *      server derives WHO is checking in from the authenticated session.
 *
 * The token expires when the Friday attendance window closes (13:00), using
 * the same FRIDAY_ATTENDANCE_WINDOW constant as the M1 AttendanceContext —
 * there is exactly one interpretation of the window.
 *
 * Uses jose (already used for user sessions) — no custom crypto.
 */

import { SignJWT, jwtVerify } from "jose";
import { config } from "../backend/config";
import { FRIDAY_ATTENDANCE_WINDOW } from "./attendance-context";

export const ATTENDANCE_SESSION_TYPE = "friday_attendance" as const;
export const ATTENDANCE_SESSION_ISSUER = "church-management-platform:attendance-session";

export interface AttendanceSessionTokenPayload {
  serviceId: string;
  tenantId: string;
  sessionType: typeof ATTENDANCE_SESSION_TYPE;
  iat: number;
  exp: number;
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(config.jwtSecret);
}

/**
 * Return the end of the attendance window for the given moment's date
 * (13:00), derived from the single source of truth.
 */
function windowEndFor(now: Date): Date {
  const end = new Date(now);
  end.setHours(
    FRIDAY_ATTENDANCE_WINDOW.endHour,
    FRIDAY_ATTENDANCE_WINDOW.endMinute,
    0,
    0
  );
  // Ensure the expiration is never in the past or immediately expiring.
  // If `now` is at or past the window end on this date, grant at least 4 hours validity.
  if (end.getTime() <= now.getTime()) {
    return new Date(now.getTime() + 4 * 60 * 60 * 1000);
  }
  return end;
}

/**
 * Mint an attendance session token for a tenant's service.
 * The QR content = this token. No member data is included.
 */
export async function encodeAttendanceSessionToken(
  params: { serviceId: string; tenantId: string },
  now: Date = new Date()
): Promise<string> {
  const exp = windowEndFor(now);
  return new SignJWT({
    serviceId: params.serviceId,
    tenantId: params.tenantId,
    sessionType: ATTENDANCE_SESSION_TYPE,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setIssuer(ATTENDANCE_SESSION_ISSUER)
    .setExpirationTime(exp)
    .sign(getJwtSecret());
}

/**
 * Verify and decode an attendance session token.
 * Returns null if invalid, tampered, wrong issuer, or expired.
 *
 * `opts.now` (Demo Mode) overrides the verification clock so a token minted
 * for a simulated Friday remains verifiable during a dev/demo session. When
 * omitted the REAL clock is used — production behavior is unchanged.
 */
export async function decodeAttendanceSessionToken(
  token: string,
  opts?: { now?: Date }
): Promise<AttendanceSessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: ATTENDANCE_SESSION_ISSUER,
      ...(opts?.now ? { currentDate: opts.now } : {}),
    });
    if (
      typeof payload.serviceId !== "string" ||
      typeof payload.tenantId !== "string" ||
      payload.sessionType !== ATTENDANCE_SESSION_TYPE
    ) {
      return null;
    }
    return {
      serviceId: payload.serviceId,
      tenantId: payload.tenantId,
      sessionType: ATTENDANCE_SESSION_TYPE,
      iat: typeof payload.iat === "number" ? payload.iat : 0,
      exp: typeof payload.exp === "number" ? payload.exp : 0,
    };
  } catch {
    return null;
  }
}