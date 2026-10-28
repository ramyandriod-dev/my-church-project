/**
 * POST /api/realtime/publish
 *
 * Staff only, one event type, capped payload. A member must not be able to publish
 * events to the church's live dashboard.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

function userWithRole(role: string) {
  return { id: `u-${role}`, tenantId: "tenant-1", email: `${role}@grace.community`, name: role, role, isActive: true, memberId: null };
}

async function publish(role: string, body: unknown) {
  (prisma.user.findUnique as any).mockResolvedValue(userWithRole(role));
  const token = await signSession({ userId: `u-${role}`, tenantId: "tenant-1", email: `${role}@grace.community`, role });
  const req = new NextRequest("http://localhost/api/realtime/publish", {
    method: "POST",
    headers: { cookie: `church_session=${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({}) } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/realtime/publish", () => {
  it("refuses a member (403)", async () => {
    const res = await publish("member", { type: "attendance.check_in", data: {} });
    expect(res.status).toBe(403);
  });

  it("accepts staff with a valid event", async () => {
    const res = await publish("usher", { type: "attendance.check_in", data: { memberName: "A" } });
    expect(res.status).toBe(200);
    expect((await res.json()).data.eventType).toBe("attendance.check_in");
  });

  it("rejects an invented event type", async () => {
    const res = await publish("admin", { type: "attendance.reset", data: {} });
    expect(res.status).toBe(400);
  });

  it("rejects extra fields and oversized data", async () => {
    expect((await publish("admin", { type: "attendance.check_in", data: {}, tenantId: "other" })).status).toBe(400);
    expect((await publish("admin", { type: "attendance.check_in", data: { x: "a".repeat(5000) } })).status).toBe(400);
  });
});
