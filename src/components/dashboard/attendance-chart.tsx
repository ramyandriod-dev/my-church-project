"use client";

import * as React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { useAnimatedNumber } from "@/lib/use-animated-number";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">
          {payload[0].value.toLocaleString()} attendees
        </p>
      </div>
    );
  }
  return null;
};

function SkeletonAttendanceChartInner() {
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
              <div className="w-full skeleton-shimmer rounded-t" style={{ height: `${h}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AttendanceChart() {
  const { analytics, isLoading, isEmpty } = useDashboard();
  const { attendanceChart } = analytics;
  const animatedTotal = useAnimatedNumber(attendanceChart.total, 1400);

  if (isLoading) {
    return <SkeletonAttendanceChartInner />;
  }

  if (isEmpty || attendanceChart.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Attendance</h3>
              <p className="text-sm text-gray-500">No data available</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center">
            <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No attendance data for this period</p>
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
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{attendanceChart.title}</h3>
              <p className="text-sm text-gray-500">{attendanceChart.subtitle}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{animatedTotal.toLocaleString()}</p>
            <p className="text-sm text-gray-400">total attendees</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceChart.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                interval={attendanceChart.data.length > 12 ? Math.floor(attendanceChart.data.length / 6) : 0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59, 130, 246, 0.05)" }} />
              <Bar
                dataKey="value"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                isAnimationActive={true}
                animationDuration={1400}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
