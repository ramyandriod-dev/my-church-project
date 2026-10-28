"use client";

/**
 * Shared presentational pieces for the Community screens.
 *
 * Kept in one file because each is small and they are always used together on
 * the talent directory, the search results and the Member 360 talent section.
 */

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MemberContactActions } from "@/components/community/member-contact-actions";
import {
  IconBriefcase,
  IconChurch,
  IconMail,
  IconPhone,
  IconStar,
  IconCheckCircle2,
  IconClock,
  IconSparkles,
  IconChevronRight,
  IconHeartHandshake,
} from "@/components/community/icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type {
  IdeaStatus,
  TalentDirectoryEntry,
  TalentWillingness,
} from "@/lib/backend/types";

/** Colour coding and icons for willingness status. */
const WILLINGNESS_CONFIG: Record<
  TalentWillingness,
  {
    bg: string;
    text: string;
    border: string;
    icon: React.ComponentType<{ className?: string }> | null;
  }
> = {
  yes: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/80",
    icon: IconCheckCircle2,
  },
  maybe: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/80",
    icon: IconClock,
  },
  not_currently: {
    bg: "bg-slate-50 dark:bg-slate-900/60",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-800",
    icon: null,
  },
};

const STATUS_STYLES: Record<IdeaStatus, string> = {
  new: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  under_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  planned: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  implemented: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  declined: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

export function WillingnessBadge({ value }: { value: TalentWillingness }) {
  const { t } = useTranslation();
  const cfg = WILLINGNESS_CONFIG[value] ?? WILLINGNESS_CONFIG.not_currently;
  const Icon = cfg.icon;
  const key =
    value === "yes"
      ? "communityPage.willingYes"
      : value === "maybe"
        ? "communityPage.willingMaybe"
        : "communityPage.willingNotCurrently";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border shadow-2xs shrink-0 whitespace-nowrap",
        cfg.bg,
        cfg.text,
        cfg.border,
      )}
    >
      {Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
      )}
      <span>{t(key, value)}</span>
    </span>
  );
}

export function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  const { t } = useTranslation();
  const label =
    status === "new"
      ? t("communityPage.statusNew", "New")
      : status === "under_review"
        ? t("communityPage.statusUnderReview", "Under review")
        : status === "planned"
          ? t("communityPage.statusPlanned", "Planned")
          : status === "implemented"
            ? t("communityPage.statusImplemented", "Implemented")
            : t("communityPage.statusDeclined", "Declined");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {label}
    </span>
  );
}

