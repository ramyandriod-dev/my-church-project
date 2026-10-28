import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createCareRequest } from "./route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { followUpRepository } from "@/lib/db/repositories/follow-up-repository";

vi.mock("@/lib/db/repositories/follow-up-repository", () => ({
  followUpRepository: {
    create: vi.fn(),
  },
}));

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
    user?: typeof memberUser;
  } = {}
) {
  const user = options.user ?? memberUser;
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

describe("Care Requests API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
      if (where.id === memberUser.id) return memberUser;
      return null;
    });
    (prisma.user.findFirst as any).mockImplementation(async ({ where }: any) => {
      if (where.id === memberUser.id) return memberUser;
      return null;
    });
    (prisma.member.findFirst as any).mockImplementation(async ({ where }: any) => {
      if (where.id === memberUser.memberId) return { id: memberUser.memberId, tenantId: memberUser.tenantId };
      return null;
    });
  });

  it("creates a care request for an authenticated member", async () => {
    (followUpRepository.create as any).mockResolvedValue({
      id: "fu-123",
      status: "open",
      reason: "Member Request: Pastoral Counseling & Guidance",
    });

    const req = await makeRequest("http://localhost/api/care-requests", {
      body: {
        careType: "pastoral",
        notes: "Need counseling regarding family matters",
      },
    });

    const res = await createCareRequest(req, {} as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe("fu-123");
    expect(followUpRepository.create).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        memberId: "m-member",
        type: "pastoral_care",
        status: "open",
        notes: "Need counseling regarding family matters",
      })
    );
  });

  it("rejects unauthenticated requests", async () => {
    const unauthReq = new NextRequest("http://localhost/api/care-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ careType: "pastoral" }),
    });

    const res = await createCareRequest(unauthReq, {} as any);
    expect(res.status).toBe(401);
  });
});
