/**
 * Workspace Summary Service
 *
 * The top bar is on every page, so it must never show a count the viewer could
 * not open: each figure is gated on the permission that lets them act on it.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { workspaceSummaryService } from "./workspace-summary-service";
import { workspaceSummaryRepository } from "../../db/repositories/workspace-summary-repository";
import type { TenantContext } from "../types";

vi.mock("../../db/repositories/workspace-summary-repository", () => ({
  workspaceSummaryRepository: {
    findLiveService: vi.fn(),
    countPendingPrayers: vi.fn(),
    countFollowUpsDue: vi.fn(),
    countNewMembers: vi.fn(),
    countPendingRoleRequests: vi.fn(),
  },
}));

const repo = vi.mocked(workspaceSummaryRepository);
const ctx = (permissions: string[]): TenantContext => ({ tenantId: "t-1", userId: "u-1", role: "x", permissions });

beforeEach(() => {
  vi.clearAllMocks();
  repo.findLiveService.mockResolvedValue({ id: "s-1", name: "Friday service", checkedIn: 214 });
  repo.countPendingPrayers.mockResolvedValue(3);
  repo.countFollowUpsDue.mockResolvedValue(5);
  repo.countNewMembers.mockResolvedValue(2);
  repo.countPendingRoleRequests.mockResolvedValue(1);
});

describe("workspace summary", () => {
  it("gives a pastor everything they can act on", async () => {
    const s = await workspaceSummaryService.getSummary(
      ctx(["attendance.read", "prayer_wall.moderate", "followups.read", "members.read", "roles.manage"]),
    );
    expect(s).toEqual({
      live: { id: "s-1", name: "Friday service", checkedIn: 214 },
      waiting: { prayers: 3, followUps: 5, newMembers: 2, roleRequests: 1 },
    });
  });

  it("leaves out counts the caller has no permission for, without querying them", async () => {
    const s = await workspaceSummaryService.getSummary(ctx(["attendance.read", "members.read"]));
    expect(s.waiting).toEqual({ prayers: null, followUps: null, newMembers: 2, roleRequests: null });
    expect(repo.countPendingPrayers).not.toHaveBeenCalled();
    expect(repo.countFollowUpsDue).not.toHaveBeenCalled();
  });

  it("shows no live service to someone who cannot read attendance", async () => {
    const s = await workspaceSummaryService.getSummary(ctx([]));
    expect(s.live).toBeNull();
    expect(repo.findLiveService).not.toHaveBeenCalled();
  });

  it("counts new members over the last 7 days", async () => {
    const now = new Date("2026-10-27T12:00:00Z");
    await workspaceSummaryService.getSummary(ctx(["members.read"]), now);
    expect(repo.countNewMembers).toHaveBeenCalledWith("t-1", new Date("2026-10-20T12:00:00Z"));
  });
});
