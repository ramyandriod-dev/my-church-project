"use client";

import { distinctArrivals, liveStats } from "@/lib/attendance/live-roster";
import * as React from "react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { MinistryDistributionChart } from "@/components/dashboard/ministry-distribution";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { LiveServiceCard } from "@/components/dashboard/live-service-card";
import { useAttendanceDemo } from "@/components/dashboard/attendance-demo-provider";
import { FridayDemoSimulationProvider, useFridayDemoSimulation } from "@/components/dashboard/friday-demo-simulation-provider";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { CollapsibleSection } from "@/components/dashboard/collapsible-section";
import { useDashboard } from "@/lib/dashboard-context";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { type CheckInEvent } from "@/lib/mock-data/check-ins";
import { getAttendanceContext, type ActiveService } from "@/lib/attendance/attendance-context";
import { getLiveOperations } from "@/lib/mock-data/live-operations";
import { useTranslation, tMinistry } from "@/lib/i18n";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { FRIDAY_DEMO_DEFAULT_STATE } from "@/lib/attendance/attendance-day-context";
import { syncDatabaseCheckIns } from "@/lib/demo/demo-attendance-store";

function AttendanceSummary() {
  const { analytics, isLoading, isEmpty } = useDashboard();
  const { t, isRTL } = useTranslation();
  const { attendanceChart } = analytics;
  const animatedTotal = useAnimatedNumber(attendanceChart.total, 1400);
  const avg = attendanceChart.data.length > 0
    ? Math.round(attendanceChart.total / attendanceChart.data.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-5 w-20 skeleton-shimmer rounded" />
        <div className="h-4 w-16 skeleton-shimmer rounded" />
        <div className="h-4 w-24 skeleton-shimmer rounded" />
      </div>
    );
  }

  if (isEmpty) {
    return <p className="text-sm text-gray-500">{t("dashboard.noAttendanceData")}</p>;
  }

  return (
    <div className="flex items-center gap-3 text-start">
      <div className="p-2 bg-blue-50 rounded-lg">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-900">{t("dashboard.weeklyAttendance")}</h3>
        <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
          <span className="font-bold text-gray-900 tabular-nums">{animatedTotal.toLocaleString()}</span>
          <span>{t("dashboard.totalAttendees")}</span>
          <span className="text-gray-300">|</span>
          <span>{isRTL ? `متوسط ${avg.toLocaleString()} لكل اجتماع` : `Avg ${avg.toLocaleString()} / service`}</span>
        </div>
      </div>
    </div>
  );
}

function MinistrySummary() {
  const { analytics, isLoading, isEmpty } = useDashboard();
  const { t, locale } = useTranslation();
  const { ministryDistribution } = analytics;
  const animatedTotal = useAnimatedNumber(ministryDistribution.total, 1400);
  const topMinistries = ministryDistribution.data.slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-5 w-20 skeleton-shimmer rounded" />
        <div className="h-4 w-16 skeleton-shimmer rounded" />
      </div>
    );
  }

  if (isEmpty) {
    return <p className="text-sm text-gray-500">{t("dashboard.noMinistryData")}</p>;
  }

  return (
    <div className="flex items-center gap-3 text-start">
      <div className="p-2 bg-purple-50 rounded-lg">
        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-900">{t("dashboard.peopleByMinistry")}</h3>
        <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
          <span className="font-bold text-gray-900 tabular-nums">{animatedTotal}</span>
          <span>{t("dashboard.activeMembersCount")}</span>
          <span className="text-gray-300">|</span>
          {topMinistries.map((m, i) => (
            <span key={m.name} className="tabular-nums font-medium">
              {tMinistry(m.name, locale)} <span className="font-bold text-gray-800">{m.count}</span>
              {i < topMinistries.length - 1 && <span className="text-gray-300 mx-2">·</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivitySummary() {
  const { t, isRTL } = useTranslation();
  return (
    <div className="flex items-center gap-3 text-start">
      <div className="p-2 bg-emerald-50 rounded-lg">
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-900">{t("dashboard.recentActivity")}</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          <span className="font-bold text-gray-800">8</span> {isRTL ? "أنشطة رعوية حديثة" : "recent activities"}
          <span className="text-gray-300 mx-2">|</span>
          {isRTL ? "أحدث عملية: تسجيل عضو جديد — منذ دقيقتين" : "Latest: New Member Registration — 2 min ago"}
        </p>
      </div>
    </div>
  );
}

function EventsSummary() {
  const { t, isRTL } = useTranslation();
  return (
    <div className="flex items-center gap-3 text-start">
      <div className="p-2 bg-amber-50 rounded-lg">
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-900">{t("dashboard.upcomingEvents")}</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          <span className="font-bold text-gray-800">3</span> {isRTL ? "اجتماعات قادمة" : "upcoming events"}
          <span className="text-gray-300 mx-2">|</span>
          {isRTL ? "القادم: اجتماع العبادة والتسبيح الأحد — 10:00 ص" : "Next: Sunday Worship Service — 10:00 AM"}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <FridayDemoSimulationProvider>
      <DashboardContent />
    </FridayDemoSimulationProvider>
  );
}

function DashboardContent() {
  const { t, isRTL, attendanceWindow } = useTranslation();
  const { dateRange, activePreset, setDateRange, analytics, isLoading, isEmpty, refresh } = useDashboard();
  const { effectiveNow, attendanceRelevant, demoMode, demoState, enterDemo } = useAttendanceDemo();
  const simulation = useFridayDemoSimulation();
  const [totalCheckedIn, setTotalCheckedIn] = React.useState(349);
  const kpiRef = React.useRef<HTMLDivElement>(null);
  const prevPresetRef = React.useRef(activePreset);
  const [selectedService, setSelectedService] = React.useState<ActiveService>(null);
  const [realDbCount, setRealDbCount] = React.useState<number>(0);
  const [realStats, setRealStats] = React.useState<{ recent: number; lastCheckInAt: Date | null }>({ recent: 0, lastCheckInAt: null });

  // Poll real check-in records from database every 8s
  React.useEffect(() => {
    let mounted = true;
    async function pollAttendance() {
      try {
        const sessionRes = await fetch("/api/attendance/session").then((r) => r.json()).catch(() => null);
        const serviceId = sessionRes?.data?.sessionId;
        // No active service means nobody is checked in: never fall back to all history.
        if (!serviceId) { setRealDbCount(0); setRealStats({ recent: 0, lastCheckInAt: null }); return; }
        const url = `/api/attendance?serviceId=${serviceId}&limit=100`;
        const res = await fetch(url).then((r) => r.json()).catch(() => null);
        if (mounted && res?.meta?.total !== undefined) {
          const stats = liveStats(res.data || []);
          const count = stats.count;
          setRealStats({ recent: stats.recent, lastCheckInAt: stats.lastCheckInAt });
          setRealDbCount(count);
          if (res.data && Array.isArray(res.data)) {
            const loaded: CheckInEvent[] = distinctArrivals(res.data).map((r: any) => ({
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
            syncDatabaseCheckIns(loaded);
          }
        }
      } catch {}
    }
    pollAttendance();
    const interval = setInterval(pollAttendance, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    if (prevPresetRef.current !== activePreset && kpiRef.current) {
      kpiRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    prevPresetRef.current = activePreset;
  }, [activePreset]);

  const handleLiveCheckIn = React.useCallback((event: CheckInEvent) => {
    const pulseCheckIn = (window as any).__livePulseCheckIn;
    if (pulseCheckIn) pulseCheckIn(event);
    setTotalCheckedIn(prev => prev + 1);
  }, []);

  const attendanceCtx = getAttendanceContext(effectiveNow);
  const fridayAttendanceShown = attendanceRelevant && attendanceCtx.state !== "not-started";

  // Auto-sync selectedService when the real context changes (e.g. demo state change)
  React.useEffect(() => {
    if (attendanceCtx.activeService) {
      setSelectedService(attendanceCtx.activeService);
    }
  }, [attendanceCtx.activeService]);

  // The service used for labelling and scoping — auto-detected or manually overridden
  const resolvedService = selectedService ?? attendanceCtx.activeService ?? "friday_morning";
  const isSundayMorning = resolvedService === "sunday_morning";
  const isSundayEvening = resolvedService === "sunday_evening";
  const isSunday = isSundayMorning || isSundayEvening;

  // Real arrivals only: no invented expected headcount, simulated or sample counts.
  const serviceCheckedIn = realDbCount;

  const serviceKpiTitle = isSundayMorning
    ? (isRTL ? "حضور الأحد الصباحي" : "Sunday Morning Attendance")
    : isSundayEvening
      ? (isRTL ? "حضور الأحد المسائي" : "Sunday Evening Attendance")
      : attendanceWindow.fridayAttendance;



  // Row 1 — Main KPI cards (single instance, position varies with livePriority)
  const kpiRow = (
    <div ref={kpiRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 scroll-mt-4">
      <KpiCard
        title={isRTL ? t("dashboard.totalMembers") : analytics.kpis.totalMembers.label}
        value={analytics.kpis.totalMembers.value}
        change={analytics.kpis.totalMembers.change}
        comparisonLabel={isRTL ? "مقارنة بالشهر السابق" : analytics.kpis.totalMembers.comparisonLabel}
        color="blue"
        href="/people"
        isLoading={isLoading}
        isEmpty={isEmpty}
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />
      <KpiCard
        key={`service-attendance-${resolvedService}-${simulation.active ? "sim" : "static"}`}
        title={serviceKpiTitle}
        value={fridayAttendanceShown ? serviceCheckedIn.toLocaleString() : "—"}
        change={{ value: 0, trend: "neutral" }}
        comparisonLabel={
          attendanceRelevant
            ? attendanceCtx.state === "not-started"
              ? attendanceWindow.notStartedHint
              : (isRTL ? `${serviceCheckedIn} مسجّل حاضر` : `${serviceCheckedIn} checked in`)
            : attendanceWindow.attendanceFridayOnly
        }
        color="green"
        href="/attendance"
        isLoading={isLoading}
        isEmpty={isEmpty}
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <KpiCard
        title={isRTL ? t("dashboard.followUpsPending") : analytics.kpis.followUps.label}
        value={analytics.kpis.followUps.value}
        change={analytics.kpis.followUps.change}
        comparisonLabel={isRTL ? "متابعات رعوية معلقة" : analytics.kpis.followUps.comparisonLabel}
        color="gold"
        href="/follow-ups?status=open"
        isLoading={isLoading}
        isEmpty={isEmpty}
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        }
      />
      <KpiCard
        title={isRTL ? t("dashboard.activeGroups") : analytics.kpis.activeGroups.label}
        value={analytics.kpis.activeGroups.value}
        change={analytics.kpis.activeGroups.change}
        comparisonLabel={isRTL ? "مجموعات نشطة هذا الشهر" : analytics.kpis.activeGroups.comparisonLabel}
        color="purple"
        href="/groups"
        isLoading={isLoading}
        isEmpty={isEmpty}
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ═══════════ ZONE 1: Church banner (photo, greeting, what is waiting, verse) ═══════════ */}
      <DashboardHero
        controls={
          <>
            {!demoMode && (
              <button
                type="button"
                onClick={() => enterDemo(FRIDAY_DEMO_DEFAULT_STATE)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/30 px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-white/60 hover:bg-white/10 hover:text-white"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isRTL ? "تشغيل العرض التجريبي" : "Start Live Demo"}
              </button>
            )}
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <button
              onClick={refresh}
              disabled={isLoading}
              className="btn btn-md btn-secondary cursor-pointer"
              aria-label={isRTL ? "تحديث بيانات لوحة التحكم" : "Refresh dashboard data"}
              title={isRTL ? "تحديث" : "Refresh"}
            >
              <svg
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </>
        }
      />

      {/* Empty state for custom date range */}
      {isEmpty && !isLoading ? (
        <DashboardEmptyState
          title={isRTL ? "لا توجد بيانات متاحة لهذه الفترة" : "No data available for this period"}
          description={isRTL ? "يرجى اختيار فترة محددة مسبقًا (اليوم، هذا الأسبوع، هذا الشهر) لعرض مؤشرات الكنيسة." : "Custom date ranges don't have pre-loaded analytics data. Select a preset period to view your dashboard."}
        />
      ) : (
        <>
          {/* ═══════════ ZONE 2: KPI Cards ═══════════ */}
          {kpiRow}

          {/* ═══════════ ZONE 3: Live Service Card (unified) ═══════════ */}
          {attendanceRelevant && (
            <LiveServiceCard
              key={`live-card-${resolvedService}-${demoState.id}`}
              activeService={resolvedService}
              onServiceChange={setSelectedService}
              checkedIn={serviceCheckedIn}
              recentCheckIns={realStats.recent}
              lastCheckInAt={realStats.lastCheckInAt}
              totalCheckedIn={totalCheckedIn}
              effectiveNow={effectiveNow}
              onCheckIn={handleLiveCheckIn}
            />
          )}

          {/* ═══════════ ZONE 4: Analytics (collapsible) ═══════════ */}
          <div className="space-y-6">
            <CollapsibleSection title={t("dashboard.weeklyAttendance")} summary={<AttendanceSummary />}>
              <AttendanceChart />
            </CollapsibleSection>

            <CollapsibleSection title={t("dashboard.peopleByMinistry")} summary={<MinistrySummary />}>
              <MinistryDistributionChart />
            </CollapsibleSection>

            <CollapsibleSection title={t("dashboard.recentActivity")} summary={<ActivitySummary />}>
              <ActivityFeed />
            </CollapsibleSection>

            <CollapsibleSection title={t("dashboard.upcomingEvents")} summary={<EventsSummary />}>
              <UpcomingEvents />
            </CollapsibleSection>
          </div>
        </>
      )}
    </div>
  );
}
