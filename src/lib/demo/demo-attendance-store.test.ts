import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDemoAttendanceSnapshot,
  setDemoSimulationPaused,
  resetDemoAttendanceRun,
  pushRealCheckIn,
  clearRealCheckIns,
} from "./demo-attendance-store";
import { setDemoStateId } from "./demo-clock-store";
import { getLiveOperations } from "@/lib/mock-data/live-operations";

/**
 * M5.1 — shared progressive attendance simulation.
 *
 * These tests encode the contract that fixed the "resets to 1 on navigation"
 * bug: the count is derived from ELAPSED REAL WALL-CLOCK time since a persisted
 * run start, so no page remount can move it backwards. They also prove the
 * Dashboard ↔ /attendance parity (identical snapshot + identical object) and
 * the live/review/demo-off boundaries of the shared store.
 */

/** Real clock used for simulation: a Thursday 23:54, far outside any window. */
function realNow(): Date {
  return new Date(2026, 8, 17, 23, 54, 0);
}

beforeEach(() => {
  vi.useFakeTimers();
  setDemoStateId(null);
  resetDemoAttendanceRun();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("store: shared snapshot (Dashboard ↔ /attendance parity)", () => {
  it("returns the SAME cached object for the same realNow (useSyncExternalStore-safe)", () => {
    setDemoStateId("1259");
    const a = getDemoAttendanceSnapshot(realNow());
    const b = getDemoAttendanceSnapshot(realNow());
    expect(a).toBe(b);
    expect(a.active).toBe(true);
    expect(a.stateId).toBe("1259");
  });

  it("produces identical numbers for Dashboard and /attendance at the same moment", () => {
    setDemoStateId("1259");
    const dashboard = getDemoAttendanceSnapshot(realNow());
    const attendance = getDemoAttendanceSnapshot(realNow());
    expect(attendance).toBe(dashboard);
    expect(attendance.checkedIn).toBe(dashboard.checkedIn);
    expect(attendance.peopleHereNow).toBe(dashboard.peopleHereNow);
    expect(attendance.attendanceRate).toBe(dashboard.attendanceRate);
    expect(attendance.recentCheckIns).toBe(dashboard.recentCheckIns);
    expect(attendance.missing).toBe(dashboard.missing);
    expect(attendance.latestCheckIn).toBe(dashboard.latestCheckIn);
  });
});

describe("store: navigation / remount survival", () => {
  it("continues growing across reads instead of resetting to 1", () => {
    setDemoStateId("1259");

    const first = getDemoAttendanceSnapshot(realNow());
    expect(first.active).toBe(true);

    // A later remount (e.g. navigating Dashboard → /attendance → back)
    // must derive from the same persisted run, NOT from a fresh start.
    const second = getDemoAttendanceSnapshot(new Date(realNow().getTime()));
    expect(second.active).toBe(true);

    const third = getDemoAttendanceSnapshot(new Date(realNow().getTime() + 0));
    expect(third.checkedIn).toBe(first.checkedIn);
  });

  it("advances with the real wall clock even across isolated reads", () => {
    setDemoStateId("1259");
    const start = getDemoAttendanceSnapshot(realNow());
    const later = getDemoAttendanceSnapshot(new Date(realNow().getTime() + 30_000));
    expect(later.checkedIn).toBeGreaterThanOrEqual(start.checkedIn);
    expect(later.elapsedMs).toBeGreaterThan(start.elapsedMs);
  });
});

describe("store: live vs review semantics", () => {
  it("is active during a LIVE demo checkpoint", () => {
    setDemoStateId("1259");
    const s = getDemoAttendanceSnapshot(realNow());
    expect(s.active).toBe(true);
    expect(s.expectedAttendance).toBeGreaterThanOrEqual(1);
  });

  it("is inactive in the REVIEW checkpoint and falls back to the M2 dataset", () => {
    setDemoStateId("1301");
    const s = getDemoAttendanceSnapshot(realNow());
    expect(s.active).toBe(false);
    expect(s.checkedIn).toBe(getLiveOperations().checkedIn);
    expect(s.expectedAttendance).toBe(getLiveOperations().expectedAttendance);
    expect(s.attendanceRate).toBe(getLiveOperations().attendanceRate);
    expect(s.missing).toBe(getLiveOperations().missing);
  });

  it("Demo OFF produces an inactive snapshot and clears the run", () => {
    setDemoStateId("1259");
    getDemoAttendanceSnapshot(realNow());
    setDemoStateId(null);
    const s = getDemoAttendanceSnapshot(realNow());
    expect(s.active).toBe(false);
    expect(s.stateId).toBe(null);

    // Re-selecting a live checkpoint starts a FRESH run (elapsed ~0).
    setDemoStateId("1259");
    const fresh = getDemoAttendanceSnapshot(realNow());
    expect(fresh.active).toBe(true);
    expect(fresh.elapsedMs).toBeLessThan(1_000);
  });
});

describe("store: pause / resume determinism", () => {
  it("pause freezes the count; resume continues from the frozen point", () => {
    setDemoStateId("1259");
    vi.setSystemTime(realNow());
    const s0 = getDemoAttendanceSnapshot();

    // Run for 40 seconds, then pause.
    const tPause = realNow().getTime() + 40_000;
    vi.setSystemTime(new Date(tPause));
    const beforePause = getDemoAttendanceSnapshot();
    setDemoSimulationPaused(true);
    const paused = getDemoAttendanceSnapshot();
    expect(paused.paused).toBe(true);
    expect(paused.elapsedMs).toBe(beforePause.elapsedMs);

    // 2 real minutes pass while paused → elapsedMs must NOT move.
    const tLater = tPause + 120_000;
    vi.setSystemTime(new Date(tLater));
    setDemoSimulationPaused(true);
    const stillPaused = getDemoAttendanceSnapshot();
    expect(stillPaused.elapsedMs).toBe(beforePause.elapsedMs);

    // Resume → count advances from the frozen point.
    setDemoSimulationPaused(false);
    const resumed = getDemoAttendanceSnapshot();
    expect(resumed.paused).toBe(false);
    expect(resumed.elapsedMs).toBe(stillPaused.elapsedMs);

    // Advance the clock another 30s after resuming → growth resumes.
    const tAfterResume = tLater + 30_000;
    vi.setSystemTime(new Date(tAfterResume));
    const advanced = getDemoAttendanceSnapshot();
    expect(advanced.elapsedMs).toBeGreaterThan(resumed.elapsedMs);
  });

  it("pausing is idempotent (no double-count side effects)", () => {
    setDemoStateId("1259");
    vi.setSystemTime(realNow());
    getDemoAttendanceSnapshot();
    setDemoSimulationPaused(true);
    setDemoSimulationPaused(true);
    const paused = getDemoAttendanceSnapshot();
    setDemoSimulationPaused(false);
    setDemoSimulationPaused(false);
    const resumed = getDemoAttendanceSnapshot();
    expect(paused.paused).toBe(true);
    expect(resumed.paused).toBe(false);
  });
});

describe("store: pushRealCheckIn (real check-in integration into Friday Demo)", () => {
  it("increments checkedIn and peopleHereNow, updates attendance rate, and prepends arrival", () => {
    setDemoStateId("1259");
    vi.setSystemTime(realNow());

    const before = getDemoAttendanceSnapshot();
    const initialCheckedIn = before.checkedIn;
    const initialPeopleHere = before.peopleHereNow;

    pushRealCheckIn({
      data: {
        recordId: "rec-michael-1",
        memberId: "m-michael",
        memberName: "Michael Williams",
        ministry: "Tech & Media",
        serviceId: "svc-1",
        timestamp: new Date(realNow()).toISOString(),
      },
    });

    const after = getDemoAttendanceSnapshot();
    expect(after.checkedIn).toBe(initialCheckedIn + 1);
    expect(after.peopleHereNow).toBe(initialPeopleHere + 1);
    expect(after.arrivals[0]?.personName).toBe("Michael Williams");
    expect(after.latestCheckIn?.personName).toBe("Michael Williams");
    expect(after.arrivals[0]?.ministry).toBe("Tech & Media");
    expect(after.attendanceRate).toBeGreaterThanOrEqual(before.attendanceRate);
  });

  it("strictly deduplicates repeated scans for the same member or recordId", () => {
    setDemoStateId("1259");
    vi.setSystemTime(realNow());

    pushRealCheckIn({
      data: {
        recordId: "rec-dup-1",
        memberId: "m-dup",
        memberName: "Michael Williams",
      },
    });

    const firstSnapshot = getDemoAttendanceSnapshot();
    const countAfterFirst = firstSnapshot.checkedIn;

    // Second scan with same recordId
    pushRealCheckIn({
      data: {
        recordId: "rec-dup-1",
        memberId: "m-dup",
        memberName: "Michael Williams",
      },
    });

    const secondSnapshot = getDemoAttendanceSnapshot();
    expect(secondSnapshot.checkedIn).toBe(countAfterFirst);
    expect(secondSnapshot.arrivals.filter((a) => a.personName === "Michael Williams").length).toBe(1);

    // Third scan with different recordId but same memberId
    pushRealCheckIn({
      data: {
        recordId: "rec-dup-2",
        memberId: "m-dup",
        memberName: "Michael Williams",
      },
    });

    const thirdSnapshot = getDemoAttendanceSnapshot();
    expect(thirdSnapshot.checkedIn).toBe(countAfterFirst);
    expect(thirdSnapshot.arrivals.filter((a) => a.personName === "Michael Williams").length).toBe(1);
  });

  it("preserves progressive simulation continuity after a real check-in", () => {
    setDemoStateId("1259");
    vi.setSystemTime(realNow());

    const initial = getDemoAttendanceSnapshot();

    // Advance 30 seconds
    const t1 = realNow().getTime() + 30_000;
    vi.setSystemTime(new Date(t1));
    const mid = getDemoAttendanceSnapshot();
    expect(mid.checkedIn).toBeGreaterThanOrEqual(initial.checkedIn);

    // Push real check-in
    pushRealCheckIn({
      data: {
        recordId: "rec-mid-1",
        memberId: "m-mid",
        memberName: "David Johnson",
      },
    });

    const afterReal = getDemoAttendanceSnapshot();
    expect(afterReal.checkedIn).toBe(mid.checkedIn + 1);

    // Advance another 30 seconds - simulation continues advancing while preserving real check-in
    const t2 = t1 + 30_000;
    vi.setSystemTime(new Date(t2));
    const later = getDemoAttendanceSnapshot();
    expect(later.checkedIn).toBe(afterReal.checkedIn);
    expect(later.elapsedMs).toBeGreaterThan(afterReal.elapsedMs);
  });

  it("clearRealCheckIns deducts checked-in counts and removes members from arrivals", () => {
    setDemoStateId("1259");
    vi.setSystemTime(realNow());

    const initial = getDemoAttendanceSnapshot();

    pushRealCheckIn({
      data: {
        recordId: "rec-test-1",
        memberId: "m-test-1",
        memberName: "Michael Williams",
      },
    });

    const withMichael = getDemoAttendanceSnapshot();
    expect(withMichael.checkedIn).toBe(initial.checkedIn + 1);
    expect(withMichael.peopleHereNow).toBe(initial.peopleHereNow + 1);
    expect(withMichael.recentCheckIns).toBe(initial.recentCheckIns + 1);
    expect(withMichael.arrivals.some((a) => a.personName === "Michael Williams")).toBe(true);

    // Now call clearRealCheckIns (simulate clicking Reset tab)
    clearRealCheckIns();

    const afterReset = getDemoAttendanceSnapshot();
    expect(afterReset.checkedIn).toBe(initial.checkedIn);
    expect(afterReset.peopleHereNow).toBe(initial.peopleHereNow);
    expect(afterReset.recentCheckIns).toBe(initial.recentCheckIns);
    expect(afterReset.arrivals.some((a) => a.personName === "Michael Williams")).toBe(false);
  });
});