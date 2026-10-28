import { describe, it, expect, vi, beforeEach } from "vitest";
import { attendanceService } from "./attendance-service";
import prisma from "@/lib/db/prisma";
import { NotFoundError, ConflictError, ValidationError } from "../errors";
import type { TenantContext } from "../types";

const adminCtx: TenantContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  role: "admin",
  permissions: ["attendance.create"],
  email: "admin@example.com",
};

const serviceRow = {
  id: "svc-1",
  tenantId: "tenant-1",
  name: "Friday Main Service",
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

const exceptionRow = {
  id: "e-1",
  tenantId: "tenant-1",
  memberId: "m-1",
  serviceId: "svc-1",
  status: "excused",
  reason: "sick",
  note: null,
  recordedBy: "user-1",
  recordedAt: new Date(),
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.service.findFirst as any).mockResolvedValue(serviceRow);
  (prisma.member.findFirst as any).mockResolvedValue(memberRow);
  (prisma.attendanceException.findFirst as any).mockResolvedValue(null);
});

describe("AttendanceService.recordExcuse — explicit excuse model", () => {
  it("records an explicit excused absence with reason + recorder", async () => {
    (prisma.attendanceException.create as any).mockResolvedValue(exceptionRow);
    (prisma.auditLog.create as any).mockResolvedValue({});

    const result = await attendanceService.recordExcuse(adminCtx, {
      memberId: "m-1",
      serviceId: "svc-1",
      status: "excused",
      reason: "sick",
    });

    expect(result.status).toBe("excused");
    expect(result.reason).toBe("sick");
    expect(result.recordedBy).toBe("user-1");
    expect(prisma.attendanceException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          memberId: "m-1",
          serviceId: "svc-1",
          status: "excused",
          reason: "sick",
          recordedBy: "user-1",
        }),
      })
    );
  });

  it("requires an explicit reason for excused (never inferred)", async () => {
    await expect(
      attendanceService.recordExcuse(adminCtx, {
        memberId: "m-1",
        serviceId: "svc-1",
        status: "excused",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a not_expected record that carries a reason", async () => {
    await expect(
      attendanceService.recordExcuse(adminCtx, {
        memberId: "m-1",
        serviceId: "svc-1",
        status: "not_expected",
        reason: "sick",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("records not_expected without any reason", async () => {
    (prisma.attendanceException.create as any).mockResolvedValue({
      ...exceptionRow,
      status: "not_expected",
      reason: null,
    });
    (prisma.auditLog.create as any).mockResolvedValue({});

    const result = await attendanceService.recordExcuse(adminCtx, {
      memberId: "m-1",
      serviceId: "svc-1",
      status: "not_expected",
    });

    expect(result.status).toBe("not_expected");
    expect(result.reason).toBeUndefined();
    expect(prisma.attendanceException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reason: null }),
      })
    );
  });

  it("rejects when the member is not in the tenant", async () => {
    (prisma.member.findFirst as any).mockResolvedValue(null);
    await expect(
      attendanceService.recordExcuse(adminCtx, {
        memberId: "member-other-tenant",
        serviceId: "svc-1",
        status: "excused",
        reason: "travel",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects a duplicate exception for the same member/service", async () => {
    (prisma.attendanceException.findFirst as any).mockResolvedValue(exceptionRow);
    await expect(
      attendanceService.recordExcuse(adminCtx, {
        memberId: "m-1",
        serviceId: "svc-1",
        status: "excused",
        reason: "travel",
      })
    ).rejects.toThrow(ConflictError);
  });
});