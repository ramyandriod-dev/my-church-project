import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listPrayers, POST as createPrayer } from "./route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { grantMemberPermissions } from "../../../../tests/member-grants";

const adminUser = {
  id: "u-admin",
  tenantId: "tenant-1",
  email: "admin@grace.community",
  name: "Admin User",
  role: "admin",
  isActive: true,
  memberId: "m-admin",
};

const memberUser = {
  id: "u-member",
  tenantId: "tenant-1",
  email: "member@grace.community",
  name: "Member User",
  role: "member",
  isActive: true,
  memberId: "m-member",
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

describe("Prayer Requests API", () => {
  beforeEach(() => {
    // Members start with nothing; here the admin has ticked what this route needs.
    grantMemberPermissions(["prayers.create"]);
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.id === adminUser.id) return adminUser;
      if (where.id === memberUser.id) return memberUser;
      return null;
    });
  });

  it("lists all prayers for staff with prayers.read", async () => {
    (prisma.prayerRequest.findMany as any).mockResolvedValue([
      {
        id: "pr-1",
        category: "Healing",
        request: "Please pray for quick recovery",
        tenantId: "tenant-1",
        member: { id: "m-1", firstName: "Alice", lastName: "Smith" },
        shepherd: null,
      },
    ]);

    const req = await makeRequest("http://localhost/api/prayers", { user: adminUser });
    const res = await listPrayers(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data[0].category).toBe("Healing");
  });

  it("allows member to submit prayer request with auto-resolved memberId", async () => {
    (prisma.user.findFirst as any).mockResolvedValue(memberUser);
    (prisma.member.findFirst as any).mockResolvedValue({ id: "m-member", tenantId: "tenant-1" });
    (prisma.prayerRequest.create as any).mockImplementation(async ({ data }: any) => ({
      id: "pr-new",
      ...data,
      member: { id: "m-member", firstName: "Member", lastName: "User" },
      shepherd: null,
    }));

    const req = await makeRequest("http://localhost/api/prayers", {
      method: "POST",
      user: memberUser,
      body: {
        category: "Family",
        request: "Prayer for peace in our home",
      },
    });

    const res = await createPrayer(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.category).toBe("Family");
    expect(prisma.prayerRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          memberId: "m-member",
          tenantId: "tenant-1",
        }),
      })
    );
  });
});
