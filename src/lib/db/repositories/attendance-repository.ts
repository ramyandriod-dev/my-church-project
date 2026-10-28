/**
 * Attendance Repository
 *
 * Tenant-scoped data access for the attendance domain.
 * The ATTENDANCE SERVICE (business logic) calls this repository;
 * repositories call Prisma. Route handlers never touch Prisma directly.
 *
 * CRITICAL SECURITY RULE (tenant isolation):
 * Every query includes tenantId and resolves objects ONLY within the
 * authenticated tenant. No query ever reads across tenants.
 */

import prisma from "../prisma";
import type { AttendanceExceptionStatus } from "../../backend/types";

export const attendanceRepository = {
  /**
   * Find a service within a tenant. Returns null if missing OR
   * if the service belongs to another tenant (tenant lookup model).
   */
  async findServiceForTenant(tenantId: string, serviceId: string) {
    return prisma.service.findFirst({
      where: { id: serviceId, tenantId },
    });
  },

  /**
   * Resolve a member by email within a tenant. Member identity is always
   * derived from the authenticated user session — never from the client.
   */
  async findMemberByEmail(tenantId: string, email: string) {
    return prisma.member.findFirst({
      where: { tenantId, email },
    });
  },

  /**
   * Find a member by id within a tenant (used only by authorized
   * admin-style flows that already passed role authorization).
   */
  async findMemberForTenant(tenantId: string, memberId: string) {
    return prisma.member.findFirst({
      where: { id: memberId, tenantId },
    });
  },

  /**
   * Find the current/next attendance session (Service) for a tenant.
   * Prefers today's service, then falls back to the next scheduled one.
   */
  async findActiveSession(tenantId: string, at: Date) {
    // 1. Explicitly live services take immediate precedence
    const liveService = await prisma.service.findFirst({
      where: {
        tenantId,
        status: "live",
      },
      orderBy: { startTime: "desc" },
    });
    if (liveService) return liveService;

    const dayStart = new Date(at);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(at);
    dayEnd.setHours(23, 59, 59, 999);

    const today = await prisma.service.findFirst({
      where: {
        tenantId,
        startTime: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { startTime: "asc" },
    });
    if (today) return today;

    return prisma.service.findFirst({
      where: {
        tenantId,
        status: { in: ["scheduled", "live"] },
      },
      orderBy: { startTime: "asc" },
    });
  },

  /**
   * Demo-only convenience: the Friday service for a tenant, even when another
   * service sorts earlier. Used ONLY while a Demo Mode clock header is present
   * so the mobile demo always shows the same "Friday Main Service" the
   * dashboard promotes. Production lookups keep using findActiveSession.
   */
  async findFridayDemoService(tenantId: string) {
    return prisma.service.findFirst({
      where: {
        tenantId,
        name: { contains: "Friday", mode: "insensitive" },
      },
      orderBy: { startTime: "asc" },
    });
  },

  /**
   * Duplicate-safe lookup before creating a check-in.
   */
  async findCheckIn(tenantId: string, memberId: string, serviceId: string) {
    return prisma.attendanceRecord.findFirst({
      where: { tenantId, memberId, serviceId },
    });
  },

  /**
   * The member's most recent earlier visit, ignoring the service they are
   * checking in to now. Used to work out how long they have been away.
   */
  async findLastCheckInBefore(tenantId: string, memberId: string, excludeServiceId: string, before: Date) {
    return prisma.attendanceRecord.findFirst({
      where: { tenantId, memberId, serviceId: { not: excludeServiceId }, checkInTime: { lt: before } },
      orderBy: { checkInTime: "desc" },
      select: { checkInTime: true },
    });
  },

  /**
   * Create a check-in (attendance record). tenantId is ALWAYS from the
   * server-side context — never from the client request.
   */
  async createCheckIn(
    tenantId: string,
    data: {
      memberId: string;
      serviceId: string;
      checkInTime: Date;
      method: string;
    }
  ) {
    return prisma.attendanceRecord.create({
      data: {
        tenantId,
        memberId: data.memberId,
        serviceId: data.serviceId,
        checkInTime: data.checkInTime,
        method: data.method,
      },
    });
  },

  /**
   * Find an explicit attendance exception (excused / not_expected).
   */
  async findException(tenantId: string, memberId: string, serviceId: string) {
    return prisma.attendanceException.findFirst({
      where: { tenantId, memberId, serviceId },
    });
  },

  /**
   * Record an explicit exception. The excuse is NEVER inferred — reason is
   * provided by an authorized user and recordedBy/recordedAt are captured.
   */
  async createException(
    tenantId: string,
    data: {
      memberId: string;
      serviceId: string;
      status: AttendanceExceptionStatus;
      reason: string | null;
      note?: string | null;
      recordedBy: string;
    }
  ) {
    return prisma.attendanceException.create({
      data: {
        tenantId,
        memberId: data.memberId,
        serviceId: data.serviceId,
        status: data.status,
        reason: data.reason,
        note: data.note ?? null,
        recordedBy: data.recordedBy,
        recordedAt: new Date(),
      },
    });
  },

  /**
   * Delete all check-in records for a tenant (demo / test reset).
   */
  /**
   * Clear the check-ins of the service run that is still open (scheduled or live):
   * what the dashboard's "Reset check-ins" is for. Check-ins at services marked
   * completed are history and are never touched, so a demo reset cannot erase a
   * member's past attendance (and with it who has been away).
   */
  async deleteLiveCheckIns(tenantId: string) {
    return prisma.attendanceRecord.deleteMany({
      where: { tenantId, service: { status: { not: "completed" } } },
    });
  },

  /**
   * Find attendance records for a specific member within a tenant,
   * including the service name and schedule.
   */
  async findMemberAttendanceHistory(tenantId: string, memberId: string, limit = 50) {
    return prisma.attendanceRecord.findMany({
      where: { tenantId, memberId },
      orderBy: { checkInTime: "desc" },
      take: limit,
      include: {
        service: {
          select: { id: true, name: true, startTime: true, endTime: true },
        },
      },
    });
  },

  /**
   * Count total check-ins for a member within a tenant.
   */
  async countMemberCheckIns(tenantId: string, memberId: string) {
    return prisma.attendanceRecord.count({
      where: { tenantId, memberId },
    });
  },
};

export type AttendanceRepository = typeof attendanceRepository;