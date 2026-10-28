"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Member360 } from "@/lib/mock-data/member360";
import { useLanguage, Ltr } from "@/lib/i18n";

interface EngagementSectionProps {
  data: Member360;
}

export function EngagementSection({ data }: EngagementSectionProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";
  const { engagement } = data;

  const formatDimension = (dim: string) => {
    if (!isAr) return dim;
    const map: Record<string, string> = {
      Attendance: "الحضور",
      "Small Group": "المجموعة الصغيرة",
      Serving: "الخدمة",
      Giving: "العطاء",
    };
    return map[dim] || dim;
  };

  const formatLevel = (lvl: string) => {
    if (!isAr) return lvl;
    if (lvl === "High") return "مشاركة مرتفعة";
    if (lvl === "Moderate") return "مشاركة متوسطة";
    if (lvl === "Low") return "مشاركة منخفضة";
    return lvl;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-50 rounded-lg">
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{isAr ? "مسيرة المشاركة" : "Engagement Journey"}</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart */}
        <div className="h-32 flex items-end gap-1">
          {engagement.months.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col gap-0.5" style={{ height: "100px" }}>
                <div className="w-full rounded-t-sm bg-blue-500" style={{ height: `${m.attendance * 0.35}%` }} title={`${isAr ? "الحضور" : "Attendance"}: ${m.attendance}%`} />
                <div className="w-full rounded-t-sm bg-purple-400" style={{ height: `${m.groupParticipation * 0.35}%` }} title={`${isAr ? "المجموعة" : "Group"}: ${m.groupParticipation}%`} />
                <div className="w-full rounded-t-sm bg-mint-400" style={{ height: `${m.serving * 0.35}%` }} title={`${isAr ? "الخدمة" : "Serving"}: ${m.serving}%`} />
              </div>
              <span className="text-[10px] text-gray-400">{m.month}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> {isAr ? "الحضور" : "Attendance"}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-400" /> {isAr ? "المجموعة" : "Group"}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-mint-400" /> {isAr ? "الخدمة" : "Serving"}</span>
        </div>

        {/* Insights */}
        <div className="flex flex-wrap gap-2">
          {engagement.insights.map((ins) => (
            <span key={ins.dimension} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-full text-xs text-gray-600">
              {formatDimension(ins.dimension)} <span className={ins.trend === "up" ? "text-green-600" : ins.trend === "down" ? "text-red-500" : "text-gray-400"}><Ltr>{ins.label}</Ltr></span>
            </span>
          ))}
        </div>

        <div className="text-xs text-gray-500">
          {isAr ? "مستوى المشاركة الأخير: " : "Recent engagement: "}<span className="font-medium text-gray-700">{formatLevel(engagement.recentLevel)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
