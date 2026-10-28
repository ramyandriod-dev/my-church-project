"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Member360 } from "@/lib/mock-data/member360";
import { useLanguage, Ltr, tMinistry, tStatus } from "@/lib/i18n";

const statusColors: Record<string, "green" | "gray" | "blue" | "red"> = {
  active: "green",
  inactive: "gray",
  visitor: "blue",
  deletion_requested: "red",
};

interface MemberHeaderProps {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
    ministry: string;
    group: string;
    lastAttendance: string;
    joinedDate: string;
    avatar: string;
    isCommitted?: boolean;
    committedReason?: string;
  };
  data: Member360;
  onSelectRewardTab?: () => void;
  onMemberStatusChange?: (newStatus: string) => void;
  onMemberDeleted?: () => void;
}

export function MemberHeader({
  member,
  data,
  onSelectRewardTab,
  onMemberStatusChange,
  onMemberDeleted,
}: MemberHeaderProps) {
  const { locale, isRtl } = useLanguage();
  const isAr = locale === "ar";
  const isDeletionRequested = member.status === "deletion_requested";
  const isNeg = member.status === "inactive" || member.status === "visitor" || isDeletionRequested;
  const isCommitted = Boolean(
    member.isCommitted ?? (data.attendanceRate >= 90 && member.status === "active")
  );

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isKeepModalOpen, setIsKeepModalOpen] = React.useState(false);
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] = React.useState(false);
  const [isCrmDeleteModalOpen, setIsCrmDeleteModalOpen] = React.useState(false);
  const [pastoralNote, setPastoralNote] = React.useState("");
  const [isResolving, setIsResolving] = React.useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Resolve Deletion: Keep for Follow-up or Delete Permanently
  const handleResolve = async (action: "delete_permanently" | "keep_for_followup") => {
    setIsResolving(true);
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(member.id)}/resolve-deletion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: pastoralNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to resolve member deletion");
      }

      if (action === "delete_permanently") {
        showToast(
          isAr
            ? `🗑️ تم حذف العضو "${member.firstName} ${member.lastName}" نهائياً من النظام.`
            : `🗑️ Member "${member.firstName} ${member.lastName}" was permanently deleted.`
        );
        setIsPermanentDeleteModalOpen(false);
        setIsCrmDeleteModalOpen(false);
        if (onMemberDeleted) {
          setTimeout(() => onMemberDeleted(), 1000);
        } else {
          setTimeout(() => {
            window.location.href = "/people";
          }, 1200);
        }
      } else {
        showToast(
          isAr
            ? `🛡️ تم الاحتفاظ بالعضو وتعيين حالته كـ "غير نشط" وجدولة المتابعة الرعوية بنجاح.`
            : `🛡️ Member kept for pastoral follow-up and marked as inactive.`
        );
        setIsKeepModalOpen(false);
        setIsCrmDeleteModalOpen(false);
        setPastoralNote("");
        if (onMemberStatusChange) {
          onMemberStatusChange("inactive");
        }
      }
    } catch (err: any) {
      console.error("Resolve deletion error:", err);
      showToast(err.message || (isAr ? "حدث خطأ أثناء تنفيذ الإجراء" : "Action failed"));
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-sm font-medium flex items-center justify-between shadow-sm animate-fade-in">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-blue-500 hover:text-blue-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── URGENT ALARMING BANNER: Mobile Deletion Request ───────── */}
      {isDeletionRequested && (
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-xl border-2 border-red-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-2xl animate-bounce">
                ⚠️
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black tracking-wide">
                    {isAr
                      ? "تنبيه عاجل: قام هذا العضو بطلب حذف حسابه من تطبيق الموبايل!"
                      : "URGENT ALERT: Member Requested Profile Deletion via Mobile App!"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white text-red-700 shadow-xs">
                    {isAr ? "مطلوب قرار رعوي" : "Pastoral Decision Needed"}
                  </span>
                </div>
                <p className="text-xs text-rose-100 mt-1.5 leading-relaxed max-w-2xl font-medium">
                  {isAr
                    ? "قام العضو بطلب حذف ملفه الشخصي وحسابه عبر تطبيق الموبايل وتم إنهاء جلسته فوراً. يُرجى التواصل والافتقاد الرعوي للوقوف على أسباب القرار، ثم اختيار الإجراء المناسب:"
                    : "The member submitted a self-service profile deletion request on the mobile app. Please reach out to provide pastoral care, then choose how to resolve this record below:"}
                </p>
              </div>
            </div>

            {/* Resolution Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setIsKeepModalOpen(true)}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs shadow-md border border-emerald-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02]"
              >
                <span>🛡️</span>
                <span>
                  {isAr
                    ? "الاحتفاظ للمتابعة الرعوية والافتقاد"
                    : "Keep for Follow-up & Care"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsPermanentDeleteModalOpen(true)}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-950 text-white font-bold text-xs shadow-md border border-red-500/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02]"
              >
                <span>🗑️</span>
                <span>
                  {isAr
                    ? "حذف نهائي من النظام"
                    : "Delete Permanently"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back nav & Quick Actions */}
      <div className="flex items-center justify-between">
        <a
          href="/people"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {isAr ? "دليل الأعضاء" : "People"}
        </a>

        <div className="flex items-center gap-2">
          {isCommitted && onSelectRewardTab && (
            <button
              onClick={onSelectRewardTab}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
            >
              <span>{isAr ? "🏆 عرض التكريمات والهدايا" : "🏆 View Rewards & Gifts"}</span>
            </button>
          )}

          {/* CRM Profile Delete Option */}
          <button
            type="button"
            onClick={() => setIsCrmDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
          >
            <span>🗑️</span>
            <span>{isAr ? "خيارات حذف العضو" : "Delete Member Options"}</span>
          </button>
        </div>
      </div>

      <Card
        className={`transition-all ${
          isDeletionRequested
            ? "border-red-400 ring-2 ring-red-400/50 shadow-lg shadow-red-50"
            : isCommitted
            ? "border-amber-200/80 shadow-md shadow-amber-50/50"
            : ""
        }`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar with Golden Badge */}
            <div className="relative shrink-0">
              <img
                src={member.avatar}
                alt={`${member.firstName} ${member.lastName}`}
                className={`w-20 h-20 rounded-2xl object-cover ring-4 shadow-lg ${
                  isDeletionRequested
                    ? "ring-red-400"
                    : isCommitted
                    ? "ring-amber-400"
                    : isNeg
                    ? "ring-red-200"
                    : "ring-blue-100"
                }`}
              />
              {isDeletionRequested ? (
                <div
                  className={`absolute -top-2 ${isRtl ? "-left-2" : "-right-2"} w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md border-2 border-white text-xs font-bold animate-pulse`}
                  title={isAr ? "طلب حذف معلق من الموبايل" : "Pending Mobile Deletion Request"}
                >
                  ⚠️
                </div>
              ) : isCommitted ? (
                <div
                  className={`absolute -top-2 ${isRtl ? "-left-2" : "-right-2"} w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-white flex items-center justify-center shadow-md border-2 border-white text-xs font-bold`}
                  title={
                    isAr
                      ? "عضو ملتزم ركيزة كنسية (حضور 90%+)"
                      : "Committed Gold Pillar Member (90%+ Attendance)"
                  }
                >
                  👑
                </div>
              ) : null}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {member.firstName} {member.lastName}
                </h1>

                {/* Golden Tag */}
                {isCommitted && !isDeletionRequested && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-amber-950 shadow-xs border border-amber-300">
                    <svg className="w-3.5 h-3.5 text-amber-900 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    ⭐ {isAr ? "عضو ملتزم" : "Committed Member"} (<Ltr>{data.attendanceRate}%</Ltr>{" "}
                    {isAr ? "حضور" : "Attendance"})
                  </span>
                )}

                <Badge variant={isDeletionRequested ? "red" : isNeg ? "red" : statusColors[member.status]}>
                  {isDeletionRequested
                    ? isAr
                      ? "⚠️ طلب حذف من الموبايل"
                      : "⚠️ Deletion Requested"
                    : tStatus(member.status, locale)}
                </Badge>
              </div>

              {isCommitted && !isDeletionRequested && (
                <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 flex items-center gap-2">
                  <span className="font-semibold">
                    {isAr ? "🏛️ عضو ملتزم وركيزة كنسية:" : "🏛️ Old Committed Member:"}
                  </span>
                  <span>
                    {member.committedReason ||
                      (isAr
                        ? `يواظب بثبات على نسبة حضور ${data.attendanceRate}% مع مشاركة فعالة في الخدمات.`
                        : `Consistently maintains ${data.attendanceRate}% attendance with high engagement across ministries.`)}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
                <span>{tMinistry(member.ministry, locale)}</span>
                <span>{member.group}</span>
                <span>
                  {isAr ? "تاريخ الانضمام" : "Joined"} <Ltr>{member.joinedDate}</Ltr>
                </span>
                <span>
                  {isAr ? "آخر حضور" : "Last visit"} <Ltr>{member.lastAttendance}</Ltr>
                </span>
                <span>
                  {isAr ? "مسؤول الرعاية" : "Shepherd"}: {data.shepherding.assignedShepherd}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() =>
                  showToast(
                    isAr
                      ? `تم فتح نموذج المراسلة للعضو ${member.firstName} ${member.lastName}`
                      : `Message dialog opened for ${member.firstName} ${member.lastName}`
                  )
                }
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {isAr ? "إرسال رسالة" : "Message"}
              </button>
              <button
                onClick={() =>
                  showToast(
                    isAr
                      ? `تم تسجيل متابعة جديدة للعضو ${member.firstName}`
                      : `Follow-up logged for ${member.firstName}`
                  )
                }
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                {isAr ? "إضافة متابعة" : "Add Follow-up"}
              </button>
              <button
                onClick={() =>
                  showToast(
                    isAr
                      ? `تمت إضافة طلب صلاة للعضو ${member.firstName}`
                      : `Prayer request added for ${member.firstName}`
                  )
                }
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {isAr ? "إضافة طلب صلاة" : "Add Prayer"}
              </button>
              <button
                onClick={() =>
                  showToast(
                    isAr
                      ? `تم تفعيل وضع التعديل للعضو ${member.firstName}`
                      : `Edit mode opened for ${member.firstName}`
                  )
                }
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                {isAr ? "تعديل بيانات العضو" : "Edit Member"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── MODAL 1: Keep for Follow-up / Investigation ─────────── */}
      {isKeepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🛡️</span>
                <h3 className="text-base font-bold">
                  {isAr
                    ? "الاحتفاظ بالعضو للمتابعة الرعوية والافتقاد"
                    : "Keep Member for Pastoral Follow-up & Care"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKeepModalOpen(false)}
                disabled={isResolving}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
                <p className="font-semibold mb-1">
                  {isAr ? "الإجراء الذي سيتم تنفيذه:" : "Action that will be taken:"}
                </p>
                <ul className="list-disc list-inside space-y-1 text-emerald-900">
                  <li>
                    {isAr
                      ? "تغيير حالة العضو إلى 'غير نشط' والاحتفاظ بكافة سجلاته وبياناته."
                      : "Change member status to 'Inactive' and preserve full records."}
                  </li>
                  <li>
                    {isAr
                      ? "إلغاء شارة الإنذار العاجل من الملف الشخصي."
                      : "Dismiss the urgent alarm banner from this profile."}
                  </li>
                  <li>
                    {isAr
                      ? "تسجيل مهمة افتقاد ورعاية عاجلة لفريق الرعاة للتواصل معه."
                      : "Create a priority pastoral care task for shepherding follow-up."}
                  </li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isAr ? "ملاحظات وتوجيهات الرعاة (اختياري):" : "Pastoral Notes & Instructions:"}
                </label>
                <textarea
                  value={pastoralNote}
                  onChange={(e) => setPastoralNote(e.target.value)}
                  placeholder={
                    isAr
                      ? "اكتب هنا خطة الافتقاد، أو سبب الاحتفاظ بالعضو، أو المكلف بالمتابعة..."
                      : "Enter shepherding plan, reason for retention, or assigned shepherd..."
                  }
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsKeepModalOpen(false)}
                  disabled={isResolving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve("keep_for_followup")}
                  disabled={isResolving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isResolving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>🛡️</span>
                  )}
                  <span>
                    {isAr
                      ? "تأكيد الاحتفاظ والمتابعة"
                      : "Confirm & Schedule Care"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Permanent Delete Confirmation ──────────────── */}
      {isPermanentDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-base font-bold">
                  {isAr ? "تأكيد الحذف النهائي للعضو" : "Confirm Permanent Deletion"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPermanentDeleteModalOpen(false)}
                disabled={isResolving}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 leading-relaxed">
                <p className="font-bold text-rose-900 mb-1">
                  {isAr ? "تحذير أمني شديد:" : "Irreversible Action Warning:"}
                </p>
                <p>
                  {isAr
                    ? `سيتم مسح العضو "${member.firstName} ${member.lastName}" وحسابه وأي سجلات حضور وصلوات بشكل نهائي من قاعدة البيانات. لن تتمكن من استرجاع هذا السجل بعد إتمام هذا الإجراء.`
                    : `Member "${member.firstName} ${member.lastName}", linked login, and all associated attendance/prayer records will be permanently purged from the database.`}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPermanentDeleteModalOpen(false)}
                  disabled={isResolving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {isAr ? "تراجع وإلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve("delete_permanently")}
                  disabled={isResolving}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isResolving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>🗑️</span>
                  )}
                  <span>
                    {isAr ? "نعم، حذف نهائي من النظام" : "Yes, Delete Permanently"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: CRM Direct Delete Choice Dialog ─────────────── */}
      {isCrmDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="p-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🗑️</span>
                <h3 className="text-base font-bold">
                  {isAr ? "إدارة وحذف ملف العضو" : "Manage & Delete Member Profile"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCrmDeleteModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? `يرجى تحديد الإجراء المطلوب للعضو "${member.firstName} ${member.lastName}":`
                  : `Please choose the desired deletion policy for "${member.firstName} ${member.lastName}":`}
              </p>

              <div className="space-y-3">
                {/* Option 1: Keep & Deactivate */}
                <div
                  onClick={() => {
                    setIsCrmDeleteModalOpen(false);
                    setIsKeepModalOpen(true);
                  }}
                  className="p-4 rounded-xl border-2 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer flex items-start gap-3.5 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                    🛡️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                      {isAr
                        ? "الاحتفاظ بالبيانات والتعطيل للمتابعة الرعوية (موصى به)"
                        : "Deactivate & Retain for Pastoral Follow-up (Recommended)"}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isAr
                        ? "يوقف إمكانية تسجيل الدخول ويحفظ السجلات لتمكين الرعاة من الافتقاد الدوري."
                        : "Suspends account logins while keeping history for pastoral care."}
                    </p>
                  </div>
                </div>

                {/* Option 2: Permanent Purge */}
                <div
                  onClick={() => {
                    setIsCrmDeleteModalOpen(false);
                    setIsPermanentDeleteModalOpen(true);
                  }}
                  className="p-4 rounded-xl border-2 border-rose-200 hover:border-rose-500 hover:bg-rose-50/50 transition-all cursor-pointer flex items-start gap-3.5 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold">
                    🗑️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-900">
                      {isAr ? "حذف نهائي لا رجعة فيه" : "Permanent Deletion (Purge)"}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isAr
                        ? "يمسح العضو وجميع بياناته وسجلاته نهائياً من قاعدة البيانات."
                        : "Permanently removes the member and all dependent records."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCrmDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {isAr ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
