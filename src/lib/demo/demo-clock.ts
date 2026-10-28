/**
 * Pure derivation helpers over the shared Demo clock.
 *
 * One function turns the stored demo state id into the effective `now` that
 * every screen must feed to the EXISTING single-source AttendanceContext
 * (getAttendanceContext). Interpretation stays in attendance-day-context.ts —
 * this only wires the stored id to it.
 *
 * Now supports three service types:
 *   fri-*     → simulated Friday
 *   sun-am-*  → simulated Sunday (morning window)
 *   sun-pm-*  → simulated Sunday (evening window)
 */

import {
  ALL_DEMO_STATES,
  FRIDAY_DEMO_DEFAULT_STATE,
  getDemoServiceKey,
  getSimulatedFriday,
  getSimulatedSunday,
  isFriday,
  resolveAttendanceDay,
} from "@/lib/attendance/attendance-day-context";
import { getDemoStateId } from "./demo-clock-store";

export interface DemoClockInfo {
  /** Stored demo state id, or null when Demo Mode is OFF. */
  stateId: string | null;
  /**
   * The one `now` to use everywhere. Equals the real clock when Demo Mode is
   * OFF (production behavior unchanged); equals the simulated service time when
   * a demo state is active.
   */
  effectiveNow: Date;
  demoMode: boolean;
  /** Whether the REAL calendar day is a Friday (unchanged demo semantics). */
  isRealFriday: boolean;
  /** True when real Friday OR Demo Mode — the attendance relevance gate. */
  attendanceRelevant: boolean;
}

function resolveStateId(id: string | null): string | null {
  if (!id) return null;
  const direct = ALL_DEMO_STATES.find((s) => s.id === id);
  if (direct) return direct.id;
  if (id.startsWith("fri-")) {
    const stripped = id.replace(/^fri-/, "");
    const found = ALL_DEMO_STATES.find((s) => s.id === stripped);
    if (found) return found.id;
  }
  const withFri = ALL_DEMO_STATES.find((s) => s.id === `fri-${id}`);
  if (withFri) return withFri.id;
  return null;
}

/**
 * Compute the effective demo clock from the shared store + the real clock.
 * Never throws and is safe to call on the server (returns real clock).
 */
export function getDemoClockInfo(
  realNow: Date = new Date(),
  explicitStateId?: string | null
): DemoClockInfo {
  const stateId =
    explicitStateId !== undefined
      ? resolveStateId(explicitStateId)
      : resolveStateId(getDemoStateId());
  const realFriday = isFriday(realNow);

  if (!stateId) {
    return {
      stateId: null,
      effectiveNow: realNow,
      demoMode: false,
      isRealFriday: realFriday,
      attendanceRelevant: realFriday,
    };
  }

  const state =
    ALL_DEMO_STATES.find((s) => s.id === stateId) ??
    ALL_DEMO_STATES.find((s) => s.id === FRIDAY_DEMO_DEFAULT_STATE) ??
    ALL_DEMO_STATES[0];

  const service = getDemoServiceKey(stateId);
  const simulatedNow =
    service === "friday"
      ? getSimulatedFriday(state.hour, state.minute, realNow)
      : getSimulatedSunday(state.hour, state.minute, realNow);

  const resolution = resolveAttendanceDay(realNow, { active: true, simulatedNow });

  return {
    stateId,
    effectiveNow: resolution.effectiveNow,
    demoMode: true,
    isRealFriday: realFriday,
    attendanceRelevant: true,
  };
}