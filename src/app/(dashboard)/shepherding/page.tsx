"use client";

import * as React from "react";
import { mockAvatar, mockPortrait } from "@/lib/avatars/mock-avatar";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { shepherdingRecords, getShepherdingStats, type ShepherdingRecord } from "@/lib/mock-data/shepherding";
import { useLanguage, useTranslation, Ltr } from "@/lib/i18n";

export interface LivePrayerRequest {
  id: string;
  personName: string;
  avatar: string;
  category: string;
  request: string;
  submittedAt: string;
  submittedDate: string;
  createdAtRaw: string;
  status: "new" | "in-prayer" | "prayed" | "follow-up-needed";
  assignedShepherd?: string;
}

const statusColors: Record<string, "red" | "yellow" | "green"> = {
  "attention-needed": "red",
  stable: "yellow",
  thriving: "green",
};

const categoryIcons: Record<string, React.ReactNode> = {
  family: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  health: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  work: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  relationships: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  spiritual: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  other: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

const getCategoryIcon = (cat: string) => {
  const c = (cat || "").toLowerCase();
  if (c.includes("fam")) return categoryIcons.family;
  if (c.includes("health")) return categoryIcons.health;
  if (c.includes("work") || c.includes("job")) return categoryIcons.work;
  if (c.includes("relat")) return categoryIcons.relationships;
  if (c.includes("spirit") || c.includes("pastor") || c.includes("pray")) return categoryIcons.spiritual;
  return categoryIcons.other;
};

const getCategoryColor = (cat: string) => {
  const c = (cat || "").toLowerCase();
  if (c.includes("fam")) return "bg-blue-50 text-blue-600";
  if (c.includes("health")) return "bg-coral-50 text-coral-600";
  if (c.includes("work")) return "bg-purple-50 text-purple-600";
  if (c.includes("relat")) return "bg-pink-50 text-pink-600";
  if (c.includes("pastor")) return "bg-purple-50 text-purple-600";
  if (c.includes("pray") || c.includes("spirit")) return "bg-mint-50 text-mint-600";
  return "bg-gray-100 text-gray-600";
};

const prayerStatusColors: Record<string, "blue" | "yellow" | "green" | "red"> = {
  "new": "blue",
  "in-prayer": "yellow",
  "prayed": "green",
  "follow-up-needed": "red",
};

export default function ShepherdingPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 bg-gradient-to-br from-rose-50/50 via-white to-rose-50/30 min-h-screen p-6 -m-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">جاري التحميل...</div>
        </div>
      </div>
    }>
      <ShepherdingContent />
    </Suspense>
  );
}

