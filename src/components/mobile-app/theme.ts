/**
 * Mobile design tokens — premium consumer-app visual language.
 *
 * Extracted from the Grace Church UI showcase reference. Every token here is
 * consumed by `primitives.tsx`, so retuning this one file retunes the whole
 * mobile app. Values are Tailwind class strings so they compose with the
 * existing utility-first codebase without a config migration.
 *
 * Visual rules encoded here (do not drift):
 *  - App background is a very light neutral, never pure white
 *  - Cards are white with a HAIRLINE border and a SOFT shadow (never border-2)
 *  - Primary text is deep navy; secondary text is a muted blue-grey
 *  - Blue is the interactive color (links, active tab)
 *  - Deep navy is the fill for primary buttons and active filter chips
 *  - Each action/category owns one pastel accent (bg + saturated icon color)
 *  - Section headers are sentence-case, ~17px, semibold, navy — never uppercase
 */

// ─── Surfaces ───────────────────────────────────────────────────────
export const surface = {
  /** App canvas behind every screen. */
  app: "bg-[#FBF8F3]",
  /** Cards and sheets. */
  card: "bg-white",
  /** Sunk panels (filters, inputs). */
  sunken: "bg-[#F1ECE0]",
  /** Hairline divider / card border. */
  line: "border-[#EAE3D6]",
} as const;

// ─── Ink ────────────────────────────────────────────────────────────
export const ink = {
  /** Headings, titles, primary values. */
  strong: "text-[#132F4C]",
  /** Body copy. */
  body: "text-[#334A63]",
  /** Secondary / meta text. */
  muted: "text-[#6F6650]",
  /** Tertiary / placeholder. */
  faint: "text-[#8F8670]",
  /** Text sitting on dark or photo backgrounds. */
  onDark: "text-white",
} as const;

// ─── Interaction ────────────────────────────────────────────────────
export const interactive = {
  /** Links, "View All", active tab, focus rings. */
  blue: "text-[#8A6A35]",
  blueSolid: "bg-[#8A6A35]",
  /** Primary button + active filter chip fill. */
  navy: "bg-[#132F4C]",
  navyPressed: "bg-[#0D2340]",
} as const;

// ─── Shape ──────────────────────────────────────────────────────────
export const shape = {
  /** Primary card radius. */
  card: "rounded-[20px]",
  /** Quick-action tile radius. */
  tile: "rounded-[18px]",
  /** Icon badge radius. */
  badge: "rounded-xl",
  /** Buttons, chips, avatars. */
  pill: "rounded-full",
} as const;

// ─── Elevation ──────────────────────────────────────────────────────
export const elevation = {
  /** Cards resting on the app background. */
  card: "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)]",
  /** Chips, tiles, small surfaces. */
  soft: "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_rgba(16,24,40,0.05)]",
  /** Photo overlays and floating elements. */
  lifted: "shadow-[0_2px_4px_rgba(16,24,40,0.06),0_12px_32px_rgba(16,24,40,0.10)]",
} as const;

// ─── Type scale ─────────────────────────────────────────────────────
export const type = {
  /** Full-screen titles: Community, Events, Profile. */
  screenTitle: "text-[28px] font-bold tracking-[-0.02em] leading-tight",
  /** Personalised greeting name. */
  greeting: "text-[22px] font-bold tracking-[-0.01em]",
  /** Section headers ("Upcoming Events", "Recent Activity"). */
  section: "text-[17px] font-semibold tracking-[-0.01em]",
  /** Card / row titles. */
  cardTitle: "text-[16px] font-semibold tracking-[-0.01em]",
  /** Body copy and descriptions. */
  body: "text-[14px] font-normal leading-relaxed",
  /** Meta: counts, times, locations, timestamps. */
  meta: "text-[13px] font-medium",
  /** Tiny caption under icons and chips. */
  caption: "text-[12px] font-medium",
} as const;

