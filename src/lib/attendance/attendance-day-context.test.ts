import { describe, it, expect } from "vitest";
import {
  FRIDAY_DEMO_STATES,
  getSimulatedFriday,
  isFriday,
  resolveAttendanceDay,
} from "./attendance-day-context";
import { getAttendanceContext } from "./attendance-context";

describe("Friday-only attendance day context", () => {
  it("recognizes Friday (getDay() === 5)", () => {
    expect(isFriday(new Date(2026, 8, 18, 10, 0))).toBe(true); // Friday, Sep 18 2026
    expect(isFriday(new Date(2026, 8, 17, 10, 0))).toBe(false); // Thursday, Sep 17 2026
  });

  it("real mode on Thursday → attendance is NOT relevant", () => {
    const realNow = new Date(2026, 8, 17, 20, 30);
    const r = resolveAttendanceDay(realNow, null);
    expect(r.mode).toBe("real");
    expect(r.isRealFriday).toBe(false);
    expect(r.attendanceRelevant).toBe(false);
    expect(r.effectiveNow).toBe(realNow);
  });

  it("real mode on Friday → attendance IS relevant", () => {
    const realNow = new Date(2026, 8, 18, 10, 30);
    const r = resolveAttendanceDay(realNow, null);
    expect(r.isRealFriday).toBe(true);
    expect(r.attendanceRelevant).toBe(true);
  });

  it("demo mode on Thursday → attendance relevant with a simulated Friday now", () => {
    const realNow = new Date(2026, 8, 17, 20, 30);
    const simulated = getSimulatedFriday(9, 0, realNow);
    const r = resolveAttendanceDay(realNow, { active: true, simulatedNow: simulated });
    expect(r.mode).toBe("demo");
    expect(r.isRealFriday).toBe(false);
    expect(r.attendanceRelevant).toBe(true);
    expect(r.effectiveNow).toBe(simulated);
  });

  it("getSimulatedFriday lands on a Friday at the requested time", () => {
    const simulated = getSimulatedFriday(11, 0, new Date(2026, 8, 17, 12, 0)); // from Thursday
    expect(simulated.getDay()).toBe(5);
    expect(simulated.getHours()).toBe(11);
    expect(simulated.getMinutes()).toBe(0);
  });
});

describe("Milestone 2.1 demo checkpoints map to the correct attendance state", () => {
  const checkpoints = [
    { id: "0859", state: "not-started" },
    { id: "0900", state: "live" },
    { id: "1100", state: "live" },
    { id: "1230", state: "live" },
    { id: "1259", state: "live" },
    { id: "1300", state: "review" },
    { id: "1301", state: "review" },
  ];

  it("defines exactly the seven demo states", () => {
    expect(FRIDAY_DEMO_STATES).toHaveLength(7);
  });

  for (const cp of checkpoints) {
    it(`${cp.id} → ${cp.state}`, () => {
      const demo = FRIDAY_DEMO_STATES.find((s) => s.id === cp.id);
      expect(demo).toBeDefined();
      const simulated = getSimulatedFriday(demo!.hour, demo!.minute, new Date(2026, 8, 17, 12, 0));
      const ctx = getAttendanceContext(simulated);
      expect(ctx.state).toBe(cp.state);
    });
  }

  it("11:00 → LIVE and flagged as main service window", () => {
    const demo = FRIDAY_DEMO_STATES.find((s) => s.id === "1100")!;
    const simulated = getSimulatedFriday(demo.hour, demo.minute, new Date(2026, 8, 17, 12, 0));
    const r = resolveAttendanceDay(new Date(2026, 8, 17, 20, 0), { active: true, simulatedNow: simulated });
    expect(r.mode).toBe("demo");
    expect(isFriday(r.effectiveNow)).toBe(true);
    const ctx = getAttendanceContext(r.effectiveNow);
    expect(ctx.state).toBe("live");
    expect(ctx.isMainServiceTime).toBe(true);
  });

  it("demo never leaks into real-mode resolution", () => {
    const realNow = new Date(2026, 8, 17, 9, 0); // Thursday
    const r = resolveAttendanceDay(realNow, null);
    expect(r.attendanceRelevant).toBe(false);
    // time-of-day would be "live", but attendance must stay hidden for the day gate
    expect(getAttendanceContext(r.effectiveNow).state).toBe("live");
  });

  describe("Automatic Friday real-time phase progression", () => {
    it("at 08:30 on Friday → automatically not-started", () => {
      const realFridayMorning = new Date(2026, 8, 25, 8, 30);
      const r = resolveAttendanceDay(realFridayMorning, null);
      expect(r.mode).toBe("real");
      expect(r.attendanceRelevant).toBe(true);
      const ctx = getAttendanceContext(r.effectiveNow);
      expect(ctx.state).toBe("not-started");
    });

    it("at 10:30 on Friday → automatically live", () => {
      const realFridayLive = new Date(2026, 8, 25, 10, 30);
      const r = resolveAttendanceDay(realFridayLive, null);
      expect(r.mode).toBe("real");
      expect(r.attendanceRelevant).toBe(true);
      const ctx = getAttendanceContext(r.effectiveNow);
      expect(ctx.state).toBe("live");
    });

    it("at past 3 PM (15:17) on Friday → automatically review", () => {
      const realFridayAfternoon = new Date(2026, 8, 25, 15, 17);
      const r = resolveAttendanceDay(realFridayAfternoon, null);
      expect(r.mode).toBe("real");
      expect(r.attendanceRelevant).toBe(true);
      const ctx = getAttendanceContext(r.effectiveNow);
      expect(ctx.state).toBe("review");
      expect(ctx.minutesSinceEnd).toBe(137); // 15:17 - 13:00 = 137 minutes
    });

    it("on Sunday → real attendance is relevant", () => {
      const realSunday = new Date(2026, 8, 27, 10, 0);
      const r = resolveAttendanceDay(realSunday, null);
      expect(r.mode).toBe("real");
      expect(r.attendanceRelevant).toBe(true);
    });
  });
});