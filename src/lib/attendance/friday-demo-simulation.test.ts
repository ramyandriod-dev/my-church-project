import { describe, it, expect } from "vitest";
import { getAttendanceContext } from "@/lib/attendance/attendance-context";
import { FRIDAY_DEMO_STATES } from "@/lib/attendance/attendance-day-context";
import { getLiveOperations } from "@/lib/mock-data/live-operations";
import { members } from "@/lib/mock-data/people";
import {
  FRIDAY_DEMO_SIMULATION_DURATION_MS,
  FRIDAY_DEMO_SIMULATION_TICK_MS,
  getFridayDemoSimulationDurationMs,
  getFridayDemoCheckedInAt,
  getFridayDemoSimulationProgress,
  getFridayDemoArrivalTimeMs,
  getFridayDemoSimClockTimeMs,
  createFridayDemoArrivalEvents,
  ARRIVAL_TEMPLATES,
  isMobileAppExcludedMember,
} from "./friday-demo-simulation";

const at = (hour: number, minute = 0) => new Date(2026, 0, 16, hour, minute, 0, 0);

describe("Friday Demo: progressive attendance simulation", () => {
  it("takes a full 10 minutes for every live demo state", () => {
    for (const state of FRIDAY_DEMO_STATES) {
      const ctx = getAttendanceContext(at(state.hour, state.minute));
      if (ctx.state !== "live") continue;
      const duration = getFridayDemoSimulationDurationMs(ctx);
      expect(duration).toBe(FRIDAY_DEMO_SIMULATION_DURATION_MS);
      expect(duration).toBe(600_000);
    }
  });

  it("spends about 7 of the 10 minutes in quiet lulls and 3 minutes arriving", () => {
    const duration = getFridayDemoSimulationDurationMs(getAttendanceContext(at(9, 0)));
    const tFirst = getFridayDemoArrivalTimeMs(0, duration);
    const tLast = getFridayDemoArrivalTimeMs(362, duration);
    expect(tFirst).toBe(0);
    expect(tLast).toBe(600_000);

    // The first wave (1 → 25) trickles in slowly; lulls are multi-minute pauses.
    const t24 = getFridayDemoArrivalTimeMs(24, duration);
    expect(t24).toBeGreaterThan(30_000);
  });

  it("starts from 1 and never decreases as time advances", () => {
    const duration = getFridayDemoSimulationDurationMs(getAttendanceContext(at(9, 0)));
    let previous = getFridayDemoCheckedInAt(0, duration);
    expect(previous).toBe(1);

    for (let elapsed = 0; elapsed <= duration; elapsed += FRIDAY_DEMO_SIMULATION_TICK_MS) {
      const current = getFridayDemoCheckedInAt(elapsed, duration);
      expect(current).toBeGreaterThanOrEqual(previous);
      expect(current).toBeLessThanOrEqual(363);
      previous = current;
    }
    expect(previous).toBe(363);
  });

  it("keeps people-here-now equal to checked-in during the run", () => {
    const duration = getFridayDemoSimulationDurationMs(getAttendanceContext(at(9, 0)));
    for (let elapsed = 0; elapsed <= duration; elapsed += FRIDAY_DEMO_SIMULATION_TICK_MS * 7) {
      const progress = getFridayDemoSimulationProgress(elapsed, duration);
      expect(progress.peopleHereNow).toBe(progress.checkedIn);
      expect(progress.expectedAttendance).toBe(420);
      expect(progress.recentCheckIns).toBeGreaterThanOrEqual(1);
      expect(progress.recentCheckIns).toBeLessThanOrEqual(8);
      expect(progress.checkedIn + progress.missing).toBe(420);
    }
  });

  it("converges exactly to the M2 live operations values", () => {
    const duration = getFridayDemoSimulationDurationMs(getAttendanceContext(at(9, 0)));
    const finalProgress = getFridayDemoSimulationProgress(duration + FRIDAY_DEMO_SIMULATION_TICK_MS, duration);
    const m2 = getLiveOperations();

    expect(finalProgress.completed).toBe(true);
    expect(finalProgress.checkedIn).toBe(363);
    expect(finalProgress.peopleHereNow).toBe(363);
    expect(finalProgress.expectedAttendance).toBe(420);
    expect(finalProgress.attendanceRate).toBe(86.4);
    expect(finalProgress.recentCheckIns).toBe(m2.recentCheckIns);
    expect(finalProgress.missing).toBe(57);
  });

  it("schedules arrivals with variable, accelerating timing", () => {
    const duration = getFridayDemoSimulationDurationMs(getAttendanceContext(at(11, 0)));
    const times = Array.from({ length: 363 }, (_, index) => getFridayDemoArrivalTimeMs(index, duration));

    expect(times[0]).toBe(0);
    expect(times[times.length - 1]).toBe(duration);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }

    // Acceleration: the second half of arrivals is much denser than the first.
    const firstHalfSpan = times[181] - times[0];
    const secondHalfSpan = times[362] - times[181];
    expect(secondHalfSpan).toBeLessThan(firstHalfSpan);
  });

  it("freezes after the 25th arrival (lull), then resumes with the next wave", () => {
    const duration = getFridayDemoSimulationDurationMs(getAttendanceContext(at(9, 0)));
    const t24 = getFridayDemoArrivalTimeMs(24, duration); // count reaches 25
    const t25 = getFridayDemoArrivalTimeMs(25, duration); // first arrival after lull

    expect(getFridayDemoCheckedInAt(t24, duration)).toBe(25);
    // Mid-lull: counters stay frozen at 25.
    expect(getFridayDemoCheckedInAt((t24 + t25) / 2, duration)).toBe(25);
    expect(getFridayDemoCheckedInAt(t25, duration)).toBe(26);
    // The lull is a real 1–2 minute pause.
    expect(t25 - t24).toBeGreaterThanOrEqual(60_000);
    expect(t25 - t24).toBeLessThanOrEqual(121_000);
  });

  it("advances the church clock across each lull", () => {
    const duration = getFridayDemoSimulationDurationMs(getAttendanceContext(at(9, 0)));
    const sim24 = getFridayDemoSimClockTimeMs(24, duration);
    const sim25 = getFridayDemoSimClockTimeMs(25, duration);
    const gap = sim25 - sim24;
    expect(gap).toBeGreaterThanOrEqual(60_000); // at least 1 church-minute
    expect(gap).toBeLessThanOrEqual(121_000);    // at most ~2 church-minutes
  });

  it("builds deterministic, unique arrivals from the existing member list", () => {
    const duration = getFridayDemoSimulationDurationMs(getAttendanceContext(at(9, 0)));
    const baseNow = at(9, 0);
    const events = createFridayDemoArrivalEvents(0, 3, baseNow, duration);

    expect(events).toHaveLength(3);
    expect(events[0].id).toBe("demo-arrival-2");
    expect(events[2].id).toBe("demo-arrival-0");

    const ids = new Set(events.map((e) => e.id));
    const personIds = new Set(events.map((e) => e.personId));
    expect(ids.size).toBe(3);
    expect(personIds.size).toBe(3);

    // Newest-first ordering by scheduled time.
    expect(events[0].personId).toBe("demo-person-2");
    expect(events[1].personId).toBe("demo-person-1");
    expect(events[2].personId).toBe("demo-person-0");

    // Names come from the existing deterministic member list excluding mobile demo members.
    const expectedName = (index: number) =>
      `${ARRIVAL_TEMPLATES[index].firstName} ${ARRIVAL_TEMPLATES[index].lastName}`;
    expect(events[0].personName).toBe(expectedName(2));
    expect(events[2].personName).toBe(expectedName(0));

    // Rebuilding the same batch is identical.
    const again = createFridayDemoArrivalEvents(0, 3, baseNow, duration);
    expect(again).toEqual(events);
  });

  it("strictly excludes all mobile app test members from simulated background arrivals", () => {
    const duration = getFridayDemoSimulationDurationMs(getAttendanceContext(at(9, 0)));
    const allArrivals = createFridayDemoArrivalEvents(0, 363, at(9, 0), duration);
    for (const event of allArrivals) {
      expect(isMobileAppExcludedMember(event.personName)).toBe(false);
    }
  });
});
