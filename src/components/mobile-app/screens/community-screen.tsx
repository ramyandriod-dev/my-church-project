"use client";

/**
 * Community, review edition: the Prayer wall is the working section. Groups, Talent
 * and Ideas stay in the bar but are locked; their code is not part of this edition.
 */

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { IconLock } from "../icons";
import { PrayerWallTab } from "./prayer-wall-tab";

interface CommunityScreenProps {
  /** Called with the feature key when a locked section is tapped. */
  onOpenIdeaModal?: () => void;
  onLockedTap?: (feature: string) => void;
  refreshSignal?: number;
}

export function CommunityScreen({ onLockedTap, refreshSignal = 0 }: CommunityScreenProps) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";
  const [active] = useState<"prayer">("prayer");

  const locked = [
    { key: "groups", en: "Groups", ar: "المجموعات" },
    { key: "talent", en: "Talent", ar: "المواهب" },
    { key: "ideas", en: "Ideas", ar: "الأفكار" },
  ];

  return (
    <div className="space-y-4 pb-6">
      <div className="flex gap-2 overflow-x-auto">
        {locked.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onLockedTap?.(t.key === "ideas" ? "ideas" : "community")}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-[13px] font-semibold text-slate-400"
          >
            <IconLock className="h-3.5 w-3.5" />
            {isAr ? t.ar : t.en}
          </button>
        ))}
        <span className="shrink-0 rounded-full bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white">
          {isAr ? "حائط الصلاة" : "Prayer wall"}
        </span>
      </div>

      {active === "prayer" && <PrayerWallTab isAr={isAr} refreshSignal={refreshSignal} />}
    </div>
  );
}
