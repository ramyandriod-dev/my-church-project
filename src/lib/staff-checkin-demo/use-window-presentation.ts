"use client";

import * as React from "react";
import { useDemoClock } from "@/lib/demo/use-demo-clock";
import type { WindowPresentation } from "./types";
import { getWindowPresentation } from "./window-presentation";

export interface DemoWindowPresentation {
  /** The attendance window presentation on the shared Demo clock. */
  window: WindowPresentation;
  demoMode: boolean;
  /** "Friday Demo · 12:59" label when Demo Mode is active, else null. */
  demoLabel: string | null;
}

function formatDemoLabel(hour: number | undefined, minute: number | undefined): string | null {
  if (hour === undefined || minute === undefined) return null;
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `Friday Demo · ${h}:${m}`;
}

/**
 * Window presentation bound to the SHARED Friday Demo clock.
 *
 * In Demo Mode every screen (Dashboard, /staff-checkin-demo, /checkin-scanner) uses
 * the same simulated `now`; with Demo Mode OFF this is the real clock and the
 * presentation is identical to production.
 */
export function useWindowPresentation(): DemoWindowPresentation {
  const clock = useDemoClock();
  const window = getWindowPresentation(clock.effectiveNow);

  return {
    window,
    demoMode: clock.demoMode,
    demoLabel: clock.demoMode
      ? formatDemoLabel(clock.demoState?.hour, clock.demoState?.minute)
      : null,
  };
}