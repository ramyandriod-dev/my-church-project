"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getAttendanceContext, type AttendanceState } from "@/lib/attendance/attendance-context";
import { useTranslation } from "@/lib/i18n";

interface AttendanceStatusBadgeProps {
  now?: Date;
  className?: string;
  showLabel?: boolean;
}

const STATE_STYLES: Record<AttendanceState, {
  dot: string;
  ping: string | null;
  text: string;
  bg: string;
  border: string;
}> = {
  "not-started": {
    dot: "bg-gray-400",
    ping: null,
    text: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-200",
  },
  live: {
    dot: "bg-emerald-500",
    ping: "bg-emerald-400",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  review: {
    dot: "bg-amber-500",
    ping: null,
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
};

export function AttendanceStatusBadge({ now, className, showLabel = false }: AttendanceStatusBadgeProps) {
  const ctx = getAttendanceContext(now);
  const { t, attendanceWindow } = useTranslation();
  const style = STATE_STYLES[ctx.state];
  const label =
    ctx.state === "live"
      ? attendanceWindow.stateLive
      : ctx.state === "review"
      ? attendanceWindow.stateReview
      : attendanceWindow.stateNotStarted;

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5", style.bg, style.border, className)}>
      {showLabel && (
        <span className="text-xs font-medium text-gray-500">{attendanceWindow.todayAttendance}</span>
      )}
      <span className="relative flex h-2 w-2">
        {style.ping && (
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", style.ping)} />
        )}
        <span className={cn("relative inline-flex rounded-full h-2 w-2", style.dot)} />
      </span>
      <span className={cn("text-xs font-bold uppercase tracking-wider", style.text)}>{label}</span>
    </span>
  );
}