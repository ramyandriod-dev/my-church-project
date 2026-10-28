"use client";

import { cn } from "@/lib/utils";

// ─── KPI Card Skeleton ──────────────────────────────────────
export function SkeletonKpiCard() {
  return (
    <div className="relative block p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-24 skeleton-shimmer rounded" />
          <div className="h-8 w-20 skeleton-shimmer rounded mt-1" />
        </div>
        <div className="w-11 h-11 skeleton-shimmer rounded-xl shrink-0" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-16 skeleton-shimmer rounded" />
          <div className="h-3 w-14 skeleton-shimmer rounded" />
        </div>
        <div className="h-3 w-4 skeleton-shimmer rounded" />
      </div>
    </div>
  );
}

// ─── Attendance Chart Skeleton ───────────────────────────────
export function SkeletonAttendanceChart() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 skeleton-shimmer rounded-lg" />
            <div className="space-y-2">
              <div className="h-5 w-36 skeleton-shimmer rounded" />
              <div className="h-4 w-28 skeleton-shimmer rounded" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="h-6 w-16 skeleton-shimmer rounded ml-auto" />
            <div className="h-3 w-20 skeleton-shimmer rounded ml-auto" />
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="h-64 flex items-end gap-2 px-4">
          {[60, 45, 75, 40, 55, 80, 70].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <div
                className="w-full skeleton-shimmer rounded-t transition-all duration-500"
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 px-4">
          {["", "", "", "", "", "", ""].map((_, i) => (
            <div key={i} className="h-3 w-8 skeleton-shimmer rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ministry Distribution Skeleton ──────────────────────────
export function SkeletonMinistryDistribution() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 skeleton-shimmer rounded-lg" />
            <div className="space-y-2">
              <div className="h-5 w-32 skeleton-shimmer rounded" />
              <div className="h-4 w-24 skeleton-shimmer rounded" />
            </div>
          </div>
          <div className="h-6 w-10 skeleton-shimmer rounded" />
        </div>
      </div>
      <div className="p-6 space-y-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 skeleton-shimmer rounded-lg" />
                <div className="h-4 w-20 skeleton-shimmer rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-8 skeleton-shimmer rounded" />
                <div className="h-3 w-8 skeleton-shimmer rounded" />
              </div>
            </div>
            <div className="h-2 skeleton-shimmer rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compact KPI Row Skeleton ────────────────────────────────
export function SkeletonCompactKpiRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 skeleton-shimmer rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-20 skeleton-shimmer rounded" />
              <div className="h-7 w-14 skeleton-shimmer rounded" />
              <div className="h-3 w-24 skeleton-shimmer rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
