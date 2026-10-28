/**
 * Prayer Wall Service
 *
 * The two promises members are given when they share a prayer:
 *
 * 1. Nobody sees it until a pastor or leader approves it.
 * 2. The wall shows who wrote it only when the author chose to show their name.
 *
 * Plus the counter: one "I prayed" per login, and only on approved prayers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prayerWallService } from "./prayer-wall-service";
import { prayerWallRepository } from "../../db/repositories/prayer-wall-repository";
import { resolveOwnMember } from "./own-member";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { canTransition, toWallItem, type PrayerWallRow } from "@/lib/prayer-wall/rules";
import type { TenantContext } from "../types";

vi.mock("../../db/repositories/prayer-wall-repository", () => ({
  prayerWallRepository: {
    listApproved: vi.fn(),
    listByAuthor: vi.fn(),
    listForModeration: vi.fn(),
    countByStatus: vi.fn(),
    countPendingByAuthor: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    setStatus: vi.fn(),
    delete: vi.fn(),
    addPrayer: vi.fn(),
    removePrayer: vi.fn(),
    countPrayers: vi.fn(),
  },
}));

vi.mock("./own-member", () => ({ resolveOwnMember: vi.fn() }));

const repo = vi.mocked(prayerWallRepository);
const ownMember = vi.mocked(resolveOwnMember);

const ME = "m-me";
const SOMEONE = "m-someone";
const POST = "11111111-1111-4111-8111-111111111111";

function ctx(role: string, permissions: string[]): TenantContext {
  return { tenantId: "t-1", userId: `u-${role}`, role, permissions };
}
const memberCtx = ctx("member", ["prayer_wall.read", "prayer_wall.post"]);
const pastorCtx = ctx("pastor", ["prayer_wall.read", "prayer_wall.post", "prayer_wall.moderate"]);
const noAccessCtx = ctx("member", []);

function row(overrides: Partial<PrayerWallRow> = {}): PrayerWallRow {
  return {
    id: POST,
    kind: "prayer",
    body: "Please pray for my mother's surgery on Thursday.",
    status: "approved",
    authorMemberId: SOMEONE,
    authorName: "Mariam Fawzy",
    showName: false,
    createdAt: new Date("2026-10-20T10:00:00Z"),
    reviewedAt: null,
    prayedCount: 3,
    prayedByViewer: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  ownMember.mockResolvedValue({ id: ME });
});

describe("rules", () => {
  it("an anonymous prayer carries no author, whatever the row holds", () => {
    const item = toWallItem(row(), ME);
    expect(Object.keys(item).sort()).toEqual(
      ["body", "createdAt", "displayName", "id", "kind", "mine", "prayedByMe", "prayedCount"].sort(),
    );
    expect(item.displayName).toBeNull();
    expect(JSON.stringify(item)).not.toContain(SOMEONE);
    expect(JSON.stringify(item)).not.toContain("Mariam");
  });

  it("shows the name only when the author chose to", () => {
    const item = toWallItem(row({ showName: true }), ME);
    expect(item.displayName).toBe("Mariam Fawzy");
    expect(JSON.stringify(item)).not.toContain(SOMEONE);
  });

  it("allows only the moderation moves that make sense", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "rejected")).toBe(true);
    expect(canTransition("approved", "archived")).toBe(true);
    expect(canTransition("rejected", "approved")).toBe(true);
    expect(canTransition("approved", "pending")).toBe(false);
    expect(canTransition("pending", "archived")).toBe(false);
    expect(canTransition("nonsense", "approved")).toBe(false);
  });
});

describe("the wall", () => {
  it("lists approved prayers without names and marks the viewer's own", async () => {
    repo.listApproved.mockResolvedValue([row(), row({ id: "p-2", authorMemberId: ME, prayedByViewer: true })]);

    const posts = await prayerWallService.listWall(memberCtx);

    expect(repo.listApproved).toHaveBeenCalledWith("t-1", memberCtx.userId, "prayer");
    expect(posts.map((p) => p.mine)).toEqual([false, true]);
    expect(posts[1].prayedByMe).toBe(true);
    for (const p of posts) expect(p).not.toHaveProperty("authorMemberId");
  });

  it("lists answered prayers separately", async () => {
    repo.listApproved.mockResolvedValue([row({ kind: "answered" })]);
    const posts = await prayerWallService.listWall(memberCtx, "answered");
    expect(repo.listApproved).toHaveBeenCalledWith("t-1", memberCtx.userId, "answered");
    expect(posts[0].kind).toBe("answered");
  });

  it("still works for a staff login with no member record", async () => {
    ownMember.mockRejectedValue(new NotFoundError("No member record"));
    repo.listApproved.mockResolvedValue([row()]);
    const posts = await prayerWallService.listWall(pastorCtx);
    expect(posts[0].mine).toBe(false);
  });

  it("needs prayer_wall.read", async () => {
    await expect(prayerWallService.listWall(noAccessCtx)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("sharing", () => {
  it("files the prayer as the logged-in member, pending approval", async () => {
    repo.countPendingByAuthor.mockResolvedValue(0);
    repo.create.mockResolvedValue(row({ status: "pending", authorMemberId: ME, prayedCount: 0 }));

    const post = await prayerWallService.share(memberCtx, { body: "  Pray for my exams  ", kind: "prayer", showName: false });

    expect(repo.create).toHaveBeenCalledWith("t-1", {
      authorMemberId: ME,
      kind: "prayer",
      body: "Pray for my exams",
      showName: false,
    });
    expect(post.status).toBe("pending");
    expect(post.mine).toBe(true);
  });

  it("passes the author's choice to show their name", async () => {
    repo.countPendingByAuthor.mockResolvedValue(0);
    repo.create.mockResolvedValue(row({ status: "pending", authorMemberId: ME, showName: true }));

    const post = await prayerWallService.share(memberCtx, { body: "Thank God with me", kind: "prayer", showName: true });

    expect(repo.create).toHaveBeenCalledWith("t-1", expect.objectContaining({ showName: true }));
    expect(post.showName).toBe(true);
  });

  it("files an answered prayer through the same approval queue", async () => {
    repo.countPendingByAuthor.mockResolvedValue(0);
    repo.create.mockResolvedValue(row({ status: "pending", kind: "answered", authorMemberId: ME }));

    const post = await prayerWallService.share(memberCtx, { body: "God healed my mother!", kind: "answered", showName: false });

    expect(repo.create).toHaveBeenCalledWith("t-1", expect.objectContaining({ kind: "answered" }));
    expect(post.status).toBe("pending");
    expect(post.kind).toBe("answered");
  });

  it("stops a member from flooding the queue", async () => {
    repo.countPendingByAuthor.mockResolvedValue(5);
    await expect(prayerWallService.share(memberCtx, { body: "One more prayer", kind: "prayer", showName: false })).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("I prayed for this", () => {
  it("records the prayer and returns the new count", async () => {
    repo.getById.mockResolvedValue(row());
    repo.countPrayers.mockResolvedValue(4);

    const res = await prayerWallService.pray(memberCtx, POST);

    expect(repo.addPrayer).toHaveBeenCalledWith("t-1", POST, memberCtx.userId);
    expect(res).toEqual({ prayedCount: 4, prayedByMe: true });
  });

  it.each(["pending", "rejected", "archived"])("treats a %s prayer as not found", async (status) => {
    repo.getById.mockResolvedValue(row({ status }));
    await expect(prayerWallService.pray(memberCtx, POST)).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.addPrayer).not.toHaveBeenCalled();
  });

  it("can be undone", async () => {
    repo.getById.mockResolvedValue(row());
    repo.countPrayers.mockResolvedValue(2);
    const res = await prayerWallService.unpray(memberCtx, POST);
    expect(repo.removePrayer).toHaveBeenCalledWith("t-1", POST, memberCtx.userId);
    expect(res).toEqual({ prayedCount: 2, prayedByMe: false });
  });
});

describe("removing", () => {
  it("lets the author withdraw their own prayer", async () => {
    repo.getById.mockResolvedValue(row({ authorMemberId: ME, status: "pending" }));
    await prayerWallService.remove(memberCtx, POST);
    expect(repo.delete).toHaveBeenCalledWith("t-1", POST);
  });

  it("answers not found when a member tries to delete someone else's", async () => {
    repo.getById.mockResolvedValue(row({ authorMemberId: SOMEONE }));
    await expect(prayerWallService.remove(memberCtx, POST)).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("lets a moderator remove any prayer", async () => {
    repo.getById.mockResolvedValue(row({ authorMemberId: SOMEONE }));
    await prayerWallService.remove(pastorCtx, POST);
    expect(repo.delete).toHaveBeenCalled();
  });
});

describe("moderation", () => {
  it("is closed to members", async () => {
    await expect(prayerWallService.listForModeration(memberCtx, "pending")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(prayerWallService.moderate(memberCtx, POST, { status: "approved" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("shows moderators who wrote each prayer", async () => {
    repo.listForModeration.mockResolvedValue([
      { ...row({ status: "pending" }), reviewedByName: null },
    ]);
    repo.countByStatus.mockResolvedValue({ pending: 1, approved: 7 });

    const res = await prayerWallService.listForModeration(pastorCtx, "pending");

    expect(res.items[0].authorName).toBe("Mariam Fawzy");
    expect(res.counts).toEqual({ pending: 1, approved: 7 });
  });

  it("approves a pending prayer and records the reviewer", async () => {
    repo.getById.mockResolvedValue(row({ status: "pending" }));
    await prayerWallService.moderate(pastorCtx, POST, { status: "approved" });
    expect(repo.setStatus).toHaveBeenCalledWith("t-1", POST, "approved", pastorCtx.userId);
  });

  it("refuses a move the workflow does not allow", async () => {
    repo.getById.mockResolvedValue(row({ status: "pending" }));
    await expect(prayerWallService.moderate(pastorCtx, POST, { status: "archived" })).rejects.toBeInstanceOf(ConflictError);
    expect(repo.setStatus).not.toHaveBeenCalled();
  });

  it("does nothing when the status is already the one asked for", async () => {
    repo.getById.mockResolvedValue(row({ status: "approved" }));
    await prayerWallService.moderate(pastorCtx, POST, { status: "approved" });
    expect(repo.setStatus).not.toHaveBeenCalled();
  });
});
