"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  deviceLabel: string;
  deviceIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  windowLabel?: string;
  strip?: React.ReactNode;
}

/**
 * Renders a phone-style frame ("Member Mobile Simulator") around demo content.
 * The mobile app UI is LTR regardless of the dashboard's RTL default.
 */
export function MobileShell({
  deviceLabel,
  deviceIcon,
  children,
  className,
  windowLabel,
  strip,
}: MobileShellProps) {
  return (
    <div
      dir="ltr"
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-blue-950 px-4 py-10"
    >
      <div className="mb-6 flex items-center gap-3 text-white/80">
        <div className="w-2.5 h-2.5 rounded-full bg-mint-400 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          MOBILE CHECK-IN SIMULATOR
        </p>
        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold uppercase tracking-widest">
          Demo
        </span>
      </div>

      {strip && <div className="w-full max-w-[430px] mb-4">{strip}</div>}

      <div
        data-testid="mobile-shell"
        className={cn(
          "relative w-full max-w-[400px] rounded-[2.6rem] border-[10px] border-gray-900 bg-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] overflow-hidden",
          className
        )}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-gray-900 rounded-b-2xl z-10" />

        {/* Device header */}
        <div className="bg-gray-900 text-white px-5 pt-8 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300">
              {deviceIcon ?? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">{deviceLabel}</p>
              {windowLabel && (
                <p suppressHydrationWarning className="text-[11px] text-gray-400 leading-tight">
                  {windowLabel}
                </p>
              )}
            </div>
          </div>
          <div suppressHydrationWarning className="text-[10px] flex items-center gap-1.5 text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-mint-400" />
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        {/* Screen content */}
        <div className="h-[600px] overflow-y-auto bg-gray-50">{children}</div>
      </div>

      <p className="mt-6 text-center text-xs text-white/50 max-w-sm leading-relaxed">
        A web-based simulator of the future Member mobile app. It reuses the
        real M5 check-in architecture (session QR + authenticated check-in).
      </p>
    </div>
  );
}