/**
 * GET /api/realtime/poll
 *
 * Lightweight real-time polling endpoint for multi-device live sync.
 * Returns events and updates since a given timestamp.
 *
 * Provides a rock-solid real-time guarantee across mobile devices and desktop
 * browsers even in serverless edge environments where native WebSockets may be blocked.
 */

import { withAuth, successResponse } from "@/lib/backend";
import prisma from "@/lib/db/prisma";
import { awayInfoFor } from "@/lib/attendance/away-info";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, _context, ctx) => {
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");

  // Default to 45 seconds ago if since is not provided
  const sinceDate = sinceParam && !isNaN(Date.parse(sinceParam))
    ? new Date(sinceParam)
    : new Date(Date.now() - 45000);

  const serverTime = new Date().toISOString();

  // 1. Fetch recent audit logs for member / family changes
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      createdAt: { gt: sinceDate },
      action: {
        in: [
          "member.self_updated",
          "member.updated",
          "member.created",
          "talent_profile.update_self",
          "talent_profile.create_self",
          "talent_profile.update_by_staff",
          "talent_profile.create_by_staff",
          "family.created",
          "family.updated",
          "attendance.check_in",
        ],
      },
    },
    orderBy: { createdAt: "asc" },
    take: 25,
  });

  const events: Array<{
    type: string;
    data: Record<string, unknown>;
    timestamp: string;
  }> = [];

  for (const log of auditLogs) {
    const newVals = (log.newValues as Record<string, any>) || {};
    const isProfileUpdate =
      log.action === "member.self_updated" ||
      log.action === "member.updated" ||
      log.action.startsWith("talent_profile");

    events.push({
      type: isProfileUpdate ? "member.profile_updated" : log.action,
      data: {
        memberId: newVals.memberId || log.resourceId,
        memberName: newVals.firstName
          ? `${newVals.firstName} ${newVals.lastName || ""}`.trim()
          : undefined,
        phone: newVals.phone,
        ministry: newVals.ministry,
        groupId: newVals.groupId,
        skills: newVals.skills,
        profession: newVals.profession,
        timestamp: log.createdAt.toISOString(),
      },
      timestamp: log.createdAt.toISOString(),
    });
  }

  // 2. Cross-check members table directly for recent updates
  // This guarantees updates are caught even if an audit log wasn't written
  const recentMembers = await prisma.member.findMany({
    where: {
      tenantId: ctx.tenantId,
      updatedAt: { gt: sinceDate },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      ministry: true,
      updatedAt: true,
    },
    take: 25,
  });

  for (const m of recentMembers) {
    if (!events.some((e) => e.data.memberId === m.id)) {
      events.push({
        type: "member.profile_updated",
        data: {
          memberId: m.id,
          memberName: `${m.firstName} ${m.lastName}`.trim(),
          phone: m.phone,
          ministry: m.ministry,
          timestamp: m.updatedAt.toISOString(),
        },
        timestamp: m.updatedAt.toISOString(),
      });
    }
  }

  // 3. Cross-check attendance records directly for cross-device live check-in sync
  const recentCheckIns = await prisma.attendanceRecord.findMany({
    where: {
      tenantId: ctx.tenantId,
      checkInTime: { gt: sinceDate },
    },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          ministry: true,
        },
      },
    },
    orderBy: { checkInTime: "asc" },
    take: 25,
  });

  // How long each arriving member has been away, for the golden "welcome back" banner.
  // The live site hears about arrivals only through this route (no WebSocket on
  // Cloudflare), so the information has to travel with the event.
  const away = await Promise.all(
    recentCheckIns.map((r) => awayInfoFor(ctx.tenantId, r.memberId, r.serviceId, r.checkInTime)),
  );

  for (const [index, record] of recentCheckIns.entries()) {
    const memberName = record.member
      ? `${record.member.firstName} ${record.member.lastName}`.trim()
      : "Church Member";
    events.push({
      type: "attendance.check_in",
      data: {
        recordId: record.id,
        memberId: record.memberId,
        memberName,
        memberAvatar: record.member?.avatarUrl,
        ministry: record.member?.ministry || "General",
        serviceId: record.serviceId,
        method: record.method,
        timestamp: record.checkInTime.toISOString(),
        ...away[index],
      },
      timestamp: record.checkInTime.toISOString(),
    });
  }

  return successResponse({
    events,
    serverTime,
    count: events.length,
  });
});
