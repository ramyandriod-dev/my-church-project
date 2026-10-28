"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

interface UpcomingEvent {
  id: string;
  title: string;
  titleAr: string;
  date: string;
  dateAr: string;
  time: string;
  timeAr: string;
  attendees: number;
  status: "upcoming" | "in-progress" | "completed";
  icon: React.ReactNode;
  iconBg: string;
}

const mockEvents: UpcomingEvent[] = [
  {
    id: "1",
    title: "Sunday Worship Service",
    titleAr: "اجتماع العبادة والتسبيح الأسبوعي",
    date: "Sep 15, 2024",
    dateAr: "الأحد، 15 سبتمبر",
    time: "10:00 AM",
    timeAr: "10:00 صباحًا",
    attendees: 245,
    status: "upcoming",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
    iconBg: "bg-purple-50 text-purple-600",
  },
  {
    id: "2",
    title: "Youth Night",
    titleAr: "اجتماع الشباب الأسبوعي",
    date: "Sep 20, 2024",
    dateAr: "الجمعة، 20 سبتمبر",
    time: "7:00 PM",
    timeAr: "7:00 مساءً",
    attendees: 45,
    status: "upcoming",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: "bg-blue-50 text-blue-600",
  },
  {
    id: "3",
    title: "Bible Study",
    titleAr: "دراسة وتأمل الكتاب المقدس",
    date: "Sep 18, 2024",
    dateAr: "الأربعاء، 18 سبتمبر",
    time: "6:30 PM",
    timeAr: "6:30 مساءً",
    attendees: 32,
    status: "upcoming",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    iconBg: "bg-mint-50 text-mint-600",
  },
];

const statusVariant = {
  upcoming: "blue" as const,
  "in-progress": "green" as const,
  completed: "gray" as const,
};

export function UpcomingEvents() {
  const { t, isRTL } = useTranslation();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-start">
            <h3 className="text-lg font-bold text-gray-900">{t("dashboard.upcomingEvents")}</h3>
            <p className="text-sm text-gray-500">
              {isRTL ? "مواعيد اجتماعات الكنيسة القادمة" : "What's coming up next"}
            </p>
          </div>
        </div>
        <Link
          href="/events"
          className="text-sm text-blue-600 hover:text-blue-700 font-bold transition-colors duration-150"
        >
          {t("dashboard.viewCalendar")}
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-gray-100">
          {mockEvents.map((event) => (
            <li key={event.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${event.iconBg}`}>
                  {event.icon}
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-sm font-bold text-gray-900">
                    {isRTL ? event.titleAr : event.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isRTL ? `${event.dateAr} • ${event.timeAr}` : `${event.date} at ${event.time}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500 font-medium">
                    {isRTL ? `${event.attendees} متوقع` : `${event.attendees} expected`}
                  </span>
                  <Badge variant={statusVariant[event.status]}>
                    {isRTL
                      ? (event.status === "upcoming" ? "قادمة" : event.status === "in-progress" ? "جارية" : "مكتملة")
                      : event.status}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

