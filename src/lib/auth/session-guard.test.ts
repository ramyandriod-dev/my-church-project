import { describe, it, expect } from "vitest";
import { shouldEndSession, buildLoginRedirect } from "./session-guard";

describe("shouldEndSession", () => {
  it("ends the session only when the server says it is invalid", () => {
    expect(shouldEndSession(401)).toBe(true);
    expect(shouldEndSession(403)).toBe(true);
  });

  it("keeps the session on a successful check", () => {
    expect(shouldEndSession(200)).toBe(false);
  });

  it("keeps the session on a server error", () => {
    // A 500 during a deploy must never look like a logout.
    for (const status of [500, 502, 503, 504]) {
      expect(shouldEndSession(status)).toBe(false);
    }
  });

  it("keeps the session on an unexpected or redirected status", () => {
    for (const status of [301, 302, 400, 404, 429]) {
      expect(shouldEndSession(status)).toBe(false);
    }
  });
});

describe("buildLoginRedirect", () => {
  it("preserves the path the user was trying to reach", () => {
    expect(buildLoginRedirect("/people/42")).toBe("/login?from=%2Fpeople%2F42");
  });

  it("preserves the query string too", () => {
    expect(buildLoginRedirect("/families?add=7")).toBe("/login?from=%2Ffamilies%3Fadd%3D7");
  });

  it("falls back to the dashboard for a non-path value", () => {
    expect(buildLoginRedirect("")).toBe("/login?from=%2Fdashboard");
    expect(buildLoginRedirect("people/42")).toBe("/login?from=%2Fdashboard");
  });

  it("does not allow an off-site redirect target", () => {
    // `from` is only ever a path, so a crafted query cannot bounce the user to
    // another origin through the login page.
    const url = buildLoginRedirect("/people/1");
    expect(url.startsWith("/login?from=")).toBe(true);
  });
});
