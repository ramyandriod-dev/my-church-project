"use client";

import * as React from "react";
import { useDemoClock } from "@/lib/demo/use-demo-clock";
import type { AttendanceDayMode, FridayDemoState } from "@/lib/attendance/attendance-day-context";

interface AttendanceDemoContextValue {
  mode: AttendanceDayMode;
  demoMode: boolean;
  demoState: FridayDemoState;
  /** The `now` to feed `getAttendanceContext` (real now on real Friday, simulated Friday otherwise). */
  effectiveNow: Date;
  isRealFriday: boolean;
  attendanceRelevant: boolean;
  enterDemo: (stateId: string) => void;
  exitDemo: () => void;
}

const AttendanceDemoContext = React.createContext<AttendanceDemoContextValue | null>(null);

export function useAttendanceDemo() {
  const ctx = React.useContext(AttendanceDemoContext);
  if (!ctx) {
    throw new Error("useAttendanceDemo must be used within an AttendanceDemoProvider");
  }
  return ctx;
}

/**
 * Wraps the shared Friday Demo clock (source of truth for M5 Demo Mode) for
 * the dashboard subtree. No local demo state lives here anymore — the 
 * dashboard selector writes to the shared store, and /staff-checkin-demo and
 * /checkin-scanner read the very same clock.
 */
export function AttendanceDemoProvider({ children }: { children: React.ReactNode }) {
  const clock = useDemoClock();

  const value = React.useMemo<AttendanceDemoContextValue>(
    () => ({
      mode: clock.demoMode ? "demo" : "real",
      demoMode: clock.demoMode,
      demoState: clock.demoState ?? { id: "", hour: 0, minute: 0, labelKey: "live" },
      effectiveNow: clock.effectiveNow,
      isRealFriday: clock.isRealFriday,
      attendanceRelevant: clock.attendanceRelevant,
      enterDemo: clock.enterDemo,
      exitDemo: clock.exitDemo,
    }),
    [clock]
  );

  return <AttendanceDemoContext.Provider value={value}>{children}</AttendanceDemoContext.Provider>;
}