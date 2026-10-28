/**
 * Demo-only attendance clock (M5 hotfix)
 *
 * The HTTP bridge between the shared client-side Friday Demo clock and the
 * attendance endpoints. The demo simulator sends its simulated `now` in the
 * `x-demo-now` header so the session token minting and check-in validation
 * can honor Demo Mode during a development/demo session.
 *
 * SECURITY:
 * - The header is READ ONLY when the server is NOT running in production.
 * - In production this function always returns null, so the attendance
 *   service keeps validating against the REAL clock and the Demo time is
 *   never accepted as a trusted attendance timestamp.
 * - An absent or malformed header silently falls back to the real clock.
 */

import { config } from "./config";

export const DEMO_CLOCK_HEADER = "x-demo-now";

export function isDemoClockEnabled(): boolean {
  if (!config.isProduction) return true;
  if (process.env.ENABLE_DEMO_CLOCK === "true" || process.env.ENABLE_DEMO_CLOCK === "1") {
    return true;
  }
  const globalEnv = (globalThis as any)?.__ENV__ || (globalThis as any)?.process?.env;
  if (globalEnv?.ENABLE_DEMO_CLOCK === "true" || globalEnv?.ENABLE_DEMO_CLOCK === "1") {
    return true;
  }
  return false;
}

export function readDemoClock(request: Request): Date | null {
  if (!isDemoClockEnabled()) return null;

  const raw = request.headers.get(DEMO_CLOCK_HEADER);
  if (!raw) return null;

  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) return null;

  return new Date(timestamp);
}