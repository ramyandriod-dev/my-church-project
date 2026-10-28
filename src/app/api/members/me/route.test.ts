import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getMyMemberProfile, PATCH as updateMyMemberProfile } from "./route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

const memberUser = {
  id: "u-member-1",
  tenantId: "tenant-1",
  email: "sarah@example.com",
  name: "Sarah Johnson",
  role: "member",
  isActive: true,
};

const mockLinkedMember = {
  id: "m-sarah",
  tenantId: "tenant-1",
  firstName: "Sarah",
  lastName: "Johnson",
  email: "sarah@example.com",
  phone: "+1 555 123",
  status: "active",
  ministry: "Worship",
  groupId: "g-1",
  group: { id: "g-1", name: "Worship Team" },
};

async function makeRequest(options: {
  user?: typeof memberUser | null;
  method?: string;
  body?: any;
} = {}) {
  const headers: Record<string, string> = {};

  if (options.user !== null) {
    const user = options.user ?? memberUser;
    const authToken = await signSession({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });
    headers.cookie = `church_session=${authToken}`;
  }

  const method = options.method ?? "GET";
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  return new NextRequest("http://localhost/api/members/me", {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("GET /api/members/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests with 401", async () => {
    const req = await makeRequest({ user: null });
    const res = await getMyMemberProfile(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("returns linked member record when user.memberId is set", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(memberUser);
    (prisma.user.findFirst as any).mockResolvedValue({
      id: memberUser.id,
      email: memberUser.email,
      memberId: "m-sarah",
    });
    (prisma.member.findFirst as any).mockResolvedValue(mockLinkedMember);

    const req = await makeRequest();
    const res = await getMyMemberProfile(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe("m-sarah");
    expect(json.data.firstName).toBe("Sarah");
    expect(json.data.email).toBe("sarah@example.com");
    expect(json.data.group.name).toBe("Worship Team");

    // Tenant isolation verification
    expect(prisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-1" }),
      })
    );
  });

  it("auto-links member by email when user.memberId is initially null", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(memberUser);
    (prisma.user.findFirst as any).mockResolvedValue({
      id: memberUser.id,
      email: memberUser.email,
      memberId: null,
    });
    (prisma.member.findFirst as any).mockResolvedValue(mockLinkedMember);
    (prisma.user.update as any).mockResolvedValue({
      ...memberUser,
      memberId: "m-sarah",
    });

    const req = await makeRequest();
    const res = await getMyMemberProfile(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("m-sarah");

    // Verified auto-heal update called
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: memberUser.id },
        data: { memberId: "m-sarah" },
      })
    );
  });

  it("returns 404 when no member record exists for user in tenant", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(memberUser);
    (prisma.user.findFirst as any).mockResolvedValue({
      id: memberUser.id,
      email: memberUser.email,
      memberId: null,
    });
    (prisma.member.findFirst as any).mockResolvedValue(null);

    const req = await makeRequest();
    const res = await getMyMemberProfile(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/members/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests with 401", async () => {
    const req = await makeRequest({ user: null, method: "PATCH", body: { phone: "+123456" } });
    const res = await updateMyMemberProfile(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("updates contact details and ministry for authenticated member", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(memberUser);
    (prisma.user.findFirst as any).mockResolvedValue({
      id: memberUser.id,
      email: memberUser.email,
      memberId: "m-sarah",
    });
    (prisma.member.findFirst as any).mockResolvedValue(mockLinkedMember);
    (prisma.member.update as any).mockResolvedValue({
      ...mockLinkedMember,
      phone: "+20 100 999 888",
      ministry: "Media",
    });
    (prisma.user.update as any).mockResolvedValue(memberUser);

    const req = await makeRequest({
      method: "PATCH",
      body: {
        phone: "+20 100 999 888",
        ministry: "Media",
      },
    });
    const res = await updateMyMemberProfile(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.phone).toBe("+20 100 999 888");
    expect(json.data.ministry).toBe("Media");

    expect(prisma.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "m-sarah" }),
        data: expect.objectContaining({
          phone: "+20 100 999 888",
          ministry: "Media",
        }),
      })
    );
  });
});
