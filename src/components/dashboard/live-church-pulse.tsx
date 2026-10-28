"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { type CheckInEvent } from "@/lib/mock-data/check-ins";
import { useTranslation } from "@/lib/i18n";
import { getAttendanceContext, type AttendanceState } from "@/lib/attendance/attendance-context";
import { useFridayDemoSimulation } from "@/components/dashboard/friday-demo-simulation-provider";

import type { ActiveService } from "@/lib/attendance/attendance-context";

interface ServiceData {
  id: string;
  name: string;
  nameAr: string;
  startTime: string;
  expectedAttendance: number;
  checkedIn: number;
  lastCheckInTime: string;
  checkInsLastMinute: number;
  status: "live" | "upcoming" | "ended";
}

const SERVICE_PROFILES: Record<string, ServiceData> = {
  friday_morning: {
    id: "1",
    name: "Friday Main Service",
    nameAr: "اجتماع الجمعة الرئيسي",
    startTime: "11:00 AM",
    expectedAttendance: 420,
    checkedIn: 347,
    lastCheckInTime: "10:42 AM",
    checkInsLastMinute: 3,
    status: "live",
  },
  sunday_morning: {
    id: "2",
    name: "Sunday Morning Service",
    nameAr: "اجتماع الأحد الصباحي",
    startTime: "10:00 AM",
    expectedAttendance: 320,
    checkedIn: 265,
    lastCheckInTime: "09:42 AM",
    checkInsLastMinute: 4,
    status: "live",
  },
  sunday_evening: {
    id: "3",
    name: "Sunday Evening Service",
    nameAr: "اجتماع الأحد المسائي",
    startTime: "06:00 PM",
    expectedAttendance: 180,
    checkedIn: 145,
    lastCheckInTime: "05:42 PM",
    checkInsLastMinute: 2,
    status: "live",
  },
};

const mockService: ServiceData = SERVICE_PROFILES.friday_morning;

interface LiveChurchPulseProps {
  onCheckIn?: (event: CheckInEvent) => void;
  /** Effective "now" (from demo mode / Friday gating). Falls back to an internal 1s clock. */
  effectiveNow?: Date;
  activeService?: ActiveService;
}

const STATE_ACCENTS: Record<AttendanceState, {
  statusText: string;
  dot: string;
  ping: string | null;
  ring: string;
  border: string;
  bar: string;
  num: string;
}> = {
  "not-started": {
    statusText: "text-gray-600",
    dot: "bg-gray-400",
    ping: null,
    ring: "text-gray-500",
    border: "border-gray-200",
    bar: "bg-gray-300",
    num: "text-gray-400",
  },
  live: {
    statusText: "text-red-600",
    dot: "bg-red-500",
    ping: "bg-red-400",
    ring: "text-red-600",
    border: "border-gray-200",
    bar: "bg-gradient-to-r from-blue-500 to-blue-600",
    num: "text-gray-900",
  },
  review: {
    statusText: "text-amber-700",
    dot: "bg-amber-500",
    ping: null,
    ring: "text-amber-700",
    border: "border-amber-200",
    bar: "bg-amber-500",
    num: "text-amber-700",
  },
};

