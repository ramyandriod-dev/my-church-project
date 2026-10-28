import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getMyAttendance } from "./route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

const memberUser = {
  id: "u-member-1",
  tenantId: "tenant-1",
  email: "john@example.com",
  name: "John Smith",
  role: "member",
  isActive: true,
  memberId: "m-john",
};

const mockRecords = [
  {
    id: "att-1",
    tenantId: "tenant-1",
    memberId: "m-john",
    serviceId: "srv-1",
    checkInTime: new Date("2026-03-27T10:00:00Z"),
    checkOutTime: null,
    method: "qr",
    createdAt: new Date("2026-03-27T10:00:00Z"),
    service: {
      id: "srv-1",
      name: "Sunday Service",
      startTime: new Date("2026-03-27T09:30:00Z"),
      endTime: new Date("2026-03-27T11:30:00Z"),
    },
  },
];

async function makeRequest(options: { user?: typeof memberUser | null } = {}) {
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

  return new NextRequest("http://localhost/api/attendance/me", {
    method: "GET",
    headers,
  });
}

describe("GET /api/attendance/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests with 401", async () => {
    const req = await makeRequest({ user: null });
    const res = await getMyAttendance(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("returns member attendance history, streak, and attendance rate", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(memberUser);
    (prisma.user.findFirst as any).mockResolvedValue({
      id: memberUser.id,
      memberId: "m-john",
    });
    (prisma.member.findFirst as any).mockResolvedValue({
      id: "m-john",
      tenantId: "tenant-1",
    });
    (prisma.attendanceRecord.findMany as any).mockResolvedValue(mockRecords);
    (prisma.attendanceRecord.count as any).mockResolvedValue(1);

    const req = await makeRequest();
    const res = await getMyAttendance(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.records).toHaveLength(1);
    expect(json.data.records[0].id).toBe("att-1");
    expect(json.data.records[0].service.name).toBe("Sunday Service");
    expect(json.data.stats.totalCheckIns).toBe(1);
    expect(json.data.stats.attendanceRate).toBeGreaterThanOrEqual(0);
  });
});
