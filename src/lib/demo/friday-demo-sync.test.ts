import { describe, it, expect, beforeEach } from "vitest";
import { getAttendanceContext } from "@/lib/attendance/attendance-context";
import { getWindowPresentation } from "@/lib/staff-checkin-demo/window-presentation";
import { getDemoClockInfo } from "./demo-clock";
import { getDemoStateId, setDemoStateId } from "./demo-clock-store";

/**
 * M5 hotfix — Demo Mode synchronization.
 *
 * Dashboard / /staff-checkin-demo / /checkin-scanner all derive their effective
 * `now` from the SAME shared demo clock (this store). These tests prove that
 * every demo checkpoint yields the identical AttendanceContext state on the
 * Dashboard, the matching presentation on the Mobile Simulator, and the
 * matching scanner availability — and that changing the selector updates the
 * Mobile Demo immediately.
 */

/** Real clock used for simulation: a Thursday 23:54, far outside any window. */
const realNow = () => new Date(2026, 8, 17, 23, 54, 0);

beforeEach(() => {
  setDemoStateId(null);
});

describe("Friday Demo clock store", () => {
  it("is OFF by default → effectiveNow is the real clock", () => {
    const info = getDemoClockInfo(realNow());
    expect(info.demoMode).toBe(false);
    expect(info.effectiveNow.getTime()).toBe(realNow().getTime());
  });

  it("stores and returns the selected demo state id", () => {
    setDemoStateId("1259");
    expect(getDemoStateId()).toBe("1259");
    setDemoStateId("1300");
    expect(getDemoStateId()).toBe("1300");
  });

  it("ignores an unknown state id (falls back to the real clock)", () => {
    setDemoStateId("bogus");
    const info = getDemoClockInfo(realNow());
    expect(info.demoMode).toBe(false);
    expect(info.effectiveNow.getTime()).toBe(realNow().getTime());
  });
});

describe("Demo Mode synchronization across Dashboard, Mobile and Scanner", () => {
  it.each([
    ["0859", "not-started", false],
    ["0900", "live", true],
    ["1100", "live", true],
    ["1230", "live", true],
    ["1259", "live", true],
    ["1300", "review", false],
    ["1301", "review", false],
  ] as const)(
    "Demo %s → Dashboard=%s, Mobile=%s, Scanner check-in=%s",
    (stateId, expectedState, scannerAvailable) => {
      setDemoStateId(stateId);

      // ONE effectiveNow shared by every consumer.
      const clock = getDemoClockInfo(realNow());
      expect(clock.demoMode).toBe(true);

      // Dashboard Friday Demo surface (what the attendance page badge shows).
      const dashboardState = getAttendanceContext(clock.effectiveNow).state;

      // Mobile Simulator banner + Scanner availability (same effectiveNow).
      const mobile = getWindowPresentation(clock.effectiveNow);

      expect(dashboardState).toBe(expectedState);
      expect(mobile.state).toBe(expectedState);
      expect(mobile.checkInAvailable).toBe(scannerAvailable);
      expect(mobile.checkInAvailable).toBe(dashboardState === "live");
    }
  );
});

describe("Changing the Demo time updates the Mobile Demo state", () => {
  it("12:59 → Live, then 13:00 → Closed, immediately", () => {
    setDemoStateId("1259");
    const before = getWindowPresentation(getDemoClockInfo(realNow()).effectiveNow);
    expect(before.state).toBe("live");
    expect(before.checkInAvailable).toBe(true);

    setDemoStateId("1300");
    const after = getWindowPresentation(getDemoClockInfo(realNow()).effectiveNow);
    expect(after.state).toBe("review");
    expect(after.checkInAvailable).toBe(false);
  });

  it("exiting Demo Mode returns every screen to the real clock", () => {
    setDemoStateId("1259");
    setDemoStateId(null);
    const clock = getDemoClockInfo(realNow());
    expect(clock.demoMode).toBe(false);
    expect(clock.effectiveNow.getTime()).toBe(realNow().getTime());
  });
});