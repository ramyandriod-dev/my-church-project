/**
 * Attendance Service
 *
 * Client-independent business logic for check-in/check-out and excuses.
 * Both web dashboard and future mobile app consume this service.
 *
 * Architecture:
 *   Member Mobile App (QR) → this.checkIn(ctx, { sessionToken }) → Repository → Prisma
 *   Authorized User          → this.recordExcuse(ctx, {...})         → Repository → Prisma
 *   Dashboard                → consumes the resulting attendance data
 *
 * The Friday attendance window (09:00 → 13:00) is enforced HERE using the
 * centralized M1 AttendanceContext. Route handlers ONLY wire HTTP.
 */

import { BaseService } from "./base-service";
import type {
  TenantContext,
  AttendanceRecord,
  CheckInResult,
  AttendanceException,
  AttendanceExceptionStatus,
} from "../types";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  TenantError,
  ValidationError,
} from "../errors";
import { getAttendanceContext } from "../../attendance/attendance-context";
import { awayInfoFor, type AwayInfo } from "../../attendance/away-info";
import { decodeAttendanceSessionToken } from "../../attendance/attendance-session";
import { attendanceRepository } from "../../db/repositories/attendance-repository";
import { familyRepository } from "../../db/repositories/family-repository";
import { memberRepository } from "../../db/repositories/member-repository";
import { resolveOwnMember } from "./own-member";
import { isDemoClockEnabled } from "../demo-clock";
import { getSimulatedFriday, getSimulatedSunday } from "../../attendance/attendance-day-context";

const MOBILE_QR_METHOD = "qr";

function toAttendanceRecord(record: any): AttendanceRecord {
  return {
    id: record.id,
    tenantId: record.tenantId,
    memberId: record.memberId,
    serviceId: record.serviceId,
    checkInTime: new Date(record.checkInTime).toISOString(),
    checkOutTime: record.checkOutTime
      ? new Date(record.checkOutTime).toISOString()
      : undefined,
    method: record.method,
    createdAt: new Date(record.createdAt).toISOString(),
  };
}

function toAttendanceException(exception: any): AttendanceException {
  return {
    id: exception.id,
    tenantId: exception.tenantId,
    memberId: exception.memberId,
    serviceId: exception.serviceId,
    status: exception.status,
    reason: exception.reason ?? undefined,
    note: exception.note ?? undefined,
    recordedBy: exception.recordedBy,
    recordedAt: new Date(exception.recordedAt).toISOString(),
    createdAt: new Date(exception.createdAt).toISOString(),
  };
}

