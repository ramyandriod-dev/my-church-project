import { VERSE_DATASET, type Verse } from "@/data/verses";
import { daysSinceEpoch, getVerseOfTheDay } from "./rotation";

/**
 * Church seasons for the member app: a subtle seasonal tint on the verse card, a
 * small season chip, and a verse chosen from a season-appropriate list.
 *
 * Calendar: Heliopolis follows the Egyptian church calendar, so Easter is the
 * Orthodox Easter and Christmas is celebrated on 7 January. Windows (tunable here):
 *   lent      55 days before Easter up to the day before it (Great Lent + Holy Week)
 *   easter    Easter Sunday for 14 days
 *   christmas 20 December - 14 January (covers 25 Dec and 7 Jan)
 *
 * Verses: each season lists references; only those present in the bundled verse
 * dataset are used, so adding verses to the dataset enriches the pool with no
 * code change. With no match, the normal verse of the day is used.
 */

export type Season = "lent" | "easter" | "christmas";

const MS_DAY = 86_400_000;

/** Orthodox Easter (Gregorian date), valid 1900-2099. Meeus' Julian algorithm. */
export function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 = March, 4 = April (Julian)
  const day = ((d + e + 114) % 31) + 1;
  return new Date(year, month - 1, day + 13); // Julian -> Gregorian
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** The season a date falls in, or null in ordinary time. */
export function seasonForDate(date: Date): Season | null {
  const day = startOfDay(date);
  const month = date.getMonth();
  if ((month === 11 && date.getDate() >= 20) || (month === 0 && date.getDate() <= 14)) {
    return "christmas";
  }
  const easter = startOfDay(orthodoxEaster(date.getFullYear()));
  if (day >= easter - 55 * MS_DAY && day < easter) return "lent";
  if (day >= easter && day <= easter + 13 * MS_DAY) return "easter";
  return null;
}

export interface SeasonMeta {
  emoji: string;
  en: string;
  ar: string;
  /** CSS background laid over the photo scrim. Kept subtle. */
  tint: string;
  /** Accent for the church name and rule on the share card. */
  accent: string;
}

export const SEASON_META: Record<Season, SeasonMeta> = {
  lent: {
    emoji: "✝️",
    en: "Lent",
    ar: "الصوم الكبير",
    tint: "linear-gradient(180deg, rgba(76,45,110,0.28) 0%, rgba(52,30,84,0.38) 100%)",
    accent: "#DCCBF2",
  },
  easter: {
    emoji: "🕊️",
    en: "Easter season",
    ar: "موسم القيامة",
    tint: "radial-gradient(circle at 85% 0%, rgba(255,240,200,0.42) 0%, rgba(255,240,200,0) 60%)",
    accent: "#F6E3A4",
  },
  christmas: {
    emoji: "⭐",
    en: "Christmas",
    ar: "موسم الميلاد",
    tint: "linear-gradient(180deg, rgba(12,74,52,0.26) 0%, rgba(122,24,36,0.34) 100%)",
    accent: "#F3CFC6",
  },
};

/** Season-appropriate references. Entries missing from the dataset are skipped. */
const SEASON_REFS: Record<Season, string[]> = {
  lent: [
    "Psalm 103:8", "Psalm 86:5", "Romans 5:8", "Hebrews 12:1-2", "Romans 5:3-5",
    "James 4:8", "James 5:16", "Hebrews 4:16", "2 Corinthians 4:16-18",
    "Matthew 11:28-30", "Psalm 51:10", "Isaiah 53:5", "Joel 2:12-13",
  ],
  easter: [
    "Job 19:25", "John 16:33", "Psalm 118:24", "Revelation 5:12", "Isaiah 61:1-3",
    "Ezekiel 37:14", "Matthew 28:20", "John 3:16", "John 10:28",
    "John 11:25", "Matthew 28:6", "Luke 24:6", "1 Corinthians 15:57",
  ],
  christmas: [
    "John 1:1", "John 3:16", "Luke 1:37", "John 14:27", "Numbers 6:24-26",
    "Zephaniah 3:17", "Psalm 100:1-5", "Ephesians 2:4-5", "Matthew 28:20",
    "Isaiah 9:6", "Luke 2:10-11", "Matthew 1:23",
  ],
};

const OVERRIDE_KEY = "cmp:season-preview";

/**
 * The season in effect. Adding `?season=easter|lent|christmas|none` to the app
 * URL previews a season on this device for the session (it changes only what that
 * person sees, never any data).
 */
export function resolveSeason(date: Date = new Date()): Season | null {
  if (typeof window !== "undefined") {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("season");
      if (fromUrl) window.sessionStorage.setItem(OVERRIDE_KEY, fromUrl);
      const o = window.sessionStorage.getItem(OVERRIDE_KEY);
      if (o === "none") return null;
      if (o === "lent" || o === "easter" || o === "christmas") return o;
    } catch {
      // Storage blocked: fall through to the real calendar.
    }
  }
  return seasonForDate(date);
}

/** Verses from the dataset that suit a season. */
export function seasonalVerses(season: Season): Verse[] {
  const wanted = new Set(SEASON_REFS[season]);
  return VERSE_DATASET.verses.filter((v) => wanted.has(v.ref));
}

/** Today's hero verse: seasonal in season (stable for the day), else the normal verse of the day. */
export function getHeroVerse(date: Date = new Date()): { verse: Verse | null; season: Season | null } {
  const season = resolveSeason(date);
  if (season) {
    const pool = seasonalVerses(season);
    if (pool.length > 0) {
      return { verse: pool[daysSinceEpoch(date) % pool.length], season };
    }
  }
  return { verse: getVerseOfTheDay(date), season };
}
