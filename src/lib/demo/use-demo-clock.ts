"use client";

import * as React from "react";
import {
  ALL_DEMO_STATES,
  FRIDAY_DEMO_DEFAULT_STATE,
  type FridayDemoState,
} from "@/lib/attendance/attendance-day-context";
import { getDemoClockInfo, type DemoClockInfo } from "./demo-clock";
import { getDemoStateId, setDemoStateId, subscribeDemoClock } from "./demo-clock-store";

export interface DemoClockHookValue extends DemoClockInfo {
  demoState: FridayDemoState | null;
  /** Enter Demo Mode with one of the FRIDAY_DEMO_STATES ids. */
  enterDemo: (stateId: string) => void;
  /** Exit Demo Mode back to the real clock. */
  exitDemo: () => void;
}

export async function resetAttendanceState(): Promise<boolean> {
  // The server comes first. This used to clear the screen first and ask the server
  // afterwards, so when the server refused, the dashboard looked reset while members
  // stayed checked in (and their phones, rightly, still said so).
  let failure: string | null = null;
  try {
    const res = await fetch("/api/attendance/reset", { method: "POST", credentials: "include" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      failure = body?.error?.message || `The server answered ${res.status}`;
    }
  } catch {
    failure = "The server could not be reached";
  }

  if (failure) {
    console.error("Failed to reset attendance:", failure);
    if (typeof window !== "undefined") {
      window.alert(`Check-ins were NOT reset: ${failure}. Members are still checked in.`);
    }
    return false;
  }

  if (typeof window !== "undefined") {
    try {
      const { clearRealCheckIns } = await import("@/lib/demo/demo-attendance-store");
      clearRealCheckIns();
    } catch {}
    try {
      const { clearCarriedSession } = await import("@/lib/staff-checkin-demo/carry");
      clearCarriedSession();
    } catch {}
    try {
      const { publishLocalRealtime } = await import("@/lib/realtime/local-broadcast");
      publishLocalRealtime({
        type: "attendance.reset",
        data: { count: 0 },
        timestamp: new Date().toISOString(),
      });
    } catch {}
    try {
      localStorage.setItem("cmp:attendance-reset-trigger", Date.now().toString());
    } catch {}
  }
  return true;
}

export function useDemoClock(): DemoClockHookValue {
  const [realNow, setRealNow] = React.useState<Date>(() => new Date());
  // NOTE: must NOT read localStorage in the initializer — SSR has none, so a
  // returning visitor's persisted selection would make the first client paint
  // a DIFFERENT subtree (Demo-ON control vs server's Demo-OFF invite) → whole
  const [mounted, setMounted] = React.useState(false);
  const [stateId, setStateId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = window.setInterval(() => setRealNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    // Apply a persisted demo selection AFTER hydration/mount (the initial
    // state is null so SSR and first client paint always agree → invariant:
    // invite button on both; the persisted selection is restored in a stable,
    // mount-only effect so a returning visitor still gets Demo ON back).
    setMounted(true);
    setStateId(getDemoStateId());
    const unsubscribe = subscribeDemoClock(setStateId);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === undefined) return;
      setStateId(getDemoStateId());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const info = React.useMemo(
    () => getDemoClockInfo(realNow, mounted ? stateId : null),
    [realNow, stateId, mounted]
  );

  const demoState = React.useMemo<FridayDemoState | null>(() => {
    if (!info.stateId) return null;
    return (
      ALL_DEMO_STATES.find((s) => s.id === info.stateId) ??
      ALL_DEMO_STATES.find((s) => s.id === FRIDAY_DEMO_DEFAULT_STATE) ??
      ALL_DEMO_STATES[0] ??
      null
    );
  }, [info.stateId]);

  const enterDemo = React.useCallback(async (id: string) => {
    setDemoStateId(id);
    const target = ALL_DEMO_STATES.find((s) => s.id === id);
    if (target?.labelKey === "not-started") {
      await resetAttendanceState();
    }
  }, []);

  const exitDemo = React.useCallback(() => setDemoStateId(null), []);

  return { ...info, demoState, enterDemo, exitDemo };
}