export class AttendanceService extends BaseService {
  /**
   * Process a Mobile QR check-in.
   *
   * The client inputs the QR session token and optional family member IDs.
   * The authenticated member is resolved server-side from the session.
   * Multi-member family check-ins are verified against the household graph.
   *
   * `opts.now` is injectable for deterministic testing of the Friday window.
   */
  async checkIn(
    ctx: TenantContext,
    params: { sessionToken: string; familyMemberIds?: string[] },
    opts: { now?: Date } = {}
  ): Promise<CheckInResult> {
    const tenant = this.ensureTenant(ctx);
    const now = opts.now ?? new Date();

    // ── 1. Validate QR session context (server-side) ─────────────
    // Normal path verifies against the REAL clock (production unchanged).
    // Demo Mode fallback: if the token would only expire relative to the real
    // clock (e.g. the simulated Friday has already passed), re-verify against
    // the simulated `now` so the M5 demo remains testable off-Friday.
    let token = opts.now
      ? await decodeAttendanceSessionToken(params.sessionToken, { now: opts.now })
      : await decodeAttendanceSessionToken(params.sessionToken);

    if (!token && opts.now) {
      token = await decodeAttendanceSessionToken(params.sessionToken);
    } else if (!token && isDemoClockEnabled()) {
      // Build a simulated Friday at 11:00 relative to real now so the token
      // expiry window covers a demo service started on a non-Friday day.
      const fallbackFriday = getSimulatedFriday(11, 0, now);
      token = await decodeAttendanceSessionToken(params.sessionToken, { now: fallbackFriday });
    }

    if (!token) {
      throw new ForbiddenError("Invalid or expired attendance session");
    }
    if (token.tenantId !== tenant.tenantId) {
      throw new TenantError("Attendance session does not belong to your organization");
    }

    // ── 2. Resolve the session's service within the tenant ───────
    // NOTE: this is done BEFORE the clock window check so the service status
    // can be used as an authoritative override: if the CRM has explicitly set
    // service.status = 'live', that takes precedence over the clock. This is
    // the fix for APK reporting "Attendance has not started" when the CRM is
    // live on a non-Friday weekday (e.g., a special service or a test session).
    const service = await attendanceRepository.findServiceForTenant(
      tenant.tenantId,
      token.serviceId
    );
    if (!service) {
      throw new NotFoundError("Service not found");
    }

    // ── 3. Validate attendance window ────────────────────────────
    // If the CRM admin has explicitly marked the service as 'live', trust that
    // and skip the clock-based day/time check. This allows check-in on any day
    // the church decides to run a service (Thursday events, special services,
    // or when the real service day differs from the Friday-only default).
    const serviceIsLive = service.status === "live";

    if (!serviceIsLive) {
      // Fall through to the clock-based M1 window validation.
      let window = getAttendanceContext(now);

      // 3a. Timezone compensation: services are scheduled in Cairo local time (Africa/Cairo),
      // while Cloudflare Workers runs in UTC. A client in Egypt checking in at 10:30 AM sends
      // 07:30 UTC. Check if `now` in Africa/Cairo is within the live service window.
      if (window.state !== "live") {
        try {
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Africa/Cairo",
            weekday: "short",
            hour: "numeric",
            minute: "numeric",
            hourCycle: "h23",
          });
          const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));
          const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
          let hour = parseInt(parts.hour, 10);
          if (hour === 24) hour = 0;
          const minute = parseInt(parts.minute, 10) || 0;
          if (parts.weekday && weekdayMap[parts.weekday] !== undefined) {
            const cairoDay = weekdayMap[parts.weekday];
            if (cairoDay === 5) {
              const cairoWindow = getAttendanceContext(getSimulatedFriday(hour, minute, now));
              if (cairoWindow.state === "live") {
                window = cairoWindow;
              }
            } else if (cairoDay === 0) {
              const cairoWindow = getAttendanceContext(getSimulatedSunday(hour, minute, now));
              if (cairoWindow.state === "live") {
                window = cairoWindow;
              }
            }
          }
        } catch {
          // Non-blocking
        }
      }

      // 3b. Demo Mode / Preview environment fallback:
      // If today is not a service day ("other") or no clock was explicitly supplied,
      // and demo clock is enabled, fallback to Friday 11:00 AM demo window
      // so testing remains available across devices (APK & web) regardless of real day/time.
      if (
        window.state !== "live" &&
        (!opts.now || window.dayOfWeek === "other") &&
        isDemoClockEnabled()
      ) {
        const fallbackFriday = getSimulatedFriday(11, 0, now);
        const demoWindow = getAttendanceContext(fallbackFriday);
        if (demoWindow.state === "live") {
          window = demoWindow;
        }
      }

      if (window.state === "not-started") {
        throw new ConflictError("Attendance has not started");
      }
      if (window.state === "review") {
        throw new ConflictError("Attendance window has closed");
      }
    }

    // ── 4. Resolve WHO is checking in from the authenticated session ──
    const member = await attendanceRepository.findMemberByEmail(
      tenant.tenantId,
      ctx.email ?? ""
    );
    if (!member) {
      throw new NotFoundError("Member profile not found for the authenticated user");
    }

    const memberName = `${member.firstName} ${member.lastName}`.trim();
    const memberAvatar =
      member.avatarUrl ??
      `https://api.dicebear.com/9.x/initials/svg?seed=${member.firstName}${member.lastName}`;
    const ministry = member.ministry ?? undefined;

    // ── 5. Duplicate check — one record per member/session ───────
    const existing = await attendanceRepository.findCheckIn(
      tenant.tenantId,
      member.id,
      service.id
    );

    // ── 5.5 Helper to process multi-member family check-ins ──────
    const familyResults: Array<{
      memberId: string;
      name: string;
      recordId?: string;
      alreadyCheckedIn?: boolean;
      success: boolean;
    }> = [];

    if (params.familyMemberIds && Array.isArray(params.familyMemberIds) && params.familyMemberIds.length > 0) {
      try {
        const familyId = await familyRepository.findFamilyIdForMember(tenant.tenantId, member.id).catch(() => null);
        if (familyId) {
          const famRels = await familyRepository.listRelationshipsForFamily(tenant.tenantId, familyId).catch(() => []);
          const allowedIds = new Set<string>();
          for (const r of famRels) {
            allowedIds.add(r.fromMemberId);
            allowedIds.add(r.toMemberId);
          }
          const fam = await familyRepository.findForTenant(tenant.tenantId, familyId).catch(() => null);
          if (fam?.headMemberId) allowedIds.add(fam.headMemberId);

          for (const relId of params.familyMemberIds) {
            if (relId === member.id || !allowedIds.has(relId)) continue;
            const relMember = await memberRepository.findMemberById(tenant.tenantId, relId).catch(() => null);
            if (!relMember) continue;

            const relName = `${relMember.firstName} ${relMember.lastName}`.trim();
            const relExisting = await attendanceRepository.findCheckIn(tenant.tenantId, relId, service.id);
            if (relExisting) {
              familyResults.push({
                memberId: relId,
                name: relName,
                recordId: relExisting.id,
                alreadyCheckedIn: true,
                success: true,
              });
              continue;
            }

            try {
              const relRecord = await attendanceRepository.createCheckIn(tenant.tenantId, {
                memberId: relId,
                serviceId: service.id,
                checkInTime: now,
                method: MOBILE_QR_METHOD,
              });
              familyResults.push({
                memberId: relId,
                name: relName,
                recordId: relRecord.id,
                alreadyCheckedIn: false,
                success: true,
              });

              await this.emitRealtimeEvent(tenant, "attendance.check_in", {
                recordId: relRecord.id,
                memberId: relId,
                memberName: relName,
                memberAvatar: relMember.avatarUrl ?? undefined,
                serviceId: service.id,
                method: MOBILE_QR_METHOD,
                timestamp: now.toISOString(),
                ...(await this.awayFor(tenant.tenantId, relId, service.id, now)),
              }).catch(() => {});
            } catch {
              familyResults.push({
                memberId: relId,
                name: relName,
                success: false,
              });
            }
          }
        }
      } catch {
        // Non-blocking family processing
      }
    }

    if (existing) {
      return {
        record: toAttendanceRecord(existing),
        alreadyCheckedIn: true,
        member: {
          id: member.id,
          name: memberName,
          avatar: memberAvatar,
          ministry,
        },
        familyResults: familyResults.length > 0 ? familyResults : undefined,
      };
    }

    // ── 6. Create the attendance record (source: mobile QR) ──────
    let record: any;
    try {
      record = await attendanceRepository.createCheckIn(tenant.tenantId, {
        memberId: member.id,
        serviceId: service.id,
        checkInTime: now,
        method: MOBILE_QR_METHOD,
      });
    } catch (error) {
      // Race-safe duplicate protection: the DB unique constraint
      // (tenantId, memberId, serviceId) backs the service-level check.
      if ((error as any)?.code === "P2002") {
        const duplicate = await attendanceRepository.findCheckIn(
          tenant.tenantId,
          member.id,
          service.id
        );
        if (duplicate) {
          return {
            record: toAttendanceRecord(duplicate),
            alreadyCheckedIn: true,
            member: {
              id: member.id,
              name: memberName,
              avatar: memberAvatar,
              ministry,
            },
            familyResults: familyResults.length > 0 ? familyResults : undefined,
          };
        }
      }
      throw error;
    }

    // ── 7. Audit + realtime-ready event ─────────────────────────
    await this.audit(ctx, "check_in", "attendance", record.id, undefined, {
      memberId: member.id,
      serviceId: service.id,
      method: MOBILE_QR_METHOD,
    });
    await this.emitRealtimeEvent(tenant, "attendance.check_in", {
      recordId: record.id,
      memberId: member.id,
      memberName,
      memberAvatar,
      ministry,
      serviceId: service.id,
      method: MOBILE_QR_METHOD,
      timestamp: record.checkInTime.toISOString(),
      // Lets the live dashboard show the golden "welcome back" banner for
      // someone who has been away.
      ...(await this.awayFor(tenant.tenantId, member.id, service.id, record.checkInTime)),
    });

    return {
      record: toAttendanceRecord(record),
      alreadyCheckedIn: false,
      member: {
        id: member.id,
        name: memberName,
        avatar: memberAvatar,
        ministry,
      },
      familyResults: familyResults.length > 0 ? familyResults : undefined,
    };
  }

  /**
   * Record an explicit excused / not_expected exception.
   *
   * Excuses are NEVER inferred. Only an explicit, authorized submission
   * creates an exception; recordedBy/recordedAt capture who recorded it.
   */
  async recordExcuse(
    ctx: TenantContext,
    params: {
      memberId: string;
      serviceId: string;
      status: AttendanceExceptionStatus;
      reason?: string;
      note?: string;
    }
  ): Promise<AttendanceException> {
    const tenant = this.ensureTenant(ctx);

    // Explicit reason required for excused; forbidden for not_expected.
    if (params.status === "excused" && !params.reason?.trim()) {
      throw new ValidationError({
        reason: ["An explicit excuse reason is required (e.g. sick, travel, other)"],
      });
    }
    if (params.status === "not_expected" && params.reason) {
      throw new ValidationError({
        reason: ["A reason is not allowed for a not_expected status"],
      });
    }

    // Fully tenant-scoped: the member and service must belong to the
    // authenticated tenant or the lookup returns null.
    const [service, member] = await Promise.all([
      attendanceRepository.findServiceForTenant(tenant.tenantId, params.serviceId),
      attendanceRepository.findMemberForTenant(tenant.tenantId, params.memberId),
    ]);
    if (!service) {
      throw new NotFoundError("Service not found");
    }
    if (!member) {
      throw new NotFoundError("Member not found in your organization");
    }

    const existing = await attendanceRepository.findException(
      tenant.tenantId,
      member.id,
      service.id
    );
    if (existing) {
      throw new ConflictError("Member already has an attendance exception for this service");
    }

    const exception = await attendanceRepository.createException(tenant.tenantId, {
      memberId: member.id,
      serviceId: service.id,
      status: params.status,
      reason: params.status === "excused" ? (params.reason?.trim() ?? "") : null,
      note: params.note,
      recordedBy: ctx.userId,
    });

    await this.audit(ctx, "record_exception", "attendance", exception.id, undefined, {
      memberId: member.id,
      serviceId: service.id,
      status: params.status,
      reason: params.status === "excused" ? params.reason : null,
    });
    await this.emitRealtimeEvent(tenant, "attendance.exception", {
      exceptionId: exception.id,
      memberId: member.id,
      serviceId: service.id,
      status: params.status,
    });

    return toAttendanceException(exception);
  }

  /**
   * Check out a member from a service (foundation — future use).
   */
  async checkOut(
    ctx: TenantContext,
    params: {
      memberId: string;
      serviceId: string;
    }
  ): Promise<AttendanceRecord> {
    this.ensureTenant(ctx);
    throw new NotFoundError("Check-out not yet connected to database");
  }

  /**
   * Reset all attendance records for the tenant (demo / testing tool).
   * Emits an 'attendance.reset' event to notify connected realtime clients.
   */
  async resetAttendance(ctx: TenantContext): Promise<{ count: number }> {
    const tenant = this.ensureTenant(ctx);
    const deleted = await attendanceRepository.deleteLiveCheckIns(tenant.tenantId);

    await this.audit(ctx, "reset", "attendance", undefined, undefined, {
      count: deleted.count,
    });

    await this.emitRealtimeEvent(tenant, "attendance.reset", {
      count: deleted.count,
    });

    return { count: deleted.count };
  }

  /**
   * Get authenticated member's check-in history, attendance streak, and rate.
   * Requires valid authenticated session (any role).
   */
  async getMyAttendanceHistory(ctx: TenantContext, params: { limit?: number } = {}) {
    const tenant = this.ensureTenant(ctx);
    const ownMember = await resolveOwnMember(ctx);

    const limit = Math.max(1, Math.min(100, params.limit ?? 50));

    const [records, totalCount] = await Promise.all([
      attendanceRepository.findMemberAttendanceHistory(tenant.tenantId, ownMember.id, limit),
      attendanceRepository.countMemberCheckIns(tenant.tenantId, ownMember.id),
    ]);

    // Calculate streak: consecutive weeks with at least one check-in
    let streak = 0;
    if (records.length > 0) {
      const weekKeys = new Set<string>();
      for (const r of records) {
        const d = new Date(r.checkInTime);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000);
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        weekKeys.add(`${d.getFullYear()}-${weekNum}`);
      }

      const now = new Date();
      let currentCheck = new Date(now);
      while (true) {
        const startOfYear = new Date(currentCheck.getFullYear(), 0, 1);
        const pastDays = Math.floor((currentCheck.getTime() - startOfYear.getTime()) / 86400000);
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        const key = `${currentCheck.getFullYear()}-${weekNum}`;

        if (weekKeys.has(key)) {
          streak++;
          currentCheck.setDate(currentCheck.getDate() - 7);
        } else if (streak === 0) {
          // Allow current week not having check-in yet if early in the week
          currentCheck.setDate(currentCheck.getDate() - 7);
          const prevStartOfYear = new Date(currentCheck.getFullYear(), 0, 1);
          const prevPastDays = Math.floor((currentCheck.getTime() - prevStartOfYear.getTime()) / 86400000);
          const prevWeekNum = Math.ceil((prevPastDays + prevStartOfYear.getDay() + 1) / 7);
          const prevKey = `${currentCheck.getFullYear()}-${prevWeekNum}`;
          if (weekKeys.has(prevKey)) {
            streak++;
            currentCheck.setDate(currentCheck.getDate() - 7);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    // Attendance rate in last 12 weeks
    const sampleWindow = Math.min(12, Math.max(1, totalCount));
    const recentCheckIns = records.filter((r) => {
      const msAgo = Date.now() - new Date(r.checkInTime).getTime();
      return msAgo <= 12 * 7 * 24 * 60 * 60 * 1000;
    }).length;
    const attendanceRate =
      totalCount === 0
        ? 0
        : Math.min(100, Math.round((recentCheckIns / Math.max(1, sampleWindow)) * 100));

    return {
      records: records.map((r) => ({
        id: r.id,
        checkInTime: r.checkInTime.toISOString(),
        checkOutTime: r.checkOutTime ? r.checkOutTime.toISOString() : null,
        method: r.method,
        service: r.service
          ? {
              id: r.service.id,
              name: r.service.name,
              startTime: r.service.startTime.toISOString(),
              endTime: r.service.endTime ? r.service.endTime.toISOString() : null,
            }
          : null,
      })),
      stats: {
        totalCheckIns: totalCount,
        streak,
        attendanceRate,
        lastAttendedAt: records[0]?.checkInTime ? records[0].checkInTime.toISOString() : null,
      },
    };
  }

  /** How long this member has been away, for the live "welcome back" banner (see away-info.ts). */
  private awayFor(tenantId: string, memberId: string, serviceId: string, arrival: Date): Promise<AwayInfo> {
    return awayInfoFor(tenantId, memberId, serviceId, arrival);
  }
}

// Singleton instance
export const attendanceService = new AttendanceService();