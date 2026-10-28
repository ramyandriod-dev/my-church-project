"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  IconQrCode,
  IconHeart,
  IconCross,
  IconUsers,
  IconMusic,
  IconCalendar,
  IconClock,
  IconChevronRight,
  IconCheckCircle2,
  IconSparkles,
  IconX,
} from "../icons";
import { useMobileAuth } from "../mobile-auth-provider";
import { mobileApiFetch, mobileApiFetchCached } from "@/lib/mobile-app/api-client";
import { formatRelativeTime, formatServiceWindow } from "@/lib/mobile-app/date-format";
import {
  MobileSection,
  SectionHeader,
  ActionTile,
  PhotoCard,
  SkeletonRows,
  EmptyState,
} from "../primitives";
import { ENGLISH_NOTICE, ENGLISH_NOTICE_URL } from "@/data/verses";
import { getHeroVerse, SEASON_META } from "@/lib/verses/seasons";
import { HomeHero } from "../home-hero";
import {
  getVerseImage,
  formatVerseRef,
  themeLabel,
} from "@/lib/verses/rotation";

/** The verse card rides up over the bottom of the photo hero. */
const VERSE_OVER_HERO = "relative z-10 !-mt-10 ring-4 ring-[#FBF8F3] shadow-[0_12px_30px_-12px_rgba(11,31,58,0.55)]";

interface ServiceCountdown {
  isLive: boolean;
  formatted: string;
}

function calculateNextService(now: Date, locale: string): ServiceCountdown {
  const dayOfWeek = now.getDay(); // 0: Sun, 5: Fri
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const serviceStartMinutes = 10 * 60; // 10:00 AM
  const serviceEndMinutes = 12 * 60 + 30; // 12:30 PM

  // Check if service is currently in progress (Friday 10:00 AM - 12:30 PM)
  if (dayOfWeek === 5 && currentTotalMinutes >= serviceStartMinutes && currentTotalMinutes < serviceEndMinutes) {
    return {
      isLive: true,
      formatted: locale === "ar" ? "مباشر الآن" : "Live Now",
    };
  }

  // Calculate next Friday 10:00 AM
  const nextFriday = new Date(now);
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0 && currentTotalMinutes >= serviceEndMinutes) {
    daysUntilFriday = 7;
  }
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  nextFriday.setHours(10, 0, 0, 0);

  const diffMs = Math.max(0, nextFriday.getTime() - now.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  let formatted = "";
  if (locale === "ar") {
    if (days > 0) {
      formatted = `${days} يوم و ${hours} ساعة`;
    } else if (hours > 0) {
      formatted = `${hours} ساعة و ${minutes} دقيقة`;
    } else {
      formatted = `${minutes} دقيقة`;
    }
  } else {
    if (days > 0) {
      formatted = `${days}d ${hours}h`;
    } else if (hours > 0) {
      formatted = `${hours}h ${minutes}m`;
    } else {
      formatted = `${minutes}m`;
    }
  }

  return {
    isLive: false,
    formatted,
  };
}

interface AttendanceSessionData {
  sessionId: string;
  serviceName: string;
  serviceStatus: string;
  window: {
    start: string;
    end: string;
  };
  qrToken: string;
}

interface RecentActivityItem {
  id: string;
  title: string;
  timeAgo: string;
  type: "checkin" | "ministry" | "idea" | "care";
}

interface UpcomingEventData {
  id: string;
  title: string;
  startTime: string;
  location?: string | null;
  category?: string | null;
}

function arabicWeeks(n: number): string {
  const digits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const num = String(n).replace(/[0-9]/g, (d) => digits[Number(d)]);
  if (n === 1) return "أسبوع واحد";
  if (n === 2) return "أسبوعان";
  if (n <= 10) return `${num} أسابيع`;
  return `${num} أسبوعًا`;
}

interface HomeScreenProps {
  onOpenCheckin: (mode?: "scan" | "direct") => void;
  onOpenPrayer: () => void;
  onOpenCare: () => void;
  onOpenSeating?: () => void;
  onOpenIdea: () => void;
  onOpenNotIncluded?: (feature: string) => void;
  onNavigateToTab: (tab: "community" | "events" | "profile") => void;
  isCheckedIn: boolean;
  sessionData?: AttendanceSessionData | null;
  isLoadingSession?: boolean;
  onOpenEditProfile?: () => void;
  /** Bumped by pull-to-refresh to reload the live feed. */
  refreshSignal?: number;
  /** Opens the share-the-verse sheet (rendered by the shell). */
  onOpenVerseShare?: () => void;
}

