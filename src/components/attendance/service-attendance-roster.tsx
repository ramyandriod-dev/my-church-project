"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  PRESET_SERVICES,
  getServiceRoster,
  exportRosterToCSV,
  type AttendeeRecord,
  type ServiceOption,
} from "@/lib/attendance/historical-attendance";
import { subscribeLiveWelcomeBack } from "@/lib/attendance/live-welcome-back-store";

import type { ActiveService } from "@/lib/attendance/attendance-context";

interface ServiceAttendanceRosterProps {
  effectiveNow?: Date;
  activeService?: ActiveService;
  className?: string;
}

type FilterTab = "all" | "welcome_back" | "visitors" | "regular";

export function ServiceAttendanceRoster({
  effectiveNow,
  activeService,
  className,
}: ServiceAttendanceRosterProps) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";

  // Selected date and service
  const initialServiceId = React.useMemo(() => {
    if (activeService === "sunday_morning") return "sun-2026-09-13-am";
    if (activeService === "sunday_evening") return "sun-2026-09-13-pm";
    if (effectiveNow && effectiveNow.getDay() === 0) {
      return effectiveNow.getHours() >= 17 ? "sun-2026-09-13-pm" : "sun-2026-09-13-am";
    }
    return PRESET_SERVICES[1].id;
  }, [activeService, effectiveNow]);

  const [selectedServiceId, setSelectedServiceId] = React.useState<string>(initialServiceId);
  const [customDate, setCustomDate] = React.useState<string>("2026-09-11");
  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [ministryFilter, setMinistryFilter] = React.useState("all");
  const [wbVersion, setWbVersion] = React.useState(0);

  React.useEffect(() => {
    return subscribeLiveWelcomeBack(() => {
      setWbVersion((v) => v + 1);
    });
  }, []);

  React.useEffect(() => {
    if (activeService === "sunday_morning") {
      setSelectedServiceId("sun-2026-09-13-am");
    } else if (activeService === "sunday_evening") {
      setSelectedServiceId("sun-2026-09-13-pm");
    } else if (activeService === "friday_morning") {
      setSelectedServiceId("fri-2026-09-18");
    } else if (effectiveNow && effectiveNow.getDay() === 0) {
      setSelectedServiceId(
        effectiveNow.getHours() >= 17 ? "sun-2026-09-13-pm" : "sun-2026-09-13-am"
      );
    }
  }, [activeService, effectiveNow]);

  const currentService = React.useMemo(() => {
    return (
      PRESET_SERVICES.find((s) => s.id === selectedServiceId) || {
        id: "custom",
        dateStr: customDate,
        dateLabel: customDate,
        dayOfWeek: new Date(customDate).getDay() === 0 ? "sunday" : "friday",
        serviceName:
          new Date(customDate).getDay() === 0
            ? "Sunday Morning Service"
            : "Friday Main Service",
        serviceKey: (new Date(customDate).getDay() === 0
          ? "sunday_morning"
          : "friday_morning") as "friday_morning" | "sunday_morning",
      }
    );
  }, [selectedServiceId, customDate]);

  // Load roster
  const rosterData = React.useMemo(() => {
    return getServiceRoster(currentService.dateStr, currentService.serviceKey);
  }, [currentService.dateStr, currentService.serviceKey, wbVersion]);

  // Extract unique ministries for dropdown
  const ministries = React.useMemo(() => {
    const set = new Set<string>();
    rosterData.attendees.forEach((a) => {
      if (a.ministry && a.ministry !== "—") set.add(a.ministry);
    });
    return Array.from(set).sort();
  }, [rosterData.attendees]);

  // Filter attendees
  const filteredAttendees = React.useMemo(() => {
    return rosterData.attendees.filter((attendee) => {
      // Tab filter
      if (activeTab === "welcome_back" && attendee.status !== "welcome_back")
        return false;
      if (activeTab === "visitors" && !attendee.isVisitor) return false;
      if (activeTab === "regular" && attendee.status !== "regular") return false;

      // Ministry filter
      if (ministryFilter !== "all" && attendee.ministry !== ministryFilter)
        return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = attendee.name.toLowerCase().includes(q);
        const matchesPhone = attendee.phone.toLowerCase().includes(q);
        const matchesEmail = attendee.email.toLowerCase().includes(q);
        const matchesMinistry = attendee.ministry.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesMinistry)
          return false;
      }

      return true;
    });
  }, [rosterData.attendees, activeTab, ministryFilter, searchQuery]);

  const handleExport = () => {
    exportRosterToCSV(
      filteredAttendees,
      currentService.serviceName,
      currentService.dateStr
    );
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm space-y-6",
        className
      )}
    >
      {/* ─── 1. Header & Service Selector ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isAr
                  ? "سجل الحضور وقائمة المشاركين"
                  : "Service Attendance Register & Roster"}
              </h2>
              <p className="text-xs text-gray-500">
                {isAr
                  ? "استعراض كامل المشاركين، تنبيهات العائدين، والتصدير لأي تاريخ خدمة"
                  : "Inspect attendees, returning member alerts, and export records for any service date"}
              </p>
            </div>
          </div>
        </div>

        {/* Date & Service Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Preset Selector */}
          <select
            value={selectedServiceId}
            onChange={(e) => {
              setSelectedServiceId(e.target.value);
              const found = PRESET_SERVICES.find((s) => s.id === e.target.value);
              if (found) setCustomDate(found.dateStr);
            }}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-gray-100 text-gray-800 transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
          >
            {PRESET_SERVICES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.dateLabel} — {s.serviceName}
              </option>
            ))}
            <option value="custom">
              {isAr ? "📅 تاريخ مخصص..." : "📅 Custom Date..."}
            </option>
          </select>

          {/* Native HTML5 Calendar Date Picker */}
          <div className="flex items-center gap-1 bg-gray-50/70 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700">
            <span className="text-gray-400">📅</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setSelectedServiceId("custom");
              }}
              className="bg-transparent text-xs font-medium text-gray-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer ml-auto"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>{isAr ? "تصدير CSV" : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* ─── 2. Quick Filter Tabs & Summary Counters ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Triage Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/70 rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {isAr ? "الكل" : "All Attendees"} ({rosterData.totalCount})
          </button>

          {/* Welcome Back Tab (Amber Highlight) */}
          <button
            type="button"
            onClick={() => setActiveTab("welcome_back")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "welcome_back"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-amber-800 hover:bg-amber-100/60 bg-amber-50"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                activeTab === "welcome_back" ? "bg-white" : "bg-amber-500"
              )}
            />
            <span>{isAr ? "مرحبًا بعودتك (اهتمام)" : "Welcome Back"}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                activeTab === "welcome_back"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-200 text-amber-900"
              )}
            >
              {rosterData.welcomeBackCount}
            </span>
          </button>

          {/* Visitors Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("visitors")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "visitors"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-blue-800 hover:bg-blue-100/60 bg-blue-50"
            )}
          >
            <span>{isAr ? "الزوار الجدد" : "Visitors"}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                activeTab === "visitors"
                  ? "bg-blue-700 text-white"
                  : "bg-blue-200 text-blue-900"
              )}
            >
              {rosterData.visitorsCount}
            </span>
          </button>

          {/* Regular Members */}
          <button
            type="button"
            onClick={() => setActiveTab("regular")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "regular"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {isAr ? "الأعضاء المنتظمون" : "Regular Members"} ({rosterData.regularCount})
          </button>
        </div>

        {/* Search & Ministry Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={isAr ? "بحث بالاسم أو الهاتف..." : "Search attendees..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs w-48 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <select
            value={ministryFilter}
            onChange={(e) => setMinistryFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="all">{isAr ? "كل الخدمات" : "All Ministries"}</option>
            {ministries.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── 3. Attendee Roster Table ─────────────────────────────────────── */}
      <div className="overflow-x-auto border border-gray-100 rounded-xl">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100">
              <th className="py-3 px-4 text-start">{isAr ? "المشارك" : "Attendee"}</th>
              <th className="py-3 px-3 text-start">{isAr ? "الخدمة / المجموعة" : "Ministry / Group"}</th>
              <th className="py-3 px-3 text-start">{isAr ? "وقت وطريقة التسجيل" : "Check-in"}</th>
              <th className="py-3 px-3 text-start">{isAr ? "حالة الانتباه" : "Attendance Status"}</th>
              <th className="py-3 px-4 text-end">{isAr ? "إجراء" : "Action"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAttendees.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  {isAr ? "لا توجد سجلات مطابقة" : "No matching attendees found"}
                </td>
              </tr>
            ) : (
              filteredAttendees.map((attendee) => (
                <tr
                  key={attendee.id}
                  className={cn(
                    "hover:bg-gray-50/60 transition-colors",
                    attendee.status === "welcome_back" && "bg-amber-50/30"
                  )}
                >
                  {/* Member Name + Avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={attendee.avatar}
                        alt={attendee.name}
                        className={cn(
                          "w-8 h-8 rounded-full object-cover border",
                          attendee.status === "welcome_back"
                            ? "border-amber-300 ring-2 ring-amber-100"
                            : "border-gray-200"
                        )}
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/people/${attendee.memberId}`}
                          className="font-bold text-gray-900 hover:text-emerald-600 transition-colors truncate block"
                        >
                          {attendee.name}
                        </Link>
                        <span className="text-[10px] text-gray-400">
                          {attendee.phone || attendee.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Ministry & Group */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                        {attendee.ministry}
                      </span>
                      {attendee.group && attendee.group !== "—" && (
                        <span className="text-[10px] text-gray-400 truncate max-w-[110px]">
                          {attendee.group}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Check-In Time & Method */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {attendee.checkInTime}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                          attendee.method === "QR Mobile"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {attendee.method}
                      </span>
                    </div>
                  </td>

                  {/* Attendance Status Badge (Welcome Back / Visitor / Regular) */}
                  <td className="py-3 px-3">
                    {attendee.status === "welcome_back" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>
                          {isAr
                            ? `مرحبًا بعودتك (غاب ${attendee.missedWeeks ?? 2} أسابيع)`
                            : `Welcome Back (Missed ${attendee.missedWeeks ?? 2} wks)`}
                        </span>
                      </span>
                    ) : attendee.status === "visitor" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <span>{isAr ? "زائر لأول مرة" : "First-time Visitor"}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-emerald-700 bg-emerald-50">
                        <span>✓ {isAr ? "منتظم" : "Regular Attendee"}</span>
                      </span>
                    )}
                  </td>

                  {/* Action Link to Member 360 & Follow-up */}
                  <td className="py-3 px-4 text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      {attendee.status === "welcome_back" && (
                        <Link
                          href={`/follow-ups?create=true&memberId=${attendee.memberId}&memberName=${encodeURIComponent(attendee.name)}&reason=${encodeURIComponent(isAr ? `عودة بعد غياب ${attendee.missedWeeks ?? 2} أسابيع` : `Welcome Back after ${attendee.missedWeeks ?? 2} weeks absence`)}&type=welcome_back`}
                          className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors"
                        >
                          {isAr ? "متابعة" : "Follow-up"}
                        </Link>
                      )}
                      <Link
                        href={`/people/${attendee.memberId}`}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold text-gray-700 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        {isAr ? "عرض 360" : "View 360"}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 4. Footer Summary ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 flex-wrap gap-2">
        <span>
          {isAr
            ? `عرض ${filteredAttendees.length} من أصل ${rosterData.totalCount} مشارك في ${currentService.serviceName}`
            : `Showing ${filteredAttendees.length} of ${rosterData.totalCount} attendees for ${currentService.serviceName}`}
        </span>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {rosterData.welcomeBackCount} {isAr ? "عائدون بحاجة لاهتمام" : "Returning (Welcome Back)"}
          </span>
          <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {rosterData.visitorsCount} {isAr ? "زوار" : "Visitors"}
          </span>
        </div>
      </div>
    </div>
  );
}
