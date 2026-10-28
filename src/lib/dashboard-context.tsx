"use client";

import * as React from "react";
import { type DateRange } from "@/components/dashboard/date-range-picker";
import { type DashboardAnalytics, getDashboardAnalytics } from "@/lib/mock-dashboard-data";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

interface DashboardContextValue {
  dateRange: DateRange;
  activePreset: string;
  setDateRange: (range: DateRange, preset: string) => void;
  analytics: DashboardAnalytics;
  isLoading: boolean;
  isEmpty: boolean;
  refresh: () => void;
}

const DashboardContext = React.createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = React.useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRangeState] = React.useState<DateRange>({
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date()),
  });
  const [activePreset, setActivePreset] = React.useState("this-week");
  const [isLoading, setIsLoading] = React.useState(false);

  const analytics = React.useMemo(
    () => getDashboardAnalytics(activePreset),
    [activePreset]
  );

  // M16: Detect empty state for custom ranges
  const isEmpty = React.useMemo(() => {
    if (activePreset === "custom") {
      // Custom ranges with no specific data show empty state
      return true;
    }
    return false;
  }, [activePreset]);

  function setDateRange(range: DateRange, preset: string) {
    setIsLoading(true);
    setDateRangeState(range);
    setActivePreset(preset);
    // Simulate brief loading for period change (300ms for snappy feel)
    setTimeout(() => setIsLoading(false), 300);
  }

  function refresh() {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  }

  return (
    <DashboardContext.Provider
      value={{ dateRange, activePreset, setDateRange, analytics, isLoading, isEmpty, refresh }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
