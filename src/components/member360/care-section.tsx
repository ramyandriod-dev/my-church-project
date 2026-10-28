"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Member360 } from "@/lib/mock-data/member360";
import { members } from "@/lib/mock-data/people";
import { useLanguage, Ltr } from "@/lib/i18n";

interface CareSectionProps {
  data: Member360;
  memberName?: string;
}

const careStatusColors: Record<string, "green" | "yellow" | "red"> = {
  healthy: "green",
  "needs-attention": "yellow",
  "follow-up-required": "red",
};

export function CareSection({ data, memberName: propMemberName }: CareSectionProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";
  const { shepherding } = data;

  const member = members.find((m) => m.id === data.id);
  const memberName = propMemberName || (member ? `${member.firstName} ${member.lastName}` : (data.id === "mw" ? "Michael Williams" : "Member"));
  const isMichael = data.id === "mw" || (data.id === "1" && memberName.toLowerCase().includes("michael"));

  const formatCareStatus = (status: string) => {
    if (!isAr) return status.replace(/-/g, " ");
    const map: Record<string, string> = {
      healthy: "جيدة ومستقرة",
      "needs-attention": "تحتاج إلى اهتمام",
      "follow-up-required": "تحتاج إلى متابعة",
    };
    return map[status] || status;
  };

  return (
    <Card className="border border-gray-200/90 shadow-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-mint-50 text-mint-700 rounded-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{isAr ? "الرعاية والمتابعة الرعوية" : "Follow-up & Pastoral Care"}</h3>
              <p className="text-[11px] text-gray-500">{isAr ? "إدارة التكليفات والتواصل الفعلي" : "Assigned actions & recorded contact history"}</p>
            </div>
          </div>

          <Link
            href={`/follow-ups?create=true&memberId=${data.id}&memberName=${encodeURIComponent(memberName)}`}
            className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
          >
            + {isAr ? "تسجيل متابعة" : "Create Follow-up"}
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* M8.7 Operational Care Snapshot */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-200/60">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
              {isAr ? "المتابعات المفتوحة" : "Open Follow-ups"}
            </span>
            <span className="text-lg font-extrabold text-blue-600 block">
              <Ltr>{isMichael ? 1 : shepherding.openFollowUps || 0}</Ltr>
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
              {isAr ? "آخر تواصل" : "Last Contact"}
            </span>
            <span className="text-xs font-bold text-gray-800 block mt-1">
              <Ltr>{isMichael ? "Sep 20, 2026 (3 days ago)" : shepherding.lastPastoralContact}</Ltr>
            </span>
          </div>
        </div>

        {/* Active Care Action Card (e.g. for Michael Williams) */}
        <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                {isAr ? "متابعة جارية حاليًا" : "Active Follow-up"}
              </span>
              <p className="text-xs font-bold text-gray-900 mt-0.5">
                {isMichael ? "Missed Friday Meeting" : (isAr ? "متابعة الغياب والافتقاد" : "Check-in & Attendance Care")}
              </p>
            </div>
            <Badge variant="yellow">
              {isAr ? "قيد المتابعة" : "In Progress"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-amber-200/50">
            <div>
              <span className="text-gray-400 text-[10px] block">{isAr ? "المسؤول:" : "Assigned:"}</span>
              <span className="font-semibold text-gray-800">{isMichael ? "Peter George" : shepherding.assignedShepherd}</span>
            </div>
            <div>
              <span className="text-gray-400 text-[10px] block">{isAr ? "الاستحقاق:" : "Due:"}</span>
              <span className="font-semibold text-gray-800"><Ltr>Sep 23, 2026</Ltr></span>
            </div>
          </div>
        </div>

        {/* General Care Attributes */}
        <div className="space-y-2 text-xs pt-1 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">{isAr ? "مسؤول الرعاية (الخادم)" : "Assigned Shepherd"}</span>
            <span className="font-semibold text-gray-800">{shepherding.assignedShepherd}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">{isAr ? "حالة الاستقرار الروحي" : "Spiritual Status"}</span>
            <Badge variant={careStatusColors[shepherding.careStatus]}>
              {formatCareStatus(shepherding.careStatus)}
            </Badge>
          </div>
        </div>

        {/* Deep Link to all follow-ups */}
        <div className="pt-2">
          <Link
            href={`/follow-ups?search=${encodeURIComponent(memberName)}`}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <span>{isAr ? "عرض كل المتابعات المرتبطة" : "View All Follow-ups for Member"}</span>
            <span>{isAr ? "←" : "→"}</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
