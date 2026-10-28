"use client";

import * as React from "react";
import { mockAvatar, mockPortrait } from "@/lib/avatars/mock-avatar";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { members } from "@/lib/mock-data/people";
import { getMember360, generateDefaultMember360 } from "@/lib/mock-data/member360";
import { MemberHeader } from "@/components/member360/member-header";
import { OverviewKpis } from "@/components/member360/overview-kpis";
import { AttendanceSection } from "@/components/member360/attendance-section";
import { EngagementSection } from "@/components/member360/engagement-section";
import { CareSection } from "@/components/member360/care-section";
import { PrayerSection } from "@/components/member360/prayer-section";
import { MinistrySection } from "@/components/member360/ministry-section";
import { TalentSection } from "@/components/member360/talent-section";
import { TimelineSection } from "@/components/member360/timeline-section";
import { NotesSection } from "@/components/member360/notes-section";
import { ActivitySection } from "@/components/member360/activity-section";
import { RewardingSection } from "@/components/member360/rewarding-section";
import { FamilySection } from "@/components/member360/family-section";
import { getMockFamilyTreeForMember } from "@/lib/mock-data/families";
import { mockTalentDirectory } from "@/lib/mock-data/community";
import { useLanguage, useTranslation } from "@/lib/i18n";
import { useAttendanceRealtime } from "@/lib/realtime/use-attendance-realtime";
import { createRefreshGuard, fetchMemberFamilyTree } from "@/lib/frontend/refresh-guard";

type TabKey = "all" | "rewards" | "attendance" | "engagement" | "family" | "care" | "timeline";

export default function Member360Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading Member 360...</div>}>
      <Member360Content />
    </Suspense>
  );
}

