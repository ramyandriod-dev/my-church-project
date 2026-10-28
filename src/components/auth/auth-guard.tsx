"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { shouldEndSession, buildLoginRedirect } from "@/lib/auth/session-guard";

/**
 * AuthGuard
 *
 * Confirms the session is actually usable while the dashboard is open, and sends
 * the user to the login page if it is not.
 *
 * What this deliberately does NOT do:
 *
 *   - It does not log out on browser reload. The session cookie already has a
 *     7-day lifetime; re-authenticating on every F5 made the app unusable.
 *   - It does not log out on `beforeunload` or `pagehide`. Cookies belong to the
 *     ORIGIN, not to a tab, so deleting the cookie when one tab unloaded signed
 *     the user out of every other tab of the same app. This was the main source
 *     of "I got logged out again as soon as I opened another tab".
 *
 * A logout is a deliberate user action and belongs to the sign-out button, not to
 * a page lifecycle event. The only automatic logout here is when the server says
 * the session is genuinely invalid.
 *
 * Why a client-side check at all, when middleware already guards the routes:
 * middleware only tests that the cookie is PRESENT. A cookie whose JWT has
 * expired is still present, so the user gets into the page and then every API
 * call on it 401s. Asking the server once on mount turns that into a single
 * clean redirect to login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  React.useEffect(() => {
    // React StrictMode double-invokes effects in development, so this runs
    // twice on mount. `cancelled` stops the first run from redirecting after
    // the effect has already been torn down.
    let cancelled = false;

    async function verifySession() {
      try {
        const response = await fetch("/api/auth/me", {
          // Always hit the server: a cached 200 would hide an expired session.
          cache: "no-store",
        });

        if (cancelled || !shouldEndSession(response.status)) return;

        // The session is genuinely gone. Clear it, then go to login keeping the
        // attempted path so the user resumes where they were headed.
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        if (!cancelled) {
          router.replace(buildLoginRedirect(window.location.pathname + window.location.search));
        }
      } catch {
        // A network blip must NOT sign the user out. Leaving the session cookie
        // untouched lets the user keep working.
      }
    }

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return <>{children}</>;
}
