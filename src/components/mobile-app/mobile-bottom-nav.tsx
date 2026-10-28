"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";
import { IconHome, IconUsers, IconCalendar, IconUser } from "./icons";

export type MobileTab = "home" | "community" | "events" | "profile";

interface MobileBottomNavProps {
  currentTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

interface TabConfig {
  id: MobileTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Four permanent tabs, Spiritual Editorial style: warm cream bar, navy for the
 * active tab with a small gold marker above the icon, soft stone-grey for the
 * rest. No coloured pills, no heavy borders.
 */
export function MobileBottomNav({ currentTab, onTabChange }: MobileBottomNavProps) {
  const { mobileApp } = useTranslation();

  const tabs: TabConfig[] = [
    { id: "home", label: mobileApp.tabHome, icon: IconHome },
    { id: "community", label: mobileApp.tabCommunity, icon: IconUsers },
    { id: "events", label: mobileApp.tabEvents, icon: IconCalendar },
    { id: "profile", label: mobileApp.tabProfile, icon: IconUser },
  ];

  return (
    <nav
      className="sticky bottom-0 z-40 bg-[#FBF8F3]/95 backdrop-blur-xl border-t border-[#EAE3D6] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-all"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-1 pt-2.5 pb-1.5 px-1 rounded-xl transition-all duration-200 active:scale-95 focus:outline-hidden"
              aria-current={isActive ? "page" : undefined}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0 h-[3px] rounded-full bg-[#B08D57] transition-all duration-300 ${
                  isActive ? "w-6 opacity-100" : "w-0 opacity-0"
                }`}
              />
              <Icon
                className={`w-[22px] h-[22px] transition-colors duration-200 ${
                  isActive ? "text-[#132F4C] stroke-[2]" : "text-[#A39A88] stroke-[1.6]"
                }`}
              />
              <span
                className={`text-[11px] tracking-tight transition-colors duration-200 ${
                  isActive ? "text-[#132F4C] font-semibold" : "text-[#A39A88] font-medium"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
