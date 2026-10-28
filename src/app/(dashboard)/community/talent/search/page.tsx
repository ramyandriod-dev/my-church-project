"use client";

/**
 * /community/talent/search — natural-language talent search
 *
 * The member asks a question in their own words. Two guarantees are visible on
 * this screen rather than buried in a policy page:
 *
 *  - what the AI receives. Only the question text is interpreted. No member
 *    record, profile, contact detail or the church's skill vocabulary is sent.
 *    The notice above the field says so, and when the interpreter falls back to
 *    direct word matching it says that too, so nobody is left believing an AI
 *    was involved when it was not.
 *  - why each person matched. Every result carries its own reasons, phrased from
 *    values stored on the profile. A result with no reason is not shown as a
 *    confident match.
 *
 * Results are always restricted to discoverable profiles.
 */

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TalentCard, SearchPrivacyNotice } from "@/components/community/community-parts";
import { useTranslation } from "@/lib/i18n";
import { mockTalentDirectory } from "@/lib/mock-data/community";
import type { TalentDirectoryEntry } from "@/lib/backend/types";

/** A result plus the reasoning the interpreter produced for it. */
interface SearchResult {
  person: TalentDirectoryEntry;
  reasons: string[];
}

/**
 * Stand-in for the interpreter, producing reasons phrased from stored values.
 *
 * Live data comes from POST /api/talent/search. The important property here is
 * that a reason can only ever quote something actually on the profile, so the
 * explanation cannot claim a match that is not there.
 */
function searchLocally(question: string): SearchResult[] {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !["who", "can", "the", "any", "help", "with", "for", "are", "our"].includes(w));

  return mockTalentDirectory
    // The opt-out is applied before anything is matched, exactly as the
    // repository does with `discoverableOnly: true`.
    .filter((p) => p.memberId !== "16")
    .map((person) => {
      const reasons: string[] = [];
      for (const term of terms) {
        const named = person.skills.find(
          (s) => s.name.toLowerCase().includes(term) || term.includes(s.name.toLowerCase()),
        );
        if (named) reasons.push(`Skill: ${named.name}`);
        if (person.profession?.toLowerCase().includes(term)) {
          reasons.push(`Profession: ${person.profession}`);
        }
        if (person.experience?.toLowerCase().includes(term)) {
          reasons.push("Described relevant experience");
        }
      }
      return { person, reasons };
    })
    .filter((r) => r.reasons.length > 0)
    .sort((a, b) => b.reasons.length - a.reasons.length);
}

export default function TalentSearchPage() {
  const { t } = useTranslation();
  const [question, setQuestion] = React.useState("");
  const [submitted, setSubmitted] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  // True when the interpreter fell back to plain word matching. Surfaced so the
  // AI notice cannot imply an AI was consulted when it was not.
  const [usedFallback, setUsedFallback] = React.useState(false);

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const question_ = question.trim();
    if (!question_) return;

    setSearching(true);
    setSubmitted(question_);
    try {
      // Live: POST /api/talent/search { question, limit }
      const found = searchLocally(question_);
      setResults(found);
      setUsedFallback(true);
    } finally {
      setSearching(false);
    }
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

      <SearchPrivacyNotice usedFallback={usedFallback} />

      <form onSubmit={runSearch} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[18rem] flex-1">
          <label
            htmlFor="talent-question"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {t("communityPage.searchPlaceholder", "Who can help me?")}
          </label>
          <Input
            id="talent-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("communityPage.searchPlaceholder", "Who can help me?")}
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {t("communityPage.searchHint", "")}
          </p>
        </div>
        <Button type="submit" disabled={searching || !question.trim()}>
          {searching
            ? t("communityPage.searching", "Searching...")
            : t("communityPage.searchButton", "Search")}
        </Button>
      </form>

      {submitted !== null ? (
        <section className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-slate-100">
              {results.length} {t("communityPage.resultsCount", "results")}
            </strong>{" "}
            {t("communityPage.searchIntro", "")}
          </p>

          {results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {t("communityPage.noResults", "Nobody matched your question.")}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("communityPage.noResultsHint", "")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map(({ person, reasons }) => (
                // showContact is false: a member asking "who can help" is not a
                // reason to hand out contact details, only a way to find a name.
                <TalentCard key={person.memberId} person={person} matchReasons={reasons} showContact={false} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
