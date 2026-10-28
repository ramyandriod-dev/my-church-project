"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/lib/use-animated-number";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
  };
  comparisonLabel?: string;
  icon: React.ReactNode;
  color?: "blue" | "green" | "purple" | "gold" | "coral";
  href?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    hoverBg: "hover:bg-blue-50/50",
    hoverBorder: "hover:border-blue-200",
    focusRing: "focus-visible:ring-blue-500",
    gradient: "from-blue-500/[0.04]",
    viewDetails: "group-hover:text-blue-600",
  },
  green: {
    bg: "bg-mint-50",
    text: "text-mint-600",
    hoverBg: "hover:bg-mint-50/50",
    hoverBorder: "hover:border-mint-200",
    focusRing: "focus-visible:ring-mint-500",
    gradient: "from-mint-500/[0.04]",
    viewDetails: "group-hover:text-mint-600",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    hoverBg: "hover:bg-purple-50/50",
    hoverBorder: "hover:border-purple-200",
    focusRing: "focus-visible:ring-purple-500",
    gradient: "from-purple-500/[0.04]",
    viewDetails: "group-hover:text-purple-600",
  },
  gold: {
    bg: "bg-gold-50",
    text: "text-gold-600",
    hoverBg: "hover:bg-gold-50/50",
    hoverBorder: "hover:border-gold-200",
    focusRing: "focus-visible:ring-gold-500",
    gradient: "from-gold-500/[0.04]",
    viewDetails: "group-hover:text-gold-600",
  },
  coral: {
    bg: "bg-coral-50",
    text: "text-coral-600",
    hoverBg: "hover:bg-coral-50/50",
    hoverBorder: "hover:border-coral-200",
    focusRing: "focus-visible:ring-coral-500",
    gradient: "from-coral-500/[0.04]",
    viewDetails: "group-hover:text-coral-600",
  },
};

function parseNumericValue(value: string | number): { num: number; prefix: string; suffix: string } {
  if (typeof value === "number") {
    return { num: value, prefix: "", suffix: "" };
  }
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "—") {
    return { num: 0, prefix: "", suffix: value.replace(/[0-9.\-]/g, "") || "" };
  }
  const num = parseFloat(cleaned);
  if (isNaN(num)) return { num: 0, prefix: "", suffix: value };
  const match = value.match(/^([^0-9\-]*)([0-9.\-,]+)(.*)$/);
  if (match) {
    return { num, prefix: match[1], suffix: match[3] };
  }
  return { num, prefix: "", suffix: "" };
}

function formatWithCommas(n: number): string {
  return n.toLocaleString("en-US");
}

export function KpiCard({ title, value, change, comparisonLabel = "vs last week", icon, color = "blue", href, isLoading, isEmpty }: KpiCardProps) {
  const { num, prefix, suffix } = parseNumericValue(value);
  const animatedNum = useAnimatedNumber(num, 1400);
  const displayValue = value === "—" || (typeof value === "string" && value.includes("—"))
    ? "—"
    : `${prefix}${formatWithCommas(animatedNum)}${suffix}`;

  const colors = colorClasses[color];

  const cardClasses = cn(
    "relative block p-5 rounded-xl border border-gray-200 bg-white",
    "shadow-sm",
    "transition-all duration-200 ease-out",
    "hover:shadow-lg hover:-translate-y-0.5",
    colors.hoverBg,
    colors.hoverBorder,
    `focus-visible:outline-none focus-visible:ring-2 ${colors.focusRing} focus-visible:ring-offset-2`,
    "group"
  );

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="relative block p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-24 skeleton-shimmer rounded" />
            <div className="h-8 w-20 skeleton-shimmer rounded mt-1" />
          </div>
          <div className="w-11 h-11 skeleton-shimmer rounded-xl shrink-0" />
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <div className="h-4 w-16 skeleton-shimmer rounded" />
          <div className="h-3 w-14 skeleton-shimmer rounded" />
        </div>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="relative block p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-300 tracking-tight">—</p>
          </div>
          <div className={cn(
            "p-2.5 rounded-xl shrink-0 bg-gray-100 text-gray-300"
          )}>
            {icon}
          </div>
        </div>
        <div className="mt-3">
          <span className="text-xs text-gray-400">No data for this period</span>
        </div>
      </div>
    );
  }

  const content = (
    <div className={cardClasses}>
      {/* Top row: label + value + icon */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight tabular-nums">{displayValue}</p>
        </div>
        <div className={cn(
          "p-2.5 rounded-xl shrink-0 transition-transform duration-200 ease-out",
          "group-hover:scale-105",
          colors.bg, colors.text
        )}>
          {icon}
        </div>
      </div>

      {/* Bottom row: trend + affordance */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {change && (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-sm font-semibold",
                  change.trend === "up" && "text-mint-600",
                  change.trend === "down" && "text-coral-600",
                  change.trend === "neutral" && "text-gray-500"
                )}
              >
                {change.trend === "up" && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
                {change.trend === "down" && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                {change.value > 0 ? "+" : ""}{change.value}%
              </span>
              <span className="text-xs text-gray-400">{comparisonLabel}</span>
            </>
          )}
        </div>

        {/* "View details" affordance — only when href is provided */}
        {href && (
          <span className={cn(
            "inline-flex items-center gap-1 text-xs font-medium text-gray-300 transition-colors duration-200",
            colors.viewDetails
          )}>
            <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              View details
            </span>
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>

      {/* Subtle hover gradient overlay — color-specific */}
      <div className={cn(
        "absolute inset-0 rounded-xl bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none",
        colors.gradient
      )} />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus-visible:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
