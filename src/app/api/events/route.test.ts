import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listEvents, POST as createEvent } from "./route";
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

describe("Events API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.id === adminUser.id) return adminUser;
      if (where.id === memberUser.id) return memberUser;
      return null;
    });
  });

  it("lists events scoped to tenant", async () => {
    (prisma.churchEvent.findMany as any).mockResolvedValue([
      {
        id: "evt-1",
        title: "Easter Service",
        startTime: new Date("2026-04-05T10:00:00Z"),
        tenantId: "tenant-1",
      },
    ]);

    const req = await makeRequest("http://localhost/api/events");
    const res = await listEvents(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe("Easter Service");
  });

  it("allows admin/leader to create event", async () => {
    (prisma.churchEvent.create as any).mockImplementation(async ({ data }: any) => ({
      id: "evt-new",
      ...data,
    }));

    const req = await makeRequest("http://localhost/api/events", {
      method: "POST",
      body: {
        title: "Youth Night",
        startTime: "2026-04-10T19:00:00Z",
        location: "Main Hall",
      },
    });

    const res = await createEvent(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe("Youth Night");
  });

  it("rejects regular member creating event with 403", async () => {
    const req = await makeRequest("http://localhost/api/events", {
      method: "POST",
      user: memberUser,
      body: {
        title: "Youth Night",
        startTime: "2026-04-10T19:00:00Z",
      },
    });

    const res = await createEvent(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });
});
