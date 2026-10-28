import { describe, it, expect } from "vitest";
import {
  daysSinceEpoch,
  verseIndexOf,
  imageIndexOf,
  getVerseOfTheDay,
  getVerseImage,
  localDayKey,
  formatVerseRef,
  themeLabel,
  THEME_LABELS,
} from "./rotation";
import {
  VERSE_DATASET,
  VERSE_COUNT,
  VERSE_IMAGE_COUNT,
  VERSE_IMAGES,
  ENGLISH_NOTICE,
  ENGLISH_NOTICE_URL,
} from "@/data/verses";

// Local calendar dates — daysSinceEpoch reads local date parts only.
const TODAY = new Date(2026, 9, 6); // 2026-10-06
const TOMORROW = new Date(2026, 9, 7);
const YESTERDAY = new Date(2026, 9, 5);

describe("dataset integrity", () => {
  it("contains verses in the supported 100–150 range", () => {
    expect(VERSE_COUNT).toBeGreaterThanOrEqual(100);
    expect(VERSE_COUNT).toBeLessThanOrEqual(150);
    expect(VERSE_DATASET.verses).toHaveLength(VERSE_COUNT);
  });

  it("bundles the expected 50 background images", () => {
    expect(VERSE_IMAGE_COUNT).toBe(50);
    expect(VERSE_IMAGES).toHaveLength(50);
    for (const src of VERSE_IMAGES) {
      expect(src.startsWith("/verse-bg/")).toBe(true);
    }
    expect(new Set(VERSE_IMAGES).size).toBe(50);
  });

  it("has non-empty Arabic and English text for every verse", () => {
    for (const v of VERSE_DATASET.verses) {
      expect(v.arabic.trim().length, v.ref).toBeGreaterThan(0);
      expect(v.english.trim().length, v.ref).toBeGreaterThan(0);
      expect(v.ref.trim().length).toBeGreaterThan(0);
    }
  });

  it("has unique references", () => {
    const refs = VERSE_DATASET.verses.map((v) => v.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it("has no invisible bidi/formatting controls in Arabic text", () => {
    // Leftover U+200E etc. from the source dataset corrupt RTL punctuation.
    const invisible = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;
    for (const v of VERSE_DATASET.verses) {
      expect(invisible.test(v.arabic), `${v.ref} contains bidi controls`).toBe(false);
    }
  });

  it("assigns every verse a theme that has an EN and AR label", () => {
    for (const v of VERSE_DATASET.verses) {
      const label = THEME_LABELS[v.theme];
      expect(label, `missing theme label for "${v.theme}" (${v.ref})`).toBeDefined();
      expect(label.en.length).toBeGreaterThan(0);
      expect(label.ar.length).toBeGreaterThan(0);
    }
  });
});

describe("English attribution", () => {
  it("requires no attribution for public-domain WEB", () => {
    expect(VERSE_DATASET.translation.english.noticeRequired).toBe(false);
    expect(ENGLISH_NOTICE).toBeNull();
    expect(ENGLISH_NOTICE_URL).toBeNull();
  });
});

describe("daysSinceEpoch", () => {
  it("is zero for 1970-01-01", () => {
    expect(daysSinceEpoch(new Date(1970, 0, 1))).toBe(0);
  });

  it("increments by one for consecutive local days", () => {
    expect(daysSinceEpoch(TOMORROW) - daysSinceEpoch(TODAY)).toBe(1);
    expect(daysSinceEpoch(TODAY) - daysSinceEpoch(YESTERDAY)).toBe(1);
  });

  it("ignores time of day", () => {
    const morning = new Date(2026, 9, 6, 0, 0, 0);
    const night = new Date(2026, 9, 6, 23, 59, 59);
    expect(daysSinceEpoch(morning)).toBe(daysSinceEpoch(night));
  });
});

describe("daily rotation", () => {
  it("returns the same verse for the same date", () => {
    const a = getVerseOfTheDay(new Date(2026, 9, 6));
    const b = getVerseOfTheDay(new Date(2026, 9, 6));
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.ref).toBe(b!.ref);
    expect(a!.id).toBe(b!.id);
  });

  it("advances by one verse per day", () => {
    const today = verseIndexOf(TODAY);
    const tomorrow = verseIndexOf(TOMORROW);
    expect(tomorrow).toBe((today + 1) % VERSE_COUNT);
  });

  it("walks backwards a day", () => {
    expect(verseIndexOf(YESTERDAY)).toBe(
      (verseIndexOf(TODAY) - 1 + VERSE_COUNT) % VERSE_COUNT,
    );
  });

  it("stays in range across a full year", () => {
    for (let d = 0; d < 366; d += 1) {
      const date = new Date(2026, 0, 1 + d);
      expect(verseIndexOf(date)).toBeGreaterThanOrEqual(0);
      expect(verseIndexOf(date)).toBeLessThan(VERSE_COUNT);
      expect(imageIndexOf(date)).toBeGreaterThanOrEqual(0);
      expect(imageIndexOf(date)).toBeLessThan(VERSE_IMAGE_COUNT);
    }
  });

  it("returns a verse whose id matches its index", () => {
    const v = getVerseOfTheDay(TODAY);
    expect(v).not.toBeNull();
    expect(v!.id).toBe(verseIndexOf(TODAY));
  });

  it("does not repeat a verse within the full cycle", () => {
    const seen = new Set<number>();
    for (let d = 0; d < VERSE_COUNT; d += 1) {
      seen.add(verseIndexOf(new Date(2026, 0, 1 + d)));
    }
    expect(seen.size).toBe(VERSE_COUNT);
  });

  it("decorrelates image from verse over the cycle", () => {
    // verse cycle = 148 days, image cycle = 50 days → pair repeats at LCM = 3700
    const pairs = new Set<string>();
    for (let d = 0; d < VERSE_COUNT; d += 1) {
      const date = new Date(2026, 0, 1 + d);
      pairs.add(`${verseIndexOf(date)}:${imageIndexOf(date)}`);
    }
    expect(pairs.size).toBe(VERSE_COUNT);
  });
});

describe("background image", () => {
  it("is deterministic per date", () => {
    expect(getVerseImage(TODAY)).toBe(getVerseImage(TODAY));
  });

  it("returns a bundled path", () => {
    const src = getVerseImage(TODAY);
    expect(src).not.toBeNull();
    expect(src!.startsWith("/verse-bg/")).toBe(true);
    expect(VERSE_IMAGES).toContain(src);
  });

  it("returns null only when no images are bundled", () => {
    // With images present the function must never fall back to null.
    expect(getVerseImage(TODAY)).not.toBeNull();
  });
});

describe("localDayKey", () => {
  it("formats YYYY-MM-DD", () => {
    expect(localDayKey(new Date(2026, 9, 6))).toBe("2026-10-06");
    expect(localDayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("formatVerseRef", () => {
  it("passes references through for English", () => {
    expect(formatVerseRef("Psalm 119:130", "en")).toBe("Psalm 119:130");
    expect(formatVerseRef("2 Corinthians 12:9-10", "en")).toBe(
      "2 Corinthians 12:9-10",
    );
  });

  it("translates book names into Arabic", () => {
    expect(formatVerseRef("Psalm 119:130", "ar")).toContain("مزمور");
    expect(formatVerseRef("Jeremiah 29:11", "ar")).toContain("إرميا");
    expect(formatVerseRef("Hebrews 10:24-25", "ar")).toContain("العبرانيين");
  });

  it("converts verse numbers to Arabic-Indic digits", () => {
    const ref = formatVerseRef("Psalm 119:130", "ar");
    expect(ref).toContain("١١٩");
    expect(ref).toContain("١٣٠");
    expect(/[0-9]/.test(ref)).toBe(false);
  });

  it("handles numbered books", () => {
    expect(formatVerseRef("2 Corinthians 12:9-10", "ar")).toContain("كورنثوس الثانية");
    expect(formatVerseRef("1 Peter 5:7", "ar")).toContain("بطرس الأولى");
  });

  it("leaves unknown books unchanged rather than producing garbage", () => {
    expect(formatVerseRef("NotABook 1:1", "ar")).toBe("NotABook 1:1");
  });
});

describe("themeLabel", () => {
  it("returns localized labels", () => {
    expect(themeLabel("courage", "en")).toBe("Courage");
    expect(themeLabel("courage", "ar")).toBe("شجاعة");
  });

  it("returns null for unknown themes", () => {
    expect(themeLabel("nope", "en")).toBeNull();
  });
});
