import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listMembers, POST as createMember } from "./route";
import {
  GET as getMember,
  PUT as updateMember,
  DELETE as deleteMember,
} from "./[memberId]/route";
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

const leaderUser = {
  id: "u-leader",
  tenantId: "tenant-1",
  email: "leader@grace.community",
  name: "Leader User",
  role: "leader",
  isActive: true,
};

const memberUser = {
  id: "u-member",
  tenantId: "tenant-1",
  email: "member@grace.community",
  name: "Regular Member",
  role: "member",
  isActive: true,
};

const mockMemberRow = {
  id: "m-123",
  tenantId: "tenant-1",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "(555) 123-4567",
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
    user?: typeof adminUser;
  } = {}
) {
  const user = options.user ?? adminUser;
  const authToken = await signSession({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
  });

  return new NextRequest(url, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      cookie: `church_session=${authToken}`,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
}

describe("Members API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.id === adminUser.id) return adminUser;
      if (where.id === leaderUser.id) return leaderUser;
      if (where.id === memberUser.id) return memberUser;
      return null;
    });
  });

  describe("GET /api/members", () => {
    it("returns paginated members scoped to tenant", async () => {
      (prisma.member.findMany as any).mockResolvedValue([mockMemberRow]);
      (prisma.member.count as any).mockResolvedValue(1);

      const req = await makeRequest("http://localhost/api/members?page=1&limit=10");
      const res = await listMembers(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe("m-123");
      expect(json.pagination.total).toBe(1);

      // Verify tenant isolation filter
      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: "tenant-1" }),
        })
      );
    });

    it("applies search and status filters", async () => {
      (prisma.member.findMany as any).mockResolvedValue([mockMemberRow]);
      (prisma.member.count as any).mockResolvedValue(1);

      const req = await makeRequest("http://localhost/api/members?search=John&status=active&ministry=Worship");
      const res = await listMembers(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: "tenant-1",
            status: "active",
            ministry: "Worship",
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: { contains: "John", mode: "insensitive" } }),
            ]),
          }),
        })
      );
    });
  });

  describe("POST /api/members", () => {
    it("creates a new member in the tenant", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(null); // No duplicate email
      (prisma.member.create as any).mockResolvedValue(mockMemberRow);
      (prisma.auditLog.create as any).mockResolvedValue({});

      const newMemberPayload = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "(555) 123-4567",
        status: "active",
        ministry: "Worship",
      };

      const req = await makeRequest("http://localhost/api/members", {
        method: "POST",
        body: newMemberPayload,
      });

      const res = await createMember(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.email).toBe("john.doe@example.com");

      // Verify tenantId comes from session, not body
      expect(prisma.member.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "tenant-1",
            email: "john.doe@example.com",
          }),
        })
      );
    });

    it("rejects duplicate email within the same tenant with 409 Conflict", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(mockMemberRow); // Duplicate exists

      const req = await makeRequest("http://localhost/api/members", {
        method: "POST",
        body: {
          firstName: "Duplicate",
          lastName: "User",
          email: "john.doe@example.com",
        },
      });

      const res = await createMember(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("CONFLICT");
    });

    it("rejects invalid member payload with 400 Validation Error", async () => {
      const req = await makeRequest("http://localhost/api/members", {
        method: "POST",
        body: {
          firstName: "",
          email: "not-an-email",
        },
      });

      const res = await createMember(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });

    it("rejects creation if user lacks members.create permission (e.g. regular member)", async () => {
      const req = await makeRequest("http://localhost/api/members", {
        method: "POST",
        user: memberUser,
        body: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
        },
      });

      const res = await createMember(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/members/[memberId]", () => {
    it("returns member details when found in tenant", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(mockMemberRow);

      const req = await makeRequest("http://localhost/api/members/m-123");
      const res = await getMember(req, { params: Promise.resolve({ memberId: "m-123" }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("m-123");
    });

    it("returns 404 when member belongs to another tenant or does not exist", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(null);

      const req = await makeRequest("http://localhost/api/members/m-other-tenant");
      const res = await getMember(req, { params: Promise.resolve({ memberId: "m-other-tenant" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/members/[memberId]", () => {
    it("updates member fields and records audit log", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(mockMemberRow);
      (prisma.member.update as any).mockResolvedValue({
        ...mockMemberRow,
        firstName: "Johnny",
        ministry: "Youth",
      });
      (prisma.auditLog.create as any).mockResolvedValue({});

      const req = await makeRequest("http://localhost/api/members/m-123", {
        method: "PUT",
        body: {
          firstName: "Johnny",
          ministry: "Youth",
        },
      });

      const res = await updateMember(req, { params: Promise.resolve({ memberId: "m-123" }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.firstName).toBe("Johnny");
    });

    it("rejects update if member does not exist in caller's tenant with 404", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(null);

      const req = await makeRequest("http://localhost/api/members/nonexistent", {
        method: "PUT",
        body: { firstName: "Test" },
      });

      const res = await updateMember(req, { params: Promise.resolve({ memberId: "nonexistent" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/members/[memberId]", () => {
    it("deactivates member (sets status to inactive)", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(mockMemberRow);
      (prisma.member.update as any).mockResolvedValue({
        ...mockMemberRow,
        status: "inactive",
      });
      (prisma.auditLog.create as any).mockResolvedValue({});

      const req = await makeRequest("http://localhost/api/members/m-123", {
        method: "DELETE",
      });

      const res = await deleteMember(req, { params: Promise.resolve({ memberId: "m-123" }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("inactive");

      expect(prisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "m-123", tenantId: "tenant-1" },
          data: { status: "inactive" },
        })
      );
    });

    it("rejects deletion if user lacks members.delete (e.g. leader)", async () => {
      const req = await makeRequest("http://localhost/api/members/m-123", {
        method: "DELETE",
        user: leaderUser,
      });

      const res = await deleteMember(req, { params: Promise.resolve({ memberId: "m-123" }) });
      expect(res.status).toBe(403);
    });
  });
});
