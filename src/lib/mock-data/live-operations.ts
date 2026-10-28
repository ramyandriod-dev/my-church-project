// ─── Live Operations Summary Mock Data ───────────────────────────────────────
// Deterministic baseline for Live Operations & Attendance Review dashboard cards.

export interface LiveOperationsData {
  checkedIn: number;
  expectedAttendance: number;
  peopleHereNow: number;
  recentCheckIns: number;
  attendanceRate: number;
  missing: number;
}

export const LIVE_OPERATIONS = {
  checkedIn: 363,
  expectedAttendance: 420,
  peopleHereNow: 363,
  recentCheckIns: 8,
} as const;

export function getLiveOperations(): LiveOperationsData {
  const attendanceRate =
    Math.round((LIVE_OPERATIONS.checkedIn / LIVE_OPERATIONS.expectedAttendance) * 1000) / 10;
  const missing = LIVE_OPERATIONS.expectedAttendance - LIVE_OPERATIONS.checkedIn;

  return {
    ...LIVE_OPERATIONS,
    attendanceRate,
    missing,
  };
}
