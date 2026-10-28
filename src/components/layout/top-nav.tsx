"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { useTranslation } from "@/lib/i18n";
import { getSharedUnreadCount } from "@/lib/messages/shared-unread";
import { useWorkspaceSummary } from "@/lib/workspace/use-workspace-summary";
import { CommandPalette } from "./command-palette";
import { NAV_PAGES } from "./sidebar";

interface TopNavProps {
  onMenuClick?: () => void;
  onSidebarToggle?: () => void;
  title?: string;
}

export function TopNav({ onMenuClick, onSidebarToggle, title }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { t, isRTL } = useTranslation();
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [currentUser, setCurrentUser] = React.useState<{ name: string; role: string; email: string } | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!active || !res.ok || !json?.data?.user) return;
        setCurrentUser(json.data.user);
      } catch {
        // Leave null
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const userInitials = React.useMemo(() => {
    if (!currentUser?.name) return "AD";
    const parts = currentUser.name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [currentUser]);

  /**
   * Unread message count for the bell.
   *
   * The endpoint is scoped by the caller's own permissions, so this number means
   * "messages waiting for you" rather than "messages you sent": staff are
   * waiting on member replies, a member is waiting on staff messages. It is
   * `null` until known, which is why the dot is hidden until then — previously
   * it was a permanent amber dot that meant nothing.
   *
   * Failures are swallowed: a badge is not worth breaking navigation over, and
   * an absent badge is better than a wrong one.
   */
  React.useEffect(() => {
    let active = true;
    const fetchUnread = async (force = false) => {
      try {
        const count = await getSharedUnreadCount(force);
        if (active) setUnreadMessages(count);
      } catch {
        // Leave the badge hidden.
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

  // Ctrl+K / Cmd+K anywhere, or "/" when not typing, opens the search palette.
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "/" && !e.ctrlKey && !e.metaKey && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { summary } = useWorkspaceSummary();
  const waiting = summary?.waiting;
  const notifications = [
    unreadMessages > 0 && {
      key: "messages",
      href: "/community/messages",
      title: isRTL ? `${unreadMessages} رسائل جديدة` : `${unreadMessages} new ${unreadMessages === 1 ? "message" : "messages"}`,
      detail: isRTL ? "ردود الأعضاء بانتظارك" : "Member replies waiting for you",
    },
    (waiting?.prayers ?? 0) > 0 && {
      key: "prayers",
      href: "/community/prayer-wall",
      title: isRTL ? `${waiting!.prayers} صلوات بانتظار الموافقة` : `${waiting!.prayers} ${waiting!.prayers === 1 ? "prayer" : "prayers"} waiting for approval`,
      detail: isRTL ? "حائط الصلاة" : "Prayer wall",
    },
    (waiting?.followUps ?? 0) > 0 && {
      key: "followUps",
      href: "/follow-ups?status=open",
      title: isRTL ? `${waiting!.followUps} متابعات مستحقة اليوم` : `${waiting!.followUps} ${waiting!.followUps === 1 ? "follow-up" : "follow-ups"} due today`,
      detail: isRTL ? "تشمل المتأخرة" : "Including overdue ones",
    },
    (waiting?.roleRequests ?? 0) > 0 && {
      key: "roleRequests",
      href: "/settings?tab=access",
      title: isRTL ? `${waiting!.roleRequests} طلبات أدوار بانتظار الموافقة` : `${waiting!.roleRequests} role ${waiting!.roleRequests === 1 ? "request" : "requests"} to approve`,
      detail: isRTL ? "الإعدادات ← الصلاحيات والأدوار" : "Settings → Access and roles",
    },
    (waiting?.newMembers ?? 0) > 0 && {
      key: "newMembers",
      href: "/people",
      title: isRTL ? `${waiting!.newMembers} أعضاء جدد هذا الأسبوع` : `${waiting!.newMembers} new ${waiting!.newMembers === 1 ? "member" : "members"} this week`,
      detail: isRTL ? "رحّب بهم" : "Say welcome",
    },
  ].filter(Boolean) as { key: string; href: string; title: string; detail: string }[];
  const badgeCount = unreadMessages + (waiting?.prayers ?? 0) + (waiting?.followUps ?? 0) + (waiting?.roleRequests ?? 0);

  const pageTitle = React.useMemo(() => {
    const match = [...NAV_PAGES]
      .sort((a, b) => b.href.length - a.href.length)
      .find((p) => pathname === p.href || pathname?.startsWith(p.href + "/"));
    return match ? t(match.key) : title;
  }, [pathname, t, title]);


  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    router.push("/login");
    router.refresh();
  }

  const tr = (en: string, ar: string) => (isRTL ? ar : en);
  const newActions = [
    { href: "/people?new=1", label: tr("Add member", "إضافة عضو"), d: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
    { href: "/community/announcements", label: tr("Send announcement", "إرسال إعلان"), d: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" },
    { href: "/community/prayer-wall", label: tr("Review prayers", "مراجعة الصلوات"), d: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" },
    { href: "/usher", label: tr("Usher seating", "مقاعد الكنيسة"), d: "M4 6h16M4 6v12m16-12v12M8 18v-6h8v6", external: true },
    { href: "/checkin-scanner", label: tr("Check-in scanner", "ماسح الحضور"), d: "M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10", external: true },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-gray-200/80 bg-white/90 px-3 backdrop-blur sm:px-6">
      <div className="flex h-full items-center gap-2 sm:gap-3">
        {/* Start: menu and page title */}
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
          aria-label={tr("Main menu", "القائمة الرئيسية")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <button
          onClick={onSidebarToggle}
          className="hidden lg:flex rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
          aria-label={tr("Toggle sidebar", "طي/إظهار القائمة")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" /></svg>
        </button>
        {pageTitle && <h1 className="max-w-[45vw] shrink-0 truncate text-base font-semibold text-gray-900 sm:text-lg">{pageTitle}</h1>}

        {/* Centre: search */}
        <div className="flex min-w-0 flex-1 justify-end md:justify-center">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 text-sm text-gray-400 transition-colors hover:border-gray-300 hover:bg-white md:flex"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <span className="flex-1 truncate text-start">{tr("Search people, families, pages", "ابحث عن شخص أو أسرة أو صفحة")}</span>
            <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-500">Ctrl K</kbd>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
            aria-label={tr("Search", "بحث")}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </div>

        {/* End: live, new, bell, profile */}
        {summary?.live && (
          <Link
            href="/attendance"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition-colors hover:bg-emerald-100"
            title={summary.live.name}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="hidden sm:inline">{tr("Live", "مباشر")} ·</span>
            <span>{summary.live.checkedIn}</span>
            <span className="hidden lg:inline">{tr("here", "حاضر")}</span>
          </Link>
        )}

        <Dropdown
          trigger={
            <button type="button" aria-label={tr("Create new", "إنشاء جديد")} className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline">{tr("New", "جديد")}</span>
              <svg className="hidden h-3.5 w-3.5 text-gray-400 sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          }
          align={isRTL ? "left" : "right"}
          className="w-56"
        >
          {newActions.map((a) => (
            <DropdownItem
              key={a.href}
              icon={<svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={a.d} /></svg>}
              onClick={() => (a.external ? window.open(a.href, "_blank", "noopener") : router.push(a.href))}
            >
              {a.label}
              {a.external && (
                <svg className="ms-1.5 inline h-3 w-3 text-gray-300 rtl:-scale-x-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label={tr("opens in a new tab", "يفتح في تبويب جديد")}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              )}
            </DropdownItem>
          ))}
        </Dropdown>

        <Dropdown
          trigger={
            <button type="button" aria-label={t("topNav.notifications")} className="relative flex rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100" title={t("topNav.notifications")}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              {badgeCount > 0 ? (
                <span className="absolute -top-0.5 end-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </button>
          }
          align={isRTL ? "left" : "right"}
          className="w-80"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{t("topNav.notifications")}</p>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl" aria-hidden="true">🕊️</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{tr("You're all caught up", "لا يوجد ما ينتظرك الآن")}</p>
              <p className="mt-0.5 text-xs text-gray-500">{tr("New messages, prayers and follow-ups show up here.", "ستظهر هنا الرسائل والصلوات والمتابعات الجديدة.")}</p>
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownItem key={n.key} onClick={() => router.push(n.href)}>
                <div className="flex flex-col gap-0.5 py-1 text-start">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-500">{n.detail}</p>
                </div>
              </DropdownItem>
            ))
          )}
        </Dropdown>

        {/* Profile */}
        <Dropdown
          trigger={
            <div className="flex items-center gap-3 ps-3 border-s border-gray-200 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors duration-150">
              <Avatar size="sm" initials={userInitials} status="online" />
              <div className="hidden lg:block text-start">
                <p className="text-sm font-semibold text-gray-900">{currentUser?.name || (isRTL ? "الراعي ديفيد" : "Pastor David")}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser?.role ? currentUser.role.replace("_", " ") : t("topNav.churchAdmin")}</p>
              </div>
            </div>
          }
          align={isRTL ? "left" : "right"}
        >
          <DropdownItem onClick={() => router.push("/settings")}>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{t("topNav.myProfile")}</span>
          </DropdownItem>
          <DropdownItem onClick={() => router.push("/settings")}>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{t("topNav.settings")}</span>
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onClick={handleSignOut}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{t("topNav.signOut")}</span>
          </DropdownItem>
        </Dropdown>
      </div>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
