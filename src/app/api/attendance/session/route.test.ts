import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { signSession } from "@/lib/auth";
import { decodeAttendanceSessionToken } from "@/lib/attendance/attendance-session";
import prisma from "@/lib/db/prisma";
import { grantMemberPermissions } from "../../../../../tests/member-grants";

/**
 * M5 mobile flow: the member's phone fetches the attendance session and its
 * QR token. The token must contain NO member identity (service + tenant only).
 */

const fridayNow = () => new Date(2026, 9, 2, 10, 30, 0);

const memberUser = {
  id: "u-1",
  tenantId: "tenant-1",
  email: "john.smith@example.com",
  name: "John Smith",
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

async function makeAuthenticatedRequest() {
  const authToken = await signSession({
    userId: "u-1",
    tenantId: "tenant-1",
    email: "john.smith@example.com",
    role: "member",
  });
  return new NextRequest("http://localhost/api/attendance/session", {
    method: "GET",
    headers: { cookie: `church_session=${authToken}` },
  });
}

beforeEach(() => {

  // Members start with nothing; here the admin has ticked what this route needs.

  grantMemberPermissions(["attendance.read", "attendance.checkin"]);
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(fridayNow());

  (prisma.user.findUnique as any).mockResolvedValue(memberUser);
  (prisma.service.findFirst as any).mockResolvedValue(serviceRow);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/attendance/session", () => {
  it("rejects unauthenticated access (401)", async () => {
    const request = new NextRequest("http://localhost/api/attendance/session");
    const res = await GET(request, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("gives an authenticated member their session + QR token", async () => {
    const res = await GET(await makeAuthenticatedRequest(), { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.sessionId).toBe("svc-1");
    expect(json.data.serviceName).toBe("Friday Main Service");
    expect(json.data.sessionType).toBe("friday_attendance");
    expect(json.data.window).toEqual({ start: "09:00", end: "13:00" });
    expect(typeof json.data.qrToken).toBe("string");
    expect(json.data.qrToken.length).toBeGreaterThan(0);
  });

  it("the QR token payload is scoped to service+tenant and carries no member identity", async () => {
    const res = await GET(await makeAuthenticatedRequest(), { params: Promise.resolve({}) });
    const json = await res.json();
    const payload = await decodeAttendanceSessionToken(json.data.qrToken);

    expect(payload).not.toBeNull();
    expect(payload!.serviceId).toBe("svc-1");
    expect(payload!.tenantId).toBe("tenant-1");
    expect(payload!.sessionType).toBe("friday_attendance");
    // No identity of any kind may be embedded in the QR.
    expect(Object.keys(payload!)).toEqual(
      expect.not.arrayContaining([
        "memberId",
        "memberEmail",
        "email",
        "userId",
        "name",
        "displayName",
        "phone",
      ])
    );
  });

  it("scopes the service lookup to the authenticated tenant", async () => {
    await GET(await makeAuthenticatedRequest(), { params: Promise.resolve({}) });
    const where = (prisma.service.findFirst as any).mock.calls[0][0].where;
    expect(where.tenantId).toBe("tenant-1");
  });

  it("mints the QR token against the shared Demo clock when x-demo-now is present", async () => {
    // Real clock: Thursday 23:54 — the token's window would be today 13:00 (past).
    const thursday = new Date(2026, 8, 17, 23, 54, 0);
    const demoNow = new Date(2026, 8, 18, 12, 59, 0); // simulated Friday 12:59
    vi.setSystemTime(thursday);

    const authToken = await signSession({
      userId: "u-1",
      tenantId: "tenant-1",
      email: "john.smith@example.com",
      role: "member",
    });
    const request = new NextRequest("http://localhost/api/attendance/session", {
      method: "GET",
      headers: { cookie: `church_session=${authToken}`, "x-demo-now": demoNow.toISOString() },
    });

    const res = await GET(request, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const json = await res.json();
    const payload = await decodeAttendanceSessionToken(json.data.qrToken, { now: demoNow });
    expect(payload).not.toBeNull();
    expect(payload!.serviceId).toBe("svc-1");

    // Token expiry is 13:00 of the SIMULATED Friday (2026-09-18), not the real day.
    const simulatedEnd = new Date(2026, 8, 18, 13, 0, 0);
    expect(payload!.exp).toBe(Math.floor(simulatedEnd.getTime() / 1000));
  });

  it("prefers the Friday service during Demo Mode even when another service sorts earlier", async () => {
    const sundayFirst = {
      id: "svc-sunday",
      tenantId: "tenant-1",
      name: "Sunday Worship Service",
      startTime: new Date(2025, 0, 1, 9, 0, 0),
      status: "scheduled",
    };
    const fridayService = {
      id: "svc-friday",
      tenantId: "tenant-1",
      name: "Friday Main Service",
      startTime: new Date(2026, 8, 18, 9, 0, 0),
      status: "live",
    };

    // findFridayDemoService (name contains "Friday") returns the Friday row.
    (prisma.service.findFirst as any).mockResolvedValueOnce(fridayService);
    (prisma.service.findFirst as any).mockResolvedValueOnce(sundayFirst);

    const authToken = await signSession({
      userId: "u-1",
      tenantId: "tenant-1",
      email: "john.smith@example.com",
      role: "member",
    });
    const request = new NextRequest("http://localhost/api/attendance/session", {
      method: "GET",
      headers: {
        cookie: `church_session=${authToken}`,
        "x-demo-now": new Date(2026, 8, 18, 12, 59, 0).toISOString(),
      },
    });

    const res = await GET(request, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.sessionId).toBe("svc-friday");
    expect(json.data.serviceName).toBe("Friday Main Service");

    // The Friday-preference query must be tenant-scoped.
    const fridayCall = (prisma.service.findFirst as any).mock.calls[0][0];
    expect(fridayCall.where.tenantId).toBe("tenant-1");
    expect(fridayCall.where.name).toMatchObject({ contains: "Friday" });

    // findActiveSession was NOT consulted because the Friday service matched.
    expect((prisma.service.findFirst as any).mock.calls.length).toBe(1);
  });
});