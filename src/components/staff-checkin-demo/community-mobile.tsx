"use client";

/**
 * The Community feature inside the phone frame.
 *
 * Deliberately self-contained rather than a reuse of the dashboard pages: those
 * are laid out for a wide screen with a sidebar, and squeezing them into 400px
 * would produce something that looks broken on a real phone. The data, types and
 * privacy rules are shared, so the two stay in step.
 *
 * The member is the signed-in user from the check-in flow. That matters for the
 * "my talent" tab: a member with no linked Member row gets an honest empty
 * state rather than a silent failure, because `/api/talent/me` answers 404 for
 * exactly that case.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  mockTalentDirectory,
  mockIdeas,
  toMemberVisibleIdea,
  mockSuggestedSkills,
} from "@/lib/mock-data/community";
import type { Idea, TalentDirectoryEntry } from "@/lib/backend/types";
import type { SignInUser } from "@/lib/staff-checkin-demo/types";

type Tab = "search" | "ideas" | "talent";

interface Match {
  person: TalentDirectoryEntry;
  reasons: string[];
}

function searchLocally(question: string): Match[] {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (w) =>
        w.length > 2 &&
        !["who", "can", "the", "any", "help", "with", "for", "are", "our", "need"].includes(w),
    );

  return mockTalentDirectory
    // Opt-out applied before matching, exactly as the repository does.
    .filter((p) => p.memberId !== "16")
    .map((person) => {
      const reasons: string[] = [];
      for (const term of terms) {
        const named = person.skills.find(
          (s) =>
            s.name.toLowerCase().includes(term) || term.includes(s.name.toLowerCase()),
        );
        if (named) reasons.push(`Skill: ${named.name}`);
        if (person.profession?.toLowerCase().includes(term)) {
          reasons.push(`Profession: ${person.profession}`);
        }
      }
      return { person, reasons };
    })
    .filter((m) => m.reasons.length > 0);
}

export function CommunityMobile({ user }: { user: SignInUser }) {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<Tab>("search");
  const [question, setQuestion] = React.useState("");
  const [matches, setMatches] = React.useState<Match[] | null>(null);
  const [ideas, setIdeas] = React.useState<Idea[]>(mockIdeas.map(toMemberVisibleIdea));
  const [skills, setSkills] = React.useState<string[]>(["Web Development"]);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const tabs: { key: Tab; label: string }[] = [
    { key: "search", label: t("communityPage.talentDirectory", "Talent") },
    { key: "ideas", label: t("communityPage.ideaBank", "Ideas") },
    { key: "talent", label: t("communityPage.myTalent", "My Talent") },
  ];

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setMatches(searchLocally(question));
  };

  const sendIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    const created: Idea = {
      ...toMemberVisibleIdea(mockIdeas[0]),
      id: `idea-mobile-${ideas.length + 1}`,
      title: title.trim(),
      description: description.trim(),
      status: "new",
      submitter: null,
      allowedTransitions: ["under_review", "planned", "declined"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setIdeas((prev) => [created, ...prev]);
    setTitle("");
    setDescription("");
    setSent(true);
    window.setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "flex-1 px-2 py-2.5 text-xs font-semibold",
              tab === item.key
                ? "border-b-2 border-cyan-500 text-cyan-700"
                : "text-gray-500",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-3">
        {tab === "search" ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-cyan-50 p-2.5 text-[11px] leading-relaxed text-cyan-900">
              {t("communityPage.aiNotice", "")}
            </p>
            <form onSubmit={runSearch} className="space-y-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("communityPage.searchPlaceholder", "Who can help me?")}
                className="text-sm"
              />
              <Button type="submit" size="sm" className="w-full" disabled={!question.trim()}>
                {t("communityPage.searchButton", "Search")}
              </Button>
            </form>

            {matches === null ? null : matches.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-500">
                {t("communityPage.noResults", "Nobody matched your question.")}
              </p>
            ) : (
              matches.map(({ person, reasons }) => (
                <div key={person.memberId} className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">
                    {person.firstName} {person.lastName}
                  </p>
                  {person.profession ? (
                    <p className="text-xs text-gray-500">{person.profession}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {person.skills.map((s) => (
                      <span
                        key={s.name}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                  {/* No contact details: searching is not consent to be handed
                      a phone number. */}
                  <ul className="mt-2 space-y-0.5">
                    {reasons.map((r, i) => (
                      <li key={`${r}-${i}`} className="text-[10px] text-emerald-700">
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        ) : null}

        {tab === "ideas" ? (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div key={idea.id} className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-sm font-semibold text-gray-900">{idea.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{idea.description}</p>
                <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                  {idea.status}
                </span>
              </div>
            ))}

            <form onSubmit={sendIdea} className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-gray-900">
                {t("communityPage.submitIdea", "Share an idea")}
              </p>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("communityPage.ideaTitle", "Idea title")}
                className="text-sm"
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("communityPage.ideaDescription", "Describe the problem")}
                className="text-sm"
                rows={2}
              />
              <Button
                type="submit"
                size="sm"
                className="w-full"
                disabled={!title.trim() || !description.trim()}
              >
                {t("communityPage.submitIdea", "Share an idea")}
              </Button>
              {sent ? (
                <p className="text-center text-[11px] text-emerald-600">
                  {t("communityPage.ideaSubmitted", "Thank you.")}
                </p>
              ) : null}
            </form>
          </div>
        ) : null}

        {tab === "talent" ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs text-gray-500">
                {t("communityPage.noProfileHint", "Add your skills so others can find you.")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mockSuggestedSkills.map((name) => {
                  const active = skills.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() =>
                        setSkills((prev) =>
                          prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
                        )
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px]",
                        active
                          ? "border-cyan-500 bg-cyan-50 text-cyan-800"
                          : "border-gray-300 text-gray-600",
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-2 rounded-xl bg-white p-3 shadow-sm">
              <input
                type="checkbox"
                defaultChecked
                className="mt-0.5 h-4 w-4"
                aria-label={t("communityPage.statsDiscoverable", "Discoverable")}
              />
              <span className="text-[11px] leading-relaxed text-gray-600">
                {t("communityPage.searchIntro", "")}
              </span>
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
