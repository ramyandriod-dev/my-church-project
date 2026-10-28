"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { clearRealCheckIns } from "@/lib/demo/demo-attendance-store";
import { clearCarriedSession } from "@/lib/staff-checkin-demo/carry";
import { publishLocalRealtime } from "@/lib/realtime/local-broadcast";

const routes = [
  { href: "/staff-checkin-demo", label: "Member Simulator" },
  { href: "/checkin-scanner", label: "Church Scanner" },
];

/** Dev-only switcher between the two M5 screens (not part of the app nav). */
export function DemoNav() {
  const pathname = usePathname();
  const [resetting, setResetting] = React.useState(false);

  async function handleReset() {
    if (!confirm("Reset all check-in records for this demo so members can be checked in again?")) {
      return;
    }
    setResetting(true);
    try {
      clearRealCheckIns();
      clearCarriedSession();
      if (process.env.NODE_ENV !== "production") {
        publishLocalRealtime({
          type: "attendance.reset",
          data: {},
          timestamp: new Date().toISOString(),
        });
      }
      await fetch("/api/attendance/reset", {
        method: "POST",
        credentials: "include",
      });
      window.location.reload();
    } catch {
      // ignore
    } finally {
      setResetting(false);
    }
  }

  return (
    <div
      dir="ltr"
      className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-2xl px-2 py-2 backdrop-blur"
    >
      {routes.map((r) => {
        const active = pathname === r.href;
        return (
          <Link
            key={r.href}
            href={r.href}
            className={cn(
              "flex-1 text-center text-xs font-semibold rounded-xl px-3 py-2 transition-colors",
              active
                ? "bg-white text-navy-900 shadow"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            {r.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={handleReset}
        disabled={resetting}
        title="Reset demo check-ins"
        className="text-center text-xs font-semibold rounded-xl px-2.5 py-2 text-coral-300 hover:text-white hover:bg-coral-500/20 transition-colors disabled:opacity-50"
      >
        {resetting ? "Resetting…" : "Reset"}
      </button>
      <a
        href="/dashboard"
        className="text-center text-xs font-semibold rounded-xl px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        Dashboard
      </a>
    </div>
  );
}