function Member360Content() {
  const routeParams = useParams<{ memberId: string }>();
  const memberId = routeParams?.memberId || "";
  const searchParams = useSearchParams();

  // Find initial mock member if exists, else start null
  const initialMock = members.find(
    (m) =>
      m.id === memberId ||
      `${m.firstName.toLowerCase()}-${m.lastName.toLowerCase()}` === memberId.toLowerCase() ||
      m.email.toLowerCase() === memberId.toLowerCase()
  );

  const [member, setMember] = React.useState<any>(initialMock ?? null);
  const [loading, setLoading] = React.useState(!initialMock);
  const [familyTree, setFamilyTree] = React.useState<any>(() => getMockFamilyTreeForMember(initialMock?.id ?? memberId));
  const [talentProfile, setTalentProfile] = React.useState<any>(() => {
    return (
      mockTalentDirectory.find((p) => p.memberId === memberId) ??
      mockTalentDirectory.find((p) => p.memberId === initialMock?.id) ??
      null
    );
  });

// A1: never run overlapping reload chains. Realtime events, edits and
  // cross-tab broadcasts can all trigger a reload; while one is in flight the
  // extra triggers collapse into a single trailing refresh instead of stacking
  // concurrent request chains (the fan-out that drives Cloudflare 1102 purges).
  const refreshGuard = React.useMemo(() => createRefreshGuard(), []);

  const loadMember360Data = React.useCallback(async () => {
    refreshGuard.run(async () => {
      try {
        // 1. Fetch real member from database API
        let memberResolved = false;
        const res = await fetch(`/api/members/${encodeURIComponent(memberId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            const dbMember = json.data;
            const uiMember = {
              id: dbMember.id,
              firstName: dbMember.firstName,
              lastName: dbMember.lastName,
              email: dbMember.email,
              phone: dbMember.phone || "—",
              status: dbMember.status || "active",
              ministry: dbMember.ministry || "—",
              group: dbMember.group?.name || "Small Group A",
              avatar: dbMember.avatarUrl || mockAvatar(dbMember.firstName + " " + dbMember.lastName),
              attendanceRate: dbMember.status === "active" ? 92 : 50,
              lastAttendance: "Sep 26, 2026",
              joinedDate: dbMember.joinedAt
                ? new Date(dbMember.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Jan 15, 2024",
              isCommitted: dbMember.status === "active",
              committedReason: dbMember.status === "active" ? "Committed Member with consistent attendance" : undefined,
            };
            setMember(uiMember);
            memberResolved = true;
          }
        }
        if (!memberResolved && !initialMock) {
          const nameParts = decodeURIComponent(memberId).replace(/-/g, " ").split(" ");
          setMember({
            id: memberId,
            firstName: nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : "Member",
            lastName: nameParts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" "),
            email: "",
            phone: "—",
            status: "active",
            ministry: "General",
            group: "Small Group A",
            avatar: mockAvatar(memberId),
            attendanceRate: 0,
            lastAttendance: "—",
            joinedDate: "—",
          });
        }

        // 2. Fetch family tree
        try {
          const tree = await fetchMemberFamilyTree(memberId);
          if (tree) setFamilyTree(tree);
        } catch {}

        // 3. Fetch talent profile
        try {
          const talRes = await fetch(`/api/talent/members/${encodeURIComponent(memberId)}`);
          if (talRes.ok) {
            const talJson = await talRes.json();
            if (talJson.data?.entry) {
              setTalentProfile(talJson.data.entry);
            }
          }
        } catch {}
      } catch (err) {
        console.error("Failed loading Member 360 data:", err);
      } finally {
        setLoading(false);
      }
    });
  }, [memberId, initialMock, refreshGuard]);

  // A2: family-only edits (add/change/delete relationship, set head) only need
  // the family tree refreshed — the full member and talent fetch is skipped,
  // cutting a relationship edit burst from ~4 requests down to ~2.
  const refreshFamilyTree = React.useCallback(async () => {
    refreshGuard.run(async () => {
      try {
        const tree = await fetchMemberFamilyTree(memberId);
        if (tree) setFamilyTree(tree);
      } catch {}
    });
  }, [memberId, refreshGuard]);

  React.useEffect(() => {
    void loadMember360Data();
  }, [loadMember360Data]);

  useAttendanceRealtime({
    onMemberUpdated: (event) => {
      const updatedId = event.data?.memberId as string | undefined;
      if (!updatedId || updatedId === memberId || updatedId === member?.id) {
        void loadMember360Data();
      }
    },
  });

  const effectiveId = member?.id ?? memberId;
  const data = React.useMemo(() => {
    if (!member) return null;
    // Always produce a data object — getMember360 only knows mock members,
    // generateDefaultMember360 covers all real DB members gracefully.
    return (
      getMember360(effectiveId) ??
      getMember360(memberId) ??
      generateDefaultMember360(effectiveId, {
        ...member,
        // Ensure all fields generateDefaultMember360 needs are present
        firstName: member.firstName || "Member",
        lastName: member.lastName || "",
        ministry: member.ministry !== "—" ? member.ministry : undefined,
        group: member.group || undefined,
        joinedDate: member.joinedDate !== "—" ? member.joinedDate : undefined,
        status: member.status || "active",
      })
    );
  }, [member, effectiveId, memberId]);

  const [activeTab, setActiveTab] = React.useState<TabKey>("all");
  const [isAutoScrolling, setIsAutoScrolling] = React.useState(false);
  const [highlightedSection, setHighlightedSection] = React.useState<string | null>(null);

  const pageContainerRef = React.useRef<HTMLDivElement>(null);
  const autoScrollRafRef = React.useRef<number | null>(null);
  const autoScrollActiveRef = React.useRef(false);

  const { locale } = useLanguage();
  const t = useTranslation();
  const isAr = locale === "ar";

  // Helper to reliably find the active scrollable container (<main> in Dashboard Shell or window)
  const getScrollContainer = React.useCallback((): HTMLElement | null => {
    if (pageContainerRef.current) {
      const parentMain = pageContainerRef.current.closest("main");
      if (parentMain && parentMain.scrollHeight > parentMain.clientHeight) {
        return parentMain;
      }
    }
    const mainEl = document.querySelector("main");
    if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
      return mainEl;
    }
    if (document.scrollingElement && document.scrollingElement.scrollHeight > window.innerHeight) {
      return document.scrollingElement as HTMLElement;
    }
    return mainEl || (document.documentElement as HTMLElement);
  }, []);

  // Stop auto-scrolling
  const stopAutoScroll = React.useCallback(() => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    autoScrollActiveRef.current = false;
    setIsAutoScrolling(false);
  }, []);

  // Start very slow, continuous, gentle sliding down till the end
  const startAutoScroll = React.useCallback(() => {
    if (!member || !data) return;
    stopAutoScroll();
    const container = getScrollContainer();
    if (!container) return;

    autoScrollActiveRef.current = true;
    setIsAutoScrolling(true);

    let lastTime = performance.now();
    let currentScroll = container.scrollTop;
    // ~40-45px per second: very calm, readable pace
    const speedPerMs = 0.042;

    const step = (time: number) => {
      if (!autoScrollActiveRef.current) return;

      const activeContainer = getScrollContainer();
      if (!activeContainer) {
        stopAutoScroll();
        return;
      }

      const delta = Math.min(time - lastTime, 40);
      lastTime = time;

      // Detect if user has manually intervened or scrolled away
      if (Math.abs(activeContainer.scrollTop - currentScroll) > 18) {
        stopAutoScroll();
        return;
      }

      currentScroll += speedPerMs * delta;
      const maxScroll = activeContainer.scrollHeight - activeContainer.clientHeight;

      if (currentScroll >= maxScroll - 4) {
        activeContainer.scrollTop = maxScroll;
        stopAutoScroll();
        return;
      }

      activeContainer.scrollTop = currentScroll;
      autoScrollRafRef.current = requestAnimationFrame(step);
    };

    autoScrollRafRef.current = requestAnimationFrame(step);
  }, [getScrollContainer, stopAutoScroll, member, data]);

  // Listen for user interactions (wheel, touch, keys) to stop auto-scroll immediately
  React.useEffect(() => {
    const handleUserInteraction = () => {
      if (autoScrollActiveRef.current) {
        stopAutoScroll();
      }
    };

    const container = getScrollContainer();

    window.addEventListener("wheel", handleUserInteraction, { passive: true });
    window.addEventListener("touchmove", handleUserInteraction, { passive: true });
    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction);

    if (container && container !== document.documentElement) {
      container.addEventListener("wheel", handleUserInteraction, { passive: true });
      container.addEventListener("touchmove", handleUserInteraction, { passive: true });
      container.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    }

    return () => {
      stopAutoScroll();
      window.removeEventListener("wheel", handleUserInteraction);
      window.removeEventListener("touchmove", handleUserInteraction);
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      if (container && container !== document.documentElement) {
        container.removeEventListener("wheel", handleUserInteraction);
        container.removeEventListener("touchmove", handleUserInteraction);
        container.removeEventListener("pointerdown", handleUserInteraction);
      }
    };
  }, [getScrollContainer, stopAutoScroll]);

  // Start slow auto-slide down on view load after brief render pause (650ms)
  React.useEffect(() => {
    if (loading || !member || !data) return;
    const shouldAutoScroll = searchParams?.get("autoscroll") === "true";
    if (!shouldAutoScroll) return;

    const timer = setTimeout(() => {
      startAutoScroll();
    }, 650);

    return () => {
      clearTimeout(timer);
      stopAutoScroll();
    };
  }, [loading, member, data, searchParams, startAutoScroll, stopAutoScroll]);

  // Tab click: stop auto-scroll & auto-direct directly to that section
  const handleTabClick = React.useCallback(
    (tabKey: TabKey) => {
      stopAutoScroll();
      setActiveTab(tabKey);

      const container = getScrollContainer();
      const targetId = tabKey === "all" ? "section-overview" : `section-${tabKey}`;
      const target = document.getElementById(targetId);

      if (target && container) {
        if (tabKey === "all") {
          container.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          // sticky navigation tab bar height (~44px) + breathing room = 64px offset
          const targetTop = targetRect.top - containerRect.top + container.scrollTop - 64;
          container.scrollTo({
            top: Math.max(0, targetTop),
            behavior: "smooth",
          });
        }

        // Highlight targeted section clearly with animated ring
        setHighlightedSection(tabKey);
        setTimeout(() => {
          setHighlightedSection((prev) => (prev === tabKey ? null : prev));
        }, 2200);
      } else if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [getScrollContainer, stopAutoScroll]
  );

  // Active section tracking as container scrolls
  React.useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const sections: { key: TabKey; id: string }[] = [
      { key: "rewards", id: "section-rewards" },
      { key: "attendance", id: "section-attendance" },
      { key: "engagement", id: "section-engagement" },
      { key: "care", id: "section-care" },
      { key: "timeline", id: "section-timeline" },
    ];

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;

      if (scrollTop < 160) {
        setActiveTab("all");
        return;
      }

      let currentTab: TabKey = "all";
      for (const sec of sections) {
        const el = document.getElementById(sec.id);
        if (el) {
          const elRect = el.getBoundingClientRect();
          const relTop = elRect.top - containerRect.top;
          const relBottom = elRect.bottom - containerRect.top;
          if (relTop <= 140 && relBottom > 80) {
            currentTab = sec.key;
          }
        }
      }

      setActiveTab(currentTab);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [getScrollContainer]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-500">
          {isAr ? "جاري تحميل ملف العضو 360..." : "Loading Member 360 profile..."}
        </p>
      </div>
    );
  }

  // Graceful not-found state — never throw notFound() which cascades errors through the tree.
  if (!member || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-3xl">
          👤
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isAr ? "لم يتم العثور على العضو" : "Member not found"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isAr
              ? "تعذر تحميل بيانات العضو. يرجى التحقق من الرابط أو المحاولة مرة أخرى."
              : "Could not load member data. Check the link or try again."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          {isAr ? "العودة" : "Go Back"}
        </button>
      </div>
    );
  }

  const isCommitted = data.attendanceRate >= 90;
  const memberFullName = `${member.firstName} ${member.lastName}`;

  // Compact tabs definition: exactly 6 tabs in ONE row, no horizontal sliding
  const compactTabs: { key: TabKey; label: string; icon: string; highlight?: boolean }[] = [
    { key: "all", label: isAr ? "الكل" : "All", icon: "🌐" },
    {
      key: "rewards",
      label: isAr ? "التكريم" : "Rewards",
      icon: "🏆",
      highlight: isCommitted,
    },
    { key: "attendance", label: isAr ? "الحضور" : "Attendance", icon: "📅" },
    { key: "engagement", label: isAr ? "الخدمة" : "Serving", icon: "⚡" },
    { key: "family", label: isAr ? "الأسرة" : "Family", icon: "👪" },
    { key: "care", label: isAr ? "الرعاية" : "Care", icon: "🕊️" },
    { key: "timeline", label: isAr ? "الأنشطة" : "Timeline", icon: "📜" },
  ];

  return (
    <div
      ref={pageContainerRef}
      className="space-y-6 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 min-h-screen p-4 sm:p-6 -m-4 sm:-m-6 relative"
    >
      <MemberHeader
        member={member}
        data={data}
        onSelectRewardTab={() => handleTabClick("rewards")}
        onMemberStatusChange={(newStatus) => {
          setMember((prev: any) => (prev ? { ...prev, status: newStatus } : prev));
        }}
        onMemberDeleted={() => {
          window.location.href = "/people";
        }}
      />

      {/* Compact Tabs Navigation — Strictly in ONE single row without horizontal sliding */}
      <nav
        aria-label="Member 360 Sections"
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-md rounded-xl p-1 border border-gray-200/90 shadow-sm"
      >
        <div className="grid grid-cols-7 gap-1 w-full">
          {compactTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.key)}
                className={`w-full flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-[11px] sm:text-xs md:text-sm font-semibold rounded-lg transition-all cursor-pointer truncate ${
                  isActive
                    ? tab.highlight
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-xs"
                      : "bg-blue-600 text-white shadow-xs"
                    : tab.highlight
                    ? "text-amber-800 bg-amber-50/80 hover:bg-amber-100"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                }`}
              >
                <span className="text-xs sm:text-sm shrink-0">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Overview KPIs */}
      <div id="section-overview" className="scroll-mt-20">
        <OverviewKpis data={data} />
      </div>

      {/* All Sections Laid Out with Section IDs for Smooth Auto-Direct & Auto-Slide */}
      <div className="space-y-8">
        {/* Section: Rewards & Recognition */}
        <div
          id="section-rewards"
          className={`scroll-mt-20 transition-all duration-500 rounded-2xl ${
            highlightedSection === "rewards" ? "ring-4 ring-amber-400/80 shadow-md" : ""
          }`}
        >
          <RewardingSection data={data} memberName={memberFullName} />
        </div>

        {/* Section: Attendance */}
        <div
          id="section-attendance"
          className={`scroll-mt-20 transition-all duration-500 rounded-2xl ${
            highlightedSection === "attendance" ? "ring-4 ring-blue-400/80 shadow-md" : ""
          }`}
        >
          <AttendanceSection data={data} />
        </div>

        {/* Section: Engagement & Serving */}
        <div
          id="section-engagement"
          className={`scroll-mt-20 transition-all duration-500 rounded-2xl space-y-6 ${
            highlightedSection === "engagement" ? "ring-4 ring-purple-400/80 shadow-md" : ""
          }`}
        >
          <EngagementSection data={data} />
          <MinistrySection data={data} />
          <TalentSection profile={talentProfile} />
        </div>

        {/* Section: Family */}
        <div
          id="section-family"
          className={`scroll-mt-20 transition-all duration-500 rounded-2xl ${
            highlightedSection === "family" ? "ring-4 ring-rose-400/80 shadow-md" : ""
          }`}
        >
          <FamilySection
            tree={familyTree}
            memberId={memberId}
            onRefresh={refreshFamilyTree}
            onMemberEditRefresh={loadMember360Data}
          />
        </div>

        {/* Section: Care & Prayer */}
        <div
          id="section-care"
          className={`scroll-mt-20 transition-all duration-500 rounded-2xl grid grid-cols-1 lg:grid-cols-2 gap-6 ${
            highlightedSection === "care" ? "ring-4 ring-emerald-400/80 shadow-md" : ""
          }`}
        >
          <CareSection data={data} memberName={memberFullName} />
          <PrayerSection data={data} />
        </div>

        {/* Section: Timeline & Activity History */}
        <div
          id="section-timeline"
          className={`scroll-mt-20 transition-all duration-500 rounded-2xl grid grid-cols-1 lg:grid-cols-2 gap-6 ${
            highlightedSection === "timeline" ? "ring-4 ring-indigo-400/80 shadow-md" : ""
          }`}
        >
          <TimelineSection data={data} />
          <div className="space-y-6">
            <NotesSection data={data} />
            <ActivitySection data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
