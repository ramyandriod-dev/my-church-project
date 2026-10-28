import { describe, it, expect } from "vitest";
import { missedWeeksSince } from "./missed-weeks";
import { WELCOME_BACK_MIN_MISSED_WEEKS } from "./welcome-back-helper";

const day = (n: number) => new Date(Date.UTC(2026, 9, 28) - n * 86_400_000);
const today = day(0);

describe("missedWeeksSince", () => {
  it("counts a regular attender as not having missed anything", () => {
    expect(missedWeeksSince(day(7), today)).toBe(0);
    expect(missedWeeksSince(day(13), today)).toBe(0);
  });

  it("counts whole weeks beyond the one they would normally have been back by", () => {
    expect(missedWeeksSince(day(14), today)).toBe(1);
    expect(missedWeeksSince(day(21), today)).toBe(2);
    expect(missedWeeksSince(day(28), today)).toBe(3);
    expect(missedWeeksSince(day(84), today)).toBe(11);
  });

  it("never goes negative, even for a visit on or after the arrival", () => {
    expect(missedWeeksSince(day(0), today)).toBe(0);
    expect(missedWeeksSince(new Date(today.getTime() + 86_400_000), today)).toBe(0);
  });

  it("agrees with the banner's threshold: three weeks away shows it, two does not", () => {
    expect(missedWeeksSince(day(21), today)).toBeGreaterThanOrEqual(WELCOME_BACK_MIN_MISSED_WEEKS);
    expect(missedWeeksSince(day(14), today)).toBeLessThan(WELCOME_BACK_MIN_MISSED_WEEKS);
  });
});
