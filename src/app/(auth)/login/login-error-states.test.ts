/**
 * Login error-state distinction — regression guards.
 *
 * The login page must not tell someone their password is wrong when the
 * problem was actually on the server. This is not hypothetical: a Next dev
 * server caught mid-recompile returns HTML with a 404 or 500, the body does
 * not parse as JSON, and the user is shown an error. If that error is worded
 * as "check your email and password", the natural reaction is to keep
 * retyping the password and conclude the credential is broken — while the real
 * fault is a compile or database problem.
 *
 * ─── Why these are source-level guards ─────────────────────────────────
 *
 * This repository runs Vitest with `environment: "node"`, its `include` covers
 * only `*.test.ts`, and no DOM testing library is installed. Rendering the
 * component is therefore unavailable, and adding one for a single page would be
 * disproportionate. These read the source and assert on the decision tree,
 * which is how the sibling `settings/password-change.test.ts` guard is written.
 *
 * The trade-off is stated plainly: this cannot prove the rendered string, only
 * that the branching exists and is ordered correctly. A behavioural DOM test is
 * the right upgrade if the suite ever gains a browser environment.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "src/app/(auth)/login/page.tsx"),
  "utf8"
);

/**
 * The body of one branch of the `!response.ok` decision tree.
 *
 * Bounded by the branch keyword that follows it rather than by a character
 * count, so a longer comment can never make a test pass or fail by accident.
 */
function branch(open: RegExp, closer: RegExp): string {
  const start = source.search(open);
  expect(start, `expected to find branch matching ${open}`).toBeGreaterThan(-1);
  const tail = source.slice(start);
  const end = tail.search(closer);
  expect(end, `expected to find ${closer} after ${open}`).toBeGreaterThan(-1);
  return tail.slice(0, end);
}

const unauthorized = () =>
  branch(/status === 401\) \{/, /\n\s*\} else if/);
const serverError = () => branch(/status >= 500\) \{/, /\n\s*\} else \{/);
const clientError = () => branch(/^\s*\} else \{/m, /\n\s*\}\n\s*return;/);

describe("login page — 401 is treated as a credential problem", () => {
  it("maps 401 to the credentials message", () => {
    expect(unauthorized()).toMatch(/t\("auth\.loginFailed"\)/);
  });

  it("does not surface the server's message for a 401", () => {
    // A 401 body is deliberately uniform across unknown email, wrong password,
    // disabled account, and lockout. Echoing it would undo the
    // anti-enumeration property the route maintains.
    expect(unauthorized()).not.toMatch(/data\?\.error\?\.message/);
  });
});

describe("login page — server faults are not blamed on the password", () => {
  it("shows the generic error for 5xx", () => {
    expect(serverError()).toMatch(/t\("common\.errorOccurred"\)/);
  });

  it("does not surface the server's message for 5xx", () => {
    // The load-bearing assertion. `errorResponse` returns `String(error)` in
    // development, so echoing `data.error.message` for a 5xx would show a raw
    // Prisma or compile exception as though it were a login problem.
    expect(serverError()).not.toMatch(/data\?\.error\?\.message/);
  });

  it("is not even offered the loginFailed string", () => {
    expect(serverError()).not.toMatch(/loginFailed/);
  });
});

describe("login page — actionable 4xx responses keep their message", () => {
  it("falls back to the server message for non-401, non-5xx statuses", () => {
    expect(clientError()).toMatch(
      /data\?\.error\?\.message\s*\|\|\s*t\("common\.errorOccurred"\)/
    );
  });

  it("still falls back to a generic message when the body is unparseable", () => {
    // The dev-server compile-failure case returns HTML, so `data` is null.
    // This guarantees that path cannot render an empty error banner.
    expect(source).toMatch(/\|\|\s*t\("common\.errorOccurred"\)/);
  });
});

describe("login page — the non-OK path never reaches the redirect", () => {
  it("returns before router.push is called", () => {
    const guard = source.indexOf("if (!response.ok) {");
    const earlyReturn = source.indexOf("return;", guard);
    const redirect = source.indexOf("router.push");
    expect(earlyReturn).toBeGreaterThan(guard);
    expect(earlyReturn).toBeLessThan(redirect);
  });
});