export function HomeScreen({
  onOpenCheckin,
  onOpenPrayer,
  onOpenCare,
  onOpenSeating,
  onOpenIdea,
  onNavigateToTab,
  onOpenNotIncluded,
  isCheckedIn,
  sessionData,
  isLoadingSession = false,
  onOpenEditProfile,
  refreshSignal = 0,
  onOpenVerseShare,
}: HomeScreenProps) {
  const { mobileApp, common, locale } = useTranslation();
  const { member, user } = useMobileAuth();

  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEventData[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isDismissedOnboardingBanner, setIsDismissedOnboardingBanner] = useState(false);
  const [hasRsvpd, setHasRsvpd] = useState(false);
  const [verseExpanded, setVerseExpanded] = useState(false);
  const [attendanceStreak, setAttendanceStreak] = useState(0);
  const [rsvpCount, setRsvpCount] = useState(38);
  const [countdown, setCountdown] = useState<ServiceCountdown>(() =>
    calculateNextService(new Date(), locale)
  );

  useEffect(() => {
    setCountdown(calculateNextService(new Date(), locale));
    const timer = setInterval(() => {
      setCountdown(calculateNextService(new Date(), locale));
    }, 15000); // live refresh every 15s
    return () => clearInterval(timer);
  }, [locale]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("church_rsvp_friday");
      if (saved === "true") {
        setHasRsvpd(true);
      }
    }
  }, []);

  const handleToggleRsvp = () => {
    const nextState = !hasRsvpd;
    setHasRsvpd(nextState);
    setRsvpCount((prev) => (nextState ? prev + 1 : prev - 1));
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("church_rsvp_friday", nextState ? "true" : "false");
    }
  };

  // Fetch real attendance history and upcoming events
  useEffect(() => {
    let isMounted = true;
    async function loadHomeLiveFeed() {
      setIsLoadingActivities(true);
      try {
        // 1. Fetch real attendance history
        const attRes: any = null;
        if (isMounted) setAttendanceStreak(Number(attRes?.stats?.streak) || 0);
        if (isMounted && attRes?.records && Array.isArray(attRes.records) && attRes.records.length > 0) {
          const checkinActivities: RecentActivityItem[] = attRes.records.slice(0, 4).map((r: any) => ({
            id: r.id,
            title:
              locale === "ar"
                ? `سجّل حضور في ${r.service?.name || "اجتماع الكنيسة"}`
                : `Checked in to ${r.service?.name || "Church Service"}`,
            timeAgo: formatRelativeTime(r.checkInTime, locale),
            type: "checkin",
          }));
          setRecentActivities(checkinActivities);
        } else if (isMounted) {
          setRecentActivities([]);
        }

        // 2. Fetch upcoming events for the meetings section
        const eventsRes: any = null;
        if (isMounted && Array.isArray(eventsRes)) {
          setUpcomingEvents(eventsRes.slice(0, 2));
        }
      } finally {
        if (isMounted) setIsLoadingActivities(false);
      }
    }

    void loadHomeLiveFeed();
    return () => {
      isMounted = false;
    };
  }, [locale, isCheckedIn, refreshSignal]);

  const serviceName =
    sessionData?.serviceName ||
    (locale === "ar" ? "اجتماع صباح الجمعة" : "Friday Morning Meeting");
  const timeWindow = sessionData?.window
    ? formatServiceWindow(sessionData.window.start, sessionData.window.end, locale)
    : locale === "ar"
    ? "١٠:٠٠ ص – ١٢:٣٠ م"
    : "10:00 AM – 12:30 PM";

  // Verse of the Day — deterministic per local calendar date, no fetch needed.
  const { verse, season } = getHeroVerse();
  const seasonMeta = season ? SEASON_META[season] : null;
  const verseImage = getVerseImage();
  const theme = verse ? themeLabel(verse.theme, locale) : null;
  const englishNotice = ENGLISH_NOTICE;
  const englishNoticeUrl = ENGLISH_NOTICE_URL;

  return (
    <div className="space-y-5 pb-6">
      {/* ─── 0. Photo hero behind the greeting (church doors) ───────── */}
      <HomeHero />

      {/* ─── 1. Verse of the Day, overlapping the hero's lower edge ─── */}
      {/* !-mt beats space-y's margin; the cream ring separates the two photos. */}
      {verse ? (
        <PhotoCard
          src={verseImage}
          alt=""
          ratio="min-h-[176px]"
          className={`mobile-rise ${VERSE_OVER_HERO}`}
          tint={seasonMeta?.tint}
        >
          {/* Compact: the church name is on the photo hero above, so it isn't repeated here. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-[#E3C98F] tracking-[0.18em] uppercase">
                {locale === "ar" ? "آية اليوم" : "Verse of the Day"}
              </p>
              {(seasonMeta || theme) && (
                <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium text-[#F3E7CF]">
                  {seasonMeta
                    ? `${seasonMeta.emoji} ${locale === "ar" ? seasonMeta.ar : seasonMeta.en}`
                    : theme}
                </span>
              )}
            </div>

            {/* Main verse: always Arabic */}
            <p
              dir="rtl"
              lang="ar"
              className={`font-serif text-white drop-shadow-sm text-[18px] min-[380px]:text-[19px] leading-[1.7] ${
                verseExpanded ? "" : "line-clamp-2"
              }`}
            >
              {verse.arabic}
            </p>

            {/* Book + chapter:verse, in Arabic */}
            <div className="flex items-center gap-3" dir="rtl">
              <span className="h-px w-8 bg-[#E3C98F]" aria-hidden="true" />
              <p lang="ar" className="text-[13px] text-[#E3C98F] font-semibold tracking-wide">
                {formatVerseRef(verse.ref, "ar")}
              </p>
            </div>

            {/* Read more: English text + English reference */}
            {verseExpanded && (
              <div className="space-y-1.5 pt-1" dir="ltr" lang="en">
                <p className="font-serif italic text-[15px] leading-relaxed text-[#F3E7CF]">
                  {verse.english}
                </p>
                <p className="text-[12px] text-[#E3C98F] font-semibold tracking-wide">
                  {verse.ref}
                </p>
                {englishNotice && englishNoticeUrl && (
                  <p className="text-[10px] text-[#C9D3E0] leading-snug">
                    {englishNotice}{" "}
                    <a
                      href={englishNoticeUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline"
                    >
                      {englishNoticeUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setVerseExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/90 hover:text-white active:scale-95 transition-all"
              >
                <span>
                  {verseExpanded ? "Show less" : "Read more in English"}
                </span>
                <IconChevronRight className={`w-3.5 h-3.5 rtl:rotate-180 transition-transform ${verseExpanded ? "-rotate-90 rtl:-rotate-90" : ""}`} />
              </button>

              <button
                type="button"
                onClick={onOpenVerseShare}
                aria-label={locale === "ar" ? "مشاركة الآية" : "Share this verse"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-xs text-[12px] font-semibold text-white hover:bg-white/25 active:scale-95 transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                  <path d="M16 6l-4-4-4 4" />
                  <path d="M12 2v13" />
                </svg>
                <span>{locale === "ar" ? "مشاركة" : "Share"}</span>
              </button>
            </div>
          </div>
        </PhotoCard>
      ) : (
        <PhotoCard src="/church-banner.jpg" ratio="min-h-[176px]" className={VERSE_OVER_HERO}>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-[#E3C98F] tracking-[0.18em] uppercase">
              {locale === "ar" ? "رسالة الأسبوع" : "This Week's Message"}
            </p>
            <h3 className="font-serif text-[24px] text-white leading-snug">
              {locale === "ar" ? "امشوا معاً، ونمُ معاً" : "Walk Together, Grow Together"}
            </h3>
            <p className="text-[12px] text-[#E3C98F] font-semibold tracking-wide">
              {locale === "ar" ? "العبرانيين ١٠:٢٤-٢٥" : "Hebrews 10:24–25"}
            </p>
          </div>
        </PhotoCard>
      )}

      {/* ─── 2. Quick Actions (4), right under the verse so Check In is visible without scrolling ─── */}
      <MobileSection variant="plain">
        <SectionHeader title={common.actions} />

        <div className="grid grid-cols-4 gap-2">
          <ActionTile
            title={locale === "ar" ? "تسجيل الحضور" : "Check In"}
            icon={isCheckedIn ? IconCheckCircle2 : IconQrCode}
            accent={isCheckedIn ? "emerald" : "blue"}
            attention={!isCheckedIn}
            onClick={() => onOpenCheckin("direct")}
          />
          <ActionTile
            title={mobileApp.prayerRequest}
            icon={IconHeart}
            accent="rose"
            onClick={onOpenPrayer}
          />
          <ActionTile
            title={mobileApp.requestCare}
            icon={IconCross}
            accent="amber"
            onClick={onOpenCare}
          />
          <ActionTile
            title={mobileApp.myMinistry}
            icon={IconMusic}
            accent="teal"
            onClick={() => (onOpenNotIncluded ? onOpenNotIncluded("ministry") : onNavigateToTab("community"))}
          />
        </div>

        {onOpenSeating && (
          <button
            type="button"
            onClick={onOpenSeating}
            className="mt-2.5 w-full flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-start ring-1 ring-[#EAE3D6] shadow-[0_2px_10px_rgba(19,47,76,0.05)] active:scale-[0.99] transition-transform"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <IconUsers className="w-5 h-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-slate-900">{locale === "ar" ? "ابحث عن مقعد" : "Find a seat"}</span>
              <span className="block text-[12px] text-slate-500">
                {locale === "ar" ? "احجز صفًا لمدة ٥ دقائق بعد تسجيل حضورك" : "Hold a row for 5 minutes once you've checked in"}
              </span>
            </span>
            <IconChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
          </button>
        )}
      </MobileSection>

      {/* ─── Next Service Countdown & Live State Card ─── */}
      {!isCheckedIn && (
        <section
          className={`relative overflow-hidden rounded-[22px] p-4 transition-all duration-300 shadow-[0_4px_18px_rgba(19,47,76,0.06)] ring-1 ${
            countdown.isLive
              ? "bg-gradient-to-br from-[#0B1528] via-[#102244] to-[#0B1528] text-white ring-rose-500/40 shadow-rose-950/20"
              : "bg-white text-slate-900 ring-[#EAE3D6]"
          }`}
        >
          {/* Top Row: Live beacon or Countdown badge + Attendance social proof */}
          <div className="flex items-center justify-between gap-2 mb-3">
            {countdown.isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-bold ring-1 ring-rose-500/50 backdrop-blur-xs animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-300 animate-ping" />
                <span>{locale === "ar" ? "مباشر الآن" : "LIVE NOW"}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5EEDF] text-[#8A6A35] text-[11px] font-bold ring-1 ring-[#E8DCC0]">
                <IconClock className="w-3.5 h-3.5 text-[#8A6A35]" />
                <span>
                  {locale === "ar"
                    ? `يبدأ بعد: ${countdown.formatted}`
                    : `Starts in: ${countdown.formatted}`}
                </span>
              </span>
            )}

            <span
              className={`text-[11px] font-semibold flex items-center gap-1 ${
                countdown.isLive ? "text-slate-300" : "text-[#6F6650]"
              }`}
            >
              <IconUsers className="w-3.5 h-3.5" />
              <span>
                {rsvpCount} {locale === "ar" ? "سيحضرون" : "attending"}
              </span>
            </span>
          </div>

          {/* Bottom Row: Service info + exclusively the "I'm Attending" RSVP Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4
                className={`text-[14px] font-bold leading-snug truncate ${
                  countdown.isLive ? "text-white" : "text-[#132F4C]"
                }`}
              >
                {serviceName}
              </h4>
              <p
                className={`text-[11px] mt-0.5 truncate flex items-center gap-1.5 ${
                  countdown.isLive ? "text-slate-300" : "text-[#6F6650]"
                }`}
              >
                <span>{timeWindow}</span>
                <span>•</span>
                <span>
                  {locale === "ar"
                    ? "القاعة الكبرى"
                    : "Main Auditorium"}
                </span>
              </p>
            </div>

            {/* Exclusively "I'm Attending" RSVP Action */}
            <button
              type="button"
              onClick={handleToggleRsvp}
              className={`px-3.5 py-2.5 rounded-[13px] font-bold text-[11px] transition-all shrink-0 flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer ${
                hasRsvpd
                  ? "bg-[#E7F6EC] text-[#1A7F45] ring-1 ring-[#BEEACF]"
                  : countdown.isLive
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30"
                  : "bg-[#132F4C] hover:bg-[#1E3A5F] text-white"
              }`}
            >
              {hasRsvpd ? (
                <>
                  <IconCheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{locale === "ar" ? "سأحضر" : "Attending"}</span>
                </>
              ) : (
                <>
                  <span>✋</span>
                  <span>{locale === "ar" ? "سأحضر" : "I'm Attending"}</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* ─── Attendance Streak (real data; hidden until there is one) ─── */}
      {member && attendanceStreak >= 1 && (
        <section className="p-3.5 rounded-[20px] bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 ring-1 ring-inset ring-amber-400/30 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[14px] bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 text-[20px] shadow-xs">
              🔥
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold text-[#132F4C] leading-snug">
                {locale === "ar"
                  ? `أمانة الحضور: ${arabicWeeks(attendanceStreak)} متتالية`
                  : `Faithful Presence: ${attendanceStreak}-Week Streak`}
              </h4>
              <p className="text-[11px] text-[#6F6650] mt-0.5 truncate">
                {locale === "ar" ? "نشكر الله على مشاركتك الدائمة في جسد المسيح" : "Thank you for gathering faithfully in worship"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab("profile")}
            className="px-2.5 py-1 rounded-lg bg-white text-amber-700 font-bold text-[10px] ring-1 ring-amber-300 shadow-xs shrink-0 active:scale-95 transition-transform"
          >
            {locale === "ar" ? "سجلي" : "My Record"}
          </button>
        </section>
      )}

      {/* ─── Checked In Active Service Card ─── */}
      {isCheckedIn && (
        <section className="relative overflow-hidden rounded-[20px] bg-[#E7F6EC] ring-1 ring-inset ring-[#BEEACF] p-4 text-[#1A7F45] shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[14px] bg-[#CEF0DB] ring-1 ring-inset ring-[#BEEACF] flex items-center justify-center shrink-0">
                <IconCheckCircle2 className="w-6 h-6 text-[#1A7F45] stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1A7F45] animate-pulse" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#1A7F45]">
                    {locale === "ar" ? "حاضر بالاجتماع اليوم" : "Checked In for Today's Service"}
                  </p>
                </div>
                <h4 className="text-[14px] font-bold text-[#0D4424] truncate mt-0.5">
                  {serviceName}
                </h4>
                <p className="text-[11px] text-[#1A7F45]/85 mt-0.5 truncate">
                  {timeWindow}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenCheckin("direct")}
              className="px-3 py-1.5 rounded-xl bg-white text-[#1A7F45] text-[11px] font-bold ring-1 ring-[#BEEACF] hover:bg-emerald-50 transition-all shrink-0 active:scale-95"
            >
              {locale === "ar" ? "التفاصيل" : "Details"}
            </button>
          </div>
        </section>
      )}

      {/* ─── Profile Completeness Onboarding Banner (if phone/profile incomplete) ─── */}
      {member && !member.phone && !isDismissedOnboardingBanner && (
        <section className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#132F4C] via-[#132F4C] to-[#132F4C] p-4 text-white shadow-md shadow-[#0F2438]/10 animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 mt-0.5">
                <IconSparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-bold leading-tight text-white">
                  {locale === "ar" ? "استكمل بياناتك في الكنيسة" : "Complete Your Church Profile"}
                </h3>
                <p className="text-[11px] text-[#F3E7CF] mt-1 leading-relaxed">
                  {locale === "ar"
                    ? "أضف رقم هاتفك وخدمتك المفضلة لتتمكن الكنيسة ومجموعتك من التواصل معك."
                    : "Add your phone number and service interests so your church community can stay in touch."}
                </p>
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#132F4C] text-[11px] font-bold shadow-xs hover:bg-[#F5EEDF] transition-colors active:scale-95"
                >
                  <span>{locale === "ar" ? "استكمال البيانات الآن" : "Complete Profile Now"}</span>
                  <IconChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDismissedOnboardingBanner(true)}
              className="text-white/70 hover:text-white p-1 rounded-full shrink-0 transition-colors"
              title={locale === "ar" ? "إخفاء" : "Dismiss"}
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* ─── 3b. More to Explore (photo cards) ───────────────────── */}
      <MobileSection variant="plain">
        <SectionHeader title={locale === "ar" ? "اكتشف المزيد" : "More to Explore"} />

        <div className="grid grid-cols-3 gap-2.5">
          {[
            {
              key: "community",
              label: locale === "ar" ? "المجتمع" : "Community",
              img: "/church-banner.jpg",
              tab: "community" as const,
            },
            {
              key: "meetings",
              label: locale === "ar" ? "الاجتماعات" : "Meetings",
              img: "/login-bg.jpg",
              tab: "events" as const,
            },
            {
              key: "profile",
              label: locale === "ar" ? "ملفي" : "Profile",
              img: verseImage,
              tab: "profile" as const,
            },
          ].map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onNavigateToTab(c.tab)}
              className="group text-left rtl:text-right active:scale-[0.97] transition-transform"
            >
              <PhotoCard src={c.img} ratio="aspect-[3/4]" className="!rounded-[18px]">
                <span className="font-serif text-[14px] text-white leading-tight">
                  {c.label}
                </span>
              </PhotoCard>
            </button>
          ))}
        </div>
      </MobileSection>

      {/* ─── 4. Upcoming Events ───────────────────────────────────── */}
      <MobileSection>
        <SectionHeader
          title={mobileApp.upcomingEvents}
          action={
            <button
              type="button"
              onClick={() => onNavigateToTab("events")}
              className="text-[12px] font-semibold text-[#8A6A35] hover:text-[#6F5428] flex items-center gap-0.5"
            >
              <span>{mobileApp.viewAll}</span>
              <IconChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          }
        />

        <div className="space-y-2.5">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => {
              const eventDate = new Date(event.startTime);
              const dayNum = eventDate.getDate();
              const monthName = eventDate.toLocaleDateString(
                locale === "ar" ? "ar-EG" : "en-US",
                { month: "short" }
              );

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onNavigateToTab("events")}
                  className="w-full p-2.5 rounded-[16px] bg-white ring-1 ring-inset ring-[#EAE3D6] shadow-[0_2px_8px_rgba(19,47,76,0.04)] flex items-center gap-3 hover:ring-[#DDD3BF] transition-all text-left"
                >
                  {/* Date block */}
                  <div className="w-[52px] h-[52px] rounded-[14px] bg-[#F5EEDF] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-[#8A6A35] uppercase leading-none">
                      {monthName}
                    </span>
                    <span className="text-[17px] font-bold text-[#132F4C] leading-tight mt-0.5">
                      {dayNum}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-semibold text-[#132F4C] truncate">
                      {event.title}
                    </h4>
                    <p className="text-[11px] text-[#6F6650] mt-0.5 flex items-center gap-1.5 truncate">
                      <span>
                        {eventDate.toLocaleTimeString(
                          locale === "ar" ? "ar-EG" : "en-US",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                      <span>·</span>
                      <span className="truncate">
                        {event.location || (locale === "ar" ? "القاعة الرئيسية" : "Main Hall")}
                      </span>
                    </p>
                  </div>

                  <IconChevronRight className="w-4 h-4 text-[#8F8670] shrink-0 rtl:rotate-180" />
                </button>
              );
            })
          ) : (
            <EmptyState
              icon={IconCalendar}
              title={
                locale === "ar"
                  ? "لا توجد اجتماعات معلنة بعد"
                  : "Nothing on the calendar yet"
              }
              description={
                locale === "ar"
                  ? "نجتمع معاً كل جمعة. ستظهر هنا الفعاليات الجديدة فور الإعلان عنها."
                  : "We usually gather on Fridays. New events appear here as soon as they're announced."
              }
              actionLabel={locale === "ar" ? "تصفّح كل الاجتماعات" : "Browse all gatherings"}
              onAction={() => onNavigateToTab("events")}
            />
          )}
        </div>
      </MobileSection>

      {/* ─── 5. Recent Activity ───────────────────────────────────── */}
      <MobileSection>
        <SectionHeader
          title={mobileApp.recentActivity}
        />

        <div className="rounded-[16px] bg-white ring-1 ring-inset ring-[#EAE3D6] divide-y divide-[#F0F3F7]">
          {isLoadingActivities ? (
            <div className="p-3.5">
              <SkeletonRows count={2} compact />
            </div>
          ) : recentActivities.length > 0 ? (
            recentActivities.map((act) => (
              <div
                key={act.id}
                className="py-3 px-3.5 first:pt-3.5 last:pb-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-[#8A6A35] shrink-0" />
                  <p className="text-[12px] font-medium text-[#132F4C] truncate">
                    {act.title}
                  </p>
                </div>
                <span className="text-[11px] text-[#8F8670] shrink-0">
                  {act.timeAgo}
                </span>
              </div>
            ))
          ) : (
            <EmptyState
              bare
              icon={IconCheckCircle2}
              title={locale === "ar" ? "رحلتك تبدأ من هنا" : "Your journey starts here"}
              description={
                locale === "ar"
                  ? "سجّل حضورك في الاجتماع القادم وسيظهر هنا."
                  : "Check in at your next service and it will show up here."
              }
              actionLabel={!isCheckedIn ? (locale === "ar" ? "سجّل حضورك" : "Check in") : undefined}
              onAction={!isCheckedIn ? () => onOpenCheckin("direct") : undefined}
            />
          )}
        </div>
      </MobileSection>
    </div>
  );
}