function ShepherdingContent() {
  const { locale } = useLanguage();
  const t = useTranslation();
  const isAr = locale === "ar";

  const searchParams = useSearchParams();
  const initialView = searchParams.get("view") === "prayer-requests" ? "prayer-requests" : "shepherding";
  const [currentView, setCurrentView] = React.useState<"shepherding" | "prayer-requests">(initialView as any);
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [selectedRecord, setSelectedRecord] = React.useState<ShepherdingRecord | null>(null);
  const [selectedPrayer, setSelectedPrayer] = React.useState<LivePrayerRequest | null>(null);
  const [livePrayers, setLivePrayers] = React.useState<LivePrayerRequest[]>([]);
  const [isLoadingPrayers, setIsLoadingPrayers] = React.useState(true);
  const [updatingPrayerId, setUpdatingPrayerId] = React.useState<string | null>(null);
  const stats = getShepherdingStats();

  const fetchPrayers = React.useCallback(async () => {
    setIsLoadingPrayers(true);
    try {
      const res = await fetch("/api/prayers");
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : [];
        const formatted: LivePrayerRequest[] = list.map((item: any) => {
          const d = new Date(item.createdAt);
          const name = item.member
            ? `${item.member.firstName} ${item.member.lastName}`.trim()
            : "Anonymous Member";
          const avatar =
            item.member?.avatarUrl ||
            mockAvatar(name);
          const rawStatus = (item.status || "new").toLowerCase().replace(/_/g, "-");
          const status: "new" | "in-prayer" | "prayed" | "follow-up-needed" =
            rawStatus === "in-prayer" || rawStatus === "prayed" || rawStatus === "follow-up-needed"
              ? rawStatus
              : "new";

          return {
            id: item.id,
            personName: name,
            avatar,
            category: item.category || "other",
            request: item.request || "",
            submittedAt: !isNaN(d.getTime())
              ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
              : "Recently",
            submittedDate: !isNaN(d.getTime())
              ? d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
              : "Today",
            createdAtRaw: item.createdAt,
            status,
            assignedShepherd: item.shepherd?.name || item.assignedShepherd || undefined,
          };
        });
        setLivePrayers(formatted);
      }
    } catch (err) {
      console.error("Failed to load live prayers:", err);
    } finally {
      setIsLoadingPrayers(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);

  const prayerStats = React.useMemo(() => {
    const today = new Date().toDateString();
    const total = livePrayers.length;
    const todayCount = livePrayers.filter((r) => {
      try {
        return new Date(r.createdAtRaw).toDateString() === today;
      } catch {
        return false;
      }
    }).length;
    const newCount = livePrayers.filter((r) => r.status === "new").length;
    const inPrayerCount = livePrayers.filter((r) => r.status === "in-prayer").length;
    const prayedCount = livePrayers.filter((r) => r.status === "prayed").length;
    const followUpCount = livePrayers.filter((r) => r.status === "follow-up-needed").length;
    return { total, todayCount, newCount, inPrayerCount, prayedCount, followUpCount };
  }, [livePrayers]);

  const filtered = React.useMemo(() => {
    return shepherdingRecords.filter(r => {
      return statusFilter === "All" || r.status === statusFilter.toLowerCase().replace(" ", "-");
    });
  }, [statusFilter]);

  const formatShepherdingStatus = (s: string) => {
    if (!isAr) return s === "attention-needed" ? "Needs Attention" : s === "stable" ? "Stable" : "Thriving";
    if (s === "attention-needed") return "تحتاج إلى اهتمام";
    if (s === "stable") return "مستقرة";
    if (s === "thriving") return "نشطة ونامية";
    return s;
  };

  const formatPrayerStatus = (s: string) => {
    if (!isAr) return s === "new" ? "New" : s === "in-prayer" ? "In Prayer" : s === "prayed" ? "Prayed For" : "Follow-up Needed";
    if (s === "new") return "جديد";
    if (s === "in-prayer") return "قيد الصلاة";
    if (s === "prayed") return "تمت الصلاة";
    if (s === "follow-up-needed") return "تحتاج إلى متابعة";
    return s;
  };

  const formatPrayerCategory = (cat: string) => {
    if (!isAr) return cat;
    const map: Record<string, string> = {
      family: "الأسرة",
      health: "الصحة والشفاء",
      work: "العمل",
      relationships: "العلاقات",
      spiritual: "الحياة الروحية",
      other: "أخرى",
      "Pastoral Care (Confidential)": "رعاية رعوية (سري)",
      "Prayer Team": "فريق الصلاة",
      "General": "عام",
    };
    return map[cat] || cat;
  };

  const handleMarkAsPrayed = async (prayerId: string) => {
    setUpdatingPrayerId(prayerId);
    try {
      const res = await fetch(`/api/prayers/${prayerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "prayed" }),
      });
      if (res.ok) {
        setLivePrayers((prev) =>
          prev.map((p) => (p.id === prayerId ? { ...p, status: "prayed" } : p))
        );
        setSelectedPrayer((prev) =>
          prev && prev.id === prayerId ? { ...prev, status: "prayed" } : prev
        );
      }
    } catch (err) {
      console.error("Failed to mark prayer as prayed:", err);
    } finally {
      setUpdatingPrayerId(null);
    }
  };

  return (
    <div className="space-y-6 bg-gradient-to-br from-rose-50/50 via-white to-rose-50/30 min-h-screen p-6 -m-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-mint-50 rounded-xl">
            <svg className="w-6 h-6 text-mint-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.shepherdingPage.title}</h1>
            <p className="text-gray-500">{t.shepherdingPage.subtitle}</p>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setCurrentView("shepherding")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            currentView === "shepherding" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {isAr ? `الرعاية الكنسية والافتقاد (${stats.total})` : `Pastoral Care (${stats.total})`}
        </button>
        <button
          onClick={() => setCurrentView("prayer-requests")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            currentView === "prayer-requests" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {isAr ? `طلبات الصلاة (${prayerStats.total})` : `Prayer Requests (${prayerStats.total})`}
        </button>
        {currentView === "prayer-requests" && (
          <button
            onClick={fetchPrayers}
            disabled={isLoadingPrayers}
            className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            title={isAr ? "تحديث" : "Refresh"}
            aria-label="Refresh prayer requests"
          >
            <svg
              className={`w-4 h-4 ${isLoadingPrayers ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {currentView === "shepherding" ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t.shepherdingPage.attentionNeeded, value: stats.attention, color: "text-coral-600", bg: "bg-coral-50", icon: (
                <svg className="w-5 h-5 text-coral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )},
              { label: t.shepherdingPage.stable, value: stats.stable, color: "text-gold-600", bg: "bg-gold-50", icon: (
                <svg className="w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )},
              { label: t.shepherdingPage.thriving, value: stats.thriving, color: "text-mint-600", bg: "bg-mint-50", icon: (
                <svg className="w-5 h-5 text-mint-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )},
              { label: t.shepherdingPage.totalTracked, value: stats.total, color: "text-blue-600", bg: "bg-blue-50", icon: (
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              )},
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${kpi.bg} rounded-lg`}>
                      {kpi.icon}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{kpi.label}</p>
                      <p className={`text-2xl font-bold ${kpi.color}`}><Ltr>{kpi.value}</Ltr></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input w-full sm:w-52 ps-10 bg-white border border-gray-200 text-sm"
                  >
                    <option value="All">{isAr ? "كل الحالات" : "All Status"}</option>
                    <option value="Attention-Needed">{isAr ? "تحتاج إلى اهتمام" : "Needs Attention"}</option>
                    <option value="Stable">{isAr ? "مستقرة" : "Stable"}</option>
                    <option value="Thriving">{isAr ? "نشطة ونامية" : "Thriving"}</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Records List */}
          <div className="space-y-3">
            {filtered.map((record) => {
              const isAttention = record.status === "attention-needed";
              const isHighPriority = record.priority === "high";
              return (
                <Card
                  key={record.id}
                  hover
                  className={`cursor-pointer ${isAttention ? "bg-red-50/30 pulse-urgent-row" : ""}`}
                  onClick={() => setSelectedRecord(record)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={record.avatar}
                        alt={record.person}
                        className={`w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0 ${
                          isAttention ? "opacity-80" : ""
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-semibold ${isAttention ? "text-red-600 pulse-urgent" : "text-gray-900"}`}>
                            {record.person}
                          </h3>
                          <Badge variant={statusColors[record.status]}>{formatShepherdingStatus(record.status)}</Badge>
                          {isHighPriority && <Badge variant="red">{isAr ? "أولوية عاجلة" : "high priority"}</Badge>}
                        </div>
                        <p className={`text-sm mt-1 line-clamp-1 ${isAttention ? "text-red-500" : "text-gray-600"}`}>{record.notes}</p>
                        <div className={`flex items-center gap-4 mt-2 text-xs ${isAttention ? "text-red-400" : "text-gray-500"}`}>
                          <span>{isAr ? "مسؤول الرعاية: " : "Assigned to: "}{record.assignedTo}</span>
                          <span>{isAr ? "آخر تواصل / افتقاد: " : "Last contact: "}<Ltr>{record.lastContact}</Ltr></span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-rose-50 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">{isAr ? "لا توجد سجلات مطابقة" : "No records found"}</p>
                  <p className="text-sm text-gray-400 mt-1">{isAr ? "يرجى تعديل خيارات التصفية" : "Try adjusting your filter criteria"}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Prayer Requests View */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: isAr ? "طلبات جديدة" : "New", value: prayerStats.newCount, color: "text-blue-600", bg: "bg-blue-50" },
              { label: isAr ? "قيد الصلاة" : "In Prayer", value: prayerStats.inPrayerCount, color: "text-gold-600", bg: "bg-gold-50" },
              { label: isAr ? "تمت الصلاة من أجلها" : "Prayed For", value: prayerStats.prayedCount, color: "text-mint-600", bg: "bg-mint-50" },
              { label: isAr ? "تحتاج إلى متابعة" : "Follow-up", value: prayerStats.followUpCount, color: "text-coral-600", bg: "bg-coral-50" },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${kpi.bg} rounded-lg`}>
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{kpi.label}</p>
                      <p className={`text-2xl font-bold ${kpi.color}`}><Ltr>{kpi.value}</Ltr></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Prayer Requests List */}
          <div className="space-y-3">
            {isLoadingPrayers && livePrayers.length === 0 ? (
              <div className="flex items-center justify-center p-12 text-gray-400">
                <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                {isAr ? "جاري تحميل طلبات الصلاة..." : "Loading prayer requests..."}
              </div>
            ) : livePrayers.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <p className="font-medium">{isAr ? "لا توجد طلبات صلاة مسجلة حالياً" : "No prayer requests found"}</p>
                </CardContent>
              </Card>
            ) : (
              livePrayers.map((prayer) => (
                <Card
                  key={prayer.id}
                  hover
                  className="cursor-pointer"
                  onClick={() => setSelectedPrayer(prayer)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={prayer.avatar}
                        alt={prayer.personName}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{prayer.personName}</h3>
                          <Badge variant={prayerStatusColors[prayer.status] || "blue"}>{formatPrayerStatus(prayer.status)}</Badge>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(prayer.category)}`}>
                            {getCategoryIcon(prayer.category)}
                            {formatPrayerCategory(prayer.category)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{prayer.request}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span><Ltr>{prayer.submittedAt}</Ltr></span>
                          {prayer.assignedShepherd && <span>{isAr ? "مسؤول الرعاية: " : "Assigned: "}{prayer.assignedShepherd}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Detail Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedRecord(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto animate-slide-in border-s border-gray-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900">{isAr ? "تفاصيل الرعاية الكنسية" : "Pastoral Care Details"}</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {(() => {
                const isAtt = selectedRecord.status === "attention-needed";
                return (
                  <div className="flex items-center gap-4">
                    <img
                      src={selectedRecord.avatar}
                      alt={selectedRecord.person}
                      className={`w-16 h-16 rounded-full object-cover ring-4 shadow-lg shrink-0 ${
                        isAtt ? "ring-red-200" : "ring-white"
                      }`}
                    />
                    <div>
                      <h3 className={`text-xl font-bold ${isAtt ? "text-red-600" : "text-gray-900"}`}>
                        {selectedRecord.person}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={statusColors[selectedRecord.status]}>{formatShepherdingStatus(selectedRecord.status)}</Badge>
                        {selectedRecord.priority === "high" && <Badge variant="red">{isAr ? "أولوية عاجلة" : "high priority"}</Badge>}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{isAr ? "مسؤول الرعاية" : "Assigned To"}</p>
                    <p className="text-sm font-medium text-gray-900">{selectedRecord.assignedTo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{isAr ? "آخر تواصل / افتقاد" : "Last Contact"}</p>
                    <p className="text-sm font-medium text-gray-900"><Ltr>{selectedRecord.lastContact}</Ltr></p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-mint-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-mint-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{isAr ? "الملاحظات الرعوية" : "Notes"}</p>
                    <p className="text-sm text-gray-900 mt-1">{selectedRecord.notes}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm cursor-pointer">
                  {isAr ? "جدولة زيارة رعوية / افتقاد" : "Schedule Visit"}
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer">
                  {isAr ? "إضافة ملاحظة" : "Add Note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prayer Request Detail Drawer */}
      {selectedPrayer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedPrayer(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto animate-slide-in border-s border-gray-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900">{isAr ? "تفاصيل طلب الصلاة" : "Prayer Request"}</h2>
              <button
                onClick={() => setSelectedPrayer(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <img
                  src={selectedPrayer.avatar}
                  alt={selectedPrayer.personName}
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-lg shrink-0"
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedPrayer.personName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={prayerStatusColors[selectedPrayer.status] || "blue"}>{formatPrayerStatus(selectedPrayer.status)}</Badge>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(selectedPrayer.category)}`}>
                      {getCategoryIcon(selectedPrayer.category)}
                      {formatPrayerCategory(selectedPrayer.category)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{isAr ? "تاريخ التقديم" : "Submitted"}</p>
                    <p className="text-sm font-medium text-gray-900"><Ltr>{selectedPrayer.submittedDate} at {selectedPrayer.submittedAt}</Ltr></p>
                  </div>
                </div>
                {selectedPrayer.assignedShepherd && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{isAr ? "مسؤول الرعاية / الافتقاد" : "Assigned Shepherd"}</p>
                      <p className="text-sm font-medium text-gray-900">{selectedPrayer.assignedShepherd}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-mint-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-mint-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{isAr ? "موضوع طلب الصلاة" : "Prayer Request"}</p>
                    <p className="text-sm text-gray-900 mt-1">{selectedPrayer.request}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleMarkAsPrayed(selectedPrayer.id)}
                  disabled={updatingPrayerId === selectedPrayer.id || selectedPrayer.status === "prayed"}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm cursor-pointer disabled:opacity-50"
                >
                  {selectedPrayer.status === "prayed"
                    ? (isAr ? "تمت الصلاة عليها" : "Already Prayed")
                    : updatingPrayerId === selectedPrayer.id
                      ? (isAr ? "جاري التحديث..." : "Updating...")
                      : (isAr ? "تمت الصلاة" : "Mark as Prayed")}
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer">
                  {isAr ? "تعيين خادم رعاية" : "Assign Shepherd"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
