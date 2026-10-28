/**
 * Friday-Only Attendance — Day Context & Demo Resolution
 *
 * Business rule: attendance / check-in happens ONLY on Friday (09:00 → 13:00).
 * This module decides WHEN the attendance experience is relevant:
 *
 *   Real mode  → relevant only when the actual calendar day is Friday.
 *   Demo mode  → always relevant, driven by a simulated Friday `now`.
 *
 * The time-of-day state itself is still derived by the M1 single source of
 * truth `getAttendanceContext(effectiveNow)` — this module only supplies the
 * effective `now` and the relevance gate. It never re-implements 09:00 / 11:00 /
 * 13:00 boundaries or the state calculation.
 */

export type AttendanceDayMode = "real" | "demo";

export type FridayDemoLabelKey = "not-started" | "live" | "main-service" | "review";

export interface FridayDemoState {
  id: string;
  hour: number;
  minute: number;
  labelKey: FridayDemoLabelKey;
}

/** The Friday demo checkpoints. */
export const FRIDAY_DEMO_STATES: readonly FridayDemoState[] = [
  { id: "0859", hour: 8,  minute: 59, labelKey: "not-started" },
  { id: "0900", hour: 9,  minute: 0,  labelKey: "live" },
  { id: "1100", hour: 11, minute: 0,  labelKey: "main-service" },
  { id: "1230", hour: 12, minute: 30, labelKey: "live" },
  { id: "1259", hour: 12, minute: 59, labelKey: "live" },
  { id: "1300", hour: 13, minute: 0,  labelKey: "review" },
  { id: "1301", hour: 13, minute: 1,  labelKey: "review" },
] as const;

/** Sunday morning demo checkpoints (09:00 → 12:00). */
export const SUNDAY_MORNING_DEMO_STATES: readonly FridayDemoState[] = [
  { id: "sun-am-0859", hour: 8,  minute: 59, labelKey: "not-started" },
  { id: "sun-am-0900", hour: 9,  minute: 0,  labelKey: "live" },
  { id: "sun-am-1000", hour: 10, minute: 0,  labelKey: "main-service" },
  { id: "sun-am-1130", hour: 11, minute: 30, labelKey: "live" },
  { id: "sun-am-1200", hour: 12, minute: 0,  labelKey: "review" },
] as const;

/** Sunday evening demo checkpoints (17:00 → 20:00). */
export const SUNDAY_EVENING_DEMO_STATES: readonly FridayDemoState[] = [
  { id: "sun-pm-1659", hour: 16, minute: 59, labelKey: "not-started" },
  { id: "sun-pm-1700", hour: 17, minute: 0,  labelKey: "live" },
  { id: "sun-pm-1800", hour: 18, minute: 0,  labelKey: "main-service" },
  { id: "sun-pm-1930", hour: 19, minute: 30, labelKey: "live" },
  { id: "sun-pm-2000", hour: 20, minute: 0,  labelKey: "review" },
] as const;

/** All demo states across all services — flat list for lookup. */
export const ALL_DEMO_STATES: readonly FridayDemoState[] = [
  ...FRIDAY_DEMO_STATES,
  ...SUNDAY_MORNING_DEMO_STATES,
  ...SUNDAY_EVENING_DEMO_STATES,
] as const;

/** Which service a demo state belongs to. */
export type DemoServiceKey = "friday" | "sunday_morning" | "sunday_evening";

export function getDemoServiceKey(stateId: string): DemoServiceKey {
  if (stateId.startsWith("sun-am")) return "sunday_morning";
  if (stateId.startsWith("sun-pm")) return "sunday_evening";
  return "friday";
}

export const FRIDAY_DEMO_DEFAULT_STATE = "0900" as const;

export function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

/**
 * Builds a simulated Friday date at the given local time.
 */
export function getSimulatedFriday(hour: number, minute: number, relativeTo: Date): Date {
  const d = new Date(relativeTo);
  const daysUntilFriday = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntilFriday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Builds a simulated Sunday date at the given local time.
 */
export function getSimulatedSunday(hour: number, minute: number, relativeTo: Date): Date {
  const d = new Date(relativeTo);
  const daysUntilSunday = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export interface FridayDemoSelection {
  active: boolean;
  simulatedNow: Date;
}

export interface AttendanceDayResolution {
  mode: AttendanceDayMode;
  /** The `now` value that must be fed to `getAttendanceContext`. */
  effectiveNow: Date;
  isRealFriday: boolean;
  /** True when real Friday OR demo mode — gate for the attendance UI. */
  attendanceRelevant: boolean;
}

export function resolveAttendanceDay(
  realNow: Date,
  demo: FridayDemoSelection | null
): AttendanceDayResolution {
  const realFriday = isFriday(realNow);
  const realSunday = isSunday(realNow);
  const realServiceDay = realFriday || realSunday;

  if (demo && demo.active) {
    return {
      mode: "demo",
      effectiveNow: demo.simulatedNow,
      isRealFriday: realFriday,
      attendanceRelevant: true,
    };
  }

  return {
    mode: "real",
    effectiveNow: realNow,
    isRealFriday: realFriday,
    attendanceRelevant: realServiceDay,
  };
}