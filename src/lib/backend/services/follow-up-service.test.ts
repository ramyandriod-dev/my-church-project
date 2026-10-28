import { describe, it, expect, vi, beforeEach } from "vitest";
import { followUpService } from "./follow-up-service";
import { followUpRepository } from "../../db/repositories/follow-up-repository";
import type { TenantContext } from "../types";
import { ConflictError, NotFoundError } from "../errors";

vi.mock("../../db/repositories/follow-up-repository", () => ({
  followUpRepository: {
    findForTenant: vi.fn(),
    listForTenant: vi.fn(),
    findOpenByMemberAndSituation: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    addActivity: vi.fn(),
    getStats: vi.fn(),
  },
}));

const mockCtx: TenantContext = {
  tenantId: "t-1",
  userId: "u-1",
  role: "pastor",
  email: "pastor@example.com",
  permissions: [
    "followups.read",
    "followups.create",
    "followups.update",
    "followups.delete",
  ],
};

const mockFollowUp = {
  id: "f-1",
  tenantId: "t-1",
  memberId: "m-1",
  memberName: "Michael Williams",
  assignedTo: "u-2",
  assignedToName: "Peter George",
  type: "absenteeism" as const,
  reason: "Missed Friday Meeting",
  priority: "high" as const,
  status: "open" as const,
  dueDate: "2026-09-23T10:00:00.000Z",
  notes: "Follow up regarding absent streak",
  activities: [],
  createdAt: "2026-09-21T10:00:00.000Z",
  updatedAt: "2026-09-21T10:00:00.000Z",
};

describe("FollowUpService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listFollowUps", () => {
    it("returns items, total, and KPI stats", async () => {
      vi.mocked(followUpRepository.listForTenant).mockResolvedValue({
        items: [mockFollowUp],
        total: 1,
      });
      vi.mocked(followUpRepository.getStats).mockResolvedValue({
        open: 1,
        inProgress: 0,
        dueToday: 1,
        overdue: 0,
        completedThisWeek: 0,
        total: 1,
      });

      const result = await followUpService.listFollowUps(mockCtx, { status: "open" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].reason).toBe("Missed Friday Meeting");
      expect(result.stats.open).toBe(1);
      expect(followUpRepository.listForTenant).toHaveBeenCalledWith("t-1", { status: "open" });
    });
  });

  describe("getFollowUp", () => {
    it("returns follow-up by ID", async () => {
      vi.mocked(followUpRepository.findForTenant).mockResolvedValue(mockFollowUp);
      const result = await followUpService.getFollowUp(mockCtx, "f-1");
      expect(result.id).toBe("f-1");
    });

    it("throws NotFoundError when not found", async () => {
      vi.mocked(followUpRepository.findForTenant).mockResolvedValue(null);
      await expect(followUpService.getFollowUp(mockCtx, "missing")).rejects.toThrow(NotFoundError);
    });
  });

  describe("createFollowUp & duplicate prevention", () => {
    it("creates follow-up successfully when no open duplicate exists", async () => {
      vi.mocked(followUpRepository.findOpenByMemberAndSituation).mockResolvedValue(null);
      vi.mocked(followUpRepository.create).mockResolvedValue(mockFollowUp);

      const result = await followUpService.createFollowUp(mockCtx, {
        memberId: "m-1",
        reason: "Missed Friday Meeting",
        assignedTo: "u-2",
        type: "absenteeism",
        priority: "high",
        dueDate: "2026-09-23T10:00:00.000Z",
      });

      expect(result.followUp.id).toBe("f-1");
      expect(followUpRepository.create).toHaveBeenCalled();
    });

    it("throws ConflictError when open follow-up exists for same situation", async () => {
      vi.mocked(followUpRepository.findOpenByMemberAndSituation).mockResolvedValue(mockFollowUp);

      await expect(
        followUpService.createFollowUp(mockCtx, {
          memberId: "m-1",
          reason: "Missed Friday Meeting",
        })
      ).rejects.toThrow(ConflictError);
    });

    it("allows duplicate creation when forceCreate is true", async () => {
      vi.mocked(followUpRepository.create).mockResolvedValue(mockFollowUp);

      const result = await followUpService.createFollowUp(mockCtx, {
        memberId: "m-1",
        reason: "Missed Friday Meeting",
        forceCreate: true,
      });

      expect(result.followUp.id).toBe("f-1");
      expect(followUpRepository.findOpenByMemberAndSituation).not.toHaveBeenCalled();
    });
  });

  describe("updateFollowUp", () => {
    it("updates status and owner assignment", async () => {
      vi.mocked(followUpRepository.findForTenant).mockResolvedValue(mockFollowUp);
      vi.mocked(followUpRepository.update).mockResolvedValue({
        ...mockFollowUp,
        status: "completed",
        assignedTo: "u-3",
      });

      const updated = await followUpService.updateFollowUp(mockCtx, "f-1", {
        status: "completed",
        assignedTo: "u-3",
      });

      expect(updated.status).toBe("completed");
      expect(updated.assignedTo).toBe("u-3");
    });
  });

  describe("logActivity", () => {
    it("records contact log and updates lastContact", async () => {
      vi.mocked(followUpRepository.findForTenant).mockResolvedValue(mockFollowUp);
      const mockActivity = {
        id: "act-1",
        tenantId: "t-1",
        followUpId: "f-1",
        contactType: "whatsapp" as const,
        notes: "Contacted Michael on WhatsApp. He will attend this Friday.",
        contactDate: "2026-09-21T12:00:00.000Z",
        createdById: "u-1",
        createdByName: "Pastor David",
        createdAt: "2026-09-21T12:00:00.000Z",
      };

      vi.mocked(followUpRepository.addActivity).mockResolvedValue({
        activity: mockActivity,
        followUp: {
          ...mockFollowUp,
          status: "in_progress",
          lastContact: "2026-09-21T12:00:00.000Z",
          activities: [mockActivity],
        },
      });

      const result = await followUpService.logActivity(mockCtx, "f-1", {
        contactType: "whatsapp",
        notes: "Contacted Michael on WhatsApp. He will attend this Friday.",
      });

      expect(result.activity.contactType).toBe("whatsapp");
      expect(result.followUp.status).toBe("in_progress");
      expect(result.followUp.lastContact).toBe("2026-09-21T12:00:00.000Z");
    });
  });

  describe("checkDuplicate", () => {
    it("returns true and existing follow-up when active item exists", async () => {
      vi.mocked(followUpRepository.findOpenByMemberAndSituation).mockResolvedValue(mockFollowUp);
      const res = await followUpService.checkDuplicate(mockCtx, "m-1", "Missed Friday");
      expect(res.hasDuplicate).toBe(true);
      expect(res.existingFollowUp?.id).toBe("f-1");
    });

    it("returns false when no duplicate exists", async () => {
      vi.mocked(followUpRepository.findOpenByMemberAndSituation).mockResolvedValue(null);
      const res = await followUpService.checkDuplicate(mockCtx, "m-2", "Missed Friday");
      expect(res.hasDuplicate).toBe(false);
      expect(res.existingFollowUp).toBeNull();
    });
  });
});
