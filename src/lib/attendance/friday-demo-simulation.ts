/**
 * Friday Demo — Progressive Attendance Simulation (Demo-only)
 *
 * When Demo Mode is in a LIVE Friday state, this module progressively simulates
 * members physically arriving at the church in realistic WAVES over a full
 * 10-minute run:
 *
 *   1 → 3 → 7 → ... → 25 ⏸(2min) → 50 ⏸(1min) → 80 ⏸(2min)
 *      → 115 ⏸(1min) → 155 ⏸(1min) → ... → 363 (M2 final)
 *
 * - Arrivals start slow (a trickle of servants/volunteers), then come in waves.
 * - After each arrival milestone the floor goes quiet for a REAL 1–2 minute
 *   lull (alternating 2min/1min), then the next wave arrives and Last Check-in
 *   advances naturally with the church clock.
 * - The final stretch (last milestone → 363) is one continuous, accelerating
 *   rush up to the 11:00 Main Service.
 *
 * Timeline budget (10:00 total):
 *   ~3 minutes of arriving waves + ~7 minutes of quiet lulls = 10 minutes.
 *
 * Final state converges EXACTLY to the M2 deterministic values in
 * `LIVE_OPERATIONS` (363 / 363 / 420 / 86.4%). This module is pure — it never
 * reads the wall clock and never writes anything to the database.
 */

import { LIVE_OPERATIONS, getLiveOperations } from "@/lib/mock-data/live-operations";
import { members } from "@/lib/mock-data/people";
import { type CheckInEvent } from "@/lib/mock-data/check-ins";
import type { AttendanceContext } from "@/lib/attendance/attendance-context";

/** Tick granularity for the simulation clock (provider advances in these steps). */
export const FRIDAY_DEMO_SIMULATION_TICK_MS = 250;

/** User requirement: the full simulation takes 10 minutes to reach 363. */
export const FRIDAY_DEMO_SIMULATION_DURATION_MS = 600_000;

/**
 * Acceleration exponent. Arrival density grows as (active elapsed)^2, so the
 * first arrivals are sparse and the rush peaks right at the Main Service.
 */
export const FRIDAY_DEMO_SIMULATION_EXPONENT = 2;

/** How many of the most recent simulated arrivals are retained for feeds. */
export const FRIDAY_DEMO_ARRIVAL_BUFFER = 32;

/**
 * Arrival waves: after the cumulative count reaches `count`, the floor goes
 * quiet for `lullMs` (a REAL 1–2 minute pause), then the next wave arrives.
 * The last milestone leaves a nonstop finishing rush up to 363.
 *
 * Lulls: 2min + 1min + 2min + 1min + 1min = 7 minutes.
 * Active arriving time: 10min − 7min = 3 minutes.
 */
interface ArrivalWave {
  count: number;
  lullMs: number;
}

const ARRIVAL_WAVES: readonly ArrivalWave[] = [
  { count: 25, lullMs: 120_000 },
  { count: 50, lullMs: 60_000 },
  { count: 80, lullMs: 120_000 },
  { count: 115, lullMs: 60_000 },
  { count: 155, lullMs: 60_000 },
] as const;

const TOTAL_CHECKED_IN = LIVE_OPERATIONS.checkedIn; // 363
const EXPECTED_ATTENDANCE = LIVE_OPERATIONS.expectedAttendance; // 420

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Sum of lull durations that have fully elapsed before arrival `index`. */
function sumLullsBefore(index: number): number {
  let total = 0;
  for (const wave of ARRIVAL_WAVES) {
    if (wave.count <= index) total += wave.lullMs;
  }
  return total;
}

/**
 * Simulation duration for a live demo state: a fixed 10-minute run.
 * (Kept as a function so the provider API stays stable.)
 */
export function getFridayDemoSimulationDurationMs(_ctx: AttendanceContext): number {
  return FRIDAY_DEMO_SIMULATION_DURATION_MS;
}

/**
 * REAL schedule: when arrival `index` is released into the UI. Active
 * (arriving) time follows the accelerating curve; each wave lull adds its
 * real 1–2 minute pause on top of everything after it.
 */
export function getFridayDemoArrivalTimeMs(index: number, durationMs: number): number {
  const i = clamp(Math.round(index), 0, TOTAL_CHECKED_IN - 1);
  const totalLulls = ARRIVAL_WAVES.reduce((sum, w) => sum + w.lullMs, 0);
  const activeMs = Math.max(0, durationMs - totalLulls);
  const active = activeMs * Math.pow(i / (TOTAL_CHECKED_IN - 1), 1 / FRIDAY_DEMO_SIMULATION_EXPONENT);
  return Math.round(active) + sumLullsBefore(i);
}

/**
 * CHURCH-clock schedule: the simulated Friday time shown on arrival stamps.
 * With 10-minute runs the church clock tracks real time 1:1, so timestamps —
 * and therefore Last Check-in — freeze during lulls and resume afterwards.
 */
