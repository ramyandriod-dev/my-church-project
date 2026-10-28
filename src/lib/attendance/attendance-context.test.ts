/**
 * Friday Attendance Window — State Model Tests
 *
 * State is derived from an explicitly supplied `Date`, so these tests never
 * depend on the computer wall clock.
 *
 * Expected mapping:
 *   before 09:00            → "not-started"
 *   09:00 (inclusive)       → "live"
 *   10:00                   → "live"
 *   11:00                   → "live" + isMainServiceTime
 *   12:30                   → "live"
 *   13:00 (time closes)     → "review"
 *   13:01                   → "review"
 */

import { describe, it, expect } from "vitest";
import { getAttendanceContext, FRIDAY_ATTENDANCE_WINDOW } from "@/lib/attendance/attendance-context";

const at = (hour: number, minute = 0) => new Date(2026, 0, 16, hour, minute, 0, 0); // Friday, arbitrary day

describe("Friday Attendance Window", () => {
  it("exposes the centralized time configuration", () => {
    expect(FRIDAY_ATTENDANCE_WINDOW.startHour).toBe(9);
    expect(FRIDAY_ATTENDANCE_WINDOW.startMinute).toBe(0);
    expect(FRIDAY_ATTENDANCE_WINDOW.mainServiceHour).toBe(11);
    expect(FRIDAY_ATTENDANCE_WINDOW.mainServiceMinute).toBe(0);
    expect(FRIDAY_ATTENDANCE_WINDOW.endHour).toBe(13);
    expect(FRIDAY_ATTENDANCE_WINDOW.endMinute).toBe(0);
  });

  describe("state derivation", () => {
    it("before 09:00 → Not Started", () => {
      const ctx = getAttendanceContext(at(8, 59));
      expect(ctx.state).toBe("not-started");
    });

    it("is live at exactly 09:00", () => {
      const ctx = getAttendanceContext(at(9, 0));
      expect(ctx.state).toBe("live");
    });

    it("10:00 → Live", () => {
      const ctx = getAttendanceContext(at(10, 0));
      expect(ctx.state).toBe("live");
    });

    it("11:00 → Live and is the main service window", () => {
      const ctx = getAttendanceContext(at(11, 0));
      expect(ctx.state).toBe("live");
      expect(ctx.isMainServiceTime).toBe(true);
    });

    it("12:30 → Live", () => {
      const ctx = getAttendanceContext(at(12, 30));
      expect(ctx.state).toBe("live");
    });

    it("13:01 → Attendance Review", () => {
      const ctx = getAttendanceContext(at(13, 1));
      expect(ctx.state).toBe("review");
    });

    it("13:00 end boundary → Attendance Review", () => {
      const ctx = getAttendanceContext(at(13, 0));
      expect(ctx.state).toBe("review");
    });

    it("after 13:00 (e.g. 18:00) → Attendance Review", () => {
      const ctx = getAttendanceContext(at(18, 0));
      expect(ctx.state).toBe("review");
    });
  });

  describe("derived window metrics", () => {
    it("reports start/main/end minutes and timers", () => {
      const ctx = getAttendanceContext(at(10, 0));
      expect(ctx.startMinutes).toBe(9 * 60);
      expect(ctx.mainServiceMinutes).toBe(11 * 60);
      expect(ctx.endMinutes).toBe(13 * 60);
      expect(ctx.nowMinutes).toBe(10 * 60);
      expect(ctx.minutesIntoWindow).toBe(60);
      expect(ctx.minutesUntilStart).toBe(0);
      expect(ctx.minutesUntilMainService).toBe(60);
      expect(ctx.minutesSinceEnd).toBe(0);
      expect(ctx.isMainServiceTime).toBe(false);
    });

    it("not-started metrics count down instead", () => {
      const ctx = getAttendanceContext(at(8, 0));
      expect(ctx.minutesIntoWindow).toBe(0);
      expect(ctx.minutesUntilStart).toBe(60);
      expect(ctx.minutesUntilMainService).toBe(180);
      expect(ctx.isMainServiceTime).toBe(false);
    });

    it("review metrics count since the window closed", () => {
      const ctx = getAttendanceContext(at(14, 0));
      expect(ctx.minutesSinceEnd).toBe(60);
      expect(ctx.state).toBe("review");
    });
  });

  describe("independence from wall clock", () => {
    it("returns identical results for the same instant across calls", () => {
      const a = at(11, 30);
      const b = at(11, 30);
      expect(getAttendanceContext(a).state).toBe("live");
      expect(getAttendanceContext(b)).toEqual(getAttendanceContext(a));
    });

    it("defaults to the current instant without throwing", () => {
      const ctx = getAttendanceContext();
      expect(["not-started", "live", "review"]).toContain(ctx.state);
      expect(typeof ctx.nowMinutes).toBe("number");
    });
  });
});