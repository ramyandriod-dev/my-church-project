import { describe, it, expect } from "vitest";
import { getLiveOperations, LIVE_OPERATIONS } from "./live-operations";
import { getAttendanceContext } from "../attendance/attendance-context";

const at = (hour: number, minute = 0) => new Date(2026, 0, 16, hour, minute, 0, 0);

describe("Milestone 2: Live Operations Summary & Attendance Review Data", () => {
  it("provides deterministic live operations numbers", () => {
    const data = getLiveOperations();

    expect(data.checkedIn).toBe(363);
    expect(data.peopleHereNow).toBe(363);
    expect(data.recentCheckIns).toBe(8);
    expect(data.expectedAttendance).toBe(420);
    expect(data.attendanceRate).toBe(86.4);
    expect(data.missing).toBe(57);
  });

  it("ensures mathematical consistency between present, missing, and expected counts", () => {
    const data = getLiveOperations();
    expect(data.checkedIn + data.missing).toBe(data.expectedAttendance);
    expect(Math.round((data.checkedIn / data.expectedAttendance) * 1000) / 10).toBe(86.4);
  });

  describe("Dashboard attendance states at specified milestone checkpoints", () => {
    it("08:59 → NOT STARTED", () => {
      const ctx = getAttendanceContext(at(8, 59));
      expect(ctx.state).toBe("not-started");
    });

    it("09:00 → LIVE", () => {
      const ctx = getAttendanceContext(at(9, 0));
      expect(ctx.state).toBe("live");
    });

    it("11:00 → LIVE", () => {
      const ctx = getAttendanceContext(at(11, 0));
      expect(ctx.state).toBe("live");
      expect(ctx.isMainServiceTime).toBe(true);
    });

    it("12:30 → LIVE", () => {
      const ctx = getAttendanceContext(at(12, 30));
      expect(ctx.state).toBe("live");
    });

    it("12:59 → LIVE", () => {
      const ctx = getAttendanceContext(at(12, 59));
      expect(ctx.state).toBe("live");
    });

    it("13:00 → ATTENDANCE REVIEW", () => {
      const ctx = getAttendanceContext(at(13, 0));
      expect(ctx.state).toBe("review");
    });

    it("13:01 → ATTENDANCE REVIEW", () => {
      const ctx = getAttendanceContext(at(13, 1));
      expect(ctx.state).toBe("review");
    });
  });
});
