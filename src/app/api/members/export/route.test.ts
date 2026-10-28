import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as exportMembers } from "./route";
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

async function makeRequest(
  url: string,
  options: {
    user?: typeof adminUser | null;
  } = {}
) {
  const headers: Record<string, string> = {};

  if (options.user !== null) {
    const user = options.user ?? adminUser;
    const authToken = await signSession({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });
    headers.cookie = `church_session=${authToken}`;
  }

  return new NextRequest(url, {
    method: "GET",
    headers,
  });
}

describe("GET /api/members/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.id === adminUser.id) return adminUser;
      return null;
    });
  });

  it("rejects unauthenticated requests with 401", async () => {
    const req = await makeRequest("http://localhost/api/members/export", { user: null });
    const res = await exportMembers(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("returns CSV with correct headers, BOM, and tenant-scoped records", async () => {
    (prisma.member.findMany as any).mockResolvedValue([
      {
        id: "m-1",
        tenantId: "tenant-1",
        firstName: "Sarah",
        lastName: "Johnson, Jr.",
        email: "sarah@example.com",
        phone: "+1 555 123",
        status: "active",
        ministry: "Worship",
        avatarUrl: "https://example.com/photo.jpg",
        joinedAt: new Date("2024-06-10T12:00:00Z"),
        group: { id: "g-1", name: "Choir & Band" },
      },
    ]);

    const req = await makeRequest("http://localhost/api/members/export");
    const res = await exportMembers(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("attachment; filename=");

    const buffer = Buffer.from(await res.arrayBuffer());

    // Verify UTF-8 BOM bytes (0xEF, 0xBB, 0xBF)
    expect(buffer[0]).toBe(0xef);
    expect(buffer[1]).toBe(0xbb);
    expect(buffer[2]).toBe(0xbf);

    const text = buffer.toString("utf-8");

    // Verify CSV content and escaping (Johnson, Jr. has comma so must be quoted)
    expect(text).toContain("First Name,Last Name,Email,Phone,Status,Ministry,Group Name,Joined Date,Photo URL");
    expect(text).toContain('Sarah,"Johnson, Jr.",sarah@example.com,+1 555 123,active,Worship,Choir & Band,2024-06-10,https://example.com/photo.jpg');

    // Verify tenant filtering
    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-1" }),
      })
    );
  });
});
