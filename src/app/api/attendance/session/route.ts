/**
 * GET /api/attendance/session
 *
 * Returns the tenant's current/next attendance session and its QR session
 * token. This is the minimal developer/test hook that lets a future mobile
 * client fetch the QR content for the Friday window.
 *
 * The token contains ONLY a service/session identifier (+ tenant). It never
 * contains member identity or private member data.
 *
 * Security:
 * - Requires authenticated session + attendance.checkin permission.
 * - Service lookup is tenant-scoped.
 */

import { withPermission, successResponse, NotFoundError } from "@/lib/backend";
import { attendanceRepository } from "@/lib/db/repositories/attendance-repository";
import {
  encodeAttendanceSessionToken,
  ATTENDANCE_SESSION_TYPE,
} from "@/lib/attendance/attendance-session";
import { FRIDAY_ATTENDANCE_WINDOW } from "@/lib/attendance/attendance-context";
import { readDemoClock } from "@/lib/backend/demo-clock";

export const GET = withPermission("attendance.checkin", async (request, _context, ctx) => {
  // Demo Mode: use the tenant's FRIDAY service so the mobile demo consistently
  // shows the same "Friday Main Service" the Dashboard promotes — even when
  // another service sorts earlier by start time. Production ignores the header
  // and always resolves the real active session.
  const demoNow = readDemoClock(request);
  const session = demoNow
    ? (await attendanceRepository.findFridayDemoService(ctx.tenantId)) ??
      (await attendanceRepository.findActiveSession(ctx.tenantId, new Date()))
    : await attendanceRepository.findActiveSession(ctx.tenantId, new Date());

  if (!session) {
    throw new NotFoundError("No attendance session found for your organization");
  }

  // Demo Mode: mint the QR session token against the simulated Friday clock
  // so it is verifiable during the demo window. Production ignores the header.
  const qrToken = await encodeAttendanceSessionToken(
    {
      serviceId: session.id,
      tenantId: ctx.tenantId,
    },
    demoNow ?? undefined
  );

  return successResponse({
    sessionId: session.id,
    serviceName: session.name,
    serviceStatus: session.status,
    sessionType: ATTENDANCE_SESSION_TYPE,
    window: {
      start: `${String(FRIDAY_ATTENDANCE_WINDOW.startHour).padStart(2, "0")}:${String(
        FRIDAY_ATTENDANCE_WINDOW.startMinute
      ).padStart(2, "0")}`,
      end: `${String(FRIDAY_ATTENDANCE_WINDOW.endHour).padStart(2, "0")}:${String(
        FRIDAY_ATTENDANCE_WINDOW.endMinute
      ).padStart(2, "0")}`,
    },
    qrToken,
  });
});