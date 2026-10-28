/**
 * The settings password-change form
 *
 * A source-level guard, not a rendering test, following the same deliberate
 * trade-off as `talent-card-link.test.ts`: the project has no DOM test
 * environment, and `useLanguage` gates its body behind a `mounted` flag, so the
 * settings page's contents never appear in server-rendered HTML and cannot be
 * checked by fetching the route.
 *
 * What that leaves unguarded without this file: the form can be built, typecheck
 * and compile perfectly well while being wired to the wrong endpoint, submitting
 * the wrong fields, or living in a tab that is not in the navigation. None of
 * those are errors to `tsc` or `next build`, and there is no other test that
 * would notice — a settings screen that silently does nothing is exactly the kind
 * of bug that survives to production.
 *
 * The security behaviour itself is covered properly in
 * `src/app/api/auth/change-password/route.test.ts`. This file only pins the wiring
 * between the form and that endpoint.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const settingsPath = join(process.cwd(), "src/app/(dashboard)/settings/page.tsx");
const source = readFileSync(settingsPath, "utf8");

describe("settings → password change", () => {
  it("is reachable from the settings navigation", () => {
    // Without this the form is unreachable: the page only renders the tab whose id
    // is active, and the default is "profile".
    expect(source).toMatch(/id:\s*"security"/);
    expect(source).toMatch(/activeTab === "security"/);
  });

  it("posts to the change-password endpoint", () => {
    expect(source).toContain("/api/auth/change-password");
    expect(source).toMatch(/method:\s*"POST"/);
  });

  it("sends the current and new password, and never the confirmation", () => {
    expect(source).toMatch(/currentPassword:\s*passwordForm\.current/);
    expect(source).toMatch(/newPassword:\s*passwordForm\.next/);
    // The confirmation is a client-side check only. It must never be sent: it
    // would be a password the server stores nothing for and no one can verify.
    expect(source).not.toMatch(/confirm:\s*passwordForm\.confirm/);
  });

  it("does not use the generic saved-toast for this form", () => {
    // `handleSave` shows "saved" without contacting anything. A password change
    // can genuinely fail — wrong current password — so reporting success
    // optimistically would be a lie.
    const securityBlock = source.slice(source.indexOf('activeTab === "security"'));
    expect(securityBlock).not.toContain("handleSave");
    expect(securityBlock).toContain("setPasswordError");
    expect(securityBlock).toContain("setPasswordMessage");
  });

  it("mirrors the server's minimum length so the button is not a trap", () => {
    // Length, not a composition rule. The server enforces this too; the client
    // copy is only there to avoid a pointless failed round trip.
    expect(source).toMatch(/MIN_PASSWORD_LENGTH = 12/);
    expect(source).toMatch(/next\.length >= MIN_PASSWORD_LENGTH/);
  });

  it("blocks submission when the confirmation does not match", () => {
    expect(source).toMatch(/passwordForm\.confirm === passwordForm\.next/);
    expect(source).toMatch(/disabled=\{passwordSaving \|\| passwordMismatch !== null \|\| !passwordReady\}/);
  });

  it("clears the fields after a successful change", async () => {
    // Otherwise the new password stays sitting in the DOM in plain text.
    expect(source).toMatch(/setPasswordForm\(\{ current: "", next: "", confirm: "" \}\)/);
  });

  it("uses password input types so the value is not echoed on screen", () => {
    const securityBlock = source.slice(source.indexOf('activeTab === "security"'));
    expect((securityBlock.match(/type="password"/g) ?? [])).toHaveLength(3);
    expect(securityBlock).not.toMatch(/type="text"[^>]*value=\{passwordForm/);
  });
});
