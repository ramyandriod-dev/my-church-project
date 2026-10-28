"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Member360 } from "@/lib/mock-data/member360";
import { useLanguage, Ltr, tMinistry, tRole } from "@/lib/i18n";

interface MinistrySectionProps {
  data: Member360;
}

export function MinistrySection({ data }: MinistrySectionProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";
  const { ministryGroups } = data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-50 rounded-lg">
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{isAr ? "الخدمة والمجموعات" : "Ministry & Groups"}</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{isAr ? "الخدمة" : "Ministry"}</span>
          <span className="font-medium text-gray-900">{tMinistry(ministryGroups.currentMinistry, locale)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{isAr ? "دور الخدمة" : "Role"}</span>
          <span className="text-gray-700">{tRole(ministryGroups.ministryRole, locale)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{isAr ? "معدل المشاركة في الخدمة" : "Serving"}</span>
          <span className="text-gray-700">{ministryGroups.servingFrequency}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{isAr ? "حالة الخدمة والتطوع" : "Status"}</span>
          <span className="text-gray-700">{ministryGroups.volunteerStatus}</span>
        </div>

        {ministryGroups.currentGroups.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">{isAr ? "المجموعات الحالية" : "Groups"}</p>
            <div className="space-y-1.5">
              {ministryGroups.currentGroups.map((g, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-700">{g.name}</span>
                  <span className="text-xs text-gray-500">{tRole(g.role, locale)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ministryGroups.participationHistory.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">{isAr ? "سجل الخدمة السابق" : "History"}</p>
            <div className="space-y-1">
              {ministryGroups.participationHistory.map((h, i) => (
                <div key={i} className="text-xs text-gray-600">
                  <span className="font-medium"><Ltr>{h.period}</Ltr></span> — {tRole(h.role, locale)} ({tMinistry(h.ministry, locale)})
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
