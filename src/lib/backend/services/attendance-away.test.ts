/**
 * The live check-in event carries how long the member has been away, so the
 * golden "welcome back" banner can show for real people, not just the preset
 * demo names. It must never get in the way of the check-in itself.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { attendanceService } from "./attendance-service";
import { encodeAttendanceSessionToken } from "../../attendance/attendance-session";
import prisma from "@/lib/db/prisma";
import type { TenantContext } from "../types";

const friday = (h: number, m: number) => new Date(2026, 9, 2, h, m, 0, 0);
const arrival = friday(11, 0);
const daysBefore = (n: number) => new Date(arrival.getTime() - n * 86_400_000);

const ctx: TenantContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  role: "member",
  permissions: ["attendance.checkin", "attendance.read"],
  email: "mina@example.com",
};
const service = { id: "svc-1", tenantId: "tenant-1", name: "Friday Main Service", startTime: friday(9, 0), endTime: friday(13, 0), status: "scheduled" };
const member = { id: "m-1", tenantId: "tenant-1", firstName: "Mina", lastName: "Samir", email: "mina@example.com", status: "active" };
const record = { id: "r-1", tenantId: "tenant-1", memberId: "m-1", serviceId: "svc-1", checkInTime: arrival, checkOutTime: null, method: "qr", createdAt: arrival };

let emit: ReturnType<typeof vi.spyOn>;

/** `lastVisit` is what the "earlier visit" lookup finds; null means a first visit. */
function setup(lastVisit: Date | null | "error") {
  (prisma.service.findFirst as any).mockResolvedValue(service);
  (prisma.member.findFirst as any).mockResolvedValue(member);
  (prisma.attendanceRecord.create as any).mockResolvedValue(record);
  (prisma.auditLog.create as any).mockResolvedValue({});
  (prisma.attendanceRecord.findFirst as any).mockImplementation(async ({ where }: any) => {
    const isEarlierVisitLookup = typeof where.serviceId === "object" && where.serviceId?.not;
    if (!isEarlierVisitLookup) return null; // not yet checked in to this service
    if (lastVisit === "error") throw new Error("database hiccup");
    return lastVisit ? { checkInTime: lastVisit } : null;
  });
}

async function checkIn() {
  const token = await encodeAttendanceSessionToken({ serviceId: "svc-1", tenantId: "tenant-1" }, arrival);
  return attendanceService.checkIn(ctx, { sessionToken: token }, { now: arrival });
}

function sentEvent() {
  const call = (emit.mock.calls as any[][]).find((c) => c[1] === "attendance.check_in");
  return call?.[2] as Record<string, unknown> | undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(arrival);
  emit = vi.spyOn(attendanceService as any, "emitRealtimeEvent").mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("check-in event: how long the member has been away", () => {
  it("says four weeks away means three missed weeks, with the last visit date", async () => {
    setup(daysBefore(28));
    await checkIn();
    expect(sentEvent()).toMatchObject({
      memberName: "Mina Samir",
      consecutiveMissedWeeks: 3,
      lastAttendanceDate: daysBefore(28).toISOString(),
    });
  });

  it("says a regular attender missed nothing", async () => {
    setup(daysBefore(7));
    await checkIn();
    expect(sentEvent()?.consecutiveMissedWeeks).toBe(0);
  });

  it("adds nothing for a first visit, so a new person is not 'welcomed back'", async () => {
    setup(null);
    await checkIn();
    expect(sentEvent()).not.toHaveProperty("consecutiveMissedWeeks");
    expect(sentEvent()).not.toHaveProperty("lastAttendanceDate");
  });

  it("still checks the member in when the lookup fails", async () => {
    setup("error");
    const result = await checkIn();
    expect(result.alreadyCheckedIn).toBe(false);
    expect(prisma.attendanceRecord.create).toHaveBeenCalledTimes(1);
    expect(sentEvent()).toBeDefined();
    expect(sentEvent()).not.toHaveProperty("consecutiveMissedWeeks");
  });

  it("looks only at the member's own earlier visits, in this church, to other services", async () => {
    setup(daysBefore(28));
    await checkIn();
    const lookup = (prisma.attendanceRecord.findFirst as any).mock.calls
      .map((c: any[]) => c[0].where)
      .find((w: any) => typeof w.serviceId === "object");
    expect(lookup).toMatchObject({ tenantId: "tenant-1", memberId: "m-1", serviceId: { not: "svc-1" } });
  });
});
