"use client";

/**
 * Dashboard banner: a personal greeting on deep navy, what is waiting for this
 * person, and the verse, with the church photo framed on the end side.
 *
 * The photo already carries the church's name and centenary seal, so it is
 * shown whole on the end side and fades into the navy, rather than sitting
 * behind text it would clash with. On phones it becomes a strip on top.
 *
 * The figures here are deliberately the *actionable* ones (prayers to approve,
 * follow-ups due, unread messages). Totals like members and attendance already
 * sit in the KPI cards right below, so repeating them would add noise.
 */

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { MovingBibleVerse } from "./moving-bible-verse";
import { useWorkspaceSummary } from "@/lib/workspace/use-workspace-summary";
import { getSharedUnreadCount } from "@/lib/messages/shared-unread";

interface DashboardHeroProps {
  /** Date range, refresh and demo controls, rendered on the photo. */
  controls: React.ReactNode;
}

function greeting(hour: number, isAr: boolean): string {
  if (hour < 12) return isAr ? "صباح الخير" : "Good morning";
  if (hour < 17) return isAr ? "مساء الخير" : "Good afternoon";
  return isAr ? "مساء الخير" : "Good evening";
}

export function DashboardHero({ controls }: DashboardHeroProps) {
  const { isRTL } = useTranslation();
  const tr = (en: string, ar: string) => (isRTL ? ar : en);
  const { summary } = useWorkspaceSummary();
  const [firstName, setFirstName] = React.useState<string | null>(null);
  const [unread, setUnread] = React.useState<number | null>(null);
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    let active = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const name: string | undefined = j?.data?.user?.name;
        if (active && name) setFirstName(name.trim().split(/\s+/)[0]);
      })
      .catch(() => {});
    getSharedUnreadCount()
      .then((n) => active && setUnread(n))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const waiting = summary?.waiting;
  const chips = [
    waiting && waiting.prayers !== null && {
      key: "prayers",
      href: "/community/prayer-wall",
      count: waiting.prayers,
      label: tr("prayers to approve", "صلوات للموافقة"),
      d: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
    },
    waiting && waiting.followUps !== null && {
      key: "followUps",
      href: "/follow-ups?status=open",
      count: waiting.followUps,
      label: tr("follow-ups due", "متابعات مستحقة"),
      d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    unread !== null && {
      key: "messages",
      href: "/community/messages",
      count: unread,
      label: tr("unread messages", "رسائل غير مقروءة"),
      d: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
    },
  ].filter(Boolean) as { key: string; href: string; count: number; label: string; d: string }[];
  const allClear = chips.length > 0 && chips.every((c) => c.count === 0);

  const dateLabel = now
    ? now.toLocaleDateString(isRTL ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-[#0B1F3A] text-white shadow-sm ring-1 ring-black/5">
      {/* Phones: the photo as a strip on top, sign and seal fully visible. */}
      <div className="relative h-28 sm:h-36 lg:hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/church-banner.jpg')" }} />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0B1F3A] to-transparent" />
      </div>
      {/* Desktop: the photo framed on the end side, fading into the navy. */}
      <div className="absolute inset-y-0 end-0 -z-10 hidden w-[56%] lg:block" aria-hidden="true">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/church-banner.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F3A] via-[#0B1F3A]/40 via-30% to-transparent rtl:bg-gradient-to-l" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0B1F3A]/80 to-transparent" />
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-7 lg:max-w-[62%]">
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E3C98F]">
              {tr("Heliopolis Evangelical Church", "كنيسة مصر الجديدة الإنجيلية")}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
              {now ? greeting(now.getHours(), isRTL) : "\u00a0"}
              {firstName ? `${isRTL ? "، " : ", "}${firstName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-white/65">{dateLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 [&>.btn]:border-white/20 [&>.btn]:bg-white/10 [&>.btn]:text-white [&>.btn:hover]:bg-white/20 [&>div>.btn]:border-white/20 [&>div>.btn]:bg-white/10 [&>div>.btn]:text-white [&>div>.btn:hover]:bg-white/20 [&>div>.btn_svg]:text-white/70">
            {controls}
          </div>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allClear ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm text-white/85 ring-1 ring-inset ring-white/15">
                <span aria-hidden="true">🕊️</span>
                {tr("Nothing is waiting for you. All caught up.", "لا يوجد ما ينتظرك الآن.")}
              </span>
            ) : (
              chips.map((c) => (
                <Link
                  key={c.key}
                  href={c.href}
                  className={`group inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm ring-1 ring-inset backdrop-blur-sm transition-colors ${
                    c.count > 0
                      ? "bg-white/15 text-white ring-[#E3C98F]/40 hover:bg-white/25"
                      : "bg-white/5 text-white/60 ring-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className={`h-4 w-4 ${c.count > 0 ? "text-[#E3C98F]" : "text-white/50"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={c.d} />
                  </svg>
                  <span className="text-lg font-semibold leading-none tabular-nums">{c.count}</span>
                  <span>{c.label}</span>
                </Link>
              ))
            )}
          </div>
        )}

        <div className="border-t border-white/15 pt-4">
          <MovingBibleVerse variant="onDark" />
        </div>
      </div>
    </section>
  );
}
