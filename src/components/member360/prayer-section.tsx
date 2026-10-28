"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Member360 } from "@/lib/mock-data/member360";
import { useLanguage, Ltr } from "@/lib/i18n";

interface PrayerSectionProps {
  data: Member360;
}

const prayerStatusColors: Record<string, "blue" | "purple" | "yellow" | "green"> = {
  new: "blue",
  "in-prayer": "purple",
  "follow-up-needed": "yellow",
  answered: "green",
};

export function PrayerSection({ data }: PrayerSectionProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";

  const formatPrayerStatus = (status: string) => {
    if (!isAr) return status.replace(/-/g, " ");
    const map: Record<string, string> = {
      new: "جديد",
      "in-prayer": "قيد الصلاة",
      "follow-up-needed": "تحتاج إلى متابعة",
      answered: "تمت الاستجابة",
    };
    return map[status] || status;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 rounded-lg">
              <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{isAr ? "طلبات الصلاة" : "Prayer Requests"}</h3>
          </div>
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
            {isAr ? "+ إضافة طلب صلاة" : "+ Add"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {data.prayers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{isAr ? "لا توجد طلبات صلاة نشطة حاليًا" : "No active prayer requests"}</p>
        ) : (
          <div className="space-y-2">
            {data.prayers.map((p) => (
              <div key={p.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{p.title}</span>
                  <Badge variant={prayerStatusColors[p.status]}>{formatPrayerStatus(p.status)}</Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>{isAr ? "تاريخ التقديم: " : "Submitted "}<Ltr>{p.dateSubmitted}</Ltr></span>
                  <span>{isAr ? "آخر صلاة: " : "Last prayer "}<Ltr>{p.lastPrayer}</Ltr></span>
                  <span>{p.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
