/**
 * Demo hand-off between the two M5 screens.
 *
 * The Member Mobile simulator (/staff-checkin-demo) and the Church scanner
 * (/checkin-scanner) share a browser, so the scanned QR content is carried
 * between them deterministically through localStorage (plus a manual paste
 * path for realism).
 *
 * IMPORTANT: This is a SIMULATION DEVICE, not an authentication mechanism.
 * The transported value is only the QR session token (service + tenant, no
 * identity). The actual check-in still requires a valid authenticated
 * session cookie, and the backend resolves the member server-side.
 */

const CARRY_KEY = "m5:checkin:carry";

export interface CarryPayload {
  sessionToken: string;
  memberName: string;
  memberEmail: string;
  carriedAt: string;
}

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function carrySession(payload: CarryPayload): void {
  safeLocalStorage()?.setItem(CARRY_KEY, JSON.stringify(payload));
}

export function readCarriedSession(): CarryPayload | null {
  const raw = safeLocalStorage()?.getItem(CARRY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CarryPayload;
    if (!parsed?.sessionToken || !parsed?.memberName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCarriedSession(): void {
  safeLocalStorage()?.removeItem(CARRY_KEY);
}