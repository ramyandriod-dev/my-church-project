"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Member360 } from "@/lib/mock-data/member360";
import { useLanguage, Ltr } from "@/lib/i18n";

interface ActivitySectionProps {
  data: Member360;
}

const typeColors: Record<string, string> = {
  attendance: "text-blue-600 bg-blue-50",
  prayer: "text-rose-600 bg-rose-50",
  "follow-up": "text-mint-600 bg-mint-50",
  group: "text-purple-600 bg-purple-50",
  ministry: "text-gold-600 bg-gold-50",
  event: "text-cyan-600 bg-cyan-50",
  joined: "text-green-600 bg-green-50",
};

export function ActivitySection({ data }: ActivitySectionProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";

  const translateTitle = (title: string) => {
    if (!isAr) return title;
    const map: Record<string, string> = {
      "Attended Service": "حضور اجتماع العبادة",
      "Joined Group": "انضمام لمجموعة",
      "Submitted Prayer Request": "تقديم طلب صلاة",
      "Follow-up Completed": "اكتمال متابعة رعوية",
      "Served in Ministry": "مشاركة في الخدمة",
      "Added Note": "إضافة ملاحظة",
    };
    return map[title] || title;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-50 rounded-lg">
            <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{isAr ? "أحدث الأنشطة الرعوية" : "Recent Activity"}</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.recentActivity.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${typeColors[a.type] || "text-gray-600 bg-gray-100"}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{translateTitle(a.title)}</span>
                </div>
                <p className="text-xs text-gray-500">{a.detail}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0"><Ltr>{a.date}</Ltr></span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
