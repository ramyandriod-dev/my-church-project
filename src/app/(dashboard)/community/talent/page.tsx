"use client";

/**
 * /community/talent — the Talent Directory
 *
 * This screen now reads the live directory API rather than mock rows. The reason
 * that matters is the skill filter: a facet count is only meaningful if it came
 * from the same query as the list, and inventing counts client-side from a
 * loaded page would make every number wrong as soon as the set was filtered or
 * paginated.
 *
 * Two behaviours are deliberately *not* the old ones:
 *
 * - The supervisor-only "show people who opted out" control is driven by the
 *   session's `talent.update` permission, not a hard-coded `true`. Previously any
 *   visitor could toggle a flag the service would have silently ignored for them.
 * - A failed request shows an error. It used to fall back to sample people, which
 *   meant a broken API displayed invented names with invented skill counts, and
 *   nothing looked wrong.
 *
 * `isDiscoverable` is applied by the server before the response is built, so an
 * opted-out member is never sent to the browser and then hidden by the render.
 */

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TalentCard } from "@/components/community/community-parts";
import { SkillFilterPanel } from "@/components/community/skill-filter";
import { BulkMessageModal } from "@/components/community/bulk-message-modal";
import { useTranslation } from "@/lib/i18n";
import type { SkillFacet, TalentDirectoryEntry } from "@/lib/backend/types";

interface DirectoryResponse {
  items: TalentDirectoryEntry[];
  total: number;
  facets: SkillFacet[];
}

export default function TalentDirectoryPage() {
  const { t } = useTranslation();

  const [session, setSession] = React.useState<{
    canIncludeNotDiscoverable: boolean;
    canMessage: boolean;
  } | null>(null);

  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [skills, setSkills] = React.useState<string[]>([]);
  const [includeNotDiscoverable, setIncludeNotDiscoverable] = React.useState(false);

  const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(new Set());
  const [isBulkMessageOpen, setIsBulkMessageOpen] = React.useState(false);

  const [data, setData] = React.useState<DirectoryResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Read the session so the controls match what the server will actually accept.
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        const permissions: string[] = json?.data?.user?.permissions ?? [];
        if (!active) return;
        setSession({
          canIncludeNotDiscoverable: permissions.includes("talent.update"),
          canMessage: permissions.includes("messages.send"),
        });
      } catch {
        if (active) setSession({ canIncludeNotDiscoverable: false, canMessage: false });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Debounce so a keystroke does not fire a query per character.
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (debounced.trim()) params.set("search", debounced.trim());
        for (const id of skills) params.append("skills", id);
        // The service already resolves "any"; sent explicitly so the intent is
        // visible at the call site and survives a future default change.
        params.set("skillMode", "any");
        if (includeNotDiscoverable) params.set("includeNotDiscoverable", "true");

        const res = await fetch(`/api/talent/directory?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.error?.message ?? "Request failed");
        }
        if (!active) return;
        setData({ items: json.data.items ?? [], total: json.data.total ?? 0, facets: json.data.facets ?? [] });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (!active) return;
        setError(t("common.loadError", "Could not load the directory. Please try again."));
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [debounced, skills, includeNotDiscoverable, t]);

  function toggleSkill(id: string) {
    setSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function toggleSelect(id: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const items = data?.items ?? [];
  const facets = data?.facets ?? [];
  const willing = items.filter((p) => p.willingness === "yes").length;
  const filtersActive = skills.length > 0 || debounced.trim().length > 0;

  const allVisibleSelected =
    items.length > 0 && items.every((i) => selectedMemberIds.has(i.memberId));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(items.map((i) => i.memberId)));
    }
  }

  const selectedTalents = items.filter((i) => selectedMemberIds.has(i.memberId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t("communityPage.talentDirectory", "Talent Directory")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("communityPage.searchIntro", "")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          <SkillFilterPanel
            facets={facets}
            selected={skills}
            onToggle={toggleSkill}
            onClear={() => setSkills([])}
            loading={loading}
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1">
              <label
                htmlFor="talent-search"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t("common.search", "Search")}
              </label>
              <Input
                id="talent-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("common.searchPlaceholder", "Search by name, skill, profession, experience...")}
              />
            </div>

            {session?.canIncludeNotDiscoverable ? (
              <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeNotDiscoverable}
                  onChange={(e) => setIncludeNotDiscoverable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {t("communityPage.hideUndiscoverable", "Show people who opted out")}
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                <strong className="text-slate-900 dark:text-slate-100">{items.length}</strong>{" "}
                {t("communityPage.statsProfiles", "Talent profiles")}
              </span>
              <span>
                <strong className="text-slate-900 dark:text-slate-100">{willing}</strong>{" "}
                {t("communityPage.willingYes", "Happy to help")}
              </span>
              {filtersActive ? (
                <span>
                  <strong className="text-slate-900 dark:text-slate-100">{data?.total ?? 0}</strong>{" "}
                  {t("communityPage.resultsCount", "results")}
                </span>
              ) : null}
            </div>

            {session?.canMessage && items.length > 0 ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>{allVisibleSelected ? t("common.deselectAll", "Deselect all") : t("common.selectAll", "Select all")}</span>
              </label>
            ) : null}
          </div>

          {/* Sticky/Prominent Bulk Action Bar */}
          {selectedMemberIds.size > 0 && (
            <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/95 p-3.5 shadow-md backdrop-blur-xs dark:border-blue-900 dark:bg-blue-950/90">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-2xs">
                  {selectedMemberIds.size}
                </span>
                <span className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                  {selectedMemberIds.size}{" "}
                  {t("communityPage.selectedTalents", "talent member(s) selected")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300"
                  onClick={() => setSelectedMemberIds(new Set())}
                >
                  {t("common.clear", "Clear")}
                </Button>
                {session?.canMessage && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700 shadow-xs text-xs font-semibold"
                    onClick={() => setIsBulkMessageOpen(true)}
                  >
                    💬 {t("communityPage.sendMessageToSelected", "Send message to selected")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {error ? (
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => {
                    setError(null);
                    setSkills((s) => [...s]);
                  }}
                >
                  {t("common.retry", "Retry")}
                </Button>
              </CardContent>
            </Card>
          ) : loading && items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t("common.loading", "Loading...")}
                </p>
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {filtersActive
                    ? t("communityPage.noResults", "Nobody matched your question.")
                    : t("communityPage.noProfile", "No talent details yet.")}
                </p>
                {filtersActive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    onClick={() => {
                      setSkills([]);
                      setSearch("");
                    }}
                  >
                    {t("skillFilter.clearAll", "Clear all")}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((person: TalentDirectoryEntry) => (
                <TalentCard
                  key={person.memberId}
                  person={person}
                  canMessage={session?.canMessage ?? false}
                  selectable={session?.canMessage ?? false}
                  isSelected={selectedMemberIds.has(person.memberId)}
                  onToggleSelect={() => toggleSelect(person.memberId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BulkMessageModal
        isOpen={isBulkMessageOpen}
        onClose={() => setIsBulkMessageOpen(false)}
        selectedMembers={selectedTalents}
        onSent={() => setSelectedMemberIds(new Set())}
      />
    </div>
  );
}

