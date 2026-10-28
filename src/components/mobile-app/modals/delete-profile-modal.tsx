"use client";

import React, { useState } from "react";
import { useLanguage, useTranslation } from "@/lib/i18n";
import {
  IconAlertTriangle,
  IconTrash2,
  IconX,
  IconCheckCircle2,
} from "../icons";
import { mobileApiFetch } from "@/lib/mobile-app/api-client";

interface DeleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}

export function DeleteProfileModal({ isOpen, onClose, onDeleted }: DeleteProfileModalProps) {
  const { locale, isRtl } = useLanguage();
  const isAr = locale === "ar";
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await mobileApiFetch("/api/members/me", {
        method: "DELETE",
        body: JSON.stringify({
          reason: reason.trim(),
        }),
      });

      setIsSuccess(true);
      setTimeout(async () => {
        await onDeleted();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (isAr
            ? "تعذر تقديم طلب حذف الحساب. يرجى المحاولة مرة أخرى."
            : "Failed to submit deletion request. Please try again.")
      );
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsSuccess(false);
    setErrorMessage(null);
    setReason("");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-rose-100 overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="relative p-5 bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 text-white">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute top-4 rtl:left-4 ltr:right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner">
              <IconAlertTriangle className="w-7 h-7 animate-pulse text-amber-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr ? "حذف الملف الشخصي والحساب" : "Delete Profile & Account"}
              </h2>
              <p className="text-xs text-rose-100 mt-0.5">
                {isAr
                  ? "إنهاء الحساب وإشعار الرعاة للمتابعة"
                  : "Terminate profile and alert church care"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <IconCheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? "تم إرسال طلب الحذف وتسجيل الخروج" : "Deletion Requested & Signed Out"}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                {isAr
                  ? "تم تسجيل طلبك وإشعار إدارة الكنيسة. ستظل أبواب الكنيسة وصلواتها مفتوحة لك دائماً."
                  : "Your deletion request has been registered and church leadership notified. Our prayers and doors remain open."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleDelete} className="space-y-4">
              {/* Alarming Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <IconAlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{isAr ? "تنبيه هام ومحبة رعوية:" : "Important Pastoral Notice:"}</span>
                </div>
                <p>
                  {isAr
                    ? "عند تأكيد طلب الحذف، سيتم إنهاء جلستك فوراً وإرسال إشعار لإدارة الكنيسة للمتابعة الرعوية والاطمئنان عليك."
                    : "When you confirm deletion, your session will end immediately, and church leadership will receive an alert to check in and provide pastoral care."}
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Optional Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isAr
                    ? "سبب طلب الحذف (اختياري - لمساعدتنا على تحسين الخدمة):"
                    : "Reason for deletion (optional - helps us improve):"}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    isAr
                      ? "هل واجهتك صعوبة في التطبيق، أو انتقال لمكان آخر، أو سبب آخر؟..."
                      : "Did you encounter an issue, relocate, or another reason?..."
                  }
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-xs text-slate-800 placeholder:text-slate-400 resize-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                >
                  <IconTrash2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? isAr
                        ? "جاري إرسال الطلب..."
                        : "Submitting request..."
                      : isAr
                      ? "تأكيد طلب حذف الحساب"
                      : "Confirm Account Deletion"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isAr ? "إلغاء والاحتفاظ بالحساب" : "Cancel & Keep Account"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
