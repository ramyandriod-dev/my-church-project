/**
 * Friday Demo — Shared Progressive Attendance Simulation (M5.1)
 *
 * SINGLE SOURCE OF TRUTH for the live operational count shown during a
 * Friday Demo. The Dashboard, /attendance and every live card consume the
 * exact same snapshot from this module — there is deliberately no second
 * counter, no per-page timer and no page-local lifecycle.
 *
 * WHY IT NEVER RESETS:
 *  - The simulation is derived from ELAPSED REAL WALL-CLOCK TIME since the
 *    run started (getFridayDemoSimulationProgress), not from a component
 *    useState. React remounts cannot move the count backwards.
 *  - A run belongs to this module (identified by the demo state id) and is
 *    persisted to localStorage, so it survives route navigation, browser
 *    refresh and continues progressing while the user is on /people, /groups…
 *  - A module-level ticker — not a page effect — refreshes subscribers while
 *    a live run exists, so the count keeps advancing in the background.
 *
 * Demo-only. Never touches the database and never affects real attendance:
 * the REAL Member-scanned check-in goes through POST /api/attendance/check-in
 * and is tracked as an AttendanceRecord — this store only feeds the demo UI.
 */

import {
  FRIDAY_DEMO_ARRIVAL_BUFFER,
  FRIDAY_DEMO_SIMULATION_DURATION_MS,
  FRIDAY_DEMO_SIMULATION_TICK_MS,
  createFridayDemoArrivalEvents,
  getFridayDemoSimulationProgress,
  type FridayDemoSimulationProgress,
} from "@/lib/attendance/friday-demo-simulation";
import { getAttendanceContext } from "@/lib/attendance/attendance-context";
import { getLiveOperations } from "@/lib/mock-data/live-operations";
import { type CheckInEvent, mockCheckIns } from "@/lib/mock-data/check-ins";
import { getDemoClockInfo, type DemoClockInfo } from "./demo-clock";
import { subscribeDemoClock } from "./demo-clock-store";

export const DEMO_ATTENDANCE_STORAGE_KEY = "cmp:attendance-demo:sim";

/** The persisted simulation run (small — progress is derived, not stored). */
export interface DemoAttendanceRun {
  stateId: string;
  /** Real clock ms when this run began. */
  startedAtRealMs: number;
  /** Active (non-paused) elapsed ms accumulated so far. */
  accumulatedMs: number;
  /** Real clock ms at the start of the current active segment. */
  lastActiveTickMs: number;
  paused: boolean;
  /** Real check-ins merged during this demo run. */
  realCheckIns?: CheckInEvent[];
}

export interface DemoAttendanceSnapshot extends FridayDemoSimulationProgress {
  /** True only while Demo Mode is in a LIVE Friday state. */
  active: boolean;
  paused: boolean;
  /** Most recent simulated arrivals, newest-first (capped live feed). */
  arrivals: CheckInEvent[];
  /** Newest arrival event, used for "Last check-in". */
  latestCheckIn: CheckInEvent | null;
  elapsedMs: number;
  durationMs: number;
  /** The demo clock state id this run is bound to (null when inactive). */
  stateId: string | null;
}

type DemoAttendanceListener = () => void;

const listeners = new Set<DemoAttendanceListener>();

