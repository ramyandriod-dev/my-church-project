"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Member360 } from "@/lib/mock-data/member360";
import { useLanguage, Ltr } from "@/lib/i18n";

interface TimelineSectionProps {
  data: Member360;
}

const typeIcons: Record<string, { color: string; path: string }> = {
  attendance: { color: "text-blue-600 bg-blue-50", path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  prayer: { color: "text-rose-600 bg-rose-50", path: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  "follow-up": { color: "text-mint-600 bg-mint-50", path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  group: { color: "text-purple-600 bg-purple-50", path: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  ministry: { color: "text-gold-600 bg-gold-50", path: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  event: { color: "text-cyan-600 bg-cyan-50", path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  note: { color: "text-gray-600 bg-gray-100", path: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  joined: { color: "text-green-600 bg-green-50", path: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
};

export function TimelineSection({ data }: TimelineSectionProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";

  const translateTitle = (title: string) => {
    if (!isAr) return title;
    const map: Record<string, string> = {
      "Attended Service": "حضر الاجتماع",
      "Joined Group": "انضم إلى مجموعة",
      "Submitted Prayer Request": "قدّم طلب صلاة",
      "Follow-up Completed": "اكتملت المتابعة الرعوية",
      "Served in Ministry": "شارك في الخدمة",
      "Added Note": "أُضيفت ملاحظة",
      "Joined Church": "انضم إلى أسرة الكنيسة",
      "Awarded Recognition Gift": "نال هدية تكريم وتقدير",
      "Volunteered": "شارك كمتطوع في الخدمة",
    };
    return map[title] || title;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{isAr ? "الخط الزمني للعضو" : "Member Timeline"}</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Logical vertical line */}
          <div className="absolute start-4 top-0 bottom-0 w-px bg-gray-200" />

          <div className="space-y-4">
            {data.timeline.map((event) => {
              const icon = typeIcons[event.type] || typeIcons.note;
              return (
                <div key={event.id} className="flex gap-3 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${icon.color}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon.path} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{translateTitle(event.title)}</span>
                      <span className="text-xs text-gray-400"><Ltr>{event.date}</Ltr></span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{event.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
