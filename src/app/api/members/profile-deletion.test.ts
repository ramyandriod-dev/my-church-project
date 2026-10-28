import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DELETE as requestMyProfileDeletion } from "./me/route";
import { POST as resolveMemberDeletion } from "./[memberId]/resolve-deletion/route";
import { DELETE as deleteMemberRoute } from "./[memberId]/route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

const adminUser = {
  id: "u-admin",
  tenantId: "tenant-1",
  email: "admin@grace.community",
  name: "Admin User",
  role: "admin",
  isActive: true,
};

const memberUser = {
  id: "u-member",
  tenantId: "tenant-1",
  email: "member@grace.community",
  name: "Self Member",
  role: "member",
  isActive: true,
};

const mockMemberRow = {
  id: "m-member-1",
  tenantId: "tenant-1",
  firstName: "Self",
  lastName: "Member",
  email: "member@grace.community",
  phone: "(555) 999-0000",
  avatarUrl: "https://example.com/avatar.jpg",
  status: "active",
  ministry: "Worship",
  groupId: null,
  joinedAt: new Date("2026-01-01"),
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  group: null,
};

async function makeRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    user?: typeof adminUser | typeof memberUser;
  } = {}
) {
  const user = options.user ?? adminUser;
  const sessionToken = await signSession({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
  });

  const req = new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      cookie: `church_session=${sessionToken}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  return req;
}

describe("Profile Deletion & Resolution Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.id === "u-admin") return adminUser;
      if (where.id === "u-member") return { ...memberUser, memberId: mockMemberRow.id };
      return null;
    });

    (prisma.user.findFirst as any).mockImplementation(async ({ where }: any) => {
      if (where.id === "u-admin") return adminUser;
      if (where.id === "u-member") return { ...memberUser, memberId: mockMemberRow.id };
      return null;
    });

    (prisma.member.findFirst as any).mockImplementation(async ({ where }: any) => {
      if (where.id === mockMemberRow.id || where.email === mockMemberRow.email) {
        return mockMemberRow;
      }
      return null;
    });

    (prisma.member.update as any).mockImplementation(async ({ data }: any) => {
      return { ...mockMemberRow, ...data };
    });

    (prisma.member.delete as any).mockImplementation(async () => {
      return mockMemberRow;
    });

    (prisma.user.update as any).mockImplementation(async ({ data }: any) => {
      return { ...memberUser, ...data };
    });

    (prisma.user.updateMany as any).mockImplementation(async () => {
      return { count: 1 };
    });

    (prisma.user.deleteMany as any).mockImplementation(async () => {
      return { count: 1 };
    });

    (prisma.session.updateMany as any).mockImplementation(async () => {
      return { count: 1 };
    });

    (prisma.followUp.create as any).mockImplementation(async ({ data }: any) => {
      return { id: "f-123", ...data };
    });

    (prisma.auditLog.create as any).mockImplementation(async ({ data }: any) => {
      return { id: "audit-123", ...data };
    });
  });

  describe("DELETE /api/members/me (Self-service Mobile profile deletion)", () => {
    it("allows an authenticated member to request profile deletion and terminates session", async () => {
      const req = await makeRequest("/api/members/me", {
        method: "DELETE",
        user: memberUser,
        body: { reason: "Relocating abroad" },
      });

      const res = await requestMyProfileDeletion(req, {} as any);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("deletion_requested");

      // Verify member status was updated to deletion_requested
      expect(prisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockMemberRow.id, tenantId: "tenant-1" },
          data: expect.objectContaining({ status: "deletion_requested" }),
        })
      );

      // Verify user was deactivated
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: memberUser.id },
          data: expect.objectContaining({ isActive: false }),
        })
      );

      // Verify urgent pastoral FollowUp was recorded
      expect(prisma.followUp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: mockMemberRow.id,
            type: "member_deletion_request",
            priority: "urgent",
            status: "open",
          }),
        })
      );

      // Verify session cookie was expired
      const cookieHeader = res.headers.get("Set-Cookie");
      expect(cookieHeader).toContain("Expires=Thu, 01 Jan 1970");
    });
  });

  describe("POST /api/members/[memberId]/resolve-deletion", () => {
    it("allows admin to resolve by keeping member for pastoral follow-up", async () => {
      const req = await makeRequest(`/api/members/${mockMemberRow.id}/resolve-deletion`, {
        method: "POST",
        user: adminUser,
        body: {
          action: "keep_for_followup",
          notes: "Pastor will visit the member this week",
        },
      });

      const res = await resolveMemberDeletion(req, {
        params: Promise.resolve({ memberId: mockMemberRow.id }),
      } as any);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.action).toBe("kept_for_followup");

      // Member status set to inactive
      expect(prisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockMemberRow.id, tenantId: "tenant-1" },
          data: expect.objectContaining({ status: "inactive" }),
        })
      );

      // Pastoral investigation task created
      expect(prisma.followUp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "pastoral_investigation",
            notes: expect.stringContaining("Pastor will visit the member this week"),
          }),
        })
      );
    });

    it("allows admin to resolve by permanently deleting member", async () => {
      const req = await makeRequest(`/api/members/${mockMemberRow.id}/resolve-deletion`, {
        method: "POST",
        user: adminUser,
        body: {
          action: "delete_permanently",
        },
      });

      const res = await resolveMemberDeletion(req, {
        params: Promise.resolve({ memberId: mockMemberRow.id }),
      } as any);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.action).toBe("deleted_permanently");

      // Permanently purges user and member
      expect(prisma.user.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: mockMemberRow.id, tenantId: "tenant-1" },
        })
      );
      expect(prisma.member.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockMemberRow.id, tenantId: "tenant-1" },
        })
      );
    });

    it("forbids regular members from resolving deletion", async () => {
      const req = await makeRequest(`/api/members/${mockMemberRow.id}/resolve-deletion`, {
        method: "POST",
        user: memberUser,
        body: { action: "delete_permanently" },
      });

      const res = await resolveMemberDeletion(req, {
        params: Promise.resolve({ memberId: mockMemberRow.id }),
      } as any);

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/members/[memberId] (CRM Direct Delete)", () => {
    it("deactivates member on normal delete", async () => {
      const req = await makeRequest(`/api/members/${mockMemberRow.id}`, {
        method: "DELETE",
        user: adminUser,
      });

      const res = await deleteMemberRoute(req, {
        params: Promise.resolve({ memberId: mockMemberRow.id }),
      } as any);

      expect(res.status).toBe(200);
      expect(prisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "inactive" }),
        })
      );
    });

    it("permanently deletes when ?permanent=true is provided", async () => {
      const req = await makeRequest(`/api/members/${mockMemberRow.id}?permanent=true`, {
        method: "DELETE",
        user: adminUser,
      });

      const res = await deleteMemberRoute(req, {
        params: Promise.resolve({ memberId: mockMemberRow.id }),
      } as any);

      expect(res.status).toBe(200);
      expect(prisma.member.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockMemberRow.id, tenantId: "tenant-1" },
        })
      );
    });
  });
});
