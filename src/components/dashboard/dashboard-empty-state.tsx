"use client";

import { cn } from "@/lib/utils";

interface DashboardEmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function DashboardEmptyState({
  title = "No data available for this period",
  description = "Try selecting a different date range or preset to view your dashboard analytics.",
  icon,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
        {icon || (
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm">{description}</p>
    </div>
  );
}

// ─── KPI Empty State ────────────────────────────────────────
export function KpiEmptyState({ label }: { label: string }) {
  return (
    <div className="relative block p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-300 tracking-tight">—</p>
        </div>
        <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
          </svg>
        </div>
      </div>
      <div className="mt-3">
        <span className="text-xs text-gray-400">No data for this period</span>
      </div>
    </div>
  );
}
