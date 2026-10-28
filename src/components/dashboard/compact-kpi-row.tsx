"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { useTranslation } from "@/lib/i18n";

interface CompactKpiCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: React.ReactNode;
  color: "blue" | "mint" | "purple" | "gold";
  href: string;
  subtitle?: string;
}

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    ring: "ring-blue-100",
    hoverBorder: "hover:border-blue-200",
  },
  mint: {
    bg: "bg-mint-50",
    text: "text-mint-600",
    ring: "ring-mint-100",
    hoverBorder: "hover:border-mint-200",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    ring: "ring-purple-100",
    hoverBorder: "hover:border-purple-200",
  },
  gold: {
    bg: "bg-gold-50",
    text: "text-gold-600",
    ring: "ring-gold-100",
    hoverBorder: "hover:border-gold-200",
  },
};

function CompactKpiCard({ title, value, prefix = "", suffix = "", icon, color, href, subtitle }: CompactKpiCardProps) {
  const animated = useAnimatedNumber(value, 1200);
  const colors = colorMap[color];

  return (
    <Link
      href={href}
      className={cn(
        "block bg-white rounded-xl border border-gray-200 shadow-sm p-4",
        "transition-all duration-200 group",
        "hover:shadow-md",
        colors.hoverBorder
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg ring-1", colors.bg, colors.ring)}>
          <span className={colors.text}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">{title}</p>
          <p className={cn("text-2xl font-bold tabular-nums", colors.text)}>
            {prefix}{animated.toLocaleString()}{suffix}
          </p>
          {subtitle && (
            <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CompactKpiRow() {
  const { t, isRTL } = useTranslation();

  const cards: CompactKpiCardProps[] = [
    {
      title: t("dashboard.newVisitorsThisWeek"),
      value: 8,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      color: "blue",
      href: "/people?filter=visitors&timeframe=week",
      subtitle: isRTL ? "3 زوار عادوا هذا الأسبوع" : "3 returned this week",
    },
    {
      title: t("dashboard.volunteersOnDuty"),
      value: 24,
      suffix: " / 30",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "mint",
      href: "/ministries?view=volunteers&status=on-duty",
      subtitle: isRTL ? "80% نسبة تغطية الخدمة" : "80% coverage",
    },
    {
      title: t("dashboard.prayerRequestsToday"),
      value: 12,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      color: "purple",
      href: "/shepherding?view=prayer-requests&timeframe=today",
      subtitle: isRTL ? "5 طلبات تحتاج لمتابعة" : "5 need follow-up",
    },
    {
      title: t("dashboard.weeklyGiving"),
      value: 18420,
      prefix: "$",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "gold",
      href: "/reports?view=giving&timeframe=week",
      subtitle: isRTL ? "87% من هدف العطاء الأسبوعي" : "87% of $21K goal",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <CompactKpiCard key={card.title} {...card} />
      ))}
    </div>
  );
}
