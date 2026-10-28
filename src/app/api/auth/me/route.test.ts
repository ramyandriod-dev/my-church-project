import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAuthMe } from "./route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

const testUser = {
  id: "u-test-1",
  tenantId: "tenant-1",
  email: "admin@grace.community",
  name: "David Admin",
  role: "admin",
  isActive: true,
  avatarUrl: null,
  tenant: {
    id: "tenant-1",
    name: "Grace Community Church",
    slug: "grace-community",
  },
};

const testMember = {
  id: "m-david",
  tenantId: "tenant-1",
  firstName: "David",
  lastName: "Admin",
  email: "admin@grace.community",
  phone: "+1 555 000",
  status: "active",
  avatarUrl: null,
  ministry: "Leadership",
  group: { id: "g-lead", name: "Elders" },
};

async function makeRequest(options: { user?: typeof testUser | null } = {}) {
  const headers: Record<string, string> = {};

  if (options.user !== null) {
    const user = options.user ?? testUser;
    const authToken = await signSession({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });
    headers.cookie = `church_session=${authToken}`;
  }

  return new NextRequest("http://localhost/api/auth/me", {
    method: "GET",
    headers,
  });
}

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user with linked memberId and member details", async () => {
    (prisma.user.findUnique as any).mockImplementation(async ({ select }: any) => {
      return {
        ...testUser,
        memberId: "m-david",
        member: testMember,
      };
    });

    const req = await makeRequest();
    const res = await getAuthMe(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.id).toBe(testUser.id);
    expect(json.data.user.memberId).toBe("m-david");
    expect(json.data.user.member).toBeDefined();
    expect(json.data.user.member.firstName).toBe("David");
    expect(json.data.user.member.ministry).toBe("Leadership");
    expect(json.data.user.member.group.name).toBe("Elders");
  });

  it("auto-heals and links member by email if memberId is initially null", async () => {
    (prisma.user.findUnique as any).mockImplementation(async () => ({
      ...testUser,
      memberId: null,
      member: null,
    }));
    (prisma.member.findFirst as any).mockResolvedValue(testMember);
    (prisma.user.update as any).mockResolvedValue({
      ...testUser,
      memberId: "m-david",
    });

    const req = await makeRequest();
    const res = await getAuthMe(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.user.memberId).toBe("m-david");
    expect(json.data.user.member.firstName).toBe("David");
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: testUser.id },
        data: { memberId: "m-david" },
      })
    );
  });
});