export function LiveChurchPulse({ onCheckIn, effectiveNow, activeService }: LiveChurchPulseProps) {
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const { t, isRTL, attendanceWindow } = useTranslation();
  const simulation = useFridayDemoSimulation();
  const usingSimulation = simulation.active;

  const now = effectiveNow ?? currentTime;
  const ctx = getAttendanceContext(now);
  const resolvedKey = activeService ?? ctx.activeService ?? "friday_morning";
  const activeProfile = SERVICE_PROFILES[resolvedKey] ?? SERVICE_PROFILES.friday_morning;

  const [service, setService] = React.useState<ServiceData>(activeProfile);

  React.useEffect(() => {
    setService(activeProfile);
  }, [activeProfile]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleExternalCheckIn = React.useCallback((event: CheckInEvent) => {
    setService(prev => ({
      ...prev,
      checkedIn: Math.min(prev.checkedIn + 1, prev.expectedAttendance),
      lastCheckInTime: event.timestamp,
      checkInsLastMinute: prev.checkInsLastMinute + 1,
    }));
    onCheckIn?.(event);
  }, [onCheckIn]);

  const handleExternalReset = React.useCallback(() => {
    setService(mockService);
  }, []);

  React.useEffect(() => {
    (window as any).__livePulseCheckIn = handleExternalCheckIn;
    (window as any).__livePulseReset = handleExternalReset;
    const onResetEvent = () => handleExternalReset();
    window.addEventListener("live-reset", onResetEvent);
    return () => {
      delete (window as any).__livePulseCheckIn;
      delete (window as any).__livePulseReset;
      window.removeEventListener("live-reset", onResetEvent);
    };
  }, [handleExternalCheckIn, handleExternalReset]);

  const accent = STATE_ACCENTS[ctx.state];
  const serviceName = isRTL ? service.nameAr : service.name;

  // Demo-only: progressive counters replace the static pulse service mock.
  const displayedCount =
    ctx.state === "not-started" ? 0 : usingSimulation ? simulation.checkedIn : service.checkedIn;
  const checkInsLastMinute = usingSimulation ? simulation.recentCheckIns : service.checkInsLastMinute;
  const lastCheckInTime = usingSimulation
    ? (simulation.arrivals[0]?.timestamp ?? attendanceWindow.justNow)
    : service.lastCheckInTime;
  const checkedInPercent =
    displayedCount > 0 ? Math.round((displayedCount / service.expectedAttendance) * 100 * 10) / 10 : 0;
  const remaining = Math.max(service.expectedAttendance - displayedCount, 0);
  const progressWidth = Math.min((displayedCount / service.expectedAttendance) * 100, 100);

  const formattedTime = now.toLocaleTimeString(isRTL ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const fmtClock = (minutes: number) => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const fmtCountdown = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} ${isRTL ? "دقيقة" : "min"}`;
    return `${h}${isRTL ? " ساعة" : "h"} ${m}${isRTL ? " دقيقة" : "m"}`;
  };

  const statusLabel =
    ctx.state === "live"
      ? attendanceWindow.statusLive
      : ctx.state === "review"
      ? attendanceWindow.statusReviewLabel
      : attendanceWindow.stateNotStarted;

  return (
    <Link href="/attendance" className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-xl">
      <div className={cn(
        "relative bg-white rounded-xl border shadow-sm overflow-hidden",
        "transition-all duration-200",
        "group-hover:shadow-md group-hover:border-gray-300",
        accent.border
      )}>
        <div className="flex flex-col lg:flex-row">
          {/* Start: Status + Service Info */}
          <div className="flex-1 p-5 lg:p-6 text-start">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {accent.ping && (
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", accent.ping)} />
                  )}
                  <span className={cn("relative inline-flex rounded-full h-3 w-3", accent.dot)} />
                </span>
                <span className={cn("text-xs font-bold uppercase tracking-wider", accent.statusText)}>
                  {statusLabel}
                </span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-semibold text-gray-800">
                {serviceName}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className={cn("text-4xl lg:text-5xl font-bold tabular-nums", accent.num)}>
                {displayedCount.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {attendanceWindow.reviewedCount}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className={cn("font-medium", accent.ring)}>
                {ctx.state === "live" && `+${checkInsLastMinute} ${isRTL ? "في الدقيقة الأخيرة" : "in the last minute"}`}
                {ctx.state === "review" && attendanceWindow.reviewInProgress}
                {ctx.state === "not-started" && attendanceWindow.notStartedHint}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5 font-medium">
                <span>{isRTL ? `المتوقع: ${service.expectedAttendance}` : `Expected: ${service.expectedAttendance}`}</span>
                <span>{isRTL ? `${checkedInPercent}% سجّلوا الحضور` : `${checkedInPercent}% checked in`}</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 ease-out", accent.bar)}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-600">
                  {ctx.state === "not-started"
                    ? `${attendanceWindow.startsAt} ${fmtClock(ctx.startMinutes)}`
                    : isRTL
                    ? `بدأ: ${service.startTime}`
                    : `Started: ${service.startTime}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-600" suppressHydrationWarning>
                {isRTL ? `الوقت الآن: ${formattedTime}` : `Now: ${formattedTime}`}
              </span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-gray-600">
                  {ctx.state === "review"
                    ? attendanceWindow.windowClosed
                    : ctx.state === "not-started"
                    ? `${isRTL ? "تبدأ خلال:" : "Starts in:"} ${fmtCountdown(ctx.minutesUntilStart)}`
                    : isRTL
                    ? `${isRTL ? "المتبقي:" : "Remaining:"} ${remaining}`
                    : `Remaining: ${remaining}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-600">
                  {ctx.state === "live"
                    ? `${isRTL ? `آخر تسجيل: ${lastCheckInTime}` : `Last check-in: ${lastCheckInTime}`}`
                    : `${isRTL ? "نهاية النافذة:" : "Window ends:"} ${fmtClock(ctx.endMinutes)}`}
                </span>
              </div>
            </div>
          </div>

          {/* End: Large Visual */}
          <div className={cn("hidden lg:flex items-center justify-center px-8 py-6 border-s", ctx.state === "review" ? "bg-amber-50/70" : "bg-gradient-to-br from-blue-50/80 to-blue-100/40")}>
            <div className="text-center">
              <div className={cn("text-6xl font-bold tabular-nums mb-1", accent.ring)}>
                {ctx.state === "not-started" ? "—" : `${checkedInPercent}%`}
              </div>
              <div className={cn("text-xs font-bold uppercase tracking-wider", accent.ring)}>
                {ctx.state === "not-started" ? attendanceWindow.stateNotStarted : t("dashboard.capacity")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}