// ─── Spacing rhythm ─────────────────────────────────────────────────
export const rhythm = {
  /** Horizontal screen gutter. */
  gutter: "px-5",
  /** Gap between stacked cards. */
  stack: "space-y-4",
  /** Gap between grid tiles. */
  gridGap: "gap-3",
} as const;

// ─── Accent palette ─────────────────────────────────────────────────
/**
 * One pastel per action/category, matched to the reference showcase.
 *
 * Names are kept identical to the pre-redesign palette (`blue`, `purple`, …)
 * so every existing call site keeps compiling; only the VALUES change. `bg`
 * fills the whole tile, `text` is the saturated foreground for the glyph, and
 * `ring` is a 1px inner edge that keeps pastels from bleeding into the app
 * background.
 */
export type AccentColor =
  | "blue"
  | "purple"
  | "teal"
  | "indigo"
  | "rose"
  | "amber"
  | "emerald"
  | "slate";

export interface AccentStyle {
  /** Pastel fill for tiles, badges, chips. */
  bg: string;
  /** Saturated foreground for the icon and its label. */
  text: string;
  /** Soft edge so pastels sit cleanly on the light background. */
  ring: string;
  /** Deeper tint for pressed states and inner badges. */
  deep: string;
}

export const ACCENTS: Record<AccentColor, AccentStyle> = {
  /** Check In, My Events, My Check-ins — light periwinkle. */
  blue: {
    bg: "bg-[#F5EEDF]",
    text: "text-[#8A6A35]",
    ring: "ring-[#E8DCC0]",
    deep: "bg-[#EBDDB9]",
  },
  /** My Groups — light indigo/violet. */
  indigo: {
    bg: "bg-[#E8EDF4]",
    text: "text-[#1B3A5C]",
    ring: "ring-[#D5DEEA]",
    deep: "bg-[#D2DCE9]",
  },
  /** Worship Ministry, secondary violet. */
  purple: {
    bg: "bg-[#F1E8F0]",
    text: "text-[#7A4B78]",
    ring: "ring-[#E4D5E2]",
    deep: "bg-[#E4D2E2]",
  },
  /** My Ministry — light green. */
  teal: {
    bg: "bg-[#D9F5E2]",
    text: "text-[#16A34A]",
    ring: "ring-[#BEEACF]",
    deep: "bg-[#B7E8C7]",
  },
  /** Prayer Request — light pink. */
  rose: {
    bg: "bg-[#FCE4F0]",
    text: "text-[#DB2777]",
    ring: "ring-[#F7C9E0]",
    deep: "bg-[#F8C8DF]",
  },
  /** My Talent — light amber. */
  amber: {
    bg: "bg-[#FCF0CE]",
    text: "text-[#D97706]",
    ring: "ring-[#F7E3A8]",
    deep: "bg-[#F7E4A8]",
  },
  /** Checked In, Success, Verified — vivid emerald/green matching #E7F6EC / #1A7F45 */
  emerald: {
    bg: "bg-[#E7F6EC]",
    text: "text-[#1A7F45]",
    ring: "ring-[#BEEACF]",
    deep: "bg-[#CEF0DB]",
  },
  /** Settings, Help & Support — neutral slate. */
  slate: {
    bg: "bg-[#EDF1F5]",
    text: "text-[#475569]",
    ring: "ring-[#E4DBC8]",
    deep: "bg-[#E4DBC8]",
  },
};

// ─── Photo slot ─────────────────────────────────────────────────────
/**
 * Every hero/event image renders through this wrapper. The gradient is the
 * shipped default (offline-safe, no external requests); dropping a real photo
 * into `public/mobile/` and passing `src` swaps it with no other change.
 */
export const photo = {
  /** Dark scrim that keeps white type legible over imagery. */
  scrim:
    "bg-[linear-gradient(180deg,rgba(9,20,36,0.10)_0%,rgba(9,20,36,0.42)_58%,rgba(9,20,36,0.72)_100%)]",
  /** Fallback fill behind an unloaded or absent image. */
  placeholder: "bg-[linear-gradient(140deg,#1B3A5C_0%,#2A5580_48%,#3E6B96_100%)]",
} as const;
