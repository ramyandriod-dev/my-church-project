"use client";

import { distinctArrivals } from "@/lib/attendance/live-roster";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { type CheckInEvent } from "@/lib/mock-data/check-ins";
import { useTranslation, tMinistry } from "@/lib/i18n";
import { getAttendanceContext } from "@/lib/attendance/attendance-context";
import { useFridayDemoSimulation } from "@/components/dashboard/friday-demo-simulation-provider";
import { pushRealCheckIn, clearRealCheckIns } from "@/lib/demo/demo-attendance-store";
import { useAttendanceRealtime } from "@/lib/realtime/use-attendance-realtime";
import type { ActiveService } from "@/lib/attendance/attendance-context";

interface LiveCheckInFeedProps {
  onCheckIn?: (event: CheckInEvent) => void;
  defaultCollapsed?: boolean;
  className?: string;
  /** Effective "now" from demo mode / Friday gating. Falls back to the wall clock. */
  effectiveNow?: Date;
  activeService?: ActiveService;
}

export function LiveCheckInFeed({
  onCheckIn,
  defaultCollapsed = false,
  className,
  effectiveNow,
  activeService,
}: LiveCheckInFeedProps) {
  const attendanceCtx = getAttendanceContext(effectiveNow);
  const [events, setEvents] = React.useState<CheckInEvent[]>([]);
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isPaused, setIsPaused] = React.useState(false);
  const { t, isRTL, attendanceWindow } = useTranslation();
  const simulation = useFridayDemoSimulation();

  const isLive = attendanceCtx.state === "live";
  const demoSimActive = simulation.active;

  // Poll real check-in records from database every 8s
  React.useEffect(() => {
    let isMounted = true;
    async function loadRealCheckIns() {
      try {
        const sessionRes = await fetch("/api/attendance/session").then((r) => r.json()).catch(() => null);
        const serviceId = sessionRes?.data?.sessionId;
        // No active service means nobody is checked in: never fall back to all history.
        if (!serviceId) { setEvents([]); return; }
        const url = `/api/attendance?serviceId=${serviceId}&limit=100`;

        const attRes = await fetch(url).then((r) => r.json()).catch(() => null);
        if (isMounted && attRes?.data && Array.isArray(attRes.data)) {
          const loaded: CheckInEvent[] = distinctArrivals(attRes.data).map((r: any) => ({
            id: r.id,
            personId: r.member?.id || r.memberId,
            personName: r.member ? `${r.member.firstName} ${r.member.lastName}`.trim() : "Church Member",
            type: "member",
            avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
              r.member ? `${r.member.firstName} ${r.member.lastName}` : "Member"
            )}`,
            timestamp: new Date(r.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            serviceId: r.serviceId,
            ministry: r.member?.ministry || "General",
          }));
          setEvents(loaded);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadRealCheckIns();
    const interval = setInterval(loadRealCheckIns, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Connect to realtime attendance events (WebSocket in prod / BroadcastChannel in dev / Polling)
  useAttendanceRealtime({
    enabled: true,
    onCheckIn: (rtEvent) => {
      const memberName = (rtEvent.data?.memberName as string) || "Church Member";
      const newEvent: CheckInEvent = {
        id: (rtEvent.data?.recordId as string) || `rt-${Date.now()}`,
        personId: (rtEvent.data?.memberId as string) || "unknown",
        personName: memberName,
        type: "member",
        avatar:
          (rtEvent.data?.memberAvatar as string) ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(memberName)}`,
        timestamp: new Date(rtEvent.timestamp || Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        serviceId: (rtEvent.data?.serviceId as string) || "1",
        ministry: (rtEvent.data?.ministry as string) || "General",
      };

      pushRealCheckIn(rtEvent);
      setEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== newEvent.id && (newEvent.personId === "unknown" || e.personId !== newEvent.personId))].slice(0, 20));

      onCheckIn?.(newEvent);
      if (typeof window !== "undefined") {
        (window as any).__livePulseCheckIn?.(newEvent);
        window.dispatchEvent(new CustomEvent("live-checkin", { detail: newEvent }));
      }
    },
    onReset: () => {
      clearRealCheckIns();
      setEvents([]);
      if (typeof window !== "undefined") {
        (window as any).__livePulseReset?.();
        window.dispatchEvent(new CustomEvent("live-reset"));
      }
    },
  });

  // Display strictly real check-ins — no mock arrivals
  const displayedEvents = events.slice(0, 10);
  const isCurrentlyActive = demoSimActive ? !simulation.paused : !isPaused;
  const handleToggleActive = () => {
    if (demoSimActive) simulation.togglePaused();
    else setIsPaused((prev) => !prev);
  };

  const statusDot = isLive ? (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
    </span>
  ) : (
    <span className="relative flex h-2 w-2">
      <span className="inline-flex rounded-full h-2 w-2 bg-gray-300"></span>
    </span>
  );

  const statusChip = !isLive && (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
      attendanceCtx.state === "review" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"
    )}>
      {attendanceCtx.state === "review" ? attendanceWindow.windowClosed : attendanceWindow.stateNotStarted}
    </span>
  );

  const inactiveSubtitle =
    attendanceCtx.state === "not-started"
      ? attendanceWindow.notStartedHint
      : attendanceWindow.reviewInProgress;

  const inactiveBody =
    attendanceCtx.state === "not-started"
      ? attendanceWindow.attendanceNotStartedMsg
      : attendanceWindow.windowEnded;

  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col text-start", className)}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {statusDot}
                <span className={cn("text-xs font-bold uppercase tracking-wider", isLive ? "text-emerald-600" : "text-gray-500")}>
                  {isLive ? t("dashboard.liveCheckIn") : attendanceWindow.checkIn}
                </span>
                {statusChip}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              {isLive
                ? (isRTL ? "أحدث الوافدين المسجلين للاجتماع" : "Latest people entering the service")
                : inactiveSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/attendance"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isRTL ? "عرض الكل ←" : "View All →"}
            </Link>
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
              aria-label={isCollapsed ? "Expand check-in feed" : "Collapse check-in feed"}
              aria-expanded={!isCollapsed}
            >
              <svg className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", isCollapsed && "-rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Feed Content / Inactive state */}
      {!isCollapsed && (isLive ? (
        displayedEvents.length > 0 ? (
          <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-gray-50">
            {displayedEvents.map((event) => (
              <div
                key={event.id}
                className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <img
                  src={event.avatar}
                  alt={event.personName}
                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {event.personName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      event.type === "member"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-purple-50 text-purple-700"
                    )}>
                      {event.type === "member"
                        ? (isRTL ? "عضو" : "Member")
                        : (isRTL ? "زائر" : "Visitor")}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-[11px] text-gray-400">
                      {event.ministry ? tMinistry(event.ministry, isRTL ? "ar" : "en") : (isRTL ? "عام" : "General")}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0 tabular-nums font-medium">
                  <bdi dir="ltr">{event.timestamp}</bdi>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 px-5 py-8 flex flex-col items-center justify-center text-center">
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 font-bold text-sm">
              ✓
            </div>
            <p className="text-sm font-semibold text-gray-800">
              {isRTL ? "لا توجد تسجيلات حضور حتى الآن" : "No check-ins yet"}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              {isRTL
                ? "ستظهر تسجيلات أعضاء الكنيسة عبر تطبيق الهاتف فور إتمامها"
                : "Real mobile check-ins will appear here in real time"}
            </p>
          </div>
        )
      ) : (
        <div className="flex-1 px-5 py-8 flex items-center justify-center text-center">
          <p className="text-sm font-medium text-gray-500">{inactiveBody}</p>
        </div>
      ))}

      {/* Footer - Only when expanded and live */}
      {!isCollapsed && isLive && (
        <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">
              {isRTL ? `تم عرض ${displayedEvents.length} تسجيلات حضور` : `${displayedEvents.length} real check-ins shown`}
            </span>
            <button
              onClick={handleToggleActive}
              className={cn(
                "text-xs font-bold transition-colors cursor-pointer",
                isCurrentlyActive ? "text-emerald-600 hover:text-emerald-700" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {isCurrentlyActive
                ? (isRTL ? "● مباشر الآن" : "● Live")
                : (isRTL ? "○ متوقف مؤقتًا" : "○ Paused")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}