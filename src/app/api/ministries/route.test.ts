import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listMinistries, POST as createMinistry } from "./route";
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

describe("Ministries API", () => {
  beforeEach(() => {
    // Members start with nothing; here the admin has ticked what this route needs.
    grantMemberPermissions(["ministries.read"]);
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.id === adminUser.id) return adminUser;
      if (where.id === memberUser.id) return memberUser;
      return null;
    });
  });

  it("lists ministries for tenant members", async () => {
    (prisma.ministry.findMany as any).mockResolvedValue([
      {
        id: "min-1",
        name: "Worship Ministry",
        tenantId: "tenant-1",
        leader: null,
        groups: [],
      },
    ]);

    const req = await makeRequest("http://localhost/api/ministries", { user: memberUser });
    const res = await listMinistries(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data[0].name).toBe("Worship Ministry");
  });

  it("allows admin to create ministry", async () => {
    (prisma.ministry.create as any).mockImplementation(async ({ data }: any) => ({
      id: "min-new",
      ...data,
      leader: null,
    }));

    const req = await makeRequest("http://localhost/api/ministries", {
      method: "POST",
      user: adminUser,
      body: {
        name: "Hospitality Ministry",
        description: "Welcoming visitors",
      },
    });

    const res = await createMinistry(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Hospitality Ministry");
  });

  it("rejects regular member from creating a ministry with 403", async () => {
    const req = await makeRequest("http://localhost/api/ministries", {
      method: "POST",
      user: memberUser,
      body: {
        name: "Member Ministry",
      },
    });

    const res = await createMinistry(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });
});
