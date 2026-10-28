import { describe, it, expect } from "vitest";
import { orthodoxEaster, seasonForDate, seasonalVerses, getHeroVerse } from "./seasons";

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("orthodoxEaster", () => {
  it("matches the published Orthodox/Coptic Easter dates", () => {
    expect(ymd(orthodoxEaster(2025))).toBe("2025-04-20");
    expect(ymd(orthodoxEaster(2026))).toBe("2026-04-12");
    expect(ymd(orthodoxEaster(2027))).toBe("2027-05-02");
    expect(ymd(orthodoxEaster(2028))).toBe("2028-04-16");
  });
});

describe("seasonForDate", () => {
  it("is Christmas from 20 December to 14 January, across the new year", () => {
    expect(seasonForDate(new Date(2026, 11, 19))).toBeNull();
    expect(seasonForDate(new Date(2026, 11, 20))).toBe("christmas");
    expect(seasonForDate(new Date(2027, 0, 7))).toBe("christmas");
    expect(seasonForDate(new Date(2027, 0, 14))).toBe("christmas");
    expect(seasonForDate(new Date(2027, 0, 15))).toBeNull();
  });

  it("is Lent for the 55 days before Easter, then Easter for 14 days", () => {
    // Easter 2026 = 12 April
    expect(seasonForDate(new Date(2026, 1, 16))).toBe("lent");
    expect(seasonForDate(new Date(2026, 1, 15))).toBeNull();
    expect(seasonForDate(new Date(2026, 3, 11))).toBe("lent");
    expect(seasonForDate(new Date(2026, 3, 12))).toBe("easter");
    expect(seasonForDate(new Date(2026, 3, 25))).toBe("easter");
    expect(seasonForDate(new Date(2026, 3, 26))).toBeNull();
  });

  it("is ordinary time in mid-summer", () => {
    expect(seasonForDate(new Date(2026, 7, 10))).toBeNull();
  });
});

describe("getHeroVerse", () => {
  it("has verses in the dataset for every season", () => {
    for (const s of ["lent", "easter", "christmas"] as const) {
      expect(seasonalVerses(s).length).toBeGreaterThan(0);
    }
  });

  it("returns a seasonal verse in season and is stable within a day", () => {
    const a = getHeroVerse(new Date(2026, 3, 14));
    const b = getHeroVerse(new Date(2026, 3, 14, 22, 30));
    expect(a.season).toBe("easter");
    expect(a.verse?.id).toBe(b.verse?.id);
    expect(seasonalVerses("easter").some((v) => v.id === a.verse?.id)).toBe(true);
  });

  it("falls back to the normal verse of the day outside a season", () => {
    const r = getHeroVerse(new Date(2026, 7, 10));
    expect(r.season).toBeNull();
    expect(r.verse).not.toBeNull();
  });
});
