import { describe, it, expect } from "vitest";
import { HOLD_MINUTES, buildAvailability, freeSeatsInRow, holdExpiry, isActive, rowCapacity } from "./reservation-rules";

const now = new Date("2026-10-30T09:00:00Z");
const res = (over: Partial<Parameters<typeof isActive>[0] & { sectionId: string; row: string; seatCount: number }> = {}) => ({
  sectionId: "ground_left", row: "A", seatCount: 3, status: "held", heldUntil: holdExpiry(now), ...over,
});

describe("seat reservation rules", () => {
  it("holds for five minutes", () => {
    expect(HOLD_MINUTES).toBe(5);
    expect(holdExpiry(now).toISOString()).toBe("2026-10-30T09:05:00.000Z");
  });
  it("a hold counts until it expires, then frees itself", () => {
    const r = res();
    expect(isActive(r, new Date("2026-10-30T09:04:59Z"))).toBe(true);
    expect(isActive(r, new Date("2026-10-30T09:05:00Z"))).toBe(false);
    expect(freeSeatsInRow("ground_left", "A", [r], new Date("2026-10-30T09:06:00Z"))).toBe(16);
  });
  it("seated counts forever, released never", () => {
    const later = new Date("2026-10-30T12:00:00Z");
    expect(isActive(res({ status: "seated" }), later)).toBe(true);
    expect(isActive(res({ status: "released" }), now)).toBe(false);
  });
  it("subtracts active reservations from the row", () => {
    expect(freeSeatsInRow("ground_left", "A", [res(), res({ seatCount: 2 })], now)).toBe(11);
    expect(freeSeatsInRow("ground_left", "B", [res()], now)).toBe(16);
  });
  it("knows row sizes and rejects unknown rows", () => {
    expect(rowCapacity("ground_center", "J")).toBe(20);
    expect(rowCapacity("gallery", "A")).toBeNull();
    expect(rowCapacity("nowhere", "A")).toBeNull();
  });
  it("builds per-section availability", () => {
    const a = buildAvailability([res()], now);
    expect(a.find((s) => s.id === "ground_left")!.rows[0]).toEqual({ row: "A", total: 16, available: 13 });
    expect(a.find((s) => s.id === "ground_left")!.available).toBe(157);
  });
});