let run: DemoAttendanceRun | null = null;
let cached: DemoAttendanceSnapshot | null = null;
let tickerId: number | null = null;
let initialized = false;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readRun(): DemoAttendanceRun | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(DEMO_ATTENDANCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoAttendanceRun;
    if (!parsed || typeof parsed.startedAtRealMs !== "number" || !parsed.stateId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRun(value: DemoAttendanceRun | null): void {
  const s = storage();
  if (!s) return;
  try {
    if (value === null) s.removeItem(DEMO_ATTENDANCE_STORAGE_KEY);
    else s.setItem(DEMO_ATTENDANCE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* persistence is best-effort */
  }
}

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  run = readRun();
  if (typeof window !== "undefined") {
    subscribeDemoClock(() => {
      refresh();
      notify();
    });
    window.addEventListener("storage", (e) => {
      if (e.key === DEMO_ATTENDANCE_STORAGE_KEY) {
        run = readRun();
        refresh();
        notify();
      }
    });
  }
}

function persist(next: DemoAttendanceRun): void {
  run = next;
  writeRun(next);
}

function activeElapsed(r: DemoAttendanceRun, realNowMs: number): number {
  const running = r.paused ? 0 : Math.max(0, realNowMs - r.lastActiveTickMs);
  return Math.min(r.accumulatedMs + running, FRIDAY_DEMO_SIMULATION_DURATION_MS);
}

function inactiveSnapshot(): DemoAttendanceSnapshot {
  return {
    ...getLiveOperations(),
    completed: true,
    active: false,
    paused: false,
    arrivals: [],
    latestCheckIn: null,
    elapsedMs: 0,
    durationMs: FRIDAY_DEMO_SIMULATION_DURATION_MS,
    stateId: null,
  };
}

/**
 * Pure derivation from a shared clock + run. Deterministic given the same
 * inputs — this is what guarantees Dashboard and /attendance are identical.
 */
export function buildDemoAttendanceSnapshot(
  clock: DemoClockInfo,
  currentRun: DemoAttendanceRun | null,
  realNow: Date
): DemoAttendanceSnapshot {
  const realNowMs = realNow.getTime();

  // Only a LIVE Friday demo state drives the progressive simulation.
  const isLiveDemo = clock.demoMode && getAttendanceContext(clock.effectiveNow).state === "live";

  if (!clock.demoMode) {
    // Demo turned OFF → the run ends; next live selection starts fresh.
    return inactiveSnapshot();
  }
  if (!isLiveDemo || !currentRun || currentRun.stateId !== clock.stateId) {
    return {
      ...inactiveSnapshot(),
      stateId: clock.stateId,
      active: false,
    };
  }

  const elapsedMs = activeElapsed(currentRun, realNowMs);
  const progress = getFridayDemoSimulationProgress(
    elapsedMs,
    FRIDAY_DEMO_SIMULATION_DURATION_MS
  );

  const realArrivals = currentRun.realCheckIns ?? [];
  const realCount = realArrivals.length;

  const checkedIn = realCount;
  const peopleHereNow = realCount;
  const recentCheckIns = realCount;
  const attendanceRate =
    progress.expectedAttendance > 0
      ? Math.round((checkedIn / progress.expectedAttendance) * 1000) / 10
      : 0;
  const missing = Math.max(0, progress.expectedAttendance - checkedIn);

  // Strictly real arrivals only — no fake background check-ins
  const arrivals: CheckInEvent[] = [...realArrivals];
  const cappedArrivals = arrivals.slice(0, FRIDAY_DEMO_ARRIVAL_BUFFER);

  return {
    ...progress,
    checkedIn,
    peopleHereNow,
    recentCheckIns,
    attendanceRate,
    missing,
    active: true,
    paused: currentRun.paused,
    arrivals: cappedArrivals,
    latestCheckIn: cappedArrivals[0] ?? null,
    elapsedMs,
    durationMs: FRIDAY_DEMO_SIMULATION_DURATION_MS,
    stateId: clock.stateId,
  };
}

function fingerprint(s: DemoAttendanceSnapshot): string {
  return [
    s.active,
    s.paused,
    s.stateId ?? "",
    s.completed,
    s.checkedIn,
    s.peopleHereNow,
    s.expectedAttendance,
    s.recentCheckIns,
    s.attendanceRate,
    s.missing,
    Math.floor(s.elapsedMs / 1000),
    s.latestCheckIn?.id ?? "",
    s.arrivals[0]?.id ?? "",
    s.arrivals.length,
  ].join("|");
}

function notify(): void {
  for (const listener of listeners) listener();
}

/** Recompute the cached snapshot from the real clock; returns the stable cache. */
function refresh(realNow: Date = new Date()): DemoAttendanceSnapshot {
  ensureInitialized();
  const clock = getDemoClockInfo(realNow);
  const isLiveDemo =
    clock.demoMode &&
    !!clock.stateId &&
    getAttendanceContext(clock.effectiveNow).state === "live";

  // Ensure a run exists when the user has a LIVE demo selected — the FIRST
  // reader (Dashboard, /attendance or /staff-checkin-demo) all agree on the same
  // deterministic run start, so no screen can "restart" another.
  if (isLiveDemo) {
    if (!run || run.stateId !== clock.stateId) {
      const startedMs = realNow.getTime();
      persist({
        stateId: clock.stateId!,
        startedAtRealMs: startedMs,
        accumulatedMs: 0,
        lastActiveTickMs: startedMs,
        paused: false,
      });
    }
  } else if (!clock.demoMode && run) {
    run = null;
    writeRun(null);
    stopTicker();
  }

  const next = buildDemoAttendanceSnapshot(clock, run, realNow);
  if (!cached || fingerprint(cached) !== fingerprint(next)) {
    cached = next;
  }
  if (cached.active) ensureTicker();
  else if (tickerId !== null) stopTicker();
  return cached;
}

function ensureTicker(): void {
  if (tickerId !== null || typeof window === "undefined") return;
  tickerId = window.setInterval(() => {
    refresh();
    notify();
  }, FRIDAY_DEMO_SIMULATION_TICK_MS);
}

function stopTicker(): void {
  if (tickerId === null) return;
  window.clearInterval(tickerId);
  tickerId = null;
}

/** Subscribe to live demo-ops changes. Returns an unsubscribe function. */
export function subscribeDemoAttendance(listener: DemoAttendanceListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDemoAttendanceSnapshot(realNow: Date = new Date()): DemoAttendanceSnapshot {
  return refresh(realNow);
}

/**
 * Stable SSR snapshot for useSyncExternalStore's getServerSnapshot argument.
 * Demo selection/run are client-only, so the server always renders the
 * inactive (M2 review) baseline — matching the client's first paint.
 */
let serverSnapshot: DemoAttendanceSnapshot | null = null;

export function getDemoAttendanceServerSnapshot(): DemoAttendanceSnapshot {
  if (serverSnapshot === null) {
    serverSnapshot = inactiveSnapshot();
  }
  return serverSnapshot;
}

/**
 * Live/Paused control (shared with the Dashboard live check-in feed).
 * Pausing freezes the simulated growth until it is resumed.
 */
export function setDemoSimulationPaused(paused: boolean): void {
  ensureInitialized();
  if (!run || run.paused === paused) return;
  const now = Date.now();
  const next: DemoAttendanceRun = run.paused
    ? { ...run, paused: false, lastActiveTickMs: now }
    : { ...run, paused: true, accumulatedMs: run.accumulatedMs + (now - run.lastActiveTickMs) };
  persist(next);
  refresh(new Date(now));
  notify();
}

/** End the current simulation run (demo OFF / cleanup). */
export function resetDemoAttendanceRun(): void {
  ensureInitialized();
  if (run === null && tickerId === null) return;
  run = null;
  writeRun(null);
  if (tickerId !== null) {
    (typeof clearInterval === "function" ? clearInterval : () => {})(tickerId as number);
    tickerId = null;
  }
  cached = inactiveSnapshot();
  notify();
}

export interface RealCheckInInput {
  id?: string;
  memberId?: string;
  memberName?: string;
  memberAvatar?: string;
  ministry?: string;
  timestamp?: string;
  serviceId?: string;
  data?: {
    recordId?: string;
    memberId?: string;
    memberName?: string;
    memberAvatar?: string;
    ministry?: string;
    serviceId?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

/**
 * Integrate a confirmed real check-in into the active Friday Demo state.
 *
 * Increments the displayed count, People Here Now, Attendance % and prepends the
 * member to Live Check-in. Deduplicates against existing check-ins by recordId/memberId.
 */
export function pushRealCheckIn(input: RealCheckInInput): void {
  ensureInitialized();
  if (!run) {
    refresh();
  }
  if (!run) return;

  const data = input.data || {};
  const recordId = (data.recordId as string) || input.id || `real-${Date.now()}`;
  const memberId = (data.memberId as string) || input.memberId || "unknown";
  const memberName = (data.memberName as string) || input.memberName || "Church Member";
  const avatar =
    (data.memberAvatar as string) ||
    input.memberAvatar ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(memberName)}`;
  const ministry = (data.ministry as string) || input.ministry || undefined;
  const serviceId = (data.serviceId as string) || input.serviceId || "1";
  const timeStr = new Date(
    (data.timestamp as string) || input.timestamp || Date.now()
  ).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const existing = run.realCheckIns || [];
  // Strict deduplication: check if already added by recordId or memberId
  if (
    existing.some(
      (r) =>
        r.id === recordId ||
        (r.personId === memberId && memberId !== "unknown")
    )
  ) {
    return;
  }

  const newEvent: CheckInEvent = {
    id: recordId,
    personId: memberId,
    personName: memberName,
    type: "member",
    ministry,
    timestamp: timeStr,
    serviceId,
    avatar,
  };

  const nextRun: DemoAttendanceRun = {
    ...run,
    realCheckIns: [newEvent, ...existing],
  };

  persist(nextRun);
  refresh();
  notify();
}

/**
 * Synchronize multiple real check-ins fetched from database into the active demo run.
 */
export function syncDatabaseCheckIns(events: CheckInEvent[]): void {
  ensureInitialized();
  if (!run) {
    refresh();
  }
  if (!run || !events.length) return;

  const existing = run.realCheckIns || [];
  let changed = false;
  const merged = [...existing];

  for (const ev of events) {
    if (
      !merged.some(
        (r) =>
          r.id === ev.id ||
          (r.personId === ev.personId && ev.personId !== "unknown")
      )
    ) {
      merged.unshift(ev);
      changed = true;
    }
  }

  if (changed) {
    const nextRun: DemoAttendanceRun = {
      ...run,
      realCheckIns: merged,
    };
    persist(nextRun);
    refresh();
    notify();
  }
}

/**
 * Clear all real check-ins merged during this demo run.
 * Deducts them from total checked in, people here now, recent check-ins,
 * and removes them from arrivals feed.
 */
export function clearRealCheckIns(): void {
  ensureInitialized();
  const current = readRun() || run;
  if (!current) return;
  const nextRun: DemoAttendanceRun = {
    ...current,
    realCheckIns: [],
  };
  persist(nextRun);
  refresh();
  notify();
}