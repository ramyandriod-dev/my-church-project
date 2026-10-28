"use client";

/**
 * LiveServiceCard
 *
 * Unified live-service experience that replaces the old stacked layers:
 *   - LiveServiceControl (demo control bar)
 *   - LiveOperationsSummary (status + tiles)
 *   - WelcomeBackAlert
 *   - Live Area (Church Pulse + People Here Now + Check-In Feed)
 *
 * Everything is inside ONE card with a compact header and toggleable sections.
 */

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAttendanceDemo } from "@/components/dashboard/attendance-demo-provider";
import { useFridayDemoSimulation } from "@/components/dashboard/friday-demo-simulation-provider";
import { useTranslation } from "@/lib/i18n";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { getAttendanceContext, type ActiveService } from "@/lib/attendance/attendance-context";
import { getLiveOperations } from "@/lib/mock-data/live-operations";
import { LiveChurchPulse } from "@/components/dashboard/live-church-pulse";
import { PeopleHereNow } from "@/components/dashboard/people-here-now";
import { LiveCheckInFeed } from "@/components/dashboard/live-check-in-feed";
import { WelcomeBackAlert } from "@/components/dashboard/welcome-back-alert";
import { DashboardSeatingRadar } from "@/components/seating/dashboard-seating-radar";
import {
  FRIDAY_DEMO_STATES,
  SUNDAY_MORNING_DEMO_STATES,
  SUNDAY_EVENING_DEMO_STATES,
  FRIDAY_DEMO_DEFAULT_STATE,
  ALL_DEMO_STATES,
  getDemoServiceKey,
  type FridayDemoState,
} from "@/lib/attendance/attendance-day-context";
import { resetAttendanceState } from "@/lib/demo/use-demo-clock";
import { type CheckInEvent } from "@/lib/mock-data/check-ins";

// ─── Service Definitions ────────────────────────────────────

interface ServiceDef {
  key: "friday" | "sunday_morning" | "sunday_evening";
  labelEn: string;
  labelAr: string;
  activeService: ActiveService;
  states: readonly FridayDemoState[];
  defaultStateId: string;
}

const SERVICES: ServiceDef[] = [
  {
    key: "friday",
    labelEn: "Friday Morning",
    labelAr: "اجتماع الجمعة",
    activeService: "friday_morning",
    states: FRIDAY_DEMO_STATES,
    defaultStateId: FRIDAY_DEMO_DEFAULT_STATE,
  },
  {
    key: "sunday_morning",
    labelEn: "Sunday Morning",
    labelAr: "الأحد الصباحي",
    activeService: "sunday_morning",
    states: SUNDAY_MORNING_DEMO_STATES,
    defaultStateId: "sun-am-0900",
  },
  {
    key: "sunday_evening",
    labelEn: "Sunday Evening",
    labelAr: "الأحد المسائي",
    activeService: "sunday_evening",
    states: SUNDAY_EVENING_DEMO_STATES,
    defaultStateId: "sun-pm-1700",
  },
];

const STATE_LABELS: Record<string, string> = {
  "not-started": "Not Started",
  live: "Live",
  "main-service": "Main Service",
  review: "Review",
};

const STATE_LABELS_AR: Record<string, string> = {
  "not-started": "لم يبدأ",
  live: "مباشر",
  "main-service": "الخدمة الرئيسية",
  review: "مراجعة",
};

function fmt(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Props ──────────────────────────────────────────────────

interface LiveServiceCardProps {
  activeService: ActiveService;
  onServiceChange?: (service: ActiveService) => void;
  checkedIn: number;
  totalCheckedIn: number;
  /** Real arrivals in the last minute, and when the latest one happened. */
  recentCheckIns?: number;
  lastCheckInAt?: Date | null;
  /** Real expected headcount; none is invented when it is unknown. */
  expectedCount?: number;
  effectiveNow?: Date;
  onCheckIn?: (event: CheckInEvent) => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────

export function LiveServiceCard({
  activeService,
  onServiceChange,
  checkedIn,
  totalCheckedIn,
  recentCheckIns = 0,
  lastCheckInAt = null,
  expectedCount = 0,
  effectiveNow,
  onCheckIn,
  className,
}: LiveServiceCardProps) {
  const { locale, t, isRTL, attendanceWindow } = useTranslation();
  const isAr = locale === "ar";
  const { demoMode, demoState, enterDemo, exitDemo } = useAttendanceDemo();
  const ctx = getAttendanceContext(effectiveNow);

  const [controlsOpen, setControlsOpen] = React.useState(false);
  const [detailsExpanded, setDetailsExpanded] = React.useState(true);

  const isLive = ctx.state === "live";
  const isReview = ctx.state === "review";
  const isNotStarted = ctx.state === "not-started";

  const isSundayMorning = activeService === "sunday_morning";
  const isSundayEvening = activeService === "sunday_evening";

  const serviceLabel = isSundayMorning
    ? (isAr ? "خدمة الأحد الصباحية" : "Sunday Morning Service")
    : isSundayEvening
    ? (isAr ? "خدمة الأحد المسائية" : "Sunday Evening Service")
    : attendanceWindow.fridayMainService;

  const expectedAttendance = expectedCount;
  const effectiveCheckedIn = checkedIn !== undefined ? checkedIn : 0;
  const animatedCheckedIn = useAnimatedNumber(effectiveCheckedIn, 500);
  const animatedPeopleHereNow = useAnimatedNumber(effectiveCheckedIn, 500);
  const animatedRecentCheckIns = useAnimatedNumber(recentCheckIns, 500);
  const effectiveAttendanceRate = expectedAttendance > 0 ? Math.min(100, Math.round((effectiveCheckedIn / expectedAttendance) * 100)) : 0;

  // Demo control state
  const currentServiceKey = demoState
    ? getDemoServiceKey(demoState.id)
    : (activeService === "friday_morning"
        ? "friday"
        : activeService === "sunday_morning"
        ? "sunday_morning"
        : activeService === "sunday_evening"
        ? "sunday_evening"
        : "friday");

  const currentServiceDef =
    SERVICES.find((s) => s.key === currentServiceKey) ?? SERVICES[0];

  const handleServiceChange = (key: ServiceDef["key"]) => {
    const def = SERVICES.find((s) => s.key === key)!;
    enterDemo(def.defaultStateId);
    onServiceChange?.(def.activeService);
  };

  const handleTimeChange = async (stateId: string) => {
    enterDemo(stateId);
    const targetState = ALL_DEMO_STATES.find((s) => s.id === stateId);
    if (targetState?.labelKey === "not-started") {
      await resetAttendanceState();
    }
  };

  // ─── Status color theming ─────────────────────────────────

  const statusConfig = isLive
    ? {
        dotColor: "bg-red-500",
        dotPing: "bg-red-400",
        label: isAr ? "مباشر الآن" : "LIVE NOW",
        labelColor: "text-red-600",
        borderColor: "border-red-200/60",
        headerBg: "bg-red-50/40",
        badge: (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            {attendanceWindow.checkInActive}
          </span>
        ),
      }
    : isReview
    ? {
        dotColor: "bg-amber-500",
        dotPing: "bg-amber-400",
        label: isAr ? "مراجعة" : "REVIEW",
        labelColor: "text-amber-700",
        borderColor: "border-amber-200/60",
        headerBg: "bg-amber-50/30",
        badge: (
          <Link
            href="/attendance?view=missing"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors inline-flex items-center gap-1"
          >
            <span>{attendanceWindow.reviewMissingPeople}</span>
            <span>{isRTL ? "←" : "→"}</span>
          </Link>
        ),
      }
    : {
        dotColor: "bg-gray-400",
        dotPing: "",
        label: isAr ? "لم يبدأ" : "NOT STARTED",
        labelColor: "text-gray-500",
        borderColor: "border-gray-200",
        headerBg: "bg-gray-50/50",
        badge: (
          <button
            type="button"
            onClick={resetAttendanceState}
            className="text-xs text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer border border-gray-200"
            title={isAr ? "إعادة تعيين الحضور للتجربة" : "Click to reset check-ins for demo"}
          >
            {attendanceWindow.notStartedHint} · <span className="font-bold underline">{isAr ? "إعادة تعيين" : "Reset Check-ins"}</span>
          </button>
        ),
      };

  // ─── Live KPI Tiles ───────────────────────────────────────

  const liveTiles = isLive
    ? [
        { label: attendanceWindow.reviewedCount, value: animatedCheckedIn.toLocaleString(), cls: "text-gray-900" },
        { label: t("dashboard.peopleHereNow"), value: animatedPeopleHereNow.toLocaleString(), cls: "text-gray-900" },
        { label: attendanceWindow.recentCheckIns, value: `+${animatedRecentCheckIns}`, cls: "text-emerald-600" },
        { label: attendanceWindow.lastCheckIn, value: lastCheckInAt ? lastCheckInAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—", cls: "text-gray-900" },
        { label: attendanceWindow.attendanceTile, value: expectedAttendance > 0 ? `${effectiveAttendanceRate}%` : "—", cls: "text-blue-600" },
      ]
    : isReview
    ? [
        { label: attendanceWindow.present, value: effectiveCheckedIn.toLocaleString(), cls: "text-gray-900" },
        { label: attendanceWindow.expected, value: expectedAttendance > 0 ? expectedAttendance.toLocaleString() : "—", cls: "text-gray-900" },
        { label: attendanceWindow.missing, value: expectedAttendance > 0 ? Math.max(0, expectedAttendance - effectiveCheckedIn).toLocaleString() : "—", cls: "text-amber-600" },
        { label: attendanceWindow.attendanceTile, value: expectedAttendance > 0 ? `${effectiveAttendanceRate}%` : "—", cls: "text-blue-600" },
      ]
    : [];

  // ─── Render ───────────────────────────────────────────────

  return (
    <div
      className={cn(
        "bg-white rounded-xl border shadow-sm overflow-hidden text-start",
        statusConfig.borderColor,
        className
      )}
    >
      {/* ── Unified Header ─────────────────────────────── */}
      <div className={cn("px-4 py-3 border-b border-gray-100", statusConfig.headerBg)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Status + Service Name */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              {statusConfig.dotPing && (
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusConfig.dotPing)} />
              )}
              <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", statusConfig.dotColor)} />
            </span>
            <span className={cn("text-xs font-bold uppercase tracking-wider", statusConfig.labelColor)}>
              {statusConfig.label}
            </span>
            <span className="text-gray-300 text-xs">|</span>
            <span className="text-sm font-semibold text-gray-800">{serviceLabel}</span>

            {demoMode ? (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">
                {attendanceWindow.demoShort}
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5">
                {isAr ? "توقيت تلقائي" : "AUTO TIME"}
              </span>
            )}
          </div>

          {/* Right: Badge + Controls Toggle + Expand/Collapse */}
          <div className="flex items-center gap-2">
            {statusConfig.badge}

            <button
              type="button"
              onClick={() => setControlsOpen(!controlsOpen)}
              className={cn(
                "text-[11px] font-semibold rounded-md px-2.5 py-1 transition-colors cursor-pointer inline-flex items-center gap-1.5 border shadow-2xs",
                controlsOpen
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
              aria-label={isAr ? "لوحة التحكم" : "Control Panel"}
            >
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>{isAr ? "لوحة التحكم" : "Controls"}</span>
              <svg className={cn("w-3 h-3 transition-transform text-gray-400", controlsOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {demoMode && (
              <button
                type="button"
                onClick={exitDemo}
                className="text-[11px] font-bold text-gray-500 hover:text-red-600 bg-white border border-gray-200 rounded-md px-2 py-1 transition-colors cursor-pointer"
                aria-label={isAr ? "إنهاء العرض التجريبي" : "Exit Demo"}
              >
                ✕
              </button>
            )}

            {/* Expand/collapse details */}
            {(isLive || isReview) && (
              <button
                type="button"
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors cursor-pointer"
                aria-label={detailsExpanded ? "Collapse" : "Expand"}
              >
                <svg className={cn("w-4 h-4 transition-transform", detailsExpanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Control Panel (Service & Time Slot Selector) ─────────────── */}
        {controlsOpen && (
          <div className="mt-2.5 pt-2.5 border-t border-gray-200/80 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500">{isAr ? "الاجتماع:" : "Service:"}</span>
              <select
                value={currentServiceKey}
                onChange={(e) => handleServiceChange(e.target.value as ServiceDef["key"])}
                className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                aria-label={isAr ? "اختر الاجتماع" : "Select service"}
              >
                {SERVICES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {isAr ? s.labelAr : s.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500">{isAr ? "الوقت:" : "Time Slot:"}</span>
              <select
                value={demoMode ? (demoState?.id ?? "") : "auto"}
                onChange={(e) => {
                  if (e.target.value === "auto") {
                    exitDemo();
                  } else {
                    handleTimeChange(e.target.value);
                  }
                }}
                className={cn(
                  "text-xs font-semibold bg-white border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer",
                  demoMode ? "text-purple-800 border-purple-300" : isReview ? "text-amber-800 border-amber-300" : "text-emerald-800 border-emerald-300"
                )}
                aria-label={isAr ? "اختر الوقت" : "Select time"}
              >
                <option value="auto">
                  ⚡ {isAr ? `الوقت الفعلي (تلقائي: ${statusConfig.label})` : `Real Time (Auto: ${statusConfig.label})`}
                </option>
                {currentServiceDef.states.map((s) => {
                  const label = isAr ? STATE_LABELS_AR[s.labelKey] : STATE_LABELS[s.labelKey];
                  return (
                    <option key={s.id} value={s.id}>
                      {fmt(s.hour, s.minute)} — {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {demoMode && (
              <button
                type="button"
                onClick={exitDemo}
                className="text-[11px] font-bold text-gray-600 hover:text-red-600 bg-white border border-gray-200 rounded-md px-2 py-1 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                aria-label={isAr ? "العودة للوقت الفعلي" : "Reset to Real Time"}
              >
                <span>↺</span>
                <span>{isAr ? "العودة للوقت الفعلي" : "Reset to Real Time"}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Compact KPI Tiles (live/review only) ────── */}
      {liveTiles.length > 0 && (
        <div className={cn(
          "grid gap-px bg-gray-100",
          liveTiles.length === 5
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            : "grid-cols-2 sm:grid-cols-4"
        )}>
          {liveTiles.map((tile) => (
            <div key={tile.label} className="bg-white px-4 py-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">
                {tile.label}
              </p>
              <p className={cn("mt-0.5 text-lg font-bold tabular-nums", tile.cls)}>
                <bdi dir="ltr">{tile.value}</bdi>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Welcome Back Alert (inside the card) ──── */}
      {(isLive || isReview) && (
        <WelcomeBackAlert effectiveNow={effectiveNow} activeService={activeService} />
      )}

      {/* ── Review Phase Action Banner (prominent for Review phase) ───── */}
      {isReview && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white border-t border-amber-200/70">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100/90 text-amber-700 rounded-xl shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  {isAr
                    ? "انتهت فترة الخدمة الحية — مرحلة مراجعة الحضور ومتابعة الغائبين نشطة الآن"
                    : "Live Service Concluded — Attendance Review & Follow-up Active"}
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  {isAr
                    ? `تم تسجيل ${effectiveCheckedIn} حاضر من إجمالي ${expectedAttendance} متوقع. هناك ${Math.max(0, expectedAttendance - effectiveCheckedIn)} غائب بحاجة للتنسيق والمتابعة الرعوية.`
                    : `${effectiveCheckedIn} checked in out of ${expectedAttendance} expected. ${Math.max(0, expectedAttendance - effectiveCheckedIn)} missing members need pastoral follow-up and care.`}
                </p>
              </div>
            </div>
            <Link
              href="/attendance?view=missing"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <span>
                {isAr
                  ? `فتح مراجعة الغائبين (${Math.max(0, expectedAttendance - effectiveCheckedIn)})`
                  : `Review Missing Members (${Math.max(0, expectedAttendance - effectiveCheckedIn)})`}
              </span>
              <span>{isRTL ? "←" : "→"}</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── Sanctuary Seating & Capacity Radar (Live Usher Feed) ──── */}
      {(isLive || isReview) && (
        <div className="p-4 border-t border-gray-100">
          <DashboardSeatingRadar />
        </div>
      )}

      {/* ── Expandable Live Details ────────────────── */}
      {(isLive || isReview) && detailsExpanded && (
        <div className="p-4 border-t border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            <div className="lg:col-span-2 space-y-4">
              <LiveChurchPulse activeService={activeService} effectiveNow={effectiveNow} />
              <PeopleHereNow
                activeService={activeService}
                totalCount={isSundayMorning ? 265 : isSundayEvening ? 145 : effectiveCheckedIn}
                effectiveNow={effectiveNow}
              />
            </div>
            <div className="lg:col-span-1 flex flex-col">
              <LiveCheckInFeed
                activeService={activeService}
                onCheckIn={onCheckIn}
                defaultCollapsed={false}
                effectiveNow={effectiveNow}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
