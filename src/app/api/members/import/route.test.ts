import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as importMembers } from "./route";
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
  name: "Regular Member",
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
    method: options.method ?? "POST",
    headers: {
      "content-type": "application/json",
      cookie: `church_session=${authToken}`,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
}

describe("POST /api/members/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.id === adminUser.id) return adminUser;
      if (where.id === memberUser.id) return memberUser;
      return null;
    });
  });

  it("requires members.create permission (rejects regular member with 403)", async () => {
    const req = await makeRequest("http://localhost/api/members/import", {
      user: memberUser,
      body: {
        members: [
          { firstName: "Alice", lastName: "Smith", email: "alice@example.com" },
        ],
      },
    });

    const res = await importMembers(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it("successfully imports a batch of members with skip strategy", async () => {
    (prisma.group.findMany as any).mockResolvedValue([
      { id: "grp-1", name: "Choir" },
    ]);
    (prisma.member.findMany as any).mockResolvedValue([
      { id: "m-existing", email: "existing@example.com", firstName: "Old", lastName: "Member" },
    ]);
    (prisma.member.create as any).mockImplementation(async ({ data }: any) => ({
      id: "m-new",
      ...data,
    }));

    const req = await makeRequest("http://localhost/api/members/import", {
      user: adminUser,
      body: {
        onDuplicate: "skip",
        members: [
          {
            firstName: "Alice",
            lastName: "Smith",
            email: "alice@example.com",
            phone: "+1 555 123",
            ministry: "Worship",
            groupName: "Choir",
          },
          {
            firstName: "Old",
            lastName: "Member",
            email: "existing@example.com",
          },
        ],
      },
    });

    const res = await importMembers(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.imported).toBe(1);
    expect(json.data.skipped).toBe(1);
    expect(json.data.updated).toBe(0);

    // Verify tenantId was injected from session
    expect(prisma.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          email: "alice@example.com",
          groupId: "grp-1",
        }),
      })
    );
  });

  it("updates existing members when onDuplicate is 'update'", async () => {
    (prisma.group.findMany as any).mockResolvedValue([]);
    (prisma.member.findMany as any).mockResolvedValue([
      { id: "m-existing", email: "existing@example.com", firstName: "Old", lastName: "Member" },
    ]);
    (prisma.member.update as any).mockResolvedValue({
      id: "m-existing",
      email: "existing@example.com",
      firstName: "Updated",
      lastName: "Member",
    });

    const req = await makeRequest("http://localhost/api/members/import", {
      user: adminUser,
      body: {
        onDuplicate: "update",
        members: [
          {
            firstName: "Updated",
            lastName: "Member",
            email: "existing@example.com",
            phone: "+1 555 999",
            ministry: "Youth",
          },
        ],
      },
    });

    const res = await importMembers(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.updated).toBe(1);
    expect(json.data.imported).toBe(0);

    expect(prisma.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "m-existing", tenantId: "tenant-1" },
        data: expect.objectContaining({
          firstName: "Updated",
          phone: "+1 555 999",
          ministry: "Youth",
        }),
      })
    );
  });

  it("handles duplicate emails inside the file by skipping subsequent occurrences", async () => {
    (prisma.group.findMany as any).mockResolvedValue([]);
    (prisma.member.findMany as any).mockResolvedValue([]);
    (prisma.member.create as any).mockImplementation(async ({ data }: any) => ({
      id: "m-dup",
      ...data,
    }));

    const req = await makeRequest("http://localhost/api/members/import", {
      user: adminUser,
      body: {
        onDuplicate: "skip",
        members: [
          { firstName: "First", lastName: "Occurrence", email: "same@example.com" },
          { firstName: "Second", lastName: "Occurrence", email: "same@example.com" },
        ],
      },
    });

    const res = await importMembers(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.imported).toBe(1);
    expect(json.data.skipped).toBe(1);
  });
});
