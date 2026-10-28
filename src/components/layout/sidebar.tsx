"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { getSharedUnreadCount } from "@/lib/messages/shared-unread";

interface NavGroupConfig {
  key: string;
  items: NavItemConfig[];
  /**
   * The group's own hue, as literal Tailwind classes.
   *
   * Literal strings rather than a computed name, because Tailwind can only see
   * class names it finds written in the source. Deriving these at runtime would
   * produce classes the compiler never emitted, and every group's glow and
   * marker would silently fall back to nothing.
   */
  marker: string;
  aura: string;
}

interface NavItemConfig {
  key: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  accentColor: string;
}

const navGroupsConfig: NavGroupConfig[] = [
  {
    key: "nav.main",
    marker: "bg-blue-400 text-blue-400",
    aura: "bg-blue-400/25",
    items: [
      {
        key: "nav.dashboard",
        href: "/dashboard",
        accentColor: "text-blue-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        key: "nav.people",
        href: "/people",
        accentColor: "text-blue-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        key: "nav.families",
        href: "/families",
        accentColor: "text-emerald-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10.5L12 3l9 7.5M5 9.5V20a1 1 0 001 1h3.5v-5.5h5V21H18a1 1 0 001-1V9.5" />
          </svg>
        ),
      },
      {
        key: "nav.groups",
        href: "/groups",
        accentColor: "text-purple-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        badge: 5,
      },
      {
        key: "nav.events",
        href: "/events",
        accentColor: "text-gold-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        key: "nav.attendance",
        href: "/attendance",
        accentColor: "text-emerald-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    key: "nav.communityGroup",
    marker: "bg-cyan-400 text-cyan-400",
    aura: "bg-cyan-400/25",
    items: [
      {
        key: "nav.community",
        href: "/community",
        accentColor: "text-cyan-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a3 3 0 11-4 0 3 3 0 014 0zM7 10a3 3 0 11-4 0 3 3 0 014 0z" />
          </svg>
        ),
      },
      {
        key: "nav.talent",
        href: "/community/talent",
        accentColor: "text-gold-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.296-5.877a2.652 2.652 0 10-4.53-2.24l4.234 8.117M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 6h2.25l2.25 2.25L15 11.25" />
          </svg>
        ),
      },
      {
        key: "nav.ideas",
        href: "/community/ideas",
        accentColor: "text-purple-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17.25c.405.165.856.25 1.337.25 2.485 0 4.5-1.886 4.5-4.214 0-1.349-.75-2.554-1.9-3.213 1.25-2.5 4.4-3.453 4.4-3.453 0 1.5-1 3-1 3s-.4-.75-.75-1.5c-1.2 0-2.4.75-2.4 3.351 0 .953.3 1.749.75 2.4-.375.15-1.05.3-1.5.3M9.663 17.25c-.75 0-1.5-.3-2.25-.75-.75-.6-1.5-1.5-1.5-3.352 0-3.001 2.25-4.5 3.75-4.5.6 0 1.2.15 1.65.45.45-.3.9-.6 1.65-.6 1.2 0 2.25.6 2.85 1.5" />
          </svg>
        ),
      },
      {
        key: "nav.prayerWall",
        href: "/community/prayer-wall",
        accentColor: "text-orange-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
          </svg>
        ),
      },
      {
        key: "nav.announcements",
        href: "/community/announcements",
        accentColor: "text-amber-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
          </svg>
        ),
      },
      {
        key: "nav.messages",
        href: "/community/messages",
        accentColor: "text-sky-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.203C0 15.5.25 9.75 3.75 6.75 7.5 3.75 12 3.75 12 3.75s7.5 0 10.5 3c3.5 3 3.75 8.75 3.75 8.75z" />
          </svg>
        ),
      },
    ],
  },
  {
    key: "nav.ministryGroup",
    marker: "bg-purple-400 text-purple-400",
    aura: "bg-purple-400/25",
    items: [
      {
        key: "nav.ministries",
        href: "/ministries",
        accentColor: "text-purple-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        key: "nav.followUps",
        href: "/follow-ups",
        accentColor: "text-amber-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ),
        badge: 12,
      },
      {
        key: "nav.shepherding",
        href: "/shepherding",
        accentColor: "text-rose-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    key: "nav.analyticsGroup",
    marker: "bg-amber-400 text-amber-400",
    aura: "bg-amber-400/25",
    items: [
      {
        key: "nav.reports",
        href: "/reports",
        accentColor: "text-cyan-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        key: "nav.trends",
        href: "/trends",
        accentColor: "text-pink-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
      },
    ],
  },
];

/** Every page in the sidebar, for the page title and the command palette. */
export const NAV_PAGES: { key: string; href: string }[] = navGroupsConfig.flatMap((g) =>
  g.items.map((item) => ({ key: item.key, href: item.href })),
);

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed = false, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useTranslation();
  const [unreadMessages, setUnreadMessages] = React.useState<number>(0);

  React.useEffect(() => {
    let active = true;
    const fetchUnread = async (force = false) => {
      try {
        const count = await getSharedUnreadCount(force);
        if (active) setUnreadMessages(count);
      } catch {
        // Leave unread count as 0
      }
    };
    void fetchUnread();

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ unread?: number }>;
      if (typeof custom.detail?.unread === "number") {
        setUnreadMessages(custom.detail.unread);
      } else {
        void fetchUnread(true);
      }
    };

    window.addEventListener("cmp:unread-count-changed", handleUpdate);
    const interval = setInterval(() => void fetchUnread(false), 45000);

    return () => {
      active = false;
      window.removeEventListener("cmp:unread-count-changed", handleUpdate);
      clearInterval(interval);
    };
  }, []);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-navy-950 text-white transition-all duration-300 select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">✝</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-white tracking-wide text-sm">
              {t("common.appName")}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navGroupsConfig.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className={cn(
              "group/card relative overflow-hidden border border-white/[0.08]",
              "bg-gradient-to-b from-white/[0.07] to-white/[0.015]",
              // Lifts the top edge so the panel reads as a raised surface rather
              // than a flat tinted block against the navy.
              "shadow-[0_1px_0_0_rgba(255,255,255,0.07)_inset,0_10px_30px_-18px_rgba(0,0,0,0.9)]",
              "transition-all duration-300 hover:border-white/[0.14] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.09)_inset,0_14px_34px_-16px_rgba(0,0,0,0.95)]",
              // Collapsed the aside is only 64px wide, so the card has to give
              // back its margin, padding and corner radius or the icon has no
              // room left inside it.
              collapsed ? "mx-1.5 rounded-xl" : "mx-2 mb-3 rounded-2xl"
            )}
          >
            {/*
              The group's colour, as a soft light behind the header. Kept as a
              separate blurred layer rather than a coloured border so there is no
              fight between two utilities both wanting to set border-colour, and
              so the tint can bleed across the rounded corner without leaking.
            */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute -top-6 left-1/2 h-20 w-36 -translate-x-1/2 rounded-full blur-2xl",
                group.aura
              )}
            />

            <div className="relative">
              {!collapsed && (
                <div className="flex items-center gap-2 px-3.5 pt-3 pb-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      group.marker,
                      "shadow-[0_0_8px_1px_currentColor]"
                    )}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                    {t(group.key)}
                  </span>
                </div>
              )}
              <ul className={cn("space-y-0.5", collapsed ? "p-1" : "px-1.5 pb-2")}>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium",
                          "transition-all duration-200",
                          collapsed ? "justify-center px-0" : "px-3",
                          isActive
                            ? "bg-gradient-to-r from-white/15 to-white/[0.04] text-white font-semibold shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset]"
                            : "text-gray-300 hover:bg-white/[0.06] hover:text-white"
                        )}
                      >
                        {/*
                          Active marker in the item's own colour. `bg-current`
                          takes the colour from the element's own `text-*` class,
                          so this reuses item.accentColor instead of needing a
                          second colour per item.
                        */}
                        {isActive && (
                          <span
                            aria-hidden
                            className={cn(
                              "absolute left-0 rtl:right-0 rtl:left-auto top-1.5 bottom-1.5 w-[3px] rounded-full bg-current",
                              item.accentColor
                            )}
                          />
                        )}
                        {/*
                          The icon keeps its section colour in every state. It
                          used to fall back to grey unless the section was active,
                          which made the sidebar read as one undifferentiated list
                          and cost the eye the only at-a-glance cue for what kind
                          of section it was. Hovering brightens the same hue
                          rather than swapping it, so the colour identity is
                          stable and a hover cannot repaint an icon into a
                          different section's colour.
                        */}
                        <span
                          className={cn(
                            "shrink-0 transition-all duration-200 relative",
                            item.accentColor,
                            "group-hover:brightness-125 group-hover:drop-shadow-[0_0_6px_currentColor]",
                            !isActive && "opacity-80 group-hover:opacity-100"
                          )}
                        >
                          {item.icon}
                          {item.href === "/community/messages" && unreadMessages > 0 && (
                            <span
                              className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-navy-950 animate-pulse"
                              title={`${unreadMessages} ${t("messaging.newMessages", "new messages")}`}
                            >
                              {unreadMessages > 99 ? "99+" : unreadMessages}
                            </span>
                          )}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{t(item.key)}</span>
                            {item.href === "/community/messages" && unreadMessages > 0 ? (
                              <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full shadow-xs">
                                {unreadMessages > 99 ? "99+" : unreadMessages}
                              </span>
                            ) : item.badge ? (
                              <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                                {item.badge}
                              </span>
                            ) : null}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: Language Switcher & Settings */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {/* Language quick switcher */}
        {!collapsed ? (
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-300">
            <span className="text-gray-400 flex items-center gap-1.5">
              <span>🌐</span>
              <span>{t("topNav.language")}</span>
            </span>
            <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded">
              <button
                type="button"
                onClick={() => setLocale("ar")}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer",
                  locale === "ar" ? "bg-blue-600 text-white shadow-xs" : "text-gray-400 hover:text-white"
                )}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer",
                  locale === "en" ? "bg-blue-600 text-white shadow-xs" : "text-gray-400 hover:text-white"
                )}
              >
                EN
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="w-full flex items-center justify-center py-2 text-xs font-bold text-gray-300 hover:text-white bg-white/5 rounded-lg cursor-pointer"
            title={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          >
            {locale === "ar" ? "EN" : "عربي"}
          </button>
        )}

        {/* Settings link */}
        <Link
          href="/settings"
          onClick={onNavigate}
          className="group flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-all duration-200"
        >
          {/* Same treatment as the configured sections: a static section colour
              that brightens on hover. This one is hand-rolled rather than driven
              by navGroupsConfig, so it needed changing separately. */}
          <svg
            className="w-5 h-5 text-slate-400 shrink-0 transition-all duration-200 opacity-80 group-hover:opacity-100 group-hover:brightness-125 group-hover:drop-shadow-[0_0_6px_currentColor]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {!collapsed && <span className="truncate">{t("nav.settings")}</span>}
        </Link>
      </div>
    </aside>
  );
}

