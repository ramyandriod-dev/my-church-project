/**
 * Attendance window presentation for the M5 Mobile Check-in demo.
 *
 * This is a THIN, UI-only mapping over the existing M1 AttendanceContext
 * (getAttendanceContext / FRIDAY_ATTENDANCE_WINDOW). It never re-implements
 * the window logic — the single source of truth remains attendance-context.
 */

import {
  getAttendanceContext,
  FRIDAY_ATTENDANCE_WINDOW,
} from "@/lib/attendance/attendance-context";
import type { WindowPresentation } from "./types";

const WINDOW_START = `${String(FRIDAY_ATTENDANCE_WINDOW.startHour).padStart(
  2,
  "0"
)}:${String(FRIDAY_ATTENDANCE_WINDOW.startMinute).padStart(2, "0")}`;
const WINDOW_END = `${String(FRIDAY_ATTENDANCE_WINDOW.endHour).padStart(2, "0")}:${String(
  FRIDAY_ATTENDANCE_WINDOW.endMinute
).padStart(2, "0")}`;

export function getWindowPresentation(now: Date = new Date()): WindowPresentation {
  const ctx = getAttendanceContext(now);

  const base = {
    window: { start: WINDOW_START, end: WINDOW_END },
  };

  if (ctx.state === "not-started") {
    return {
      ...base,
      state: "not-started",
      checkInAvailable: false,
      title: "Check-in opens at 09:00",
      description: `Attendance opens ${WINDOW_START} and closes ${WINDOW_END}. Your scanner will activate automatically at that time.`,
    };
  }

  if (ctx.state === "review") {
    return {
      ...base,
      state: "review",
      checkInAvailable: false,
      title: "Attendance window has closed",
      description: `Live check-in closed at ${WINDOW_END}. No further scans are accepted until the next Friday service.`,
    };
  }

  return {
    ...base,
    state: "live",
    checkInAvailable: true,
    title: "Check-in is live",
    description: `The Friday service check-in window is open (${WINDOW_START} → ${WINDOW_END}). Scans are being accepted.`,
  };
}