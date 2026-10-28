"use client";

import * as React from "react";
import { useSyncExternalStore } from "react";
import {
  getDemoAttendanceSnapshot,
  getDemoAttendanceServerSnapshot,
  subscribeDemoAttendance,
  setDemoSimulationPaused,
} from "@/lib/demo/demo-attendance-store";

interface FridayDemoSimulationContextValue {
  /** True only in Demo Mode while the Friday attendance window is LIVE. */
  active: boolean;
  paused: boolean;
  togglePaused: () => void;
  /** Most recent simulated arrivals, newest-first (capped buffer). */
  arrivals: import("@/lib/mock-data/check-ins").CheckInEvent[];
  /** Newest arrival event, used for "Last check-in". */
  latestCheckIn: import("@/lib/mock-data/check-ins").CheckInEvent | null;
  checkedIn: number;
  expectedAttendance: number;
  peopleHereNow: number;
  recentCheckIns: number;
  attendanceRate: number;
  missing: number;
  completed: boolean;
}

/**
 * Shared Friday Demo progressive-attendance state (M5.1).
 *
 * The simulation RUN lives in `demo-attendance-store` (wall-clock-derived +
 * persisted), NOT in this component — so it survives navigation, remounts and
 * keeps advancing in the background. Every screen (Dashboard, /attendance,
 * /staff-checkin-demo) reads the exact same snapshot through this hook.
 */
export function useFridayDemoSimulation(): FridayDemoSimulationContextValue {
  const snapshot = useSyncExternalStore(
    subscribeDemoAttendance,
    getDemoAttendanceSnapshot,
    getDemoAttendanceServerSnapshot
  );

  const togglePaused = React.useCallback(() => {
    setDemoSimulationPaused(!getDemoAttendanceSnapshot().paused);
  }, []);

  const value = React.useMemo<FridayDemoSimulationContextValue>(
    () => ({
      active: snapshot.active,
      paused: snapshot.paused,
      togglePaused,
      arrivals: snapshot.arrivals,
      latestCheckIn: snapshot.latestCheckIn,
      checkedIn: snapshot.checkedIn,
      expectedAttendance: snapshot.expectedAttendance,
      peopleHereNow: snapshot.peopleHereNow,
      recentCheckIns: snapshot.recentCheckIns,
      attendanceRate: snapshot.attendanceRate,
      missing: snapshot.missing,
      completed: snapshot.completed,
    }),
    [snapshot, togglePaused]
  );

  return value;
}

/**
 * Passthrough kept for backward compatibility — the simulation no longer owns
 * any lifecycle here, so wrapping (or not wrapping) a subtree is irrelevant.
 */
export function FridayDemoSimulationProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}