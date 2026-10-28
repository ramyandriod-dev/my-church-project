/**
 * Session Lifecycle Invariants
 *
 * Regression guard for the bug that made the app sign the user out constantly.
 *
 * A previous `RefreshAuthGuard` wrapped the whole dashboard and did two things:
 *
 *   1. On any browser reload it deleted the `church_session` cookie and called
 *      `/api/auth/logout`.
 *   2. On `beforeunload` — which fires whenever a tab is closed or navigated
 *      away from — it did the same thing.
 *
 * Because cookies belong to an ORIGIN and not to a tab, step 2 meant that
 * opening or leaving a second tab destroyed the session in every tab. That is
 * the behaviour reported as "I get redirected to login on every tab click, and
 * I have to log in twice".
 *
 * These tests assert the invariants so the pattern cannot quietly come back.
 * They read the source because the failure was a client-side side effect that
 * no server-side test can observe.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CLIENT_SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(t|j)sx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const allSourceFiles = walk(CLIENT_SRC);

/**
 * Source files that ship to the browser, excluding tests.
 *
 * Test files are excluded because they necessarily contain the very patterns
 * they search for, and comments are stripped because a component is allowed to
 * explain that it does NOT do the forbidden thing.
 */
const clientFiles = allSourceFiles.filter(
  (f) => !/\.test\.(t|j)sx?$/.test(f) && !/\.test-d\.(t|j)sx?$/.test(f),
);

/** Remove comments so prose about a pattern is not mistaken for the pattern. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("session lifecycle invariants", () => {
  it("finds the source tree", () => {
    expect(clientFiles.length).toBeGreaterThan(50);
  });

  it("actually scans non-empty, comment-stripped source", () => {
    // Guards against the checks below silently passing over an empty file set.
    const sample = stripComments(readFileSync(clientFiles[0], "utf8"));
    expect(sample.length).toBeGreaterThan(0);
  });

  it("no client code deletes the session cookie", () => {
    const offenders: string[] = [];

    for (const file of clientFiles) {
      const source = stripComments(readFileSync(file, "utf8"));
      // Any attempt to expire `church_session` from a component.
      if (
        /church_session\s*=\s*["']\s*;/.test(source) ||
        /church_session["']\s*,\s*["']max-age=0/.test(source) ||
        /church_session["']\s*,\s*["'][^"']*expires=/.test(source)
      ) {
        offenders.push(file.replace(CLIENT_SRC, "src"));
      }
    }

    expect(
      offenders,
      `Client code must never clear the session cookie: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("no client code logs out on a page lifecycle event", () => {
    const offenders: string[] = [];

    for (const file of clientFiles) {
      const source = stripComments(readFileSync(file, "utf8"));
      const logsOut = /logout/.test(source);
      if (!logsOut) continue;

      // A logout is fine when it is a deliberate user action (a button click).
      // It is NOT fine when it rides on a lifecycle event, which fires without
      // the user asking and takes every other tab's session with it.
      const ridesLifecycleEvent =
        /beforeunload|unload|pagehide|visibilitychange/.test(source) ||
        /PerformanceNavigationTiming|type\s*===?\s*["']reload["']/.test(source) ||
        /sendBeacon/.test(source);

      if (ridesLifecycleEvent) {
        offenders.push(file.replace(CLIENT_SRC, "src"));
      }
    }

    expect(
      offenders,
      `Do not log out on unload/reload/pagehide: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("does not ship a refresh-triggered logout guard", () => {
    // The original component is gone; this names the regression explicitly.
    const authDir = join(CLIENT_SRC, "components", "auth");
    const names = readdirSync(authDir);
    expect(names).not.toContain("refresh-auth-guard.tsx");
    expect(names).toContain("auth-guard.tsx");
  });

  it("the session cookie is httpOnly, so page scripts cannot tamper with it", () => {
    const source = readFileSync(join(CLIENT_SRC, "lib", "auth", "session.ts"), "utf8");
    const cookieBlock = source.slice(source.indexOf("cookieStore.set("));

    expect(cookieBlock).toMatch(/httpOnly:\s*true/);
    expect(cookieBlock).not.toMatch(/httpOnly:\s*false/);
  });
});
