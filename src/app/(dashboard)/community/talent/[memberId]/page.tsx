"use client";

/**
 * /community/talent/[memberId] — one person's live talent profile.
 *
 * This exists because the Talent Directory links here, and it deliberately does
 * *not* reuse `/people/[memberId]`. That page is a Member 360 view built on
 * fixture data, and it resolves a person by fixture id, `first-last` slug or
 * email. A real member id from the database matches none of those, so the page
 * called `notFound()` and every "view profile" click in the directory landed on
 * a 404. Pointing a live id at a fixture-shaped page cannot be fixed by widening
 * the lookup: the 360 view's attendance, giving and pastoral figures have no
 * live source at all, so the only alternative was inventing them.
 *
 * So this page shows only what is actually stored, and omits a section when it
 * is empty. Every value below comes from `GET /api/talent/members/[memberId]`,
 * which the server scopes to the caller's tenant and hides an opted-out profile
 * from callers without `talent.update` — including on this direct-by-id route,
 * so an id cannot be guessed past the opt-out.
 *
 * A missing entry is rendered as an explanatory empty state rather than a bare
 * not-found, because "no profile" and "not yours to see" are the same response by
 * design, and someone who opted out should not be told that they exist.
 */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberContactActions } from "@/components/community/member-contact-actions";
import { useTranslation } from "@/lib/i18n";
import type { TalentDirectoryEntry } from "@/lib/backend/types";

export default function TalentProfilePage() {
  const params = useParams<{ memberId: string }>();
  const memberId = params.memberId;

  const { t } = useTranslation();

  const [entry, setEntry] = React.useState<TalentDirectoryEntry | null>(null);
  const [canMessage, setCanMessage] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/talent/members/${memberId}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setEntry(json?.data?.entry ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // The contact buttons depend on `messages.send`, so the session is read rather
  // than assumed. A member without it still sees the profile, just no buttons.
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        const permissions: string[] = json?.data?.user?.permissions ?? [];
        if (active) setCanMessage(permissions.includes("messages.send"));
      } catch {
        /* the profile stays readable even when messaging is unavailable */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="p-8 text-muted-foreground">{t("common.loading", "Loading...")}</p>;
  }

  if (error) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-destructive">
          {t("common.loadError", "Could not load this. Please try again.")}
        </p>
        <Button onClick={() => void load()}>{t("common.retry", "Retry")}</Button>
      </div>
    );
  }

  // A 200 with no entry means "no profile, or not yours to see". Both are
  // reported identically on purpose, so opting out cannot be probed for.
  if (!entry) {
    return (
      <div className="space-y-2 p-8">
        <h1 className="text-xl font-semibold">
          {t("communityPage.profileNotFound", "There is no talent profile to show.")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "communityPage.profileNotFoundHint",
            "This person may have withdrawn their consent to be listed, or may not have a profile yet.",
          )}
        </p>
        <Link
          href="/community/talent"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {t("communityPage.backToDirectory", "Back to Talent Directory")}
        </Link>
      </div>
    );
  }

  const fullName = `${entry.firstName} ${entry.lastName}`;
  const willingnessLabel =
    entry.willingness === "yes"
      ? t("communityPage.willingYes", "Happy to help")
      : entry.willingness === "not_currently"
        ? t("communityPage.willingNotCurrently", "Not right now")
        : t("communityPage.willingMaybe", "Maybe");

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/community/talent"
        className="inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        ← {t("communityPage.backToDirectory", "Back to Talent Directory")}
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {fullName}
            </h1>
            <Badge variant={entry.willingness === "yes" ? "green" : "gray"}>
              {willingnessLabel}
            </Badge>
          </div>
          {entry.profession ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {entry.profession}
              {typeof entry.yearsExperience === "number"
                ? ` · ${entry.yearsExperience} ${t("communityPage.yearsExperience", "years experience")}`
                : ""}
            </p>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-6">
          {entry.skills.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold">
                {t("communityPage.profileSkills", "Skills")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {entry.skills.map((skill) => (
                  <Badge key={skill.id} variant="blue">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {entry.experience ? (
            <section>
              <h2 className="mb-1 text-sm font-semibold">
                {t("communityPage.profileExperience", "Experience")}
              </h2>
              <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                {entry.experience}
              </p>
            </section>
          ) : null}

          {entry.willingAreas ? (
            <section>
              <h2 className="mb-1 text-sm font-semibold">
                {t("communityPage.profileWillingAreas", "Happy to help with")}
              </h2>
              <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                {entry.willingAreas}
              </p>
            </section>
          ) : null}

          {entry.ministry || entry.groupName ? (
            <section className="flex flex-wrap gap-2">
              {entry.ministry ? (
                <Badge variant="purple">
                  {t("communityPage.ministries", "Ministries")}: {entry.ministry}
                </Badge>
              ) : null}
              {entry.groupName ? (
                <Badge variant="purple">
                  {t("communityPage.groups", "Groups")}: {entry.groupName}
                </Badge>
              ) : null}
            </section>
          ) : null}

          <MemberContactActions
            memberId={entry.memberId}
            firstName={entry.firstName}
            phone={entry.phone ?? null}
            skill={entry.skills[0]?.name}
            canMessage={canMessage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
