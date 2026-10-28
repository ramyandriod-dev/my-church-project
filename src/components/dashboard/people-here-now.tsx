"use client";

import { distinctArrivals } from "@/lib/attendance/live-roster";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { type CheckInEvent } from "@/lib/mock-data/check-ins";
import { useTranslation } from "@/lib/i18n";
import { getAttendanceContext } from "@/lib/attendance/attendance-context";
import type { ActiveService } from "@/lib/attendance/attendance-context";

interface PeopleHereNowProps {
  totalCount?: number;
  /** Effective "now" from demo mode / Friday gating. Falls back to the wall clock. */
  effectiveNow?: Date;
  activeService?: ActiveService;
}

export function PeopleHereNow({ totalCount, effectiveNow, activeService }: PeopleHereNowProps) {
  const attendanceCtx = getAttendanceContext(effectiveNow);
  const [people, setPeople] = React.useState<CheckInEvent[]>([]);
  const { t, isRTL, attendanceWindow } = useTranslation();

  const isLive = attendanceCtx.state === "live";
  const isNotStarted = attendanceCtx.state === "not-started";

  // Poll real check-in records from database every 8s
  React.useEffect(() => {
    let isMounted = true;
    async function loadRealAttendees() {
      try {
        const sessionRes = await fetch("/api/attendance/session").then((r) => r.json()).catch(() => null);
        const serviceId = sessionRes?.data?.sessionId;
        // No active service means nobody is checked in: never fall back to all history.
        if (!serviceId) { setPeople([]); return; }
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
          setPeople(loaded);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadRealAttendees();
    const interval = setInterval(loadRealAttendees, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    const handler = (e: CustomEvent<CheckInEvent>) => {
      setPeople((prev) => {
        const exists = prev.find((p) => p.personId === e.detail.personId);
        if (exists) return prev;
        return [e.detail, ...prev].slice(0, 10);
      });
    };
    const resetHandler = () => {
      setPeople([]);
    };
    window.addEventListener("live-checkin" as any, handler as any);
    window.addEventListener("live-reset", resetHandler);
    return () => {
      window.removeEventListener("live-checkin" as any, handler as any);
      window.removeEventListener("live-reset", resetHandler);
    };
  }, []);

  const displayedCount = totalCount !== undefined ? totalCount : people.length;
  const displayedPeople = people.slice(0, 5);

  const headerCountLabel = isNotStarted
    ? attendanceWindow.notStartedHint
    : isLive
    ? (isRTL ? `${displayedCount} حاضر بالاجتماع` : `${displayedCount} people`)
    : (isRTL
        ? `${displayedCount} سجّلوا الحضور · نافذة التسجيل مغلقة`
        : `${displayedCount} ${attendanceWindow.reviewedCount} · ${attendanceWindow.windowClosed}`);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-start">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{t("dashboard.peopleHereNow")}</h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              {headerCountLabel}
            </p>
          </div>
          <Link
            href="/people"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isRTL ? "عرض الكل ←" : "View All →"}
          </Link>
        </div>
      </div>

      {/* People List / inactive state */}
      {isNotStarted ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm font-medium text-gray-500">{attendanceWindow.attendanceNotStartedMsg}</p>
        </div>
      ) : displayedPeople.length > 0 ? (
        <div className="divide-y divide-gray-50">
          {displayedPeople.map((person) => (
            <Link
              key={person.personId}
              href="/people"
              className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <img
                src={person.avatar}
                alt={person.personName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{person.personName}</p>
              </div>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0",
                person.type === "member"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-purple-50 text-purple-700"
              )}>
                {person.type === "member"
                  ? (isRTL ? "عضو" : "Member")
                  : (isRTL ? "زائر" : "Visitor")}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-5 py-6 text-center">
          <p className="text-sm font-medium text-gray-500">
            {isRTL ? "لا يوجد حاضرين مسجلين بعد" : "No attendees checked in yet"}
          </p>
        </div>
      )}

      {/* Footer - only while check-in is live */}
      {isLive && displayedCount > 5 && (
        <div className="px-5 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center font-medium">
            {isRTL ? `+${displayedCount - 5} أعضاء وزوار آخرين` : `+${displayedCount - 5} more people`}
          </p>
        </div>
      )}
    </div>
  );
}