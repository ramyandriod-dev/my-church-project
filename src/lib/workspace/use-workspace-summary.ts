"use client";

/**
 * The workspace summary (live service, what is waiting) shared by the top bar
 * and the dashboard banner. Both mount on the dashboard, so one in-flight
 * request and one short cache serve them both instead of two polls.
 */

import * as React from "react";
import type { WorkspaceSummary } from "@/lib/backend/services/workspace-summary-service";

const POLL_MS = 60_000;
const FRESH_MS = 20_000;

let cached: { at: number; data: WorkspaceSummary } | null = null;
let inFlight: Promise<WorkspaceSummary | null> | null = null;

async function load(force = false): Promise<WorkspaceSummary | null> {
  if (!force && cached && Date.now() - cached.at < FRESH_MS) return cached.data;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/workspace/summary");
      if (!res.ok) return null;
      const json = await res.json();
      const data = json?.data as WorkspaceSummary | undefined;
      if (!data) return null;
      cached = { at: Date.now(), data };
      return data;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function useWorkspaceSummary(): { summary: WorkspaceSummary | null; refresh: () => void } {
  const [summary, setSummary] = React.useState<WorkspaceSummary | null>(cached?.data ?? null);

  const refresh = React.useCallback(() => {
    void load(true).then((d) => d && setSummary(d));
  }, []);

  React.useEffect(() => {
    let active = true;
    const tick = () => void load().then((d) => active && d && setSummary(d));
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { summary, refresh };
}
