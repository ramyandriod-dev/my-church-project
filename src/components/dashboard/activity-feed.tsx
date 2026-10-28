"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

interface ActivityItem {
  id: string;
  type: "member" | "event" | "followup" | "group";
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  time: string;
  timeAr: string;
  icon: React.ReactNode;
}

const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "member",
    title: "New Member Registration",
    titleAr: "تسجيل عضو جديد",
    description: "Sarah Johnson completed membership registration",
    descriptionAr: "سارة وجدي أكملت تسجيل بيانات عضويتها بالكنيسة",
    time: "2 min ago",
    timeAr: "منذ دقيقتين",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    id: "2",
    type: "event",
    title: "Event Scheduled",
    titleAr: "إدراج فعالية جديدة بالجدول",
    description: "Youth Night - This Friday at 7pm",
    descriptionAr: "اجتماع الشباب الأسبوعي - هذا الأسبوع 7:00 م",
    time: "15 min ago",
    timeAr: "منذ 15 دقيقة",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "3",
    type: "followup",
    title: "Pastoral Visit Completed",
    titleAr: "اكتملت الزيارة الرعوية (الافتقاد)",
    description: "Pastor Mike visited the Wilson family",
    descriptionAr: "الراعي مايك أتم زيارة افتقاد لأسرة ولسن ودوّن ملاحظاته",
    time: "1 hour ago",
    timeAr: "منذ ساعة",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "4",
    type: "group",
    title: "Group Meeting",
    titleAr: "انعقاد اجتماع مجموعة دراسة الكتاب",
    description: "Bible Study Group met with 12 attendees",
    descriptionAr: "مجموعة دراسة الكتاب المقدس اجتمعت بمشاركة 12 عضواً",
    time: "3 hours ago",
    timeAr: "منذ 3 ساعات",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const typeColors = {
  member: "bg-blue-50 text-blue-600",
  event: "bg-purple-50 text-purple-600",
  followup: "bg-emerald-50 text-emerald-600",
  group: "bg-amber-50 text-amber-600",
};

export function ActivityFeed() {
  const { t, isRTL } = useTranslation();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-start">
            <h3 className="text-lg font-bold text-gray-900">{t("dashboard.recentActivity")}</h3>
            <p className="text-sm text-gray-500">
              {isRTL ? "أحدث المتابعات والأنشطة الرعوية بالكنيسة" : "Latest actions across your church"}
            </p>
          </div>
        </div>
        <Link
          href="/people"
          className="text-sm text-blue-600 hover:text-blue-700 font-bold transition-colors duration-150"
        >
          {isRTL ? "عرض الكل ←" : "View All →"}
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-gray-100">
          {mockActivities.map((activity) => (
            <li key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-start gap-4">
                <div className={cn("p-2 rounded-lg shrink-0", typeColors[activity.type])}>
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-sm font-bold text-gray-900">
                    {isRTL ? activity.titleAr : activity.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {isRTL ? activity.descriptionAr : activity.description}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap font-medium shrink-0">
                  {isRTL ? activity.timeAr : activity.time}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

