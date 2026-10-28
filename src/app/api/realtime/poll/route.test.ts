/**
 * GET /api/realtime/poll
 *
 * On the live site (Cloudflare serves no WebSocket) this route is how the dashboard
 * hears about arrivals, so it must carry what the golden "welcome back" banner
 * needs: how long each arriving member has been away.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

const user = {
  id: "u-admin",
  tenantId: "tenant-1",
  email: "admin@grace.community",
  name: "Grace Admin",
  role: "admin",
  isActive: true,
  memberId: null,
};

const arrival = new Date("2026-10-27T16:24:44.000Z");
const daysBefore = (n: number) => new Date(arrival.getTime() - n * 86_400_000);

function checkInRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "rec-1",
    memberId: "m-nadia",
    serviceId: "svc-now",
    checkInTime: arrival,
    method: "qr",
    member: { id: "m-nadia", firstName: "Nadia", lastName: "Girgis", avatarUrl: null, ministry: "Worship" },
    ...overrides,
  };
}

async function poll() {
  const token = await signSession({ userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role });
  const req = new NextRequest("http://localhost/api/realtime/poll?since=2026-10-27T16:20:00.000Z", {
    headers: { cookie: `church_session=${token}` },
  });
  const res = await GET(req, { params: Promise.resolve({}) } as never);
  return (await res.json()).data.events as Array<{ type: string; data: Record<string, any> }>;
}

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.user.findUnique as any).mockResolvedValue(user);
  (prisma.auditLog.findMany as any).mockResolvedValue([]);
  (prisma.member.findMany as any).mockResolvedValue([]);
});

describe("GET /api/realtime/poll: arrivals", () => {
  it("tells the dashboard how long an arriving member has been away", async () => {
    (prisma.attendanceRecord.findMany as any).mockResolvedValue([checkInRecord()]);
    // The earlier-visit lookup: Nadia was last here on 4 September.
    (prisma.attendanceRecord.findFirst as any).mockResolvedValue({ checkInTime: new Date("2026-09-04T08:00:00.000Z") });

    const events = await poll();
    const arrivalEvent = events.find((e) => e.type === "attendance.check_in")!;

    expect(arrivalEvent.data).toMatchObject({
      memberName: "Nadia Girgis",
      consecutiveMissedWeeks: 6,
      lastAttendanceDate: "2026-09-04T08:00:00.000Z",
    });
  });

  it("sends no away information for a first visit", async () => {
    (prisma.attendanceRecord.findMany as any).mockResolvedValue([checkInRecord()]);
    (prisma.attendanceRecord.findFirst as any).mockResolvedValue(null);

    const arrivalEvent = (await poll()).find((e) => e.type === "attendance.check_in")!;
    expect(arrivalEvent.data).not.toHaveProperty("consecutiveMissedWeeks");
    expect(arrivalEvent.data).not.toHaveProperty("lastAttendanceDate");
  });

  it("counts a regular attender as missing nothing", async () => {
    (prisma.attendanceRecord.findMany as any).mockResolvedValue([checkInRecord()]);
    (prisma.attendanceRecord.findFirst as any).mockResolvedValue({ checkInTime: daysBefore(7) });

    const arrivalEvent = (await poll()).find((e) => e.type === "attendance.check_in")!;
    expect(arrivalEvent.data.consecutiveMissedWeeks).toBe(0);
  });

  it("gives each arrival its own away information", async () => {
    (prisma.attendanceRecord.findMany as any).mockResolvedValue([
      checkInRecord({ id: "rec-1", memberId: "m-nadia" }),
      checkInRecord({
        id: "rec-2",
        memberId: "m-peter",
        member: { id: "m-peter", firstName: "Peter", lastName: "Wahba", avatarUrl: null, ministry: "Ushering" },
      }),
    ]);
    (prisma.attendanceRecord.findFirst as any).mockImplementation(async ({ where }: any) =>
      where.memberId === "m-nadia" ? { checkInTime: daysBefore(49) } : { checkInTime: daysBefore(84) },
    );

    const byName = Object.fromEntries(
      (await poll()).filter((e) => e.type === "attendance.check_in").map((e) => [e.data.memberName, e.data.consecutiveMissedWeeks]),
    );
    expect(byName).toEqual({ "Nadia Girgis": 6, "Peter Wahba": 11 });
  });

  it("still delivers the arrival when the away lookup fails", async () => {
    (prisma.attendanceRecord.findMany as any).mockResolvedValue([checkInRecord()]);
    (prisma.attendanceRecord.findFirst as any).mockImplementation(async () => {
      throw new Error("database hiccup");
    });

    const arrivalEvent = (await poll()).find((e) => e.type === "attendance.check_in")!;
    expect(arrivalEvent.data.memberName).toBe("Nadia Girgis");
    expect(arrivalEvent.data).not.toHaveProperty("consecutiveMissedWeeks");
  });
});
