"use client";

/**
 * LiveServiceControl
 *
 * Single compact control bar that replaces:
 *   1. The yellow DEMO banner (AttendanceDemoControl)
 *   2. The separate ServiceSelector tab strip
 *
 * Layout (all inline, one row):
 *   [▶ Demo] | [Service ▾ dropdown] [Time ▾ dropdown] | [● LIVE] | [✕ Exit]
 *
 * In non-demo mode it shows a minimal "Start Live Demo" invite button.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAttendanceDemo } from "@/components/dashboard/attendance-demo-provider";
import { useTranslation } from "@/lib/i18n";
import { getAttendanceContext, type ActiveService } from "@/lib/attendance/attendance-context";
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

// ─── service definitions ────────────────────────────────────────────────────

interface ServiceDef {
  key: "friday" | "sunday_morning" | "sunday_evening";
  labelEn: string;
  labelAr: string;
  activeService: ActiveService;
  states: readonly FridayDemoState[];
  defaultStateId: string;
  color: "blue" | "purple";
}

const SERVICES: ServiceDef[] = [
  {
    key: "friday",
    labelEn: "Friday Morning",
    labelAr: "اجتماع الجمعة",
    activeService: "friday_morning",
    states: FRIDAY_DEMO_STATES,
    defaultStateId: FRIDAY_DEMO_DEFAULT_STATE,
    color: "blue",
  },
  {
    key: "sunday_morning",
    labelEn: "Sunday Morning",
    labelAr: "الأحد الصباحي",
    activeService: "sunday_morning",
    states: SUNDAY_MORNING_DEMO_STATES,
    defaultStateId: "sun-am-0900",
    color: "purple",
  },
  {
    key: "sunday_evening",
    labelEn: "Sunday Evening",
    labelAr: "الأحد المسائي",
    activeService: "sunday_evening",
    states: SUNDAY_EVENING_DEMO_STATES,
    defaultStateId: "sun-pm-1700",
    color: "purple",
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

// ─── props ───────────────────────────────────────────────────────────────────

interface LiveServiceControlProps {
  /** Currently resolved service (for the live context outside demo). */
  activeService: ActiveService;
  onServiceChange?: (service: ActiveService) => void;
  checkedIn?: number;
  effectiveNow?: Date;
  className?: string;
}

// ─── component ───────────────────────────────────────────────────────────────

export function LiveServiceControl({
  activeService,
  onServiceChange,
  checkedIn,
  effectiveNow,
  className,
}: LiveServiceControlProps) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";
  const { demoMode, demoState, enterDemo, exitDemo } = useAttendanceDemo();

  // Derive current service key from the active demo state
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

  // Attendance context for live status
  const ctx = getAttendanceContext(effectiveNow);
  const isLive = ctx.state === "live";
  const isReview = ctx.state === "review";

  const currentPhaseLabel = isLive
    ? (isAr ? "مباشر" : "Live")
    : isReview
    ? (isAr ? "مراجعة" : "Review")
    : (isAr ? "لم يبدأ" : "Not Started");

  const [internalCount, setInternalCount] = React.useState<number | undefined>(undefined);
  React.useEffect(() => {
    let mounted = true;
    async function fetchCount() {
      try {
        const sessionRes = await fetch("/api/attendance/session").then((r) => r.json()).catch(() => null);
        const serviceId = sessionRes?.data?.sessionId;
        const url = serviceId ? `/api/attendance?serviceId=${serviceId}&limit=1` : `/api/attendance?limit=1`;
        const res = await fetch(url).then((r) => r.json()).catch(() => null);
        if (mounted && res?.meta?.total !== undefined) {
          setInternalCount(res.meta.total);
        }
      } catch {}
    }
    fetchCount();
    const timer = setInterval(fetchCount, 8000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [activeService]);

  const displayCheckedIn = checkedIn !== undefined ? checkedIn : internalCount;

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

  const dotColor = currentServiceDef.color === "blue" ? "bg-blue-500" : "bg-purple-500";
  const dotPing  = currentServiceDef.color === "blue" ? "bg-blue-400" : "bg-purple-400";
  const borderColor = demoMode
    ? (currentServiceDef.color === "blue" ? "border-blue-200 bg-blue-50/60" : "border-purple-200 bg-purple-50/60")
    : (isReview ? "border-amber-200 bg-amber-50/40" : isLive ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-gray-50/60");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium shadow-2xs",
        borderColor,
        className
      )}
    >
      {/* Live pulse + Status / DEMO badge */}
      <span className="flex items-center gap-1.5 shrink-0">
        <span className="relative flex h-2 w-2">
          {demoMode ? (
            <>
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotPing)} />
              <span className={cn("relative inline-flex rounded-full h-2 w-2", dotColor)} />
            </>
          ) : (
            <>
              {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />}
              <span className={cn("relative inline-flex rounded-full h-2 w-2", isLive ? "bg-emerald-500" : isReview ? "bg-amber-500" : "bg-gray-400")} />
            </>
          )}
        </span>
        <span className={cn(
          "font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded border",
          demoMode
            ? "text-purple-700 bg-purple-100 border-purple-200"
            : isReview
            ? "text-amber-700 bg-amber-100 border-amber-200"
            : isLive
            ? "text-emerald-700 bg-emerald-100 border-emerald-200"
            : "text-gray-600 bg-gray-100 border-gray-200"
        )}>
          {demoMode ? "DEMO" : (isAr ? "توقيت تلقائي" : "AUTO TIME")}
        </span>
      </span>

      {/* Divider */}
      <span className="text-gray-300 select-none">|</span>

      {/* Service dropdown */}
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

      {/* Time / state dropdown */}
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
            ⚡ {isAr ? `الوقت الفعلي (تلقائي: ${currentPhaseLabel})` : `Real Time (Auto: ${currentPhaseLabel})`}
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

      {/* Live status badge / Reset on click if not-started */}
      <button
        type="button"
        onClick={async () => {
          if (!isLive && !isReview) {
            await resetAttendanceState();
          }
        }}
        title={!isLive && !isReview ? (isAr ? "إعادة تعيين الحضور للتجربة" : "Click to reset check-ins for demo") : undefined}
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider transition-colors",
          isLive
            ? "bg-green-50 text-green-700 border-green-200"
            : isReview
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300 cursor-pointer"
        )}
      >
        {isLive
          ? (isAr ? "● مباشر" : "● LIVE")
          : isReview
          ? (isAr ? "مراجعة" : "REVIEW")
          : (isAr ? "لم يبدأ (إعادة تعيين)" : "NOT STARTED (Reset)")}
      </button>

      {/* Checked-in count */}
      {isLive && displayCheckedIn !== undefined && (
        <span className="text-gray-500 tabular-nums font-semibold">
          {displayCheckedIn.toLocaleString()} {isAr ? "حاضر" : "checked in"}
        </span>
      )}

      {/* Reset / Exit demo button */}
      {demoMode && (
        <button
          type="button"
          onClick={exitDemo}
          className="ms-auto text-[11px] font-bold text-gray-600 hover:text-red-600 bg-white border border-gray-200 rounded-md px-2 py-1 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
          aria-label={isAr ? "العودة للوقت الفعلي" : "Reset to Real Time"}
        >
          <span>↺</span>
          <span>{isAr ? "العودة للوقت الفعلي" : "Reset to Real Time"}</span>
        </button>
      )}
    </div>
  );
}
