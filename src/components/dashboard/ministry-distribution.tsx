"use client";

import * as React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useDashboard } from "@/lib/dashboard-context";
import { useAnimatedNumber } from "@/lib/use-animated-number";

const ministryConfig: Record<string, { icon: React.ReactNode; bgClass: string }> = {
  Worship: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
    bgClass: "bg-purple-100 text-purple-600",
  },
  Youth: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgClass: "bg-blue-100 text-blue-600",
  },
  Children: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    bgClass: "bg-mint-100 text-mint-600",
  },
  Outreach: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgClass: "bg-gold-100 text-gold-600",
  },
  Admin: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    bgClass: "bg-coral-100 text-coral-600",
  },
};

const ministryColors = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-mint-500",
  "bg-gold-500",
  "bg-coral-500",
];

function AnimatedMinistryItem({ name, count, percentage, colorClass }: {
  name: string;
  count: number;
  percentage: number;
  colorClass: string;
}) {
  const animatedCount = useAnimatedNumber(count, 1400);
  const animatedPct = useAnimatedNumber(percentage, 1400);
  const config = ministryConfig[name] || ministryConfig["Admin"];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${config.bgClass}`}>
            {config.icon}
          </div>
          <span className="text-sm font-medium text-gray-700">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 tabular-nums">{animatedCount}</span>
          <span className="text-xs text-gray-400 w-8 text-right tabular-nums">{animatedPct}%</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-1400 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function MinistryDistributionChart() {
  const { analytics, isLoading, isEmpty } = useDashboard();
  const { ministryDistribution } = analytics;
  const animatedTotal = useAnimatedNumber(ministryDistribution.total, 1400);

  if (isLoading) {
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

  if (isEmpty || ministryDistribution.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">People by Ministry</h3>
              <p className="text-sm text-gray-500">No data available</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No ministry data for this period</p>
            <p className="text-xs text-gray-400 mt-1">Try selecting a different date range</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">People by Ministry</h3>
              <p className="text-sm text-gray-500">Active members per ministry</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{animatedTotal}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ministryDistribution.data.map((item, index) => (
            <AnimatedMinistryItem
              key={item.name}
              name={item.name}
              count={item.count}
              percentage={item.percentage}
              colorClass={ministryColors[index % ministryColors.length]}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
