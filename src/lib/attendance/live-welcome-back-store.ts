/**
 * Live Welcome Back Attendees Store
 *
 * Persists members who triggered a "Welcome Back" alert during live attendance
 * so they are immediately reflected in the /attendance tab roster and preserved
 * for pastoral and follow-up management after the church service.
 */

export interface RecordedWelcomeBackAttendee {
  memberId: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  ministry?: string;
  group?: string;
  consecutiveMissedWeeks: number;
  lastAttendanceDate?: string;
  checkInTime: string;
  serviceDateStr: string;
  serviceKey: string;
  recordedAt: number;
}

export const LIVE_WELCOME_BACK_STORAGE_KEY = "cmp:attendance:live-welcome-back";

type Listener = () => void;
const listeners = new Set<Listener>();

let memoryRecords: RecordedWelcomeBackAttendee[] | null = null;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadRecords(): RecordedWelcomeBackAttendee[] {
  if (memoryRecords !== null) return memoryRecords;

  const storage = getStorage();
  if (!storage) {
    memoryRecords = [];
    return memoryRecords;
  }

  try {
    const raw = storage.getItem(LIVE_WELCOME_BACK_STORAGE_KEY);
    if (!raw) {
      memoryRecords = [];
      return memoryRecords;
    }
    const parsed = JSON.parse(raw);
    memoryRecords = Array.isArray(parsed) ? parsed : [];
  } catch {
    memoryRecords = [];
  }

  return memoryRecords;
}

function saveRecords(records: RecordedWelcomeBackAttendee[]): void {
  memoryRecords = records;
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(LIVE_WELCOME_BACK_STORAGE_KEY, JSON.stringify(records));
    } catch {
      /* persistence is best-effort */
    }
  }
}

function notify(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (e) {
      console.error("Error in welcome-back listener", e);
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("welcome-back-recorded"));
  }
}

// Sync across browser tabs
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LIVE_WELCOME_BACK_STORAGE_KEY) {
      memoryRecords = null;
      notify();
    }
  });
}

/**
 * Records a Welcome Back attendee who appeared live during a service.
 */
export function recordLiveWelcomeBackAttendee(attendee: RecordedWelcomeBackAttendee): void {
  const current = loadRecords();
  const key = `${attendee.serviceDateStr}:${attendee.memberId.toLowerCase()}`;

  // Deduplicate against existing recorded attendees for this date & member
  const filtered = current.filter(
    (r) => `${r.serviceDateStr}:${r.memberId.toLowerCase()}` !== key
  );

  saveRecords([attendee, ...filtered]);
  notify();
}

/**
 * Retrieves recorded Welcome Back attendees, optionally filtered by service date and service key.
 */
export function getLiveWelcomeBackAttendees(
  serviceDateStr?: string,
  serviceKey?: string
): RecordedWelcomeBackAttendee[] {
  const all = loadRecords();
  return all.filter((r) => {
    if (serviceDateStr && r.serviceDateStr !== serviceDateStr) return false;
    if (serviceKey && r.serviceKey !== serviceKey) return false;
    return true;
  });
}

/**
 * Clears recorded Welcome Back attendees (e.g. on demo reset).
 */
export function clearLiveWelcomeBackAttendees(serviceDateStr?: string): void {
  if (!serviceDateStr) {
    saveRecords([]);
  } else {
    const remaining = loadRecords().filter((r) => r.serviceDateStr !== serviceDateStr);
    saveRecords(remaining);
  }
  notify();
}

/**
 * Subscribes to updates to the live Welcome Back records.
 */
export function subscribeLiveWelcomeBack(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
