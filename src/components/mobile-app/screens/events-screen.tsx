"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";
import { IconCalendar, IconLock } from "../icons";

/** Events are not part of the review edition; the tab stays visible but inactive. */
export function EventsScreen(_props: { refreshSignal?: number } = {}) {
  const { locale } = useTranslation();
  const ar = locale === "ar";
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <IconCalendar className="h-7 w-7" />
      </div>
      <h1 className="text-lg font-bold text-slate-900">{ar ? "الفعاليات" : "Events"}</h1>
      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
        <IconLock className="h-4 w-4" />
        {ar ? "غير متاح في نسخة المراجعة. هو جزء من المنتج الكامل." : "Not included in the review edition. It is part of the full product."}
      </p>
    </div>
  );
}
