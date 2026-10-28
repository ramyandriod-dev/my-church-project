/**
 * Minimal API client for the M5 Mobile Check-in demo.
 *
 * Every helper calls a REAL existing M4 endpoint over HTTP(GET): the demo
 * never talks to the database and never bypasses the API layer.
 */

import type {
  DemoMember,
  AttendanceSessionInfo,
  CheckInResponse,
  SignInUser,
} from "./types";
import { getDemoClockInfo } from "@/lib/demo/demo-clock";

/**
 * When the shared Friday Demo clock is active, attach the simulated `now` so
 * the backend can validate/demo-time sessions during development. Production
 * ignores this header entirely (see src/lib/backend/demo-clock.ts).
 */
function demoClockHeaders(): Record<string, string> {
  const info = getDemoClockInfo();
  if (!info.demoMode) return {};
  return { "x-demo-now": info.effectiveNow.toISOString() };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string; details?: unknown };
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || !json.success) {
    throw new CheckInDemoError(
      json.error?.message ?? `Request failed (${res.status})`,
      json.error?.code ?? `HTTP_${res.status}`
    );
  }
  return json.data;
}

export class CheckInDemoError extends Error {
  readonly code: string;

  constructor(message: string, code = "REQUEST_FAILED") {
    super(message);
    this.name = "CheckInDemoError";
    this.code = code;
  }
}

/** GET /api/members — members of the current authenticated tenant. */
export async function fetchDemoMembers(): Promise<DemoMember[]> {
  const data = await unwrap<{ data: DemoMember[]; pagination: unknown }>(
    await fetch("/api/members?limit=50", { credentials: "include" })
  );
  return data.data;
}

/** GET /api/attendance/session — the tenant session + QR token (no member PII). */
export async function fetchAttendanceSession(): Promise<AttendanceSessionInfo> {
  return unwrap<AttendanceSessionInfo>(
    await fetch("/api/attendance/session", {
      credentials: "include",
      headers: demoClockHeaders(),
    })
  );
}

/**
 * POST /api/attendance/check-in — the REAL M4 check-in.
 *
 * The ONLY input allowed is the scanned session token. Member identity is
 * derived server-side from the authenticated session; the client never
 * supplies a memberId.
 */
export async function performCheckIn(sessionToken: string): Promise<CheckInResponse> {
  const body = JSON.stringify({ sessionToken });
  const result = await unwrap<CheckInResponse>(
    await fetch("/api/attendance/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...demoClockHeaders() },
      body,
      credentials: "include",
    })
  );

  // Development realtime fallback: in local dev the client cannot reach the
  // Cloudflare real-time worker, so mirror the confirmed check-in to other
  // browser tabs over BroadcastChannel. In production the WebSocket carries
  // the event instead, so this stays a no-op there.
  if (
    process.env.NODE_ENV !== "production" &&
    !result.alreadyCheckedIn &&
    result.record
  ) {
    const { publishLocalRealtime } = await import("@/lib/realtime/local-broadcast");
    publishLocalRealtime({
      type: "attendance.check_in",
      tenantId: undefined,
      data: {
        recordId: result.record.id,
        memberId: result.member?.id || result.record.memberId,
        memberName: result.member?.name,
        memberAvatar: result.member?.avatar,
        ministry: result.member?.ministry,
        serviceId: result.record.serviceId,
        method: result.record.method,
        timestamp: result.record.checkInTime,
      },
      timestamp: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * POST /api/auth/login — real session auth (password is dev-skipped).
 */
export async function signInAsMember(member: DemoMember): Promise<SignInUser> {
  const data = await unwrap<{ user: SignInUser }>(
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: member.email, password: "mobile-demo" }),
      credentials: "include",
    })
  );
  return data.user;
}