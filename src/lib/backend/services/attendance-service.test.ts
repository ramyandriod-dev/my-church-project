import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { attendanceService } from "./attendance-service";
import { encodeAttendanceSessionToken } from "../../attendance/attendance-session";
import prisma from "@/lib/db/prisma";
import {
  ForbiddenError,
  NotFoundError,
  TenantError,
  ConflictError,
} from "../errors";
import type { TenantContext } from "../types";

// A future Friday: guarantees the minted session token (exp 13:00) is not
// expired under the real clock and the injected window is always "live".
const futureFridayAt = (hour: number, minute: number) =>
  new Date(2026, 9, 2, hour, minute, 0, 0);

const ctx: TenantContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  role: "member",
  permissions: ["attendance.checkin", "attendance.read"],
  email: "sarah@example.com",
};

const serviceRow = {
  id: "svc-1",
  tenantId: "tenant-1",
  name: "Friday Main Service",
  startTime: new Date(2026, 9, 2, 9, 0, 0),
  endTime: new Date(2026, 9, 2, 13, 0, 0),
  // Not "live". A live service deliberately skips the clock window check
  // (attendance-service.ts: serviceIsLive), so every M1 window assertion below
  // would be unreachable — the call would resolve instead of rejecting. This
  // suite is specifically about the clock rules, so the service must be one
  // that the clock governs.
  status: "scheduled",
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

async function mintToken(tenantId = "tenant-1", now = futureFridayAt(11, 0)) {
  return encodeAttendanceSessionToken({ serviceId: "svc-1", tenantId }, now);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(futureFridayAt(11, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AttendanceService.checkIn — Friday window (M1 rules)", () => {
  beforeEach(() => {
    (prisma.service.findFirst as any).mockResolvedValue(serviceRow);
    (prisma.member.findFirst as any).mockResolvedValue(memberRow);
    (prisma.attendanceRecord.findFirst as any).mockResolvedValue(null);
    (prisma.attendanceRecord.create as any).mockResolvedValue(recordRow);
    (prisma.auditLog.create as any).mockResolvedValue({});
  });

  it("rejects check-in before 09:00 (not started)", async () => {
    const token = await mintToken();
    await expect(
      attendanceService.checkIn(ctx, { sessionToken: token }, { now: futureFridayAt(8, 59) })
    ).rejects.toThrow("Attendance has not started");
  });

  it("rejects check-in at 08:59 specifically", async () => {
    const token = await mintToken();
    await expect(
      attendanceService.checkIn(ctx, { sessionToken: token }, { now: futureFridayAt(8, 59) })
    ).rejects.toThrow(ConflictError);
  });

  it("accepts check-in at 09:00", async () => {
    const token = await mintToken();
    const result = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: futureFridayAt(9, 0) }
    );
    expect(result.alreadyCheckedIn).toBe(false);
  });

  it("accepts check-in at 11:00 (main service)", async () => {
    const token = await mintToken();
    const result = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: futureFridayAt(11, 0) }
    );
    expect(result.alreadyCheckedIn).toBe(false);
  });

  it("accepts check-in at 12:59 (last minute)", async () => {
    const token = await mintToken();
    const result = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: futureFridayAt(12, 59) }
    );
    expect(result.alreadyCheckedIn).toBe(false);
  });

  it("rejects check-in at 13:00 exactly (window closed)", async () => {
    const token = await mintToken();
    await expect(
      attendanceService.checkIn(ctx, { sessionToken: token }, { now: futureFridayAt(13, 0) })
    ).rejects.toThrow("Attendance window has closed");
  });

  it("accepts check-in when UTC timestamp is before 09:00 UTC but live in Cairo time (e.g. 07:30 UTC = 10:30 Cairo)", async () => {
    const token = await mintToken();
    // 2026-10-02 at 07:30:00 UTC is 10:30:00 Cairo time (UTC+3 summer)
    const utcDate = new Date(Date.UTC(2026, 9, 2, 7, 30, 0));
    const result = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: utcDate }
    );
    expect(result.alreadyCheckedIn).toBe(false);
    expect(result.record.method).toBe("qr");
  });

  it("falls back to demo window when checked in on a weekday off-hours with demo clock enabled", async () => {
    const token = await mintToken();
    // Tuesday Oct 6, 2026
    const tuesdayDate = new Date(2026, 9, 6, 14, 0, 0);
    const result = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: tuesdayDate }
    );
    expect(result.alreadyCheckedIn).toBe(false);
    expect(result.record.method).toBe("qr");
  });
});

describe("AttendanceService.checkIn — QR session validation", () => {
  beforeEach(() => {
    (prisma.service.findFirst as any).mockResolvedValue(serviceRow);
    (prisma.member.findFirst as any).mockResolvedValue(memberRow);
    (prisma.attendanceRecord.findFirst as any).mockResolvedValue(null);
    (prisma.attendanceRecord.create as any).mockResolvedValue(recordRow);
    (prisma.auditLog.create as any).mockResolvedValue({});
  });

  it("accepts a valid signed session token", async () => {
    const token = await mintToken();
    const result = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: futureFridayAt(11, 0) }
    );
    expect(result.record.method).toBe("qr");
    expect(result.alreadyCheckedIn).toBe(false);
  });

  it("rejects an invalid session token", async () => {
    await expect(
      attendanceService.checkIn(
        ctx,
        { sessionToken: "garbage-token" },
        { now: futureFridayAt(11, 0) }
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects a tampered session token", async () => {
    const token = await mintToken();
    const tampered = token.slice(0, -8) + "XXXX";
    await expect(
      attendanceService.checkIn(
        ctx,
        { sessionToken: tampered },
        { now: futureFridayAt(11, 0) }
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects an expired session token", async () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const token = await mintToken("tenant-1", past);
    await expect(
      attendanceService.checkIn(ctx, { sessionToken: token }, { now: futureFridayAt(11, 0) })
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects a token minted for another tenant (tenant isolation)", async () => {
    const token = await mintToken("tenant-b");
    await expect(
      attendanceService.checkIn(ctx, { sessionToken: token }, { now: futureFridayAt(11, 0) })
    ).rejects.toThrow(TenantError);
  });

  it("does not trust client-supplied member identity — member is resolved from the session", async () => {
    // A client could never pass a memberId (strict schema); even at the
    // service level there is no memberId parameter. The created record must
    // reference the member resolved from the authenticated email.
    const token = await mintToken();
    const result = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: futureFridayAt(11, 0) }
    );
    expect(result.record.memberId).toBe("m-1");
    expect(prisma.attendanceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          memberId: "m-1",
          serviceId: "svc-1",
          method: "qr",
        }),
      })
    );
  });
});

describe("AttendanceService.checkIn — tenant isolation", () => {
  it("rejects a service that belongs to another tenant", async () => {
    (prisma.service.findFirst as any).mockResolvedValue(null);
    const token = await mintToken();
    await expect(
      attendanceService.checkIn(ctx, { sessionToken: token }, { now: futureFridayAt(11, 0) })
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects when the authenticated user has no member profile in the tenant", async () => {
    (prisma.service.findFirst as any).mockResolvedValue(serviceRow);
    (prisma.member.findFirst as any).mockResolvedValue(null);

    const token = await mintToken();
    await expect(
      attendanceService.checkIn(ctx, { sessionToken: token }, { now: futureFridayAt(11, 0) })
    ).rejects.toThrow("Member profile not found");
  });
});

describe("AttendanceService.checkIn — duplicate prevention (server-side)", () => {
  it("creates a record on first check-in and returns alreadyCheckedIn=false", async () => {
    (prisma.service.findFirst as any).mockResolvedValue(serviceRow);
    (prisma.member.findFirst as any).mockResolvedValue(memberRow);
    (prisma.attendanceRecord.findFirst as any).mockResolvedValue(null);
    (prisma.attendanceRecord.create as any).mockResolvedValue(recordRow);
    (prisma.auditLog.create as any).mockResolvedValue({});

    const token = await mintToken();
    const result = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: futureFridayAt(11, 0) }
    );

    expect(result.alreadyCheckedIn).toBe(false);
    expect(prisma.attendanceRecord.create).toHaveBeenCalledTimes(1);
  });

  it("returns alreadyCheckedIn=true on a second check-in and creates no new record", async () => {
    (prisma.service.findFirst as any).mockResolvedValue(serviceRow);
    (prisma.member.findFirst as any).mockResolvedValue(memberRow);
    (prisma.attendanceRecord.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(recordRow);
    (prisma.attendanceRecord.create as any).mockResolvedValue(recordRow);
    (prisma.auditLog.create as any).mockResolvedValue({});

    const token = await mintToken();
    await attendanceService.checkIn(ctx, { sessionToken: token }, { now: futureFridayAt(11, 0) });

    const second = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: futureFridayAt(11, 59) }
    );

    expect(second.alreadyCheckedIn).toBe(true);
    expect(prisma.attendanceRecord.create).toHaveBeenCalledTimes(1);
  });

  it("handles the DB unique-constraint race (P2002) idempotently", async () => {
    (prisma.service.findFirst as any).mockResolvedValue(serviceRow);
    (prisma.member.findFirst as any).mockResolvedValue(memberRow);
    (prisma.attendanceRecord.findFirst as any)
      .mockResolvedValueOnce(null) // first dup check finds nothing
      .mockResolvedValue(recordRow); // recovery lookup finds the winner
    (prisma.attendanceRecord.create as any).mockRejectedValue({ code: "P2002" });
    (prisma.auditLog.create as any).mockResolvedValue({});

    const token = await mintToken();
    const result = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: futureFridayAt(11, 0) }
    );

    expect(result.alreadyCheckedIn).toBe(true);
  });
});

describe("AttendanceService.checkIn — attendance state + no inference", () => {
  it("produces PRESENT (a qr method record) and NEVER an excuse or follow-up", async () => {
    (prisma.service.findFirst as any).mockResolvedValue(serviceRow);
    (prisma.member.findFirst as any).mockResolvedValue(memberRow);
    (prisma.attendanceRecord.findFirst as any).mockResolvedValue(null);
    (prisma.attendanceRecord.create as any).mockResolvedValue(recordRow);
    (prisma.auditLog.create as any).mockResolvedValue({});

    const token = await mintToken();
    const result = await attendanceService.checkIn(
      ctx,
      { sessionToken: token },
      { now: futureFridayAt(11, 0) }
    );

    expect(result.alreadyCheckedIn).toBe(false);
    // PRESENT only — no exception/excuse is ever auto-created from a check-in.
    expect(prisma.attendanceException.create).not.toHaveBeenCalled();
    expect(result.record.method).toBe("qr");
  });

  it("rejects unauthenticated (no tenant context) check-ins", async () => {
    await expect(
      attendanceService.checkIn(null as any, {
        sessionToken: await mintToken(),
      })
    ).rejects.toThrow(TenantError);
  });
});

describe("AttendanceService.resetAttendance", () => {
  it("clears only the open service run's check-ins, strictly for the authenticated tenant, and audits", async () => {
    (prisma.attendanceRecord.deleteMany as any).mockResolvedValue({ count: 5 });
    (prisma.auditLog.create as any).mockResolvedValue({});

    const result = await attendanceService.resetAttendance(ctx);

    expect(result.count).toBe(5);
    // Completed services are history: a demo reset must never erase past attendance.
    expect(prisma.attendanceRecord.deleteMany).toHaveBeenCalledWith({
      where: { tenantId: ctx.tenantId, service: { status: { not: "completed" } } },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: ctx.tenantId,
          action: "reset",
          resource: "attendance",
        }),
      })
    );
  });

  it("rejects unauthenticated reset calls", async () => {
    await expect(attendanceService.resetAttendance(null as any)).rejects.toThrow(TenantError);
  });
});