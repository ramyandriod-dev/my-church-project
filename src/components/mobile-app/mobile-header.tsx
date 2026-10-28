"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";
import { IconBell } from "./icons";
import { useMobileAuth } from "./mobile-auth-provider";

interface MobileHeaderProps {
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  unreadCount?: number;
  /** Float over the page (Home tab, where the photo hero sits behind it). */
  overlay?: boolean;
  /** See-through over the photo hero; false turns it back into the cream bar. */
  heroMode?: boolean;
}

/**
 * Sticky app header. Circular navy avatar, muted greeting line, clean
 * hairline icon buttons — matching the reference showcase chrome.
 */
export function MobileHeader({
  onOpenProfile,
  onOpenNotifications,
  unreadCount = 0,
  overlay = false,
  heroMode = false,
}: MobileHeaderProps) {
  const { mobileApp, locale, setLocale } = useTranslation();
  const { user, member, isLoading, isAuthenticated } = useMobileAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return mobileApp.greetingMorning;
    if (hour < 17) return mobileApp.greetingAfternoon;
    return mobileApp.greetingEvening;
  };

  const toggleLanguage = () => {
    setLocale(locale === "ar" ? "en" : "ar");
  };

  const displayName = member
    ? `${member.firstName} ${member.lastName}`.trim()
    : user?.name || user?.email || (locale === "ar" ? "ضيف الكنيسة" : "Guest Member");

  const churchName =
    locale === "ar" ? "كنيسة مصر الجديدة الإنجيلية" : "Heliopolis Evangelical Church";

  const getInitials = (name: string) => {
    if (!name) return locale === "ar" ? "كن" : "CH";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const memberInitials = getInitials(displayName);

  const firstName = member?.firstName || displayName.split(" ")[0] || displayName;

  return (
    <header
      className={`${overlay ? "absolute inset-x-0 top-0" : "sticky top-0"} z-40 transition-[background-color,box-shadow] duration-300 ${
        heroMode
          ? "bg-transparent"
          : `bg-[#FBF8F3]/95 backdrop-blur-md ${overlay ? "shadow-[0_1px_0_rgba(19,47,76,0.06),0_4px_14px_-8px_rgba(19,47,76,0.18)]" : ""}`
      }`}
    >
      {/* env(safe-area-inset-top) keeps the buttons clear of the iPhone notch; it is 0 on Android, so the old 1.25rem applies. */}
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between gap-3">
        {/* Avatar + one calm greeting line */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenProfile}
            className="relative shrink-0 group focus:outline-none focus:ring-2 focus:ring-[#B08D57] rounded-full"
            aria-label={mobileApp.tabProfile}
          >
            {isLoading ? (
              <div className="w-11 h-11 rounded-full bg-[#EAE3D6] animate-pulse" />
            ) : member?.avatarUrl || user?.avatarUrl ? (
              <img
                src={member?.avatarUrl || user?.avatarUrl || ""}
                alt={displayName}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#132F4C] text-[#F3E7CF] font-serif font-semibold text-sm flex items-center justify-center ring-2 ring-white group-hover:scale-105 transition-transform">
                {memberInitials}
              </div>
            )}

            {isAuthenticated && (
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22C55E] ring-2 ${heroMode ? "ring-[#0B1F3A]" : "ring-[#FBF8F3]"}`} />
            )}
          </button>

          {/* In hero mode the photo hero shows the greeting large, so this hides. */}
          <div
            className={`min-w-0 text-left rtl:text-right transition-opacity duration-300 ${heroMode ? "opacity-0" : "opacity-100"}`}
            aria-hidden={heroMode || undefined}
          >
            <p className="text-[11px] font-medium tracking-wide text-[#8A7A5C] truncate">
              {getGreeting()}
            </p>
            <h1 className="text-[17px] font-serif font-semibold text-[#132F4C] leading-tight truncate">
              {isLoading ? (
                <span className="w-28 h-4 bg-[#EAE3D6] rounded animate-pulse inline-block mt-1" />
              ) : (
                firstName
              )}
            </h1>
          </div>
        </div>

        {/* Actions: quieter icon + compact language pill */}
        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                heroMode
                  ? "bg-white/15 text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm"
                  : "bg-white text-[#4A5568] shadow-[0_1px_2px_rgba(19,47,76,0.06)] hover:shadow-[0_2px_6px_rgba(19,47,76,0.10)]"
              }`}
              aria-label={mobileApp.notifications}
            >
              <IconBell className="w-4 h-4" />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#B08D57] text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>
          )}

          <button
            type="button"
            onClick={toggleLanguage}
            className={`px-2.5 h-8 rounded-full font-semibold text-[11px] transition-all active:scale-95 ${
              heroMode
                ? "bg-white/15 text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm"
                : "bg-white text-[#4A5568] shadow-[0_1px_2px_rgba(19,47,76,0.06)] hover:shadow-[0_2px_6px_rgba(19,47,76,0.10)]"
            }`}
            aria-label="Toggle Language"
          >
            <span>{mobileApp.languageToggle}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
