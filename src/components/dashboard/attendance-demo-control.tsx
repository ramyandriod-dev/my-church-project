"use client";

import * as React from "react";
import { useTranslation } from "@/lib/i18n";
import { FRIDAY_DEMO_STATES, FRIDAY_DEMO_DEFAULT_STATE } from "@/lib/attendance/attendance-day-context";
import { useAttendanceDemo } from "@/components/dashboard/attendance-demo-provider";

const STATE_LABEL_KEYS: Record<string, string> = {
  "not-started": "attendanceWindow.stateNotStarted",
  live: "attendanceWindow.stateLive",
  "main-service": "attendanceWindow.stateMainService",
  review: "attendanceWindow.stateReview",
};

function formatDemoTime(hour: number, minute: number): string {
  const h = hour.toString().padStart(2, "0");
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function AttendanceDemoControl() {
  const { t, locale, attendanceWindow } = useTranslation();
  const { demoMode, demoState, enterDemo, exitDemo } = useAttendanceDemo();

  const todayLabel = React.useMemo(
    () =>
      new Date().toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [locale]
  );

  const selectedTime = formatDemoTime(demoState.hour, demoState.minute);

  if (!demoMode) {
    return (
      <button
        type="button"
        onClick={() => enterDemo(FRIDAY_DEMO_DEFAULT_STATE)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-gray-300 bg-white text-xs font-semibold text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors cursor-pointer"
        aria-label={attendanceWindow.fridayAttendanceDemo}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{attendanceWindow.fridayAttendanceDemo}</span>
      </button>
    );
  }

  return (
    <div
      data-testid="attendance-demo-control"
      className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-md border border-amber-200 bg-amber-50/70"
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
          {attendanceWindow.demoBadge}
        </span>
      </span>

      {/* Simulated Friday state selector */}
      <select
        value={demoState.id}
        onChange={(e) => enterDemo(e.target.value)}
        className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        aria-label={attendanceWindow.fridayAttendanceDemo}
      >
        {FRIDAY_DEMO_STATES.map((state) => {
          const time = formatDemoTime(state.hour, state.minute);
          const key = STATE_LABEL_KEYS[state.labelKey];
          const label = key.startsWith("attendanceWindow.")
            ? (attendanceWindow as any)[key.replace("attendanceWindow.", "")]
            : t(key);
          return (
            <option key={state.id} value={state.id}>
              {time} — {label}
            </option>
          );
        })}
      </select>

      <span className="text-[11px] text-gray-500 font-medium">
        {attendanceWindow.demoToday}: <bdi dir="ltr">{todayLabel}</bdi> ·{" "}
        <bdi dir="ltr">{selectedTime}</bdi>
      </span>

      <button
        type="button"
        onClick={exitDemo}
        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-white border border-amber-200 rounded-md px-2 py-1 transition-colors cursor-pointer"
        aria-label={attendanceWindow.exitDemo}
      >
        ✕ {attendanceWindow.exitDemo}
      </button>
    </div>
  );
}