"use client";

/**
 * /community/ideas — the Idea Bank
 *
 * Anyone signed in can read the bank and submit an idea; only holders of
 * `ideas.manage` can move one through the workflow. Both halves are on this
 * screen, and the notes boundary is the part worth reading closely.
 *
 * `internalNotes` are the church's working notes on an idea. The member who
 * submitted it must never receive them. The real boundary is the repository
 * projection — an unauthorised response has no such field at all — and the mock
 * mirrors that by running every row through `toMemberVisibleIdea`. The staff
 * view below shows the same ideas with notes included, so the difference is
 * visible rather than merely asserted. A screen that "just hid it with CSS"
 * would not survive the member's browser never receiving the text.
 */

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { IdeaStatusBadge, NameWithAvatar } from "@/components/community/community-parts";
import { useTranslation } from "@/lib/i18n";
import { toMemberVisibleIdea } from "@/lib/mock-data/community";
import type { Idea, IdeaStatus } from "@/lib/backend/types";

const CATEGORIES = [
  "facilities",
  "ministry",
  "outreach",
  "families",
  "youth",
  "children",
  "other",
] as const;

const STATUS_FILTERS: (IdeaStatus | "all")[] = [
  "all",
  "new",
  "under_review",
  "planned",
  "implemented",
  "declined",
];

export default function IdeasPage() {
  const { t } = useTranslation();

  // The demo runs as staff, so the bank is shown with notes. A member's view
  // takes the same rows and drops them.
  const [asStaff, setAsStaff] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<IdeaStatus | "all">("all");
  const [ideas, setIdeas] = React.useState<Idea[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<string>("facilities");
  const [categoryOther, setCategoryOther] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  const fetchIdeas = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ideas");
      if (res.ok) {
        const json = await res.json();
        const items = json.data?.items || [];
        setIdeas(items);
      }
    } catch (err) {
      console.error("Failed to load ideas:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const shown = React.useMemo(() => {
    const base = statusFilter === "all" ? ideas : ideas.filter((i) => i.status === statusFilter);
    return asStaff ? base : base.map(toMemberVisibleIdea);
  }, [ideas, statusFilter, asStaff]);

  const handleTransition = async (ideaId: string, next: IdeaStatus) => {
    try {
      const res = await fetch(`/api/ideas/${ideaId}/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.idea) {
          setIdeas((prev) => prev.map((i) => (i.id === ideaId ? json.data.idea : i)));
        } else {
          await fetchIdeas();
        }
      }
    } catch (err) {
      console.error("Failed to transition idea:", err);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: category === "other" ? "other" : category,
          categoryOther: category === "other" ? categoryOther.trim() || null : null,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data?.idea) {
          setIdeas((prev) => [json.data.idea, ...prev]);
        } else {
          await fetchIdeas();
        }
        setTitle("");
        setDescription("");
        setCategoryOther("");
        setSaved(true);
        window.setTimeout(() => setSaved(false), 4000);
      } else {
        const errJson = await res.json().catch(() => null);
        console.error("Failed to submit idea:", errJson);
      }
    } catch (err) {
      console.error("Failed to submit idea:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {t("communityPage.ideaBank", "Idea Bank")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("communityPage.subtitle", "")}
            </p>
          </div>
          <button
            onClick={fetchIdeas}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Refresh"
            aria-label="Refresh ideas"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={asStaff}
            onChange={(e) => setAsStaff(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          {t("communityPage.internalNotes", "Internal notes")}
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "primary" : "ghost"}
            onClick={() => setStatusFilter(s)}
          >
            {s === "all"
              ? t("communityPage.all", "All")
              : t(
                  s === "new"
                    ? "communityPage.statusNew"
                    : s === "under_review"
                      ? "communityPage.statusUnderReview"
                      : s === "planned"
                        ? "communityPage.statusPlanned"
                        : s === "implemented"
                          ? "communityPage.statusImplemented"
                          : "communityPage.statusDeclined",
                  s,
                )}
          </Button>
        ))}
      </div>

      {isLoading && ideas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>{t("common.loading", "Loading ideas...")}</span>
            </div>
          </CardContent>
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t("communityPage.noIdeas", "No ideas yet.")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((idea) => (
            <Card key={idea.id}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">
                      {idea.title}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {idea.submitter ? (
                        <NameWithAvatar
                          firstName={idea.submitter.firstName}
                          lastName={idea.submitter.lastName}
                          avatarUrl={idea.submitter.avatarUrl}
                        />
                      ) : (
                        <span>{t("common.loading", "")}</span>
                      )}
                      <span>·</span>
                      <span>{idea.categoryOther ?? idea.category}</span>
                    </div>
                  </div>
                  <IdeaStatusBadge status={idea.status} />
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300">{idea.description}</p>

                {asStaff && idea.internalNotes ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      {t("communityPage.internalNotes", "Internal notes")}
                    </p>
                    <p className="mt-1 text-amber-900 dark:text-amber-100">{idea.internalNotes}</p>
                    <p className="mt-1.5 text-xs text-amber-700/80 dark:text-amber-400/80">
                      {t("communityPage.internalNotesHint", "")}
                    </p>
                  </div>
                ) : null}

                {idea.allowedTransitions && idea.allowedTransitions.length > 0 && asStaff ? (
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {idea.allowedTransitions.map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        variant="secondary"
                        onClick={() => handleTransition(idea.id, next)}
                      >
                        {next}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("communityPage.submitIdea", "Share an idea")}
          </h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="idea-title"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t("communityPage.ideaTitle", "Idea title")}
              </label>
              <Input
                id="idea-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("communityPage.ideaTitlePlaceholder", "")}
              />
            </div>
            <div>
              <label
                htmlFor="idea-description"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t("communityPage.ideaDescription", "Describe the problem")}
              </label>
              <Textarea
                id="idea-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("communityPage.ideaDescriptionPlaceholder", "")}
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="idea-category"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {t("communityPage.ideaCategory", "Category")}
                </label>
                <Select
                  id="idea-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                />
              </div>
              {category === "other" ? (
                <div>
                  <label
                    htmlFor="idea-category-other"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    {t("communityPage.ideaCategoryOtherLabel", "Name your category")}
                  </label>
                  <Input
                    id="idea-category-other"
                    value={categoryOther}
                    onChange={(e) => setCategoryOther(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!title.trim() || !description.trim()}>
                {t("communityPage.submitIdea", "Share an idea")}
              </Button>
              {saved ? (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  {t("communityPage.ideaSubmitted", "Thank you, your idea was received.")}
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
