"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";
import { IconLock, IconX } from "../icons";

const FEATURES: Record<string, { en: string; ar: string }> = {
  checkin: { en: "Check-in", ar: "تسجيل الحضور" },
  seating: { en: "Find a seat", ar: "ابحث عن مقعد" },
  care: { en: "Request care", ar: "طلب رعاية" },
  ministry: { en: "My ministry", ar: "خدمتي" },
  notifications: { en: "Notifications", ar: "الإشعارات" },
  ideas: { en: "Ideas", ar: "الأفكار" },
  events: { en: "Events", ar: "الفعاليات" },
  community: { en: "This section", ar: "هذا القسم" },
};

/** Shown when a member taps something that is not part of the review edition. */
export function NotIncludedSheet({ feature, onClose }: { feature: string | null; onClose: () => void }) {
  const { locale, direction } = useTranslation();
  if (!feature) return null;
  const ar = locale === "ar";
  const name = FEATURES[feature] ?? FEATURES.community;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        dir={direction}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-6 text-center shadow-2xl"
      >
        <button onClick={onClose} aria-label={ar ? "إغلاق" : "Close"} className="absolute top-4 end-4 h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
          <IconX className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <IconLock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{ar ? name.ar : name.en}</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          {ar ? "هذه الميزة غير متاحة في نسخة المراجعة. هي جزء من المنتج الكامل." : "This is not included in the review edition. It is part of the full product."}
        </p>
        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-slate-900 py-3 font-semibold text-white">
          {ar ? "حسنًا" : "OK"}
        </button>
      </div>
    </div>
  );
}
