/**
 * Multi-Service Attendance Window — Single Source of Truth
 *
 * The church runs TWO distinct gathering days:
 *
 *   FRIDAY MORNING   09:00 → 13:00  (teams arrive early, main service 11:00)
 *   SUNDAY MORNING   09:00 → 12:00  (main service 10:00)
 *   SUNDAY EVENING   17:00 → 20:00  (evening service 18:00)
 *
 * State is derived from an explicitly-passed `Date` so it can be
 * controlled/mocked in tests — it never reads the wall clock on its own.
 */

export const FRIDAY_ATTENDANCE_WINDOW = {
  startHour: 9,
  startMinute: 0,
  mainServiceHour: 11,
  mainServiceMinute: 0,
  endHour: 13,
  endMinute: 0,
} as const;

export const SUNDAY_MORNING_WINDOW = {
  startHour: 9,
  startMinute: 0,
  mainServiceHour: 10,
  mainServiceMinute: 0,
  endHour: 12,
  endMinute: 0,
} as const;

export const SUNDAY_EVENING_WINDOW = {
  startHour: 17,
  startMinute: 0,
  mainServiceHour: 18,
  mainServiceMinute: 0,
  endHour: 20,
  endMinute: 0,
} as const;

/** Which service is currently active (or was most recently active). */
export type ActiveService =
  | "friday_morning"
  | "sunday_morning"
  | "sunday_evening"
  | null;

export type AttendanceState = "not-started" | "live" | "review";

export interface AttendanceContext {
  state: AttendanceState;
  startMinutes: number;
  mainServiceMinutes: number;
  endMinutes: number;
  nowMinutes: number;
  minutesIntoWindow: number;
  minutesSinceEnd: number;
  minutesUntilStart: number;
  minutesUntilMainService: number;
  isMainServiceTime: boolean;
  /** Which service window this context belongs to. */
  activeService: ActiveService;
  /** The day category for the provided date. */
  dayOfWeek: "friday" | "sunday" | "other";
}

const toMinutes = (hour: number, minute: number) => hour * 60 + minute;

function buildContext(
  nowMinutes: number,
  startHour: number,
  startMinute: number,
  mainServiceHour: number,
  mainServiceMinute: number,
  endHour: number,
  endMinute: number,
  activeService: ActiveService,
  dayOfWeek: "friday" | "sunday" | "other"
): AttendanceContext {
  const startMinutes = toMinutes(startHour, startMinute);
  const mainServiceMinutes = toMinutes(mainServiceHour, mainServiceMinute);
  const endMinutes = toMinutes(endHour, endMinute);

  let state: AttendanceState;
  if (nowMinutes < startMinutes) state = "not-started";
  else if (nowMinutes >= startMinutes && nowMinutes < endMinutes) state = "live";
  else state = "review";

  return {
    state,
    startMinutes,
    mainServiceMinutes,
    endMinutes,
    nowMinutes,
    minutesIntoWindow: Math.max(0, nowMinutes - startMinutes),
    minutesSinceEnd: Math.max(0, nowMinutes - endMinutes),
    minutesUntilStart: Math.max(0, startMinutes - nowMinutes),
    minutesUntilMainService: Math.max(0, mainServiceMinutes - nowMinutes),
    isMainServiceTime:
      nowMinutes >= mainServiceMinutes && nowMinutes < endMinutes,
    activeService,
    dayOfWeek,
  };
}

/**
 * Returns the attendance context for the given date.
 *
 * - Friday  → Friday Morning window
 * - Sunday before noon → Sunday Morning window
 * - Sunday afternoon/evening → Sunday Evening window
 * - Other days → "not-started" Friday context (neutral fallback)
 */
export function getAttendanceContext(now: Date = new Date()): AttendanceContext {
  const day = now.getDay(); // 0=Sun, 5=Fri
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (day === 5) {
    // Friday
    return buildContext(
      nowMinutes,
      FRIDAY_ATTENDANCE_WINDOW.startHour,
      FRIDAY_ATTENDANCE_WINDOW.startMinute,
      FRIDAY_ATTENDANCE_WINDOW.mainServiceHour,
      FRIDAY_ATTENDANCE_WINDOW.mainServiceMinute,
      FRIDAY_ATTENDANCE_WINDOW.endHour,
      FRIDAY_ATTENDANCE_WINDOW.endMinute,
      "friday_morning",
      "friday"
    );
  }

  if (day === 0) {
    // Sunday — pick morning or evening based on time
    const eveningStart = toMinutes(
      SUNDAY_EVENING_WINDOW.startHour,
      SUNDAY_EVENING_WINDOW.startMinute
    );
    const morningEnd = toMinutes(
      SUNDAY_MORNING_WINDOW.endHour,
      SUNDAY_MORNING_WINDOW.endMinute
    );

    if (nowMinutes >= eveningStart) {
      // After 17:00 → Evening window
      return buildContext(
        nowMinutes,
        SUNDAY_EVENING_WINDOW.startHour,
        SUNDAY_EVENING_WINDOW.startMinute,
        SUNDAY_EVENING_WINDOW.mainServiceHour,
        SUNDAY_EVENING_WINDOW.mainServiceMinute,
        SUNDAY_EVENING_WINDOW.endHour,
        SUNDAY_EVENING_WINDOW.endMinute,
        "sunday_evening",
        "sunday"
      );
    }

    // Before 17:00 → Morning window
    return buildContext(
      nowMinutes,
      SUNDAY_MORNING_WINDOW.startHour,
      SUNDAY_MORNING_WINDOW.startMinute,
      SUNDAY_MORNING_WINDOW.mainServiceHour,
      SUNDAY_MORNING_WINDOW.mainServiceMinute,
      SUNDAY_MORNING_WINDOW.endHour,
      SUNDAY_MORNING_WINDOW.endMinute,
      "sunday_morning",
      "sunday"
    );
  }

  // Other weekdays (Thursday, etc.): evaluate standard time-of-day window (day gate handled by resolveAttendanceDay)
  return buildContext(
    nowMinutes,
    FRIDAY_ATTENDANCE_WINDOW.startHour,
    FRIDAY_ATTENDANCE_WINDOW.startMinute,
    FRIDAY_ATTENDANCE_WINDOW.mainServiceHour,
    FRIDAY_ATTENDANCE_WINDOW.mainServiceMinute,
    FRIDAY_ATTENDANCE_WINDOW.endHour,
    FRIDAY_ATTENDANCE_WINDOW.endMinute,
    "friday_morning",
    "other"
  );
}