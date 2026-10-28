import {
  VERSE_DATASET,
  VERSE_IMAGES,
  VERSE_COUNT,
  VERSE_IMAGE_COUNT,
  type Verse,
} from "@/data/verses";

/**
 * Deterministic Verse of the Day.
 *
 * Selection is a pure function of the local calendar date: same day → same
 * verse and same background for every user, with no server state, no cookies
 * and no randomness. The dataset was shuffled once at build time (seeded), so
 * walking it sequentially produces an order that reads as random but is stable
 * across devices and redeploys.
 *
 * The verse cycle (148 days) and image cycle (50 days) are coprime in effect:
 * a given verse/background pairing repeats only every LCM(148, 50) = 3,700 days.
 */

/** Days elapsed since 1970-01-01, computed from the *local* date parts. */
export function daysSinceEpoch(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** Deterministic index into the verse dataset for a given local date. */
export function verseIndexOf(date: Date = new Date()): number {
  if (VERSE_COUNT === 0) return 0;
  return daysSinceEpoch(date) % VERSE_COUNT;
}

/** Deterministic index into the background image manifest for a given date. */
export function imageIndexOf(date: Date = new Date()): number {
  if (VERSE_IMAGE_COUNT === 0) return 0;
  return daysSinceEpoch(date) % VERSE_IMAGE_COUNT;
}

/** Today's verse. Falls back to index 0 if the dataset were ever empty. */
export function getVerseOfTheDay(date: Date = new Date()): Verse | null {
  if (VERSE_COUNT === 0) return null;
  return VERSE_DATASET.verses[verseIndexOf(date)] ?? null;
}

/** Today's background image path, or null when no images are bundled. */
export function getVerseImage(date: Date = new Date()): string | null {
  if (VERSE_IMAGE_COUNT === 0) return null;
  return VERSE_IMAGES[imageIndexOf(date)] ?? null;
}

/**
 * The local calendar day (YYYY-MM-DD) used for selection — exposed for
 * "your date, your verse" copy and for testing.
 */
export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Display helpers ───────────────────────────────────────────────────

const AR_BOOKS: Record<string, string> = {
  Genesis: "التكوين",
  Exodus: "الخروج",
  Numbers: "العددان",
  Deuteronomy: "تثنية",
  Joshua: "يشوع",
  Judges: "القضاة",
  Ruth: "راعوث",
  "1 Samuel": "صموئيل الأولى",
  "2 Samuel": "صموئيل الثانية",
  "1 Kings": "الملوك الأولى",
  "2 Kings": "الملوك الثانية",
  "2 Chronicles": "أخبار الأيام الثانية",
  Nehemiah: "نحميا",
  Job: "أيوب",
  Psalm: "مزمور",
  Psalms: "مزمور",
  Proverbs: "أمثال",
  Ecclesiastes: "الجامع",
  Isaiah: "إشعياء",
  Jeremiah: "إرميا",
  Lamentations: "مرثيات",
  Ezekiel: "حزقيال",
  Habakkuk: "حبقوق",
  Micah: "ميخا",
  Joel: "يوئيل",
  Zephaniah: "صفويا",
  Malachi: "ملاخي",
  Matthew: "متى",
  Mark: "مرقس",
  Luke: "لوقا",
  John: "يوحنا",
  Acts: "أعمال الرسل",
  Romans: "رومية",
  "1 Corinthians": "كورنثوس الأولى",
  "2 Corinthians": "كورنثوس الثانية",
  Galatians: "غلاطية",
  Ephesians: "أفسس",
  Philippians: "فيليبي",
  Colossians: "كولوسي",
  "1 Thessalonians": "تسالونيكية الأولى",
  "2 Timothy": "تيموثاوس الثانية",
  Hebrews: "العبرانيين",
  James: "يعقوب",
  "1 Peter": "بطرس الأولى",
  "2 Peter": "بطرس الثانية",
  "1 John": "يوحنا الأولى",
  Revelation: "الرؤيا",
};

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
}

/** Render a reference like "Psalm 119:130" for the active locale. */
export function formatVerseRef(ref: string, locale: "ar" | "en" = "en"): string {
  if (locale !== "ar") return ref;
  const m = ref.match(/^([1-3]?\s?[A-Za-z][A-Za-z\s]+?)\s+(.+)$/);
  if (!m) return ref;
  const book = AR_BOOKS[m[1].trim().replace(/\s+/g, " ")];
  if (!book) return ref;
  return `${book} ${toArabicDigits(m[2])}`;
}

export const THEME_LABELS: Record<string, { en: string; ar: string }> = {
  courage: { en: "Courage", ar: "شجاعة" },
  strength: { en: "Strength", ar: "قوة" },
  peace: { en: "Peace", ar: "سلام" },
  love: { en: "Love", ar: "محبة" },
  presence: { en: "God's Presence", ar: "حضور الله" },
  hope: { en: "Hope", ar: "أمل" },
  perseverance: { en: "Perseverance", ar: "مثابرة" },
  wisdom: { en: "Wisdom", ar: "حكمة" },
  prayer: { en: "Prayer", ar: "صلاة" },
  community: { en: "Community", ar: "الجتمع" },
  worship: { en: "Worship", ar: "عبادة" },
};

export function themeLabel(theme: string, locale: "ar" | "en" = "en"): string | null {
  const t = THEME_LABELS[theme];
  if (!t) return null;
  return locale === "ar" ? t.ar : t.en;
}

export type { Verse };
