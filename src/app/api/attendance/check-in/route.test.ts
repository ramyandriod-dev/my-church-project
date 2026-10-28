import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { signSession } from "@/lib/auth";
import { encodeAttendanceSessionToken } from "@/lib/attendance/attendance-session";
import prisma from "@/lib/db/prisma";
import { grantMemberPermissions } from "../../../../../tests/member-grants";

const fridayNow = () => new Date(2026, 9, 2, 11, 0, 0);

const memberUser = {
  id: "u-1",
  tenantId: "tenant-1",
  email: "sarah@example.com",
  name: "Sarah Lee",
  role: "member",
  isActive: true,
};

const serviceRow = {
  id: "svc-1",
  tenantId: "tenant-1",
  name: "Friday Main Service",
  startTime: new Date(2026, 9, 2, 9, 0, 0),
  endTime: new Date(2026, 9, 2, 13, 0, 0),
  status: "live",
};

const memberRow = {
  id: "m-1",
  tenantId: "tenant-1",
  firstName: "Sarah",
  lastName: "Lee",
  email: "sarah@example.com",
  status: "active",
};

const recordRow = {
  id: "r-1",
  tenantId: "tenant-1",
  memberId: "m-1",
  serviceId: "svc-1",
  checkInTime: new Date(2026, 9, 2, 11, 0, 0),
  checkOutTime: null,
  method: "qr",
  createdAt: new Date(2026, 9, 2, 11, 0, 0),
};

async function makeAuthenticatedRequest(body: unknown) {
  const authToken = await signSession({
    userId: "u-1",
    tenantId: "tenant-1",
    email: "sarah@example.com",
    role: "member",
  });
  const qrToken = await encodeAttendanceSessionToken({
    serviceId: "svc-1",
    tenantId: "tenant-1",
  });
  return new NextRequest("http://localhost/api/attendance/check-in", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `church_session=${authToken}`,
    },
    body: JSON.stringify({ sessionToken: qrToken, ...(body as object) }),
  });
}

async function loadRouteContext() {
  return { params: Promise.resolve({}) };
}

beforeEach(() => {

  // Members start with nothing; here the admin has ticked what this route needs.

  grantMemberPermissions(["attendance.read", "attendance.checkin"]);
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(fridayNow());

  (prisma.user.findUnique as any).mockResolvedValue(memberUser);
  (prisma.service.findFirst as any).mockResolvedValue(serviceRow);
  (prisma.member.findFirst as any).mockResolvedValue(memberRow);
  (prisma.attendanceRecord.findFirst as any).mockResolvedValue(null);
  (prisma.attendanceRecord.create as any).mockResolvedValue(recordRow);
  (prisma.auditLog.create as any).mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/attendance/check-in", () => {
  it("rejects an unauthenticated check-in (401)", async () => {
    const request = new NextRequest("http://localhost/api/attendance/check-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionToken: "anything" }),
    });

    const res = await POST(request, await loadRouteContext());
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("accepts a check-in from a valid authenticated member (200)", async () => {
    const request = await makeAuthenticatedRequest({});
    const res = await POST(request, await loadRouteContext());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.alreadyCheckedIn).toBe(false);
    // Identity came from the session — the record is for the resolved member.
    expect(json.data.record.memberId).toBe("m-1");
    expect(json.data.record.method).toBe("qr");
  });

  it("rejects client-supplied member identity (strict schema → 400)", async () => {
    const request = await makeAuthenticatedRequest({
      memberId: "someone-elses-id",
    });
    const res = await POST(request, await loadRouteContext());

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    // No record may ever be created for an arbitrary memberId.
    expect(prisma.attendanceRecord.create).not.toHaveBeenCalled();
  });

  it("returns alreadyCheckedIn=true for a duplicate check-in (no new record)", async () => {
    (prisma.attendanceRecord.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(recordRow);

    const first = await makeAuthenticatedRequest({});
    const firstRes = await POST(first, await loadRouteContext());
    expect(firstRes.status).toBe(200);

    const second = await makeAuthenticatedRequest({});
    const secondRes = await POST(second, await loadRouteContext());
    const json = await secondRes.json();

    expect(secondRes.status).toBe(200);
    expect(json.data.alreadyCheckedIn).toBe(true);
    expect(prisma.attendanceRecord.create).toHaveBeenCalledTimes(1);
  });

  it("honors the shared Demo Mode clock (simulated Friday 12:59) while the real clock is off-window", async () => {
    // Real clock: Thursday 23:54 — the REAL window would reject this scan.
    const thursday = new Date(2026, 8, 17, 23, 54, 0);
    const demoNow = new Date(2026, 8, 18, 12, 59, 0); // simulated Friday 12:59
    vi.setSystemTime(thursday);

    const authToken = await signSession({
      userId: "u-1",
      tenantId: "tenant-1",
      email: "sarah@example.com",
      role: "member",
    });
    // The QR is minted against the same demo clock.
    const qrToken = await encodeAttendanceSessionToken(
      { serviceId: "svc-1", tenantId: "tenant-1" },
      demoNow
    );

    const request = new NextRequest("http://localhost/api/attendance/check-in", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `church_session=${authToken}`,
        "x-demo-now": demoNow.toISOString(),
      },
      body: JSON.stringify({ sessionToken: qrToken }),
    });

    const res = await POST(request, await loadRouteContext());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.alreadyCheckedIn).toBe(false);

    // The check-in is recorded with the server clock in use (the demo clock).
    expect(prisma.attendanceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ checkInTime: demoNow }),
      })
    );
  });
});