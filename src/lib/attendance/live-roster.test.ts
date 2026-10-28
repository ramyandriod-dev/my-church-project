import { describe, it, expect } from "vitest";
import { distinctArrivals, liveStats } from "./live-roster";

const row = (id: string, memberId: string, iso: string) => ({ id, memberId, checkInTime: iso });

describe("live roster", () => {
  it("lists a member once, keeping their newest arrival", () => {
    const rows = [row("a", "mina", "2026-10-23T08:00:00Z"), row("b", "peter", "2026-10-23T08:05:00Z"), row("c", "mina", "2026-10-23T08:10:00Z")];
    expect(distinctArrivals(rows).map((r) => r.id)).toEqual(["c", "b"]);
  });
  it("counts people, not rows, and finds the recent ones", () => {
    const now = new Date("2026-10-23T08:10:30Z");
    const s = liveStats([row("a", "mina", "2026-10-23T08:00:00Z"), row("c", "mina", "2026-10-23T08:10:00Z"), row("b", "peter", "2026-10-23T08:05:00Z")], now);
    expect(s.count).toBe(2);
    expect(s.recent).toBe(1);
    expect(s.lastCheckInAt?.toISOString()).toBe("2026-10-23T08:10:00.000Z");
  });
  it("is empty with no rows", () => {
    expect(liveStats([])).toEqual({ count: 0, recent: 0, lastCheckInAt: null });
  });
});
