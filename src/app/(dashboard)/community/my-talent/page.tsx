"use client";

/**
 * /community/my-talent — a member's own talent profile
 *
 * The one screen in this feature a member edits, so it is the one place the
 * opt-out has to be genuinely in the member's hands. `isDiscoverable` is shown
 * as an explicit, default-on checkbox with a plain statement of what it means,
 * rather than buried as a side effect of saving. Someone who cannot tell what
 * the flag does cannot meaningfully choose it.
 *
 * A member with no profile is not shown an error. `GET /api/talent/me` answers
 * null, and the screen treats that as "not started yet" rather than "broken",
 * because a blank profile is the normal first-run state.
 */

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SkillChips } from "@/components/community/community-parts";
import { useTranslation } from "@/lib/i18n";
import { mockMyTalent, mockSuggestedSkills } from "@/lib/mock-data/community";
import type { TalentWillingness } from "@/lib/backend/types";

const PROFESSION_CATEGORIES = [
  "ministry",
  "technology",
  "healthcare",
  "legal",
  "finance",
  "education",
  "business",
  "trades",
  "creative",
  "communications",
  "other",
];

const WILLINGNESS_OPTIONS: { value: TalentWillingness; labelKey: string; fallback: string }[] = [
  { value: "yes", labelKey: "communityPage.willingYes", fallback: "Happy to help" },
  { value: "maybe", labelKey: "communityPage.willingMaybe", fallback: "Maybe" },
  {
    value: "not_currently",
    labelKey: "communityPage.willingNotCurrently",
    fallback: "Not right now",
  },
];

export default function MyTalentPage() {
  const { t } = useTranslation();
  const [skills, setSkills] = React.useState<string[]>(mockMyTalent.skills.map((s) => s.name));
  const [profession, setProfession] = React.useState(mockMyTalent.profession);
  const [professionCategory, setProfessionCategory] = React.useState(
    mockMyTalent.professionCategory,
  );
  const [experience, setExperience] = React.useState(mockMyTalent.experience);
  const [yearsExperience, setYearsExperience] = React.useState(
    String(mockMyTalent.yearsExperience ?? ""),
  );
  const [willingness, setWillingness] = React.useState<TalentWillingness>(
    mockMyTalent.willingness,
  );
  const [willingAreas, setWillingAreas] = React.useState(mockMyTalent.willingAreas ?? "");
  const [isDiscoverable, setIsDiscoverable] = React.useState(mockMyTalent.isDiscoverable);
  const [saved, setSaved] = React.useState(false);

  const toggleSkill = (name: string) => {
    setSkills((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    // Live: PUT /api/talent/me with exactly these fields.
    setSaved(true);
    window.setTimeout(() => setSaved(false), 4000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t("communityPage.myTalent", "My Talent")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("communityPage.noProfileHint", "Add your skills so others can find you.")}
        </p>
      </div>

      {skills.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t("communityPage.noProfile", "No talent details yet.")}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={save} className="space-y-5">
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t("communityPage.professions", "Professions")}
            </h2>
            <Select
              label={t("communityPage.categories", "Categories")}
              value={professionCategory ?? ""}
              onChange={(e) => setProfessionCategory(e.target.value)}
              options={PROFESSION_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Input
              label={t("communityPage.professions", "Professions")}
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
            />
            <Input
              label={t("communityPage.yearsExperience", "years experience")}
              type="number"
              min={0}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
            />
            <Textarea
              label={t("common.details", "Details")}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t("communityPage.addSkills", "Add my skills")}
            </h2>
            <SkillChips skills={skills.map((name) => ({ name }))} />
            <div className="flex flex-wrap gap-2">
              {mockSuggestedSkills.map((name) => {
                const active = skills.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleSkill(name)}
                    aria-pressed={active}
                    className={
                      active
                        ? "rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                        : "rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300"
                    }
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <Select
              label={t("communityPage.willingYes", "Happy to help")}
              value={willingness}
              onChange={(e) => setWillingness(e.target.value as TalentWillingness)}
              options={WILLINGNESS_OPTIONS.map((o) => ({
                value: o.value,
                label: t(o.labelKey, o.fallback),
              }))}
            />
            <Textarea
              label={t("common.details", "Details")}
              value={willingAreas}
              onChange={(e) => setWillingAreas(e.target.value)}
            />

            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={isDiscoverable}
                  onChange={(e) => setIsDiscoverable(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  {t("communityPage.statsDiscoverable", "Discoverable")}
                </span>
              </label>
              <p className="mt-1.5 ps-6 text-xs text-slate-500 dark:text-slate-400">
                {t("communityPage.searchIntro", "")}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit">{t("common.save", "Save")}</Button>
          {saved ? (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              {t("common.saveChanges", "Save Changes")}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
