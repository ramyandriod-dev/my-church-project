"use client";

/**
 * /community — the Community Dashboard
 *
 * The landing screen for the whole feature: ask a question, look at the
 * directory, submit an idea, or update your own talent details.
 *
 * The two counts that need care are `membersWithSkills` and
 * `discoverableMembers`. They are different numbers and both matter: a member
 * who has listed skills but opted out of the directory is real, and collapsing
 * the two would quietly pressure people into being discoverable. They are shown
 * separately for that reason.
 */

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { mockCommunityStats, mockTalentDirectory } from "@/lib/mock-data/community";
import type { TalentWillingness } from "@/lib/backend/types";

const WILLINGNESS: TalentWillingness[] = ["yes", "maybe", "not_currently"];

export default function CommunityPage() {
  const { t } = useTranslation();
  const [question, setQuestion] = React.useState("");
  const [ideaStats, setIdeaStats] = React.useState<{ total: number; byStatus: Record<string, number> } | null>(null);

  React.useEffect(() => {
    fetch("/api/ideas/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setIdeaStats(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const stats = {
    ...mockCommunityStats,
    ideasSubmitted: ideaStats ? ideaStats.total : mockCommunityStats.ideasSubmitted,
    ideasUnderReview: ideaStats ? (ideaStats.byStatus?.under_review ?? 0) : mockCommunityStats.ideasUnderReview,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t("communityPage.title", "Community")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("communityPage.subtitle", "")}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("communityPage.searchPlaceholder", "Who can help me?")}
          </h2>
          <form
            action="/community/talent/search"
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-[18rem] flex-1">
              <Input
                name="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("communityPage.searchHint", "")}
                aria-label={t("communityPage.searchButton", "Search")}
              />
            </div>
            <Button type="submit" disabled={!question.trim()}>
              {t("communityPage.searchButton", "Search")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("communityPage.statsProfiles", "Talent profiles")}
          value={stats.membersWithSkills}
        />
        <Stat
          label={t("communityPage.willingYes", "Happy to help")}
          value={stats.membersWillingToHelp}
        />
        <Stat label={t("communityPage.statsIdeas", "Ideas")} value={stats.ideasSubmitted} />
        <Stat
          label={t("communityPage.statsIdeasOpen", "Open ideas")}
          value={stats.ideasUnderReview}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t("communityPage.willingYes", "Happy to help")}
            </h2>
            <ul className="space-y-2">
              {WILLINGNESS.map((level) => {
                const count = mockTalentDirectory.filter(
                  (p) => p.willingness === level && p.memberId !== "m-noah",
                ).length;
                const total = stats.membersWithSkills || 1;
                return (
                  <li key={level} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs text-slate-600 dark:text-slate-300">
                      {level === "yes"
                        ? t("communityPage.willingYes", "Happy to help")
                        : level === "maybe"
                          ? t("communityPage.willingMaybe", "Maybe")
                          : t("communityPage.willingNotCurrently", "Not right now")}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span
                        className="block h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.round((count / total) * 100)}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t("communityPage.statsProfilesWithSkills", "With skills listed")}
            </h2>
            <ul className="space-y-2">
              {stats.topSkills.map((s) => (
                <li key={s.name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{s.name}</span>
                  <span className="text-slate-500 dark:text-slate-400">{s.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/community/talent">
          <Button variant="secondary">{t("communityPage.talentDirectory", "Talent Directory")}</Button>
        </Link>
        <Link href="/community/ideas">
          <Button variant="secondary">{t("communityPage.ideaBank", "Idea Bank")}</Button>
        </Link>
        <Link href="/community/my-talent">
          <Button variant="secondary">{t("communityPage.myTalent", "My Talent")}</Button>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent>
        <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </CardContent>
    </Card>
  );
}
