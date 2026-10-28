/**
 * The directory's "view profile" link
 *
 * This is a source-level guard, not a rendering test, and that is a deliberate
 * trade-off: the project has no DOM test environment, but the bug it protects
 * against was invisible to typecheck, to `next build`, and to the 603 passing
 * tests, because a `Link` to any string is perfectly valid code.
 *
 * What went wrong: `TalentCard` linked to `/people/${memberId}`. That page is a
 * Member 360 view built on fixtures, and it resolves a person by fixture id,
 * `first-last` slug or email. The directory now serves real database ids, and no
 * UUID matches any of those three, so `getMember360` returned null and the page
 * called `notFound()`. Every "view profile" click rendered a 404, and the cause
 * was a one-line link in a shared component.
 *
 * So the invariant is asserted directly: live member ids must be linked to a
 * route that can actually resolve them.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const card = fs.readFileSync(
  path.join(ROOT, "src/components/community/community-parts.tsx"),
  "utf8",
);

describe("directory view-profile link", () => {
  it("does not send live member ids to the fixture-shaped 360 route", () => {
    // A `/people/` link is the specific regression. The 360 page looks a person
    // up by fixture id, `first-last` slug or email, so a real id can never match.
    expect(card).not.toMatch(/href=\{`\/people\//);
  });

  it("links to the live talent profile route", () => {
    expect(card).toMatch(/href=\{`\/community\/talent\/\$\{person\.memberId\}`\}/);
  });

  it("has a route to link to", () => {
    const page = path.join(
      ROOT,
      "src/app/(dashboard)/community/talent/[memberId]/page.tsx",
    );
    expect(fs.existsSync(page)).toBe(true);
  });

  it("does not import notFound on the live profile route", () => {
    // A missing profile is rendered as an explanatory empty state instead. The
    // service returns null both for "no profile" and "not yours to see", so
    // 404-ing here would turn the opt-out into an existence oracle.
    //
    // The import is what is checked rather than the text `notFound(`, because
    // the page's own comment explains the decision by name.
    const page = fs.readFileSync(
      path.join(ROOT, "src/app/(dashboard)/community/talent/[memberId]/page.tsx"),
      "utf8",
    );
    const navigationImport = page.match(/import \{([^}]*)\} from "next\/navigation"/);
    expect(navigationImport).not.toBeNull();
    expect(navigationImport?.[1]).not.toMatch(/notFound/);
  });
});

describe("why the 360 route cannot simply be pointed at a live id", () => {
  it("resolves only fixture ids, so a database id returns null", () => {
    const member360 = fs.readFileSync(
      path.join(ROOT, "src/lib/mock-data/member360.ts"),
      "utf8",
    );
    expect(member360).toMatch(
      /export function getMember360\(memberId: string\)[\s\S]{0,200}if \(!raw\) return null/,
    );
  });

  it("holds no member id that could be a database id", () => {
    // If a fixture key ever started looking like a UUID, this would still pass
    // while the two worlds silently collided, so it is worth pinning down.
    const people = fs.readFileSync(
      path.join(ROOT, "src/lib/mock-data/people.ts"),
      "utf8",
    );
    expect(people).not.toMatch(/id: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i);
  });
});
