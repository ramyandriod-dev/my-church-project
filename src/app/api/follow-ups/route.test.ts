import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { GET as GET_DETAIL, PATCH } from "./[id]/route";
import { POST as POST_ACTIVITY } from "./[id]/activities/route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

const pastorUser = {
  id: "u-pastor",
  tenantId: "tenant-1",
  email: "pastor@example.com",
  name: "Pastor David",
  role: "pastor",
  isActive: true,
};

const memberUser = {
  id: "u-member",
  tenantId: "tenant-1",
  email: "member@example.com",
  name: "Regular Member",
  role: "member",
  isActive: true,
};

const mockFollowUpRow = {
  id: "f-101",
  tenantId: "tenant-1",
  memberId: "m-101",
  assignedTo: "u-pastor",
  type: "absenteeism",
  reason: "Missed Friday Meeting",
  notes: "Needs check-in",
  priority: "high",
  status: "open",
  dueDate: new Date("2026-09-25"),
  completedAt: null,
  lastContact: null,
  nextAction: "Call Michael",
  createdAt: new Date(),
  updatedAt: new Date(),
  member: {
    id: "m-101",
    firstName: "Michael",
    lastName: "Williams",
    avatarUrl: "https://i.pravatar.cc/150?img=33",
  },
  assignee: {
    id: "u-pastor",
    name: "Pastor David",
  },
  activities: [],
};

async function createReq(url: string, method: string, role: "pastor" | "member" | "none", body?: unknown) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (role !== "none") {
    const user = role === "pastor" ? pastorUser : memberUser;
    const token = await signSession({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });
    headers["cookie"] = `church_session=${token}`;
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Follow-up API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === "u-pastor") return Promise.resolve(pastorUser);
      if (where.id === "u-member") return Promise.resolve(memberUser);
      return Promise.resolve(null);
    });
  });

  describe("GET /api/follow-ups", () => {
    it("rejects unauthenticated requests (401)", async () => {
      const req = await createReq("http://localhost/api/follow-ups", "GET", "none");
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
    });

    it("rejects member role lacking followups.read permission (403)", async () => {
      const req = await createReq("http://localhost/api/follow-ups", "GET", "member");
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });

    it("returns follow-ups list and stats for authorized pastor (200)", async () => {
      (prisma.followUp.findMany as any).mockResolvedValue([mockFollowUpRow]);
      (prisma.followUp.count as any).mockResolvedValue(1);

      const req = await createReq("http://localhost/api/follow-ups", "GET", "pastor");
      const res = await GET(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.items).toHaveLength(1);
      expect(json.data.items[0].reason).toBe("Missed Friday Meeting");
      expect(json.data.stats).toBeDefined();
    });
  });

  describe("POST /api/follow-ups", () => {
    it("creates follow-up when authorized (201)", async () => {
      (prisma.followUp.findFirst as any).mockResolvedValue(null);
      (prisma.followUp.create as any).mockResolvedValue(mockFollowUpRow);
      (prisma.auditLog.create as any).mockResolvedValue({});

      const req = await createReq("http://localhost/api/follow-ups", "POST", "pastor", {
        memberId: "m-101",
        reason: "Missed Friday Meeting",
        priority: "high",
        assignedTo: "u-pastor",
      });

      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.followUp.id).toBe("f-101");
    });

    it("returns 409 conflict when duplicate open follow-up exists", async () => {
      (prisma.followUp.findFirst as any).mockResolvedValue(mockFollowUpRow);

      const req = await createReq("http://localhost/api/follow-ups", "POST", "pastor", {
        memberId: "m-101",
        reason: "Missed Friday Meeting",
      });

      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("CONFLICT");
      expect(json.error.message).toContain("An open follow-up already exists");
    });
  });

  describe("GET /api/follow-ups/[id]", () => {
    it("returns follow-up detail (200)", async () => {
      (prisma.followUp.findFirst as any).mockResolvedValue(mockFollowUpRow);

      const req = await createReq("http://localhost/api/follow-ups/f-101", "GET", "pastor");
      const res = await GET_DETAIL(req, { params: Promise.resolve({ id: "f-101" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe("f-101");
    });
  });

  describe("PATCH /api/follow-ups/[id]", () => {
    it("updates follow-up status (200)", async () => {
      (prisma.followUp.findFirst as any).mockResolvedValue(mockFollowUpRow);
      (prisma.followUp.update as any).mockResolvedValue({
        ...mockFollowUpRow,
        status: "in_progress",
      });
      (prisma.auditLog.create as any).mockResolvedValue({});

      const req = await createReq("http://localhost/api/follow-ups/f-101", "PATCH", "pastor", {
        status: "in_progress",
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "f-101" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("in_progress");
    });
  });

  describe("POST /api/follow-ups/[id]/activities", () => {
    it("records contact log and transitions to in_progress (201)", async () => {
      (prisma.followUp.findFirst as any).mockResolvedValue(mockFollowUpRow);
      (prisma.followUpActivity.create as any).mockResolvedValue({
        id: "act-1",
        tenantId: "tenant-1",
        followUpId: "f-101",
        contactType: "phone",
        notes: "Called Michael, had a good talk.",
        contactDate: new Date(),
        createdById: "u-pastor",
        createdBy: { name: "Pastor David" },
        createdAt: new Date(),
      });
      (prisma.followUp.update as any).mockResolvedValue({
        ...mockFollowUpRow,
        status: "in_progress",
        lastContact: new Date(),
      });
      (prisma.auditLog.create as any).mockResolvedValue({});

      const req = await createReq("http://localhost/api/follow-ups/f-101/activities", "POST", "pastor", {
        contactType: "phone",
        notes: "Called Michael, had a good talk.",
      });

      const res = await POST_ACTIVITY(req, { params: Promise.resolve({ id: "f-101" }) });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.activity.contactType).toBe("phone");
      expect(json.data.followUp.status).toBe("in_progress");
    });
  });
});
