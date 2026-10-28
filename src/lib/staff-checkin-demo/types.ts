/**
 * Shared client-side types for the M5 Mobile Check-in Demo.
 *
 * These mirror the wire shapes returned by the real M4 API endpoints the
 * demo consumes (GET /api/members, GET /api/attendance/session,
 * POST /api/attendance/check-in). No new backend is introduced here.
 */

export interface DemoMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  status: string;
}

/** Shape returned by POST /api/auth/login. */
export interface SignInUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName: string;
}

export interface AttendanceSessionInfo {
  sessionId: string;
  serviceName: string;
  serviceStatus: string;
  sessionType: string;
  window: {
    start: string;
    end: string;
  };
  qrToken: string;
}

export interface CheckInRecord {
  id: string;
  memberId: string;
  serviceId: string;
  checkInTime: string;
  method: string;
}

export interface CheckInResponse {
  record: CheckInRecord;
  alreadyCheckedIn: boolean;
  member?: {
    id: string;
    name: string;
    avatar?: string;
    ministry?: string;
  };
}

/** UI-facing interpretation of an AttendanceContext, built for the demo. */
export type WindowPresentationState = "not-started" | "live" | "review";

export interface WindowPresentation {
  state: WindowPresentationState;
  /** Human-readable headline for the current window phase. */
  title: string;
  /** Human-readable description of the current window phase. */
  description: string;
  /** Whether the demo may currently process a check-in scan. */
  checkInAvailable: boolean;
  /** Window bounds (local time), matching the session API. */
  window: { start: string; end: string };
}