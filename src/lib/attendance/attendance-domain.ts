/**
 * Attendance Domain — Status Derivation
 *
 * A member's attendance state for a session is DERIVED, never stored:
 *
 *   PRESENT      → an AttendanceRecord exists for the session
 *   EXCUSED      → an AttendanceException(status=excused) exists
 *   NOT_EXPECTED → an AttendanceException(status=not_expected) exists
 *   MISSING      → expected, window closed, and none of the above
 *
 * MISSING is never duplicated as an independent fact — that would create a
 * second source of truth. This module is the single derivation rule.
 */

export type MemberAttendanceStatus =
  | "present"
  | "excused"
  | "not_expected"
  | "missing";

/**
 * Transient, pre-closure state (used by live views while the window is open):
 * expected, not yet checked in, no exception. Never stored, never "missing".
 */
export type NotYetCheckedIn = "not_yet_checked_in";

export type DerivedAttendanceStatus = MemberAttendanceStatus | NotYetCheckedIn;

export interface DerivationInput {
  wasExpected: boolean;
  hasPresentRecord: boolean;
  exception: "excused" | "not_expected" | null;
  windowClosed: boolean;
}

export function deriveMemberAttendanceStatus(
  input: DerivationInput
): DerivedAttendanceStatus {
  if (!input.wasExpected) return "not_expected";
  if (input.hasPresentRecord) return "present";
  if (input.exception === "excused") return "excused";
  if (input.exception === "not_expected") return "not_expected";
  return input.windowClosed ? "missing" : "not_yet_checked_in";
}