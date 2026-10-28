"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSanctuarySeating } from "@/lib/seating/use-seating";
import { UsherBroadcastDrawer } from "@/components/seating/usher-broadcast-drawer";
import { useTranslation } from "@/lib/i18n";

interface DashboardSeatingRadarProps {
  className?: string;
}

export function DashboardSeatingRadar({ className }: DashboardSeatingRadarProps) {
  const { isRTL, locale } = useTranslation();
  const isAr = locale === "ar";
  const {
    totalCapacity,
    totalOccupied,
    totalAvailable,
    occupancyRate,
    sections,
    sectionsList,
    latestAlert,
    recentAlerts,
  } = useSanctuarySeating();

  const [broadcastOpen, setBroadcastOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-md p-4 sm:p-5 text-start overflow-hidden relative",
        className
      )}
    >
      {/* Background ambient glow */}
      <div className="absolute -top-16 -end-16 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* ─── Top Bar: Title & PWA Launch Link ─── */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center text-sm shadow-inner">
            🪑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {isAr ? "رادار إشغال مقاعد الكنيسة (تحديث المنظمين المباشر)" : "Sanctuary Seating Radar (Live Usher Feed)"}
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400">
              {isAr
                ? "سعة القاعة 600 مقعد — تتناقص تلقائياً عند تسجيل المقاعد من موبايل المنظم"
                : "600 sanctuary seats — decreases in real time as ushers seat arriving attendees"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick broadcast button */}
          <button
            type="button"
            onClick={() => setBroadcastOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <span>📢</span>
            <span>{isAr ? "إرسال إشعار" : "New Note"}</span>
          </button>

          {/* Launch PWA tool button */}
          <Link
            href="/usher"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-blue-500/25 active:scale-95"
          >
            <span>📱</span>
            <span>{isAr ? "فتح تطبيق المنظمين (PWA)" : "Open Usher PWA"}</span>
            <span>{isRTL ? "←" : "→"}</span>
          </Link>
        </div>
      </div>

      {/* ─── Capacity Metrics Bar (600 Total Seats) ─── */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5 border-b border-slate-800/80">
        {/* Total Capacity */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isAr ? "إجمالي المقاعد" : "Total Capacity"}
          </p>
          <p className="text-xl sm:text-2xl font-black text-white mt-0.5 tabular-nums">
            {totalCapacity.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500">{isAr ? "سعة القاعة الكاملة" : "Full sanctuary capacity"}</p>
        </div>

        {/* Available Seats (Decreases when occupied) */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            {isAr ? "المقاعد المتاحة (تنازلي)" : "Available Seats"}
          </p>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 tabular-nums">
            {totalAvailable.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-400/80 font-medium">
            {isAr ? `شاغر حالياً (${100 - occupancyRate}%)` : `Vacant now (${100 - occupancyRate}%)`}
          </p>
        </div>

        {/* Occupied Seats */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
            {isAr ? "المقاعد المشغولة" : "Occupied Seats"}
          </p>
          <p className="text-xl sm:text-2xl font-black text-rose-400 mt-0.5 tabular-nums">
            {totalOccupied.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500">{isAr ? "حضور مسجلين" : "Seated attendees"}</p>
        </div>

        {/* Occupancy Rate Meter */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              {isAr ? "نسبة الإشغال" : "Occupancy Rate"}
            </p>
            <span className="text-xs font-bold text-blue-400 tabular-nums">{occupancyRate}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-1.5 p-0.5 border border-slate-700">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                occupancyRate > 90
                  ? "bg-rose-500"
                  : occupancyRate > 75
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              )}
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {occupancyRate > 90
              ? (isAr ? "🔴 القاعة مكتملة تقريباً" : "🔴 Sanctuary nearly full")
              : (isAr ? "🟢 أماكن شاغرة متاحة" : "🟢 Open seating available")}
          </p>
        </div>
      </div>

      {/* ─── Live Section Availability Tiles ─── */}
      <div className="relative z-10 pt-3 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {sectionsList.map((sec) => {
          const stats = sections[sec.id] || { total: sec.totalSeats, occupied: 0, available: sec.totalSeats, occupancyRate: 0 };
          const isNearlyFull = stats.occupancyRate >= 90;
          const isModerate = stats.occupancyRate >= 70 && stats.occupancyRate < 90;

          return (
            <div
              key={sec.id}
              className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/70 hover:border-slate-600 transition-all text-start"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-slate-200 truncate">
                  {isAr ? sec.nameAr : sec.nameEn}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0",
                    isNearlyFull
                      ? "bg-rose-950/80 text-rose-300 border-rose-800"
                      : isModerate
                      ? "bg-amber-950/80 text-amber-300 border-amber-800"
                      : "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                  )}
                >
                  {isNearlyFull
                    ? (isAr ? "ممتلئ" : "FULL")
                    : (isAr ? `${stats.available} متاح` : `${stats.available} Free`)}
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-1 text-[11px]">
                <span className="text-slate-400 font-medium">
                  {isAr ? "المتاح حالياً:" : "Available:"}
                </span>
                <span className="text-sm font-extrabold text-emerald-400 tabular-nums">
                  {stats.available} <span className="text-[10px] text-slate-400 font-normal">/ {sec.totalSeats}</span>
                </span>
              </div>

              {/* Progress bar per section */}
              <div className="w-full bg-slate-700/80 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isNearlyFull ? "bg-rose-500" : isModerate ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${stats.occupancyRate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Live Usher Alert Ticker ─── */}
      {latestAlert && (
        <div className="relative z-10 mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0 text-[11px]">
              📢
            </span>
            <span className="text-slate-400 shrink-0 font-medium">
              {isAr ? "آخر إشعار من المنظمين:" : "Latest Usher Report:"}
            </span>
            <span className="text-amber-200 font-bold truncate">
              {isAr ? latestAlert.messageAr : latestAlert.messageEn}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-400 font-medium">
              {latestAlert.usherName} · {latestAlert.timestamp}
            </span>
            <Link
              href="/usher"
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              {isAr ? "خريطة المقاعد" : "View Map"}
            </Link>
          </div>
        </div>
      )}

      {/* Broadcast Drawer Modal */}
      <UsherBroadcastDrawer
        isOpen={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        usherName={isAr ? "غرفة العمليات / منسق الخدمة" : "Service Coordinator"}
      />
    </div>
  );
}
