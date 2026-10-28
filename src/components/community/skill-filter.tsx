"use client";

/**
 * Skill filter for the Talent Directory.
 *
 * Two design decisions here are deliberate and worth stating, because both are
 * the kind of thing that gets "simplified" into a bug later.
 *
 * 1. Counts come from the server's facets and are *not* recomputed from the
 *    currently loaded page. A count that was derived from the visible rows would
 *    be wrong the moment the result set was paginated or filtered, and would make
 *    every unselected skill look like zero as soon as one was ticked.
 *
 * 2. Facets are shown even for skills that are already ticked. A checkbox that
 *    vanishes the moment you select it makes it impossible to add a second
 *    skill, and hides the size of the set you are narrowing.
 *
 * Selected state is lifted to the caller, so the filter is driven by the same
 * state as the query — there is no second copy of "what is selected" to drift.
 */

import * as React from "react";
import type { SkillFacet } from "@/lib/backend/types";
import { useTranslation } from "@/lib/i18n";

export function SkillFilterPanel({
  facets,
  selected,
  onToggle,
  onClear,
  disabled,
  loading,
}: {
  facets: SkillFacet[];
  /** Skill ids currently in the query. */
  selected: string[];
  onToggle: (skillId: string) => void;
  onClear: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const selectedCount = selected.length;

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
      aria-labelledby="skill-filter-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="skill-filter-heading"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            {t("skillFilter.title", "Filter by skill")}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t(
              "skillFilter.hint",
              "Pick one or more skills. Results include anyone who has any skill you choose.",
            )}
          </p>
        </div>

        {selectedCount > 0 ? (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="shrink-0 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:underline disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
          >
            {t("skillFilter.clearAll", "Clear all")}
          </button>
        ) : null}
      </div>

      {selectedCount > 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="text-slate-900 dark:text-slate-100">{selectedCount}</span>{" "}
          {t("skillFilter.selected", "selected")}
        </p>
      ) : null}

      <div className="mt-3">
        {loading && facets.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("common.loading", "Loading...")}
          </p>
        ) : facets.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("skillFilter.noSkills", "No skills have been added yet.")}
          </p>
        ) : (
          <ul className="space-y-1">
            {facets.map((facet) => {
              const checked = selected.includes(facet.skill.id);
              const id = `skill-${facet.skill.id}`;
              return (
                <li key={facet.skill.id}>
                  <label
                    htmlFor={id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors ${
                      checked
                        ? "bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggle(facet.skill.id)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {facet.skill.name}
                      {facet.skill.category ? (
                        <span className="ms-1.5 text-xs text-slate-400 dark:text-slate-500">
                          {facet.skill.category}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      title={`${facet.count} ${t("skillFilter.countFor", "people")}`}
                    >
                      {facet.count}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
