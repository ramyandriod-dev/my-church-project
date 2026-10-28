/**
 * Which read endpoint the messaging page posts to
 *
 * A source-level guard rather than a rendering test, because the project has no
 * DOM test environment — and because the bug it protects against was invisible to
 * every check that does exist. A `fetch` to any string is valid code, so
 * typecheck, `next build` and the whole service suite passed while a staff member
 * opening somebody's conversation marked the wrong thread as read.
 *
 * What went wrong: the page picked its thread URL from the audience
 * (`audience === "staff" ? /api/messages/{id} : /api/messages/me`) but wrote the
 * read URL as a flat `/api/messages/me/read`. For staff that endpoint resolves
 * from the session to the *staff user's own* member row — which is normally none
 * at all — so the request marked nothing. The unread counter in local state still
 * dropped on the next line, so the badge cleared on screen while the row stayed
 * unread in the database, and it came back on the next load.
 *
 * So the invariant is asserted directly: the read URL must be chosen by the same
 * audience decision as the thread URL, never hardcoded to the member endpoint.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../../../../..");
const PAGE = path.join(ROOT, "src/app/(dashboard)/community/messages/page.tsx");
const page = fs.readFileSync(PAGE, "utf8");

describe("thread read endpoint selection", () => {
  it("never hardcodes the member read endpoint", () => {
    // The regression itself: a single unconditional `/api/messages/me/read`.
    expect(page).not.toMatch(/await fetch\(`\/api\/messages\/me\/read`/);
  });

  it("sends staff to the per-member read endpoint", () => {
    expect(page).toMatch(/\? `\/api\/messages\/\$\{memberId\}\/read`/);
  });

  it("sends a member to their own read endpoint", () => {
    expect(page).toMatch(/: "\/api\/messages\/me\/read"/);
  });

  it("derives the read URL from the same audience check as the thread URL", () => {
    // The drift happened because the two URLs were separate expressions for one
    // decision. Both are now `audience === "staff" ? ... : ...`, so there is a
    // single branch to get right.
    const staffBranches = page.match(/audience === "staff"/g) ?? [];
    expect(staffBranches.length).toBeGreaterThanOrEqual(2);
    expect(page).toMatch(/const readUrl =\s*\n?\s*audience === "staff"/);
  });
});

describe("the two read endpoints stay distinct", () => {
  const route = (p: string) =>
    fs.readFileSync(path.join(ROOT, "src/app/api/messages", p), "utf8");

  it("routes the member path to markMyThreadRead", () => {
    expect(route("me/read/route.ts")).toMatch(/messageService\.markMyThreadRead\(ctx\)/);
  });

  it("routes the per-member path to markThreadRead with the id", () => {
    expect(route("[memberId]/read/route.ts")).toMatch(
      /messageService\.markThreadRead\(ctx, id\)/,
    );
  });

  it("gates them on different permissions", () => {
    // If these ever converge, the permission split that keeps a member inside
    // their own thread disappears with them.
    const svc = fs.readFileSync(
      path.join(ROOT, "src/lib/backend/services/message-service.ts"),
      "utf8",
    );
    const own = svc.match(
      /async markMyThreadRead[\s\S]{0,200}?requirePermission\(ctx, "([^"]+)"\)/,
    );
    expect(own?.[1]).toBe("messages.self");
  });
});
