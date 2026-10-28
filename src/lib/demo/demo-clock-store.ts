/**
 * Shared Friday Demo Clock — client-side store (M5 hotfix)
 *
 * The dashboard's "Friday Demo" selector is the CONTROL, but until now the
 * selected demo state lived only in the dashboard's local React state, so
 * /staff-checkin-demo and /checkin-scanner kept showing the real system clock.
 *
 * This module is the single client-side demo-time SOURCE: it stores the
 * active demo state id (+ real browser clock is NOT stored) and notifies
 * every subscriber across the app (Dashboard, Member Simulator, Scanner).
 *
 * It deliberately contains NO demo-time interpretation — getSimulatedFriday /
 * resolveAttendanceDay in attendance-day-context.ts remain the single source
 * of truth for HOW a selected state becomes an effective `now`.
 */

export const DEMO_CLOCK_STORAGE_KEY = "cmp:attendance-demo:state";
export const DEMO_SESSION_ACTIVE_KEY = "cmp:attendance-demo:session-active";

type DemoClockListener = (stateId: string | null) => void;

const listeners = new Set<DemoClockListener>();

/** In-memory mirror so the store works headlessly (tests) and in the browser. */
let memoryState: string | null = null;
let initialized = false;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function sessionStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function isDemoSessionExplicit(): boolean {
  const ss = sessionStore();
  if (!ss) return false;
  try {
    return ss.getItem(DEMO_SESSION_ACTIVE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setDemoSessionExplicit(active: boolean): void {
  const ss = sessionStore();
  if (!ss) return;
  try {
    if (active) {
      ss.setItem(DEMO_SESSION_ACTIVE_KEY, "true");
    } else {
      ss.removeItem(DEMO_SESSION_ACTIVE_KEY);
    }
  } catch {}
}

function isRealServiceDay(): boolean {
  if (typeof window === "undefined") return false;
  const d = new Date();
  const day = d.getDay();
  return day === 5 || day === 0; // Friday (5) or Sunday (0)
}

function readStored(): string | null {
  const s = storage();
  if (!s) return null;
  try {
    const val = s.getItem(DEMO_CLOCK_STORAGE_KEY);
    if (!val || val === "") return null;

    // If today is a real gathering day (Friday or Sunday), we must NOT restore
    // an old persisted demo state unless the user explicitly started demo mode
    // in this browser session. This ensures the app starts automatically in real
    // mode at the determined phase (not-started, live, review) on every Friday!
    if (isRealServiceDay() && !isDemoSessionExplicit()) {
      s.removeItem(DEMO_CLOCK_STORAGE_KEY);
      return null;
    }

    return val;
  } catch {
    return null;
  }
}

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  memoryState = readStored();
}

/** Current demo state id (a FRIDAY_DEMO_STATES id) or null when Demo Mode is OFF. */
export function getDemoStateId(): string | null {
  ensureInitialized();
  return memoryState;
}

/**
 * Set the active demo state id (dashboard selector / exit). Persists to
 * localStorage and notifies all subscribers so every screen updates at once.
 */
export function setDemoStateId(stateId: string | null): void {
  ensureInitialized();
  memoryState = stateId;
  if (stateId) {
    setDemoSessionExplicit(true);
  } else {
    setDemoSessionExplicit(false);
  }
  try {
    const s = storage();
    if (stateId) {
      s?.setItem(DEMO_CLOCK_STORAGE_KEY, stateId);
    } else {
      s?.removeItem(DEMO_CLOCK_STORAGE_KEY);
    }
  } catch {
    /* persistence is best-effort; the in-memory clock still drives the app */
  }
  for (const listener of listeners) {
    listener(stateId);
  }
}

/** Subscribe to demo clock changes. Returns an unsubscribe function. */
export function subscribeDemoClock(listener: DemoClockListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}