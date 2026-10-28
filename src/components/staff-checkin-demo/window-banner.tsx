"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WindowPresentation } from "@/lib/staff-checkin-demo/types";

const palette = {
  "not-started": {
    container: "bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
    headline: "text-amber-800",
    body: "text-amber-700",
  },
  live: {
    container: "bg-mint-50 border-mint-200",
    dot: "bg-mint-500",
    headline: "text-mint-700",
    body: "text-mint-600",
  },
  review: {
    container: "bg-gray-100 border-gray-200",
    dot: "bg-gray-500",
    headline: "text-gray-700",
    body: "text-gray-600",
  },
} as const;

export function WindowBanner({
  window,
  demoLabel,
}: {
  window: WindowPresentation;
  demoLabel?: string | null;
}) {
  const p = palette[window.state];

  return (
    <div
      data-testid="window-banner"
      data-state={window.state}
      className={cn("rounded-2xl border p-4", p.container)}
    >
      {demoLabel && (
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 border border-amber-200 px-2 py-1 mb-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
            {demoLabel}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className={cn("w-2.5 h-2.5 rounded-full animate-pulse", p.dot)} />
        <p className={cn("text-sm font-bold", p.headline)}>{window.title}</p>
      </div>
      <p className={cn("text-xs mt-1.5 leading-relaxed", p.body)}>{window.description}</p>
      <p className="text-[11px] text-gray-500 mt-2 font-medium">
        Friday Service window · {window.window.start} → {window.window.end}
      </p>
    </div>
  );
}