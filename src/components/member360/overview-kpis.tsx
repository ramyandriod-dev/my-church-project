"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Member360 } from "@/lib/mock-data/member360";
import { useLanguage, Ltr } from "@/lib/i18n";

interface OverviewKpisProps {
  data: Member360;
}

export function OverviewKpis({ data }: OverviewKpisProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";

  const kpis = [
    { key: "attendanceRate" as const, label: isAr ? "الحضور" : "Attendance", suffix: "%", color: "text-blue-600", bg: "bg-blue-50" },
    { key: "activeGroups" as const, label: isAr ? "المجموعات" : "Groups", suffix: isAr ? " نشطة" : " active", color: "text-purple-600", bg: "bg-purple-50" },
    { key: "servingStatus" as const, label: isAr ? "الخدمة" : "Serving", suffix: "", color: "text-mint-600", bg: "bg-mint-50" },
    { key: "openFollowUps" as const, label: isAr ? "المتابعات" : "Follow-ups", suffix: isAr ? " مفتوحة" : " open", color: "text-gold-600", bg: "bg-gold-50" },
    { key: "activePrayerRequests" as const, label: isAr ? "طلبات الصلاة" : "Prayer Requests", suffix: isAr ? " نشطة" : " active", color: "text-rose-600", bg: "bg-rose-50" },
    { key: "engagementLevel" as const, label: isAr ? "المشاركة" : "Engagement", suffix: "", color: "text-gray-900", bg: "bg-gray-50" },
  ];

  const formatValue = (key: string, val: any) => {
    if (typeof val === "number") {
      const suffix = kpis.find(k => k.key === key)?.suffix || "";
      return isAr ? `${val}${suffix}` : `${val}${suffix}`;
    }
    if (key === "servingStatus") {
      if (val === "Active" || val === "Active Servant") return isAr ? "خادم نشط" : val;
      if (val === "Inactive") return isAr ? "غير نشط بالخدمة" : val;
      return val;
    }
    if (key === "engagementLevel") {
      if (val === "High") return isAr ? "مشاركة مرتفعة" : "High";
      if (val === "Moderate") return isAr ? "مشاركة متوسطة" : "Moderate";
      if (val === "Low") return isAr ? "مشاركة منخفضة" : "Low";
      return val;
    }
    return String(val);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.key}>
          <CardContent className="p-4 text-center">
            <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <span className={`text-lg font-bold ${kpi.color}`}>
                {typeof data[kpi.key] === "number" ? <Ltr>{data[kpi.key]}</Ltr> : ""}
              </span>
            </div>
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className={`text-sm font-semibold ${kpi.color}`}>
              {formatValue(kpi.key, data[kpi.key])}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
