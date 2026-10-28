"use client";

/**
 * The Talent block on Member 360.
 *
 * This screen is staff-only, so it may show the talent profile even when the
 * member has opted out of the directory — that is the point of a supervisor's
 * view. The opt-out is shown explicitly rather than hidden, because a staff
 * member looking at a hidden profile who could not tell it was hidden would
 * reasonably assume the member had never filled anything in, and might prompt
 * them about it.
 *
 * The talent data is joined by member id, so a member with no profile simply
 * renders the empty state.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  WillingnessBadge,
  SkillChips,
  MatchReason,
} from "@/components/community/community-parts";
import { useLanguage, useTranslation } from "@/lib/i18n";
import type { TalentDirectoryEntry } from "@/lib/backend/types";

interface TalentSectionProps {
  profile: TalentDirectoryEntry | null;
}

export function TalentSection({ profile }: TalentSectionProps) {
  const { locale } = useLanguage();
  const { t } = useTranslation();
  const isAr = locale === "ar";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-50 rounded-lg">
            <svg
              className="w-4 h-4 text-cyan-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.296-5.877a2.652 2.652 0 10-4.53-2.24l4.234 8.117M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 6h2.25l2.25 2.25L15 11.25"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">
            {isAr ? "المواهب والمهارات" : "Talent & Skills"}
          </h3>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!profile ? (
          <p className="text-sm text-gray-500">
            {t("communityPage.noProfile", "No talent details yet.")}
          </p>
        ) : (
          <>
            {/*
              Surfaced rather than hidden: on a staff view, a hidden profile that
              looked identical to an empty one would invite the wrong follow-up
              with the member.
            */}
            {!isDiscoverableIn(profile) ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                {isAr
                  ? "طلب هذا العضو ألا يظهر في دليل المواهب. تظهر هذه البيانات هنا لأن هذا العرض مخصص للطاقم فقط."
                  : "This member asked not to appear in the Talent Directory. Their details are visible here because this is a staff-only view."}
              </p>
            ) : null}

            {profile.profession ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {t("communityPage.professions", "Professions")}
                </span>
                <span className="font-medium text-gray-900">{profile.profession}</span>
              </div>
            ) : null}

            {profile.professionCategory ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {t("communityPage.categories", "Categories")}
                </span>
                <span className="text-gray-700">{profile.professionCategory}</span>
              </div>
            ) : null}

            {profile.yearsExperience != null ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {t("communityPage.yearsExperience", "years experience")}
                </span>
                <span className="text-gray-700">{profile.yearsExperience}</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {t("communityPage.willingYes", "Happy to help")}
              </span>
              <WillingnessBadge value={profile.willingness} />
            </div>

            {profile.experience ? (
              <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {profile.experience}
              </p>
            ) : null}

            {profile.willingAreas ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {profile.willingAreas}
              </p>
            ) : null}

            <SkillChips skills={profile.skills} />

            {/*
              Contact is gated on `canContact` from the response, not on whether
              a field happens to be populated, so a member with no contact on
              file shows an explanation rather than a dead link.
            */}
            <div className="border-t border-gray-100 pt-3 text-sm dark:border-gray-700">
              <p className="mb-1 text-gray-500">{t("communityPage.contact", "Contact")}</p>
              {profile.canContact ? (
                <div className="space-y-0.5">
                  {profile.email ? (
                    <a
                      href={`mailto:${profile.email}`}
                      className="block truncate text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {profile.email}
                    </a>
                  ) : null}
                  {profile.phone ? (
                    <a
                      href={`tel:${profile.phone}`}
                      className="block text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {profile.phone}
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-gray-500">
                  {isAr ? "لا تملك صلاحية عرض بيانات الاتصال." : "You do not have permission to view contact details."}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The directory entry type does not carry `isDiscoverable` — a discoverability
 * flag is only exposed to a supervisor's view. The field is read defensively so
 * a payload without it is treated as discoverable rather than hiding the
 * warning on everyone.
 */
function isDiscoverableIn(profile: TalentDirectoryEntry): boolean {
  return (profile as { isDiscoverable?: boolean }).isDiscoverable !== false;
}
