"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { getAttendanceContext } from "@/lib/attendance/attendance-context";
import { useAttendanceRealtime } from "@/lib/realtime/use-attendance-realtime";
import {
  evaluateWelcomeBackAlert,
  type WelcomeBackEvaluation,
  WELCOME_BACK_MAX_VISIBLE,
  WELCOME_BACK_AUTO_DISMISS_MS,
} from "@/lib/attendance/welcome-back-helper";
import { recordLiveWelcomeBackAttendee } from "@/lib/attendance/live-welcome-back-store";
import type { CheckInEvent } from "@/lib/mock-data/check-ins";
import type { ActiveService } from "@/lib/attendance/attendance-context";

import { useFridayDemoSimulation } from "@/components/dashboard/friday-demo-simulation-provider";
import { useAttendanceDemo } from "@/components/dashboard/attendance-demo-provider";

export interface ActiveWelcomeBackAlert extends WelcomeBackEvaluation {
  id: string;
  memberKey: string;
  createdAt: number;
  isNew: boolean;
}

interface WelcomeBackAlertProps {
  effectiveNow?: Date;
  activeService?: ActiveService;
  className?: string;
}

export function WelcomeBackAlert({ effectiveNow, activeService, className }: WelcomeBackAlertProps) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";

  const [alerts, setAlerts] = React.useState<ActiveWelcomeBackAlert[]>([]);
  const [, setTick] = React.useState(0);
  const [expanded, setExpanded] = React.useState(false);
  const seenMemberKeysRef = React.useRef<Set<string>>(new Set());
  const seenArrivalIdsRef = React.useRef<Set<string>>(new Set());
  const wasLiveRef = React.useRef(false);

  // Reset on service change
  React.useEffect(() => {
    seenMemberKeysRef.current.clear();
    seenArrivalIdsRef.current.clear();
    setAlerts([]);
  }, [activeService]);

  const attendanceCtx = getAttendanceContext(effectiveNow);
  const isLive = attendanceCtx.state === "live";
  const isReview = attendanceCtx.state === "review";

  const simulation = useFridayDemoSimulation();
  const { demoMode } = useAttendanceDemo();

  // Auto-expand when a NEW alert arrives
  const prevCountRef = React.useRef(0);
  React.useEffect(() => {
    if (alerts.length > prevCountRef.current) {
      setExpanded(true);
    }
    prevCountRef.current = alerts.length;
  }, [alerts.length]);

  // Auto-collapse when queue is empty
  React.useEffect(() => {
    if (alerts.length === 0) setExpanded(false);
  }, [alerts.length]);

  // 1-second ticker + auto-dismiss at 1 min
  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setAlerts((prev) => {
        const remaining = prev.filter((a) => now - a.createdAt < WELCOME_BACK_AUTO_DISMISS_MS);
        return remaining.length !== prev.length ? remaining : prev;
      });
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const processCheckIn = React.useCallback(
    (event: {
      personId?: string;
      personName?: string;
      avatar?: string;
      lastAttendance?: string;
      consecutiveMissedWeeks?: number;
    }) => {
      if (!isLive) return;

      const name = (event.personName || "").trim();
      const id = (event.personId && event.personId !== "unknown" ? event.personId : "").trim();
      if (!name && !id) return;

      const memberKey = `${activeService ?? "default"}:${id ? id.toLowerCase() : name.toLowerCase()}`;

      if (seenMemberKeysRef.current.has(memberKey)) return;
      seenMemberKeysRef.current.add(memberKey);

      const evaluation = evaluateWelcomeBackAlert(
        {
          id,
          name,
          avatar: event.avatar,
          lastAttendance: event.lastAttendance,
          consecutiveMissedWeeks: event.consecutiveMissedWeeks,
        },
        { effectiveNow }
      );

      if (!evaluation.qualifies) return;

      const alertId = `wb-${Date.now()}-${memberKey}`;
      const newAlert: ActiveWelcomeBackAlert = {
        ...evaluation,
        id: alertId,
        memberKey,
        createdAt: Date.now(),
        isNew: true,
      };

      const now = Date.now();
      setAlerts((prev) => [
        newAlert,
        ...prev.filter((a) => a.memberKey !== memberKey && now - a.createdAt < WELCOME_BACK_AUTO_DISMISS_MS),
      ]);

      // Record this Welcome Back attendee so they appear in /attendance and are kept after church
      const currentServiceDateStr = effectiveNow
        ? effectiveNow.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      recordLiveWelcomeBackAttendee({
        memberId: evaluation.memberId,
        name: evaluation.memberName,
        avatar: evaluation.avatar,
        consecutiveMissedWeeks: evaluation.consecutiveMissedWeeks,
        lastAttendanceDate: evaluation.lastAttendanceDate,
        checkInTime: new Date(newAlert.createdAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        serviceDateStr: currentServiceDateStr,
        serviceKey: activeService || "friday_morning",
        recordedAt: newAlert.createdAt,
      });

      setTimeout(() => {
        setAlerts((current) =>
          current.map((a) => (a.id === alertId ? { ...a, isNew: false } : a))
        );
      }, 3500);
    },
    [isLive, effectiveNow, activeService]
  );

  // Demo simulation sync: only evaluate genuine NEW arrivals as they happen live
  React.useEffect(() => {
    if (!simulation.active || !isLive) {
      if (wasLiveRef.current && !isLive) {
        // Exited live mode -> clear seen arrivals
        seenArrivalIdsRef.current.clear();
      }
      wasLiveRef.current = isLive;
      return;
    }

    // Just transitioned into live: mark any existing arrivals (initial buffer & padding)
    // as already seen so we never blast historical or padded arrivals upon switching to live!
    if (!wasLiveRef.current && isLive) {
      wasLiveRef.current = true;
      for (const arrival of simulation.arrivals) {
        seenArrivalIdsRef.current.add(arrival.id);
      }
      return;
    }

    // Process only genuine NEW arrivals that just appeared
    for (const arrival of simulation.arrivals) {
      if (seenArrivalIdsRef.current.has(arrival.id)) continue;
      seenArrivalIdsRef.current.add(arrival.id);

      // Skip static padding items from mockCheckIns (only evaluate real simulated or live arrivals)
      const isGenuineArrival =
        arrival.id.startsWith("demo-arrival-") ||
        arrival.id.startsWith("rt-") ||
        arrival.id.startsWith("real-") ||
        arrival.id.startsWith("sim-");

      if (!isGenuineArrival) continue;

      processCheckIn({
        personId: arrival.personId,
        personName: arrival.personName,
        avatar: arrival.avatar,
      });
    }
  }, [simulation.active, simulation.arrivals, isLive, processCheckIn]);

  // Window event listener
  React.useEffect(() => {
    const handleWindowCheckIn = (e: Event) => {
      const customEvent = e as CustomEvent<CheckInEvent>;
      if (customEvent.detail) {
        processCheckIn({
          personId: customEvent.detail.personId,
          personName: customEvent.detail.personName,
          avatar: customEvent.detail.avatar,
        });
      }
    };
    const handleReset = () => {
      seenArrivalIdsRef.current.clear();
      seenMemberKeysRef.current.clear();
      setAlerts([]);
    };
    window.addEventListener("live-checkin", handleWindowCheckIn);
    window.addEventListener("live-reset", handleReset);
    return () => {
      window.removeEventListener("live-checkin", handleWindowCheckIn);
      window.removeEventListener("live-reset", handleReset);
    };
  }, [processCheckIn]);

  // Realtime production pipeline
  useAttendanceRealtime({
    enabled: isLive,
    onCheckIn: (rtEvent) => {
      const data = rtEvent.data || {};
      const lastVisit = typeof data.lastAttendanceDate === "string" ? new Date(data.lastAttendanceDate) : null;
      processCheckIn({
        personId: (data.memberId as string) || "",
        personName: (data.memberName as string) || "",
        avatar: (data.memberAvatar as string) || undefined,
        // From the server: how long this member has actually been away.
        lastAttendance:
          lastVisit && !isNaN(lastVisit.getTime())
            ? lastVisit.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : undefined,
        consecutiveMissedWeeks:
          typeof data.consecutiveMissedWeeks === "number" ? (data.consecutiveMissedWeeks as number) : undefined,
      });
    },
    onReset: () => {
      seenArrivalIdsRef.current.clear();
      seenMemberKeysRef.current.clear();
      setAlerts([]);
    },
  });

  const handleDismiss = React.useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const visibleAlerts = alerts.slice(0, WELCOME_BACK_MAX_VISIBLE);
  const queueWaitingCount = Math.max(0, alerts.length - WELCOME_BACK_MAX_VISIBLE);

  // ─── EMPTY STATE (demo only) ─────────────────────────────────────────────
  if (alerts.length === 0) {
    if (demoMode && isLive) {
      return (
        <div
          data-testid="welcome-back-standby"
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-2 rounded-xl border border-dashed border-amber-200 bg-amber-50/40 text-xs text-amber-800 flex-wrap",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span className="font-medium">{isAr ? "تنبيه المستقبلين — يراقب الأعضاء العائدين" : "Welcome Back Alert — Watching for returning members"}</span>
          </div>
        </div>
      );
    }
    return null;
  }

  const newestAlert = visibleAlerts[0];
  const elapsedMs = Date.now() - newestAlert.createdAt;
  const remainingSeconds = Math.max(0, Math.ceil((WELCOME_BACK_AUTO_DISMISS_MS - elapsedMs) / 1000));
  const progressPercent = Math.max(
    0,
    Math.min(100, (remainingSeconds / (WELCOME_BACK_AUTO_DISMISS_MS / 1000)) * 100)
  );

  return (
    <div className={cn("relative", className)}>
      <style>{`
        @keyframes wbSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wbPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,.5); }
          50%       { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }
        .wb-strip-pulse { animation: wbPulse 1.8s ease-in-out; }
        .wb-panel-enter { animation: wbSlideIn 0.22s cubic-bezier(.16,1,.3,1) forwards; }
        .wb-avatar-ring { box-shadow: 0 0 0 2px #fef3c7, 0 0 0 3.5px #f59e0b; }
      `}</style>

      {/* ── COMPACT STRIP (always visible) ──────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-0 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/60 cursor-pointer transition-all hover:shadow-md select-none",
          newestAlert.isNew && "wb-strip-pulse border-amber-400",
          expanded ? "rounded-b-none border-b-0" : ""
        )}
        style={{ minHeight: 52 }}
        aria-expanded={expanded}
      >
        {/* Pulsing live dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
        </span>

        {/* Label */}
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 shrink-0">
          {isAr ? "مرحبًا بعودتكم" : "Welcome Back"}
        </span>

        {/* Avatar bubble stack */}
        <div className="flex -space-x-2 shrink-0">
          {visibleAlerts.slice(0, 4).map((a, i) => (
            <img
              key={a.id}
              src={a.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(a.memberName)}`}
              alt={a.memberName}
              title={a.memberName}
              style={{ zIndex: 10 - i }}
              className="w-7 h-7 rounded-full object-cover border-2 border-amber-50 wb-avatar-ring"
            />
          ))}
          {alerts.length > 4 && (
            <span className="w-7 h-7 rounded-full bg-amber-400 border-2 border-amber-50 text-[10px] font-bold text-white flex items-center justify-center" style={{ zIndex: 6 }}>
              +{alerts.length - 4}
            </span>
          )}
        </div>

        {/* Newest name + weeks missed */}
        <span className="flex-1 text-start min-w-0">
          <span className="text-sm font-bold text-gray-900 truncate block leading-tight">
            {newestAlert.memberName}
          </span>
          <span className="text-[11px] text-amber-700 font-medium">
            {isAr
              ? `${newestAlert.consecutiveMissedWeeks} أسابيع غياب`
              : `${newestAlert.consecutiveMissedWeeks} wks missed`}
          </span>
        </span>

        {/* Count badge */}
        {alerts.length > 1 && (
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
            {alerts.length}
          </span>
        )}

        {/* Queue wait indicator */}
        {queueWaitingCount > 0 && (
          <span className="shrink-0 text-[10px] text-amber-700 font-semibold">
            +{queueWaitingCount} {isAr ? "انتظار" : "waiting"}
          </span>
        )}

        {/* Expand chevron */}
        <svg
          className={cn("w-4 h-4 text-amber-600 shrink-0 transition-transform duration-200", expanded && "rotate-180")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── EXPANDED PANEL (overlays below, doesn't push live section) ──── */}
      {expanded && (
        <div className="wb-panel-enter absolute left-0 right-0 z-40 border border-amber-300 border-t-0 rounded-b-xl bg-white shadow-xl overflow-hidden">
          {/* Countdown progress bar at very top */}
          <div className="h-0.5 w-full bg-amber-100">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Compact person rows */}
          <div className="max-h-72 overflow-y-auto divide-y divide-amber-50">
            {visibleAlerts.map((alert) => {
              const elapsed = Date.now() - alert.createdAt;
              const secLeft = Math.max(0, Math.ceil((WELCOME_BACK_AUTO_DISMISS_MS - elapsed) / 1000));

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    alert.isNew ? "bg-amber-50/70" : "bg-white hover:bg-gray-50/60"
                  )}
                >
                  {/* Avatar */}
                  <img
                    src={alert.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(alert.memberName)}`}
                    alt={alert.memberName}
                    className="w-9 h-9 rounded-full object-cover border-2 border-amber-200 shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        {alert.memberName}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                        {isAr ? `${alert.consecutiveMissedWeeks} أسابيع` : `${alert.consecutiveMissedWeeks} wks`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-emerald-600 font-medium">
                        {isAr ? "سجل حضوره الآن" : "Checked in just now"}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-[10px] text-amber-600">
                        {isAr ? `يغادر بعد ${secLeft}ث` : `clears in ${secLeft}s`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/follow-ups?create=true&memberId=${alert.memberId}&memberName=${encodeURIComponent(alert.memberName)}&reason=${encodeURIComponent(isAr ? `عودة بعد غياب ${alert.consecutiveMissedWeeks} أسابيع` : `Welcome Back after ${alert.consecutiveMissedWeeks} weeks absence`)}&type=welcome_back`}
                      onClick={() => setExpanded(false)}
                      className="px-2 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                    >
                      {isAr ? "متابعة" : "Follow-up"}
                    </Link>
                    <Link
                      href={`/people/${alert.memberId}?autoscroll=true`}
                      onClick={() => setExpanded(false)}
                      className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {isAr ? "عرض" : "View"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDismiss(alert.id)}
                      className="px-2 py-1 text-[11px] font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      aria-label={`Dismiss ${alert.memberName}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer: queue overflow info */}
          {queueWaitingCount > 0 && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-[11px] text-amber-700 font-medium">
              {isAr
                ? `+${queueWaitingCount} شخص في قائمة الانتظار (الحد الأقصى للشاشة: 5)`
                : `+${queueWaitingCount} more in queue — max 5 shown at once`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
