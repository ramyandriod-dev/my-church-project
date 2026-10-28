"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { MobileHeader } from "./mobile-header";
import { useMobilePrefs } from "./mobile-prefs";
import { OfflineBar } from "./offline-bar";
import { usePullToRefresh } from "./use-pull-to-refresh";
import { MobileBottomNav, MobileTab } from "./mobile-bottom-nav";
import { HOME_HERO_SOLID_AFTER } from "./home-hero";
import { HomeScreen } from "./screens/home-screen";
import { CommunityScreen } from "./screens/community-screen";
import { EventsScreen } from "./screens/events-screen";
import { ProfileScreen } from "./screens/profile-screen";
import { PrayerModal } from "./modals/prayer-modal";
import { NotIncludedSheet } from "./modals/not-included-sheet";
import { VerseShareSheet } from "./modals/verse-share-sheet";
import { getVerseImage, formatVerseRef } from "@/lib/verses/rotation";
import { getHeroVerse, SEASON_META } from "@/lib/verses/seasons";
import { EditProfileModal } from "./modals/edit-profile-modal";
import { MobileAuthProvider, useMobileAuth } from "./mobile-auth-provider";
import { MobileLoginView } from "./mobile-login-view";

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

function MobileShellInner() {
  const { direction, locale } = useTranslation();
  const { isAuthenticated, isLoading: isAuthLoading, member, user, refreshProfile } = useMobileAuth();
  const [currentTab, setCurrentTab] = useState<MobileTab>("home");
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  // While the saved session is still being checked, cover the screen so the login form
  // does not flash for someone who is already signed in.
  const isAuthPending = !isAuthenticated && isAuthLoading;

  // Modal open states. Only the prayer request and profile editing are part of the
  // review edition; every other action opens the "not included" notice.
  const [isPrayerOpen, setIsPrayerOpen] = useState(false);
  const [notIncluded, setNotIncluded] = useState<string | null>(null);
  const showNotIncluded = (what: string) => setNotIncluded(what);

  // Check-in and attendance are not part of the review edition.
  const isCheckedIn = false;
  const sessionData: AttendanceSessionData | null = null;
  const isLoadingSession = false;
  const unreadCount = 0;

  const { resolvedTheme, textScale } = useMobilePrefs();
  const [isVerseShareOpen, setIsVerseShareOpen] = useState(false);
  const { verse: shareVerse, season: shareSeason } = getHeroVerse();

  // Pull-to-refresh is switched off: it interfered with scrolling inside the Android
  // WebView. The hook and indicator stay in place so it can return once it is proven safe.
  const PULL_TO_REFRESH_ENABLED = false;
  const mainRef = useRef<HTMLElement | null>(null);

  // Home's photo hero sits under a see-through header; once it scrolls out of
  // view the header turns back into the cream bar. Re-checked on tab change,
  // because each tab starts at its own scroll position.
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const check = () => setScrolledPastHero(el.scrollTop > HOME_HERO_SOLID_AFTER);
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [currentTab, isAuthenticated]);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const canPullRefresh =
    PULL_TO_REFRESH_ENABLED &&
    isAuthenticated &&
    (currentTab === "home" || currentTab === "events" || currentTab === "community");
  const {
    pull,
    refreshing: isPullRefreshing,
    dragging: isPulling,
  } = usePullToRefresh(
    mainRef,
    () => {
      setRefreshSignal((n) => n + 1);
    },
    canPullRefresh
  );

  return (
    <div
      dir={direction}
      data-mobile-theme={resolvedTheme}
      className="min-h-screen bg-slate-100 min-[520px]:bg-gradient-to-br min-[520px]:from-slate-900 min-[520px]:via-slate-950 min-[520px]:to-slate-900 flex items-center justify-center p-0 min-[520px]:py-8 min-[520px]:px-4 text-slate-900 font-sans selection:bg-blue-500/20"
    >
      {/* ─── Mobile Frame Container (Realistic Smartphone Shape) ──── */}
      {/* On phones the frame is exactly the screen's height (100dvh), so only
          <main> scrolls and the header and bottom nav stay on screen. With
          min-h-screen the frame grew with the content, the whole page scrolled,
          and the bottom nav scrolled away with it. */}
      <div className="w-full max-w-[430px] h-[100dvh] min-[520px]:min-h-[860px] min-[520px]:max-h-[920px] min-[520px]:h-[calc(100vh-4rem)] bg-[#FBF8F3] flex flex-col relative min-[520px]:rounded-[52px] min-[520px]:border-[10px] min-[520px]:border-slate-800 min-[520px]:ring-1 min-[520px]:ring-slate-700/60 min-[520px]:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden transition-all">
        {/* Realistic Smartphone Dynamic Island & Speaker Notch (visible on min-[520px]+) */}
        <div className="hidden min-[520px]:flex absolute top-2.5 left-1/2 -translate-x-1/2 z-50 items-center justify-center pointer-events-none select-none">
          <div className="h-5 w-28 bg-slate-950 rounded-full px-2.5 flex items-center justify-between shadow-inner border border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700/50 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-blue-500/50 animate-pulse" />
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-700/40" />
            </div>
            <div className="w-8 h-1 bg-slate-800/80 rounded-full" />
          </div>
        </div>

        {/* Sticky Header (Only visible when authenticated and welcome has concluded) */}
        {isAuthenticated && (
            <MobileHeader
              onOpenProfile={() => setCurrentTab("profile")}
              onOpenNotifications={() => showNotIncluded("notifications")}
              unreadCount={unreadCount}
              overlay={currentTab === "home"}
              heroMode={currentTab === "home" && !scrolledPastHero}
            />
        )}

        <OfflineBar />

        {/* Content View: Login for guests, active screens for authenticated members */}
        {!isAuthenticated ? (
          /* Unauthenticated State: Show Native Mobile Login Directly (No hero intro before sign-in) */
          <main className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <MobileLoginView />
          </main>
        ) : (
          /* Authenticated State: Active Screens */
          <>
            <main
              ref={mainRef}
              className="flex-1 min-h-0 px-4 pt-4 overflow-y-auto overscroll-contain"
            >
              {/* Pull-to-refresh indicator: grows as you pull, spins while refreshing */}
              <div
                aria-hidden="true"
                className="flex items-end justify-center overflow-hidden"
                style={{
                  height: isPullRefreshing ? 44 : pull,
                  transition: isPulling ? "none" : "height 0.2s ease-out",
                }}
              >
                <div
                  className={`mb-2 w-8 h-8 rounded-full bg-white shadow-[0_2px_8px_rgba(19,47,76,0.12)] flex items-center justify-center text-[#8A6A35] ${
                    isPullRefreshing ? "animate-spin" : ""
                  }`}
                  style={{
                    opacity: isPullRefreshing ? 1 : Math.min(1, pull / 40),
                    transform: isPullRefreshing ? undefined : `rotate(${pull * 4}deg)`,
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-3-6.7" />
                    <path d="M21 3v6h-6" />
                  </svg>
                </div>
              </div>
              <div
                key={currentTab}
                className="mobile-screen-enter"
                style={textScale !== 100 ? { zoom: textScale / 100 } : undefined}
              >
              {currentTab === "home" && (
                <HomeScreen
                  onOpenCheckin={() => showNotIncluded("checkin")}
                  onOpenPrayer={() => setIsPrayerOpen(true)}
                  onOpenSeating={() => showNotIncluded("seating")}
                  onOpenCare={() => showNotIncluded("care")}
                  onOpenIdea={() => showNotIncluded("ideas")}
                  onNavigateToTab={(tab) => setCurrentTab(tab)}
                  onOpenNotIncluded={showNotIncluded}
                  isCheckedIn={isCheckedIn}
                  sessionData={sessionData}
                  isLoadingSession={isLoadingSession}
                  onOpenEditProfile={() => setIsOnboardingOpen(true)}
                  refreshSignal={refreshSignal}
                  onOpenVerseShare={() => setIsVerseShareOpen(true)}
                />
              )}

              {currentTab === "community" && (
                <CommunityScreen
                  onLockedTap={showNotIncluded}
                  refreshSignal={refreshSignal}
                />
              )}

              {currentTab === "events" && <EventsScreen refreshSignal={refreshSignal} />}

              {currentTab === "profile" && (
                <ProfileScreen
                  onOpenNotifications={() => showNotIncluded("notifications")}
                  unreadCount={unreadCount}
                />
              )}
              </div>
            </main>

            {/* Sticky Bottom Navigation */}
            <MobileBottomNav currentTab={currentTab} onTabChange={setCurrentTab} />

            {/* ─── Interactive Action Modals ─────────────────────────── */}
            <PrayerModal
              isOpen={isPrayerOpen}
              onClose={() => setIsPrayerOpen(false)}
            />

            {shareVerse && (
              <VerseShareSheet
                isOpen={isVerseShareOpen}
                onClose={() => setIsVerseShareOpen(false)}
                arabic={shareVerse.arabic}
                english={shareVerse.english}
                refAr={formatVerseRef(shareVerse.ref, "ar")}
                refEn={shareVerse.ref}
                image={getVerseImage()}
                accent={shareSeason ? SEASON_META[shareSeason].accent : undefined}
              />
            )}

            <NotIncludedSheet feature={notIncluded} onClose={() => setNotIncluded(null)} />

            {/* Profile editing */}
            <EditProfileModal
              isOpen={isOnboardingOpen}
              onClose={() => {
                try {
                  sessionStorage.setItem("cmp:onboarding-prompted", "true");
                  sessionStorage.removeItem("cmp:pending-onboarding");
                } catch {}
                setIsOnboardingOpen(false);
              }}
              onSaved={async () => {
                try {
                  sessionStorage.setItem("cmp:onboarding-prompted", "true");
                  sessionStorage.removeItem("cmp:pending-onboarding");
                } catch {}
                setIsOnboardingOpen(false);
                await refreshProfile();
              }}
              initialMember={member}
              initialUser={user}
              isOnboarding={true}
            />
          </>
        )}

        {isAuthPending && <div className="absolute inset-0 z-[60] bg-[#0B1F3A]" aria-hidden="true" />}

        {/* Smartphone Home Indicator Bar (visible on min-[520px]+) */}
        <div className="hidden min-[520px]:flex items-center justify-center pt-1 pb-2.5 bg-white/95 border-t border-slate-100/80 shrink-0 select-none">
          <div className="w-32 h-1 bg-slate-900/35 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function MobileShell() {
  return (
    <MobileAuthProvider>
      <MobileShellInner />
    </MobileAuthProvider>
  );
}
