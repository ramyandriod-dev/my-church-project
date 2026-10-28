import { describe, it, expect } from "vitest";
import { getWindowPresentation } from "./window-presentation";
import { FRIDAY_ATTENDANCE_WINDOW } from "@/lib/attendance/attendance-context";

/**
 * M5 UI window presentation: a thin mapping over the M1 AttendanceContext.
 *
 * These are NEW tests for the M5 presentation layer (check-in availability,
 * headlines, window bounds) at the exact Friday boundary times. The M4 service
 * already covers the API enforcement of the same boundaries.
 */

const friday = (hour: number, minute: number) => new Date(2026, 9, 2, hour, minute, 0, 0);

const pad = (n: number) => String(n).padStart(2, "0");
const start = `${pad(FRIDAY_ATTENDANCE_WINDOW.startHour)}:${pad(FRIDAY_ATTENDANCE_WINDOW.startMinute)}`;
const end = `${pad(FRIDAY_ATTENDANCE_WINDOW.endHour)}:${pad(FRIDAY_ATTENDANCE_WINDOW.endMinute)}`;

describe("getWindowPresentation", () => {
  it("reports not-started before 09:00 (08:59)", () => {
    const w = getWindowPresentation(friday(8, 59));
    expect(w.state).toBe("not-started");
    expect(w.checkInAvailable).toBe(false);
    expect(w.window).toEqual({ start, end });
  });

  it("opens the window exactly at 09:00", () => {
    const w = getWindowPresentation(friday(9, 0));
    expect(w.state).toBe("live");
    expect(w.checkInAvailable).toBe(true);
  });

  it("stays live until the very last minute (12:59)", () => {
    const w = getWindowPresentation(friday(12, 59));
    expect(w.state).toBe("live");
    expect(w.checkInAvailable).toBe(true);
  });

  it("closes exactly at 13:00", () => {
    const w = getWindowPresentation(friday(13, 0));
    expect(w.state).toBe("review");
    expect(w.checkInAvailable).toBe(false);
  });

  it("remains closed after the window (13:01)", () => {
    const w = getWindowPresentation(friday(13, 1));
    expect(w.state).toBe("review");
    expect(w.checkInAvailable).toBe(false);
  });
});