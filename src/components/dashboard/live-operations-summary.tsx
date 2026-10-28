"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { getAttendanceContext } from "@/lib/attendance/attendance-context";
import { getLiveOperations } from "@/lib/mock-data/live-operations";
import { useTranslation } from "@/lib/i18n";
import { useAttendanceDemo } from "@/components/dashboard/attendance-demo-provider";
import { useFridayDemoSimulation } from "@/components/dashboard/friday-demo-simulation-provider";
import { useAnimatedNumber } from "@/lib/use-animated-number";

import type { ActiveService } from "@/lib/attendance/attendance-context";

interface LiveOperationsSummaryProps {
  className?: string;
  activeService?: ActiveService;
}

export function LiveOperationsSummary({ className, activeService }: LiveOperationsSummaryProps) {
  const { t, isRTL, attendanceWindow, locale } = useTranslation();
  const isAr = locale === "ar";
  const { effectiveNow, demoMode } = useAttendanceDemo();
  const simulation = useFridayDemoSimulation();
  const ops = getLiveOperations();

  const ctx = getAttendanceContext(effectiveNow);
  const currentService = activeService ?? ctx.activeService;

  const isSundayMorning = currentService === "sunday_morning";
  const isSundayEvening = currentService === "sunday_evening";

  const serviceLabel = isSundayMorning
    ? (isAr ? "خدمة الأحد الصباحية" : "Sunday Morning Service")
    : isSundayEvening
    ? (isAr ? "خدمة الأحد المسائية" : "Sunday Evening Service")
    : attendanceWindow.fridayMainService;

  const expectedAttendance = isSundayMorning ? 320 : isSundayEvening ? 180 : ops.expectedAttendance;

  // Demo-only progressive counters; real Friday / review states keep M2 values.
  const counts = simulation.active ? simulation : ops;
  const animatedCheckedIn = useAnimatedNumber(counts.checkedIn, 500);
  const animatedPeopleHereNow = useAnimatedNumber(counts.peopleHereNow, 500);
  const animatedRecentCheckIns = useAnimatedNumber(counts.recentCheckIns, 500);

  const demoTag = demoMode ? (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
      {attendanceWindow.demoShort}
    </span>
  ) : null;

  // ─── LIVE STATE (09:00 – 13:00) ───────────────────────────
  if (ctx.state === "live") {
    const tiles = [
      {
        label: attendanceWindow.reviewedCount,
        value: animatedCheckedIn.toLocaleString(),
        valueClass: "text-gray-900",
      },
      {
        label: t("dashboard.peopleHereNow"),
        value: animatedPeopleHereNow.toLocaleString(),
        valueClass: "text-gray-900",
      },
      {
        label: attendanceWindow.recentCheckIns,
        value: `+${animatedRecentCheckIns}`,
        valueClass: "text-emerald-600",
      },
      {
        label: attendanceWindow.lastCheckIn,
        value: attendanceWindow.justNow,
        valueClass: "text-gray-900",
      },
      {
        label: attendanceWindow.attendanceTile,
        value: `${counts.attendanceRate}%`,
        valueClass: "text-blue-600",
      },
    ];

    return (
      <div
        data-testid="live-operations-summary-live"
        className={cn(
          "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-start",
          className
        )}
      >
        {/* Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
              {t("dashboard.liveOperations")}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-semibold text-gray-800">{serviceLabel}</span>
            {demoTag}
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            {attendanceWindow.checkInActive}
          </span>
        </div>

        {/* 5 Compact Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-gray-100">
          {tiles.map((tile) => (
            <div key={tile.label} className="bg-white px-5 py-3.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">
                {tile.label}
              </p>
              <p className={cn("mt-1 text-xl font-bold tabular-nums", tile.valueClass)}>
                <bdi dir="ltr">{tile.value}</bdi>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── REVIEW STATE (>= 13:00) ──────────────────────────────
  if (ctx.state === "review") {
    const tiles = [
      {
        label: attendanceWindow.present,
        value: ops.checkedIn.toLocaleString(),
        valueClass: "text-gray-900",
      },
      {
        label: attendanceWindow.expected,
        value: expectedAttendance.toLocaleString(),
        valueClass: "text-gray-900",
      },
      {
        label: attendanceWindow.missing,
        value: Math.max(0, expectedAttendance - ops.checkedIn).toLocaleString(),
        valueClass: "text-amber-600",
      },
      {
        label: attendanceWindow.attendanceTile,
        value: `${ops.attendanceRate}%`,
        valueClass: "text-blue-600",
      },
    ];

    return (
      <div
        data-testid="live-operations-summary-review"
        className={cn(
          "bg-white rounded-xl border border-amber-200/80 shadow-sm overflow-hidden text-start",
          className
        )}
      >
        {/* Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-amber-100 bg-amber-50/40">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              {attendanceWindow.stateReview}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-semibold text-gray-800">{serviceLabel}</span>
            {demoTag}
          </div>
          <Link
            href="/attendance?view=missing"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors inline-flex items-center gap-1"
          >
            <span>{attendanceWindow.reviewMissingPeople}</span>
            <span>{isRTL ? "←" : "→"}</span>
          </Link>
        </div>

        {/* 4 Compact Review Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100">
          {tiles.map((tile) => (
            <div key={tile.label} className="bg-white px-5 py-3.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">
                {tile.label}
              </p>
              <p className={cn("mt-1 text-xl font-bold tabular-nums", tile.valueClass)}>
                <bdi dir="ltr">{tile.value}</bdi>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── NOT STARTED STATE (< 09:00) ──────────────────────────
  return (
    <div
      data-testid="live-operations-summary-not-started"
      className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3 text-start flex flex-wrap items-center justify-between gap-3 text-gray-600",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {attendanceWindow.stateNotStarted}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-medium text-gray-700">{serviceLabel}</span>
        {demoTag}
      </div>
      <span className="text-xs text-gray-500 font-medium">
        {attendanceWindow.notStartedHint}
      </span>
    </div>
  );
}
