"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getAttendanceContext, type ActiveService } from "@/lib/attendance/attendance-context";
import { useTranslation } from "@/lib/i18n";

interface ServiceTab {
  key: ActiveService;
  labelEn: string;
  labelAr: string;
  shortEn: string;
  shortAr: string;
  /** Day of week this service belongs to (for badge colour). */
  day: "friday" | "sunday";
  /** Expected attendance for this service (for KPI display). */
  expectedAttendance: number;
}

const SERVICE_TABS: ServiceTab[] = [
  {
    key: "friday_morning",
    labelEn: "Friday Morning",
    labelAr: "اجتماع الجمعة الصباحي",
    shortEn: "Friday",
    shortAr: "الجمعة",
    day: "friday",
    expectedAttendance: 420,
  },
  {
    key: "sunday_morning",
    labelEn: "Sunday Morning",
    labelAr: "اجتماع الأحد الصباحي",
    shortEn: "Sun AM",
    shortAr: "الأحد ص",
    day: "sunday",
    expectedAttendance: 380,
  },
  {
    key: "sunday_evening",
    labelEn: "Sunday Evening",
    labelAr: "اجتماع الأحد المسائي",
    shortEn: "Sun PM",
    shortAr: "الأحد م",
    day: "sunday",
    expectedAttendance: 260,
  },
];

interface ServiceSelectorProps {
  /** Currently active service (auto-detected or overridden). */
  activeService: ActiveService;
  /** Called when user manually selects a different service. */
  onServiceChange: (service: ActiveService) => void;
  /** Optional check-in count for the active service. */
  checkedIn?: number;
  /** The effectiveNow used for live state detection. */
  effectiveNow?: Date;
  className?: string;
}

export function ServiceSelector({
  activeService,
  onServiceChange,
  checkedIn,
  effectiveNow,
  className,
}: ServiceSelectorProps) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";

  // Derive live state for each tab by checking the day + time
  const now = effectiveNow ?? new Date();
  const ctx = getAttendanceContext(now);

  const getTabState = (tab: ServiceTab) => {
    if (tab.key !== ctx.activeService) {
      // Not the currently running service
      return "off";
    }
    return ctx.state; // "live" | "not-started" | "review"
  };

  const dayColors: Record<"friday" | "sunday", { active: string; dot: string; badge: string }> = {
    friday: {
      active: "bg-blue-600",
      dot: "bg-blue-400",
      badge: "bg-blue-100 text-blue-700 border-blue-200",
    },
    sunday: {
      active: "bg-purple-600",
      dot: "bg-purple-400",
      badge: "bg-purple-100 text-purple-700 border-purple-200",
    },
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1 flex-wrap",
        className
      )}
      role="tablist"
      aria-label={isAr ? "اختر الاجتماع" : "Select Service"}
    >
      {SERVICE_TABS.map((tab) => {
        const state = getTabState(tab);
        const isSelected = activeService === tab.key;
        const isLive = state === "live";
        const colors = dayColors[tab.day];

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onServiceChange(tab.key)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
              isSelected
                ? "bg-white shadow-sm text-gray-900 ring-1 ring-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
            )}
          >
            {/* Live pulse / status dot */}
            {isLive && isSelected ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    colors.dot
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    colors.active
                  )}
                />
              </span>
            ) : isLive ? (
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0 opacity-60",
                  colors.dot
                )}
              />
            ) : (
              <span className="w-2 h-2 rounded-full shrink-0 bg-gray-300" />
            )}

            {/* Label */}
            <span>{isAr ? tab.labelAr : tab.labelEn}</span>

            {/* State badge */}
            {isSelected && (
              <span
                className={cn(
                  "hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                  isLive
                    ? colors.badge
                    : state === "review"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                )}
              >
                {isLive
                  ? (isAr ? "مباشر" : "LIVE")
                  : state === "review"
                  ? (isAr ? "مراجعة" : "REVIEW")
                  : (isAr ? "لم يبدأ" : "NOT STARTED")}
              </span>
            )}

            {/* Checked-in count badge (only on selected + live) */}
            {isSelected && isLive && checkedIn !== undefined && (
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-900/5 text-gray-700 tabular-nums">
                {checkedIn.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Returns a short display label for the given service key. */
export function getServiceDisplayLabel(
  service: ActiveService,
  locale: string
): string {
  const tab = SERVICE_TABS.find((t) => t.key === service);
  if (!tab) return "";
  return locale === "ar" ? tab.labelAr : tab.labelEn;
}

export { SERVICE_TABS };
export type { ServiceTab };
