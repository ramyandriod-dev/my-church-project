"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Member360, AttendanceRecord } from "@/lib/mock-data/member360";
import { useLanguage, Ltr } from "@/lib/i18n";

interface AttendanceSectionProps {
  data: Member360;
}

export function AttendanceSection({ data }: AttendanceSectionProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";

  const [records, setRecords] = React.useState<AttendanceRecord[]>(data.attendance.records);
  const [isAbsentModalOpen, setIsAbsentModalOpen] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState(isAr ? "اجتماع العبادة الصباحي الأحد" : "Sunday Morning Worship");
  const [absenceReason, setAbsenceReason] = React.useState(isAr ? "وعكة صحية / فترة نقاهة" : "Sick / Medical Recovery");
  const [customNote, setCustomNote] = React.useState("");

  const handleLogMobileAbsence = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: AttendanceRecord = {
      date: isAr ? "21 سبتمبر (القادم)" : "Sep 21 (Upcoming)",
      service: selectedService,
      present: false,
      absenteeismReason: absenceReason + (customNote ? ` (${customNote})` : ""),
      reportedVia: "Mobile App",
      reportedDate: isAr ? "منذ قليل" : "Just now",
    };
    setRecords([newRecord, ...records]);
    setIsAbsentModalOpen(false);
    setCustomNote("");
  };

  const getReasonBadge = (reason?: string) => {
    if (!reason) return null;
    let icon = "📋";
    let colorClasses = "bg-amber-50 text-amber-800 border-amber-200";

    const r = reason.toLowerCase();
    if (r.includes("sick") || r.includes("medical") || r.includes("صحية") || r.includes("مرض")) {
      icon = "🤒";
      colorClasses = "bg-rose-50 text-rose-800 border-rose-200";
    } else if (r.includes("travel") || r.includes("vacation") || r.includes("سفر") || r.includes("إجازة")) {
      icon = "✈️";
      colorClasses = "bg-sky-50 text-sky-800 border-sky-200";
    } else if (r.includes("family") || r.includes("عائلي") || r.includes("أسرة")) {
      icon = "👨‍👩‍👧";
      colorClasses = "bg-purple-50 text-purple-800 border-purple-200";
    } else if (r.includes("work") || r.includes("عمل")) {
      icon = "💼";
      colorClasses = "bg-indigo-50 text-indigo-800 border-indigo-200";
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${colorClasses}`}>
        <span>{icon}</span>
        <span>{reason}</span>
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{isAr ? "الحضور والغياب والاعتذارات" : "Attendance & Absenteeism"}</h3>
              <p className="text-xs text-gray-400">{isAr ? "متابعة تسجيل الحضور في الاجتماعات واعتذارات الغياب المسجلة عبر تطبيق الموبايل" : "Tracks service check-ins and member mobile absence notes"}</p>
            </div>
          </div>
          <button
            onClick={() => setIsAbsentModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <span>{isAr ? "📱 تسجيل اعتذار عن الحضور" : "📱 Log Mobile Absence"}</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
            <p className="text-2xl font-bold text-blue-600"><Ltr>{data.attendance.percentage}%</Ltr></p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{isAr ? "نسبة الحضور" : "Attendance Rate"}</p>
          </div>
          <div className="text-center p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
            <p className="text-2xl font-bold text-emerald-600"><Ltr>{data.attendance.servicesAttended}</Ltr></p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{isAr ? "الاجتماعات المحضورة" : "Services Attended"}</p>
          </div>
          <div className="text-center p-3 bg-rose-50/50 border border-rose-100 rounded-xl">
            <p className="text-2xl font-bold text-rose-500"><Ltr>{data.attendance.servicesMissed}</Ltr></p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{isAr ? "الاجتماعات الفائتة" : "Missed Services"}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <p className="text-sm font-bold text-gray-900 pt-1"><Ltr>{data.attendance.lastAttendance}</Ltr></p>
            <p className="text-xs font-medium text-gray-500 mt-1">{isAr ? "آخر تسجيل حضور" : "Last Checked In"}</p>
          </div>
        </div>

        {/* Trend chart */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">{isAr ? "اتجاه الحضور خلال 6 أشهر" : "6-Month Attendance Trend"}</p>
            <span className="text-xs text-gray-400">{isAr ? "المستهدف: 90%+ لمرتبة العضو الملتزم" : "Target: 90%+ for Gold Status"}</span>
          </div>
          <div className="flex items-end gap-2 h-24 pt-2 px-2 bg-gray-50/60 rounded-xl border border-gray-100">
            {data.attendance.trend.map((t) => {
              const h = Math.max(8, (t.rate / 100) * 80);
              const isGold = t.rate >= 90;
              return (
                <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-bold ${isGold ? "text-amber-600" : "text-gray-500"}`}>
                    <Ltr>{t.rate}%</Ltr>
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isGold
                        ? "bg-gradient-to-t from-amber-500 to-yellow-400"
                        : "bg-blue-500"
                    }`}
                    style={{ height: `${h}px` }}
                  />
                  <span className="text-[10px] text-gray-500 font-medium">{t.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent records with Absenteeism Reasons */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-gray-700">{isAr ? "أحدث الاجتماعات وسجل الحضور والغياب" : "Recent Services & Absence History"}</p>
            <span className="text-xs text-gray-400">{isAr ? "تكامل مع تطبيق الموبايل" : "Mobile app input integration"}</span>
          </div>

          <div className="space-y-2">
            {records.map((r, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border transition-colors ${
                  r.present
                    ? "bg-white border-gray-100 hover:border-gray-200"
                    : "bg-rose-50/20 border-rose-100/70"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${r.present ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <span className="text-sm font-semibold text-gray-800"><Ltr>{r.date}</Ltr></span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-600">{r.service}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {r.present ? (
                      <span className="px-2 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md">
                        {isAr ? "✓ حاضر" : "✓ Present"}
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                          {isAr ? "✕ غائب" : "✕ Absent"}
                        </span>
                        {r.absenteeismReason && getReasonBadge(r.absenteeismReason)}
                        {r.reportedVia && (
                          <span className="text-[10px] text-gray-400 font-medium px-1.5 py-0.5 bg-gray-100 rounded">
                            {isAr
                              ? `عبر ${r.reportedVia === "Mobile App" ? "تطبيق الموبايل" : r.reportedVia === "Pastoral Contact" ? "الافتقاد" : "تسجيل ذاتي"}`
                              : `via ${r.reportedVia}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Log Mobile Absence Modal */}
      {isAbsentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <h3 className="text-base font-bold text-gray-900">{isAr ? "تسجيل اعتذار مسبق عن الحضور" : "Member Mobile Absence Input"}</h3>
              </div>
              <button
                onClick={() => setIsAbsentModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogMobileAbsence} className="mt-4 space-y-4">
              <p className="text-xs text-gray-500">
                {isAr ? "محاكاة إبلاغ العضو المسبق لإدارة الكنيسة عن تعذر الحضور لاجتماع قادم عبر تطبيق الموبايل." : "Simulates when a church member notifies leadership in advance via the mobile app of an absence."}
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{isAr ? "الاجتماع القادم" : "Upcoming Service"}</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value={isAr ? "اجتماع العبادة الصباحي الأحد (10:00 ص)" : "Sunday Morning Worship"}>{isAr ? "اجتماع العبادة الصباحي الأحد (10:00 ص)" : "Sunday Morning Worship (10:00 AM)"}</option>
                  <option value={isAr ? "اجتماع العشية / المساء الأحد (6:00 م)" : "Sunday Evening Service"}>{isAr ? "اجتماع العشية / المساء الأحد (6:00 م)" : "Sunday Evening Service (6:00 PM)"}</option>
                  <option value={isAr ? "اجتماع دراسة الكتاب المقدس والصلاة الأربعاء" : "Wednesday Prayer & Bible Study"}>{isAr ? "اجتماع دراسة الكتاب المقدس والصلاة الأربعاء" : "Wednesday Prayer & Bible Study"}</option>
                  <option value={isAr ? "اجتماع الشباب الأسبوعي الجمعة" : "Youth Fellowship Service"}>{isAr ? "اجتماع الشباب الأسبوعي الجمعة" : "Youth Fellowship Service"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{isAr ? "سبب الاعتذار" : "Reason for Absence"}</label>
                <select
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value={isAr ? "وعكة صحية / فترة نقاهة" : "Sick / Medical Recovery"}>{isAr ? "🤒 وعكة صحية / فترة نقاهة" : "🤒 Sick / Medical Recovery"}</option>
                  <option value={isAr ? "سفر / إجازة" : "On Travel / Vacation"}>{isAr ? "✈️ سفر خارج المدينة / إجازة" : "✈️ On Travel / Vacation"}</option>
                  <option value={isAr ? "ظرف عائلي طارئ" : "Family Emergency"}>{isAr ? "👨‍👩‍👧 ظرف عائلي طارئ" : "👨‍👩‍👧 Family Emergency"}</option>
                  <option value={isAr ? "ارتباط عمل طارئ" : "Work Obligation"}>{isAr ? "💼 ارتباط عمل طارئ" : "💼 Work Obligation"}</option>
                  <option value={isAr ? "حالة عزاء" : "Bereavement / Funeral"}>{isAr ? "🕊️ حالة عزاء" : "🕊️ Bereavement"}</option>
                  <option value={isAr ? "ظرف شخصي آخر" : "Other Personal Reason"}>{isAr ? "📋 ظرف شخصي آخر" : "📋 Other Personal Reason"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{isAr ? "ملاحظة إضافية (اختياري)" : "Additional Note (Optional)"}</label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder={isAr ? "مثال: مسافر وسأعود الثلاثاء القادم بإذن الله" : "e.g. Traveling until next Tuesday"}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAbsentModalOpen(false)}
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {isAr ? "إرسال إشعار الاعتذار" : "Submit Absence Notice"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