export function SkillChips({
  skills,
  className,
}: {
  skills: { name: string }[];
  className?: string;
}) {
  if (!skills || skills.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {skills.map((s, idx) => (
        <span
          key={`${s.name}-${idx}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/80 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 shrink-0" />
          <span>{s.name}</span>
        </span>
      ))}
    </div>
  );
}

export function NameWithAvatar({
  firstName,
  lastName,
  avatarUrl,
  subtitle,
}: {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  subtitle?: string | null;
}) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-3">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-2xs"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white shadow-2xs"
        >
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug break-words">
          {firstName} {lastName}
        </p>
        {subtitle ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <IconBriefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{subtitle}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Why this person matched.
 *
 * The requirement is that every search result explains itself using values
 * actually stored on the profile. The server returns that reasoning; this only
 * renders it, and falls back to the plain name so a result is never left blank.
 */
export function MatchReason({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {reasons.map((reason, i) => (
        <li
          key={`${reason}-${i}`}
          className="flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"
        >
          <svg
            className="mt-0.5 h-3 w-3 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  );
}

/** One person in the directory. Contact is offered only when allowed. */
export function TalentCard({
  person,
  matchReasons,
  showContact = true,
  canMessage = false,
  onMessageSent,
  selectable = false,
  isSelected = false,
  onToggleSelect,
}: {
  person: TalentDirectoryEntry;
  matchReasons?: string[];
  showContact?: boolean;
  /** Session has `messages.send`. Keeps the send buttons off other people's screens. */
  canMessage?: boolean;
  onMessageSent?: () => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { t } = useTranslation();
  const contactable = showContact && person.canContact && (person.email || person.phone);

  return (
    <div
      className={`rounded-xl border p-4.5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between ${
        isSelected
          ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/20"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      }`}
    >
      <div>
        {/* Top bar: Willingness badge aligned with selection checkbox */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800/80">
          <WillingnessBadge value={person.willingness} />
          {selectable ? (
            <div className="shrink-0 flex items-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect?.()}
                aria-label={`Select ${person.firstName} ${person.lastName}`}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          ) : null}
        </div>

        {/* Member identity: Avatar + Full Name + Profession */}
        <NameWithAvatar
          firstName={person.firstName}
          lastName={person.lastName}
          avatarUrl={person.avatarUrl}
          subtitle={person.profession}
        />

        {/* Talents & Skills section */}
        {person.skills && person.skills.length > 0 ? (
          <div className="mt-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <IconSparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>{t("communityPage.profileSkills", "Talents & Skills")}</span>
            </div>
            <SkillChips skills={person.skills} />
          </div>
        ) : null}

        {/* Experience bio */}
        {person.experience ? (
          <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
            {person.experience}
          </p>
        ) : null}

        {/* Metadata section: experience years, willing areas, ministry/group */}
        <div className="mt-3 space-y-2 text-xs">
          {person.yearsExperience != null ? (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <IconStar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                {person.yearsExperience} {t("communityPage.yearsExperience", "years experience")}
              </span>
            </div>
          ) : null}

          {person.willingAreas ? (
            <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
              <IconHeartHandshake className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {t("communityPage.willingYes", "Happy to help")}:
                </span>{" "}
                {person.willingAreas}
              </div>
            </div>
          ) : null}

          {person.ministry || person.groupName ? (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <IconChurch className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="truncate">
                {[person.ministry, person.groupName].filter(Boolean).join(" · ")}
              </span>
            </div>
          ) : null}
        </div>

        {matchReasons ? <MatchReason reasons={matchReasons} /> : null}
      </div>

      {/* Card Footer: Profile link, Contact, and Messaging */}
      <div>
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          {/* Links to the live talent profile, not to `/people/[memberId]`.
              The Member 360 page resolves people by fixture id, `first-last` slug or
              email, so a real member id matched none of them and every click here
              rendered a 404. See the profile page for why the 360 view cannot simply
              be pointed at a live id. */}
          <Link
            href={`/community/talent/${person.memberId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            <span>{t("communityPage.viewProfile", "View profile")}</span>
            <IconChevronRight className="w-3.5 h-3.5 shrink-0" />
          </Link>
        </div>

        {contactable ? (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-1.5">
            {person.email ? (
              <a
                href={`mailto:${person.email}`}
                className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              >
                <IconMail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{person.email}</span>
              </a>
            ) : null}
            {person.phone ? (
              <a
                href={`tel:${person.phone}`}
                className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
              >
                <IconPhone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{person.phone}</span>
              </a>
            ) : null}
          </div>
        ) : null}

        {canMessage ? (
          <div className="mt-3">
            <MemberContactActions
              memberId={person.memberId}
              firstName={person.firstName}
              phone={person.phone ?? null}
              skill={person.skills[0]?.name}
              canMessage={canMessage}
              onMessageSent={onMessageSent}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Notice shown above search, stating what the AI does and does not receive. */
export function SearchPrivacyNotice({ usedFallback }: { usedFallback?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-100">
      {t("communityPage.aiNotice", "")}
      {usedFallback ? (
        <p className="mt-1.5 opacity-80">
          {t(
            "communityPage.searchIntro",
            "Search only shows people who chose to be discoverable.",
          )}
        </p>
      ) : null}
    </div>
  );
}
