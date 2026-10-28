import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listGroups, POST as createGroup } from "./route";
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
};

const memberUser = {
  id: "u-member",
  tenantId: "tenant-1",
  email: "member@grace.community",
  name: "Member User",
  role: "member",
  isActive: true,
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

describe("Groups API", () => {
  beforeEach(() => {
    // Members start with nothing; here the admin has ticked what this route needs.
    grantMemberPermissions(["groups.read"]);
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.id === adminUser.id) return adminUser;
      if (where.id === memberUser.id) return memberUser;
      return null;
    });
  });

  it("lists groups for tenant members", async () => {
    (prisma.group.findMany as any).mockResolvedValue([
      {
        id: "grp-1",
        name: "Youth Fellowship",
        tenantId: "tenant-1",
        _count: { members: 12 },
      },
    ]);

    const req = await makeRequest("http://localhost/api/groups", { user: memberUser });
    const res = await listGroups(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data[0].name).toBe("Youth Fellowship");
  });

  it("allows admin to create group", async () => {
    (prisma.group.create as any).mockImplementation(async ({ data }: any) => ({
      id: "grp-new",
      ...data,
      leader: null,
      ministry: null,
    }));

    const req = await makeRequest("http://localhost/api/groups", {
      method: "POST",
      user: adminUser,
      body: {
        name: "Choir Practice",
        description: "Weekly rehearsal",
      },
    });

    const res = await createGroup(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Choir Practice");
  });

  it("rejects regular member from creating a group with 403", async () => {
    const req = await makeRequest("http://localhost/api/groups", {
      method: "POST",
      user: memberUser,
      body: {
        name: "Member Group",
      },
    });

    const res = await createGroup(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });
});