export function getFridayDemoSimClockTimeMs(index: number, durationMs: number): number {
  return getFridayDemoArrivalTimeMs(index, durationMs);
}

/**
 * Checked-in count at the given real elapsed time (inverse of the real
 * schedule). Starts at 1 and is constant during lulls; converges to 363.
 */
export function getFridayDemoCheckedInAt(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return TOTAL_CHECKED_IN;
  if (elapsedMs <= 0) return 1;
  if (elapsedMs >= durationMs) return TOTAL_CHECKED_IN;

  let lo = 0;
  let hi = TOTAL_CHECKED_IN - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (getFridayDemoArrivalTimeMs(mid, durationMs) <= elapsedMs) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1; // index is 0-based → count = index + 1
}

export interface FridayDemoSimulationProgress {
  checkedIn: number;
  peopleHereNow: number;
  expectedAttendance: number;
  recentCheckIns: number;
  attendanceRate: number;
  missing: number;
  completed: boolean;
}

/**
 * Full simulated live-operations snapshot at the given elapsed time. When the
 * simulation completes it returns the M2 dataset unchanged — guaranteeing the
 * exact final convergence (363 / 363 / 420 / 8 / 86.4% / 57).
 */
export function getFridayDemoSimulationProgress(
  elapsedMs: number,
  durationMs: number
): FridayDemoSimulationProgress {
  if (durationMs > 0 && elapsedMs >= durationMs) {
    return { ...getLiveOperations(), completed: true };
  }

  const checkedIn = getFridayDemoCheckedInAt(elapsedMs, durationMs);
  const attendanceRate = Math.round((checkedIn / EXPECTED_ATTENDANCE) * 1000) / 10;
  const recentCheckIns = Math.max(
    1,
    Math.min(
      LIVE_OPERATIONS.recentCheckIns,
      Math.round((LIVE_OPERATIONS.recentCheckIns * checkedIn) / TOTAL_CHECKED_IN)
    )
  );

  return {
    checkedIn,
    peopleHereNow: checkedIn,
    expectedAttendance: EXPECTED_ATTENDANCE,
    recentCheckIns,
    attendanceRate,
    missing: EXPECTED_ATTENDANCE - checkedIn,
    completed: false,
  };
}

// ─── Simulated arrivals (existing deterministic member list) ────────────────

/**
 * Mobile App Demo Members (M5).
 * These members are reserved for manual mobile app testing and are strictly
 * excluded from automated background check-ins and simulations.
 * They only appear on the dashboard when manually checked in by the tester.
 */
export const MOBILE_APP_EXCLUDED_MEMBERS = new Set([
  "michael williams",
  "sarah johnson",
  "john smith",
  "emily brown",
  "david davis",
]);

export function isMobileAppExcludedMember(name: string): boolean {
  if (!name) return false;
  return MOBILE_APP_EXCLUDED_MEMBERS.has(name.trim().toLowerCase());
}

export const ARRIVAL_TEMPLATES = members.filter(
  (m) =>
    (m.status === "active" || m.status === "visitor") &&
    !isMobileAppExcludedMember(`${m.firstName} ${m.lastName}`)
);

export function formatFridayDemoArrivalTimestamp(baseNow: Date, offsetMs: number): string {
  const at = new Date(baseNow.getTime() + Math.max(0, offsetMs));
  return at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Builds one simulated arrival event from the existing member list. */
export function createFridayDemoArrivalEvent(index: number, timestamp: string): CheckInEvent {
  const template = ARRIVAL_TEMPLATES[index % ARRIVAL_TEMPLATES.length];
  const isVisitor = template.status === "visitor";
  return {
    id: `demo-arrival-${index}`,
    personId: `demo-person-${index}`,
    personName: `${template.firstName} ${template.lastName}`,
    type: isVisitor ? "visitor" : "member",
    ministry: template.ministry && template.ministry !== "—" ? template.ministry : undefined,
    group: template.group && template.group !== "—" ? template.group : undefined,
    timestamp,
    serviceId: "1",
    avatar: template.avatar,
  };
}

/**
 * Builds the arrivals for member indices [fromIndex, toIndexExclusive) using
 * their pre-scheduled church-clock timestamps. Returned newest-first so
 * callers can prepend directly to a feed.
 */
export function createFridayDemoArrivalEvents(
  fromIndex: number,
  toIndexExclusive: number,
  baseNow: Date,
  durationMs: number
): CheckInEvent[] {
  const events: CheckInEvent[] = [];
  const end = Math.min(toIndexExclusive, TOTAL_CHECKED_IN);
  for (let index = Math.max(0, fromIndex); index < end; index++) {
    const offset = getFridayDemoSimClockTimeMs(index, durationMs);
    events.push(createFridayDemoArrivalEvent(index, formatFridayDemoArrivalTimestamp(baseNow, offset)));
  }
  return events.reverse();
}
