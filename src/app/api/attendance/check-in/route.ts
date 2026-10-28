/**
 * POST /api/attendance/check-in
 *
 * Mobile QR Check-in → Backend validation → Attendance record → Dashboard.
 *
 * SECURITY:
 * - Requires authenticated session + attendance.checkin permission
 *   (granted to every role, including the member role — self-service).
 * - The request body carries ONLY the QR session context. The member
 *   identity is resolved server-side from the session. A client-supplied
 *   memberId is REJECTED (strict schema) and can never be used as an
 *   authorization mechanism.
 * - Tenant isolation: authenticated tenant's session, service, and member.
 * - Friday window (09:00–12:59) enforcement + duplicate-safe writes happen
 *   inside AttendanceService using M1 AttendanceContext rules.
 *
 * Flow: Route → Validation → Auth/Zod → TenantContext → AttendanceService →
 *       AttendanceRepository → Prisma
 */

import { withPermission, successResponse } from "@/lib/backend";
import { validate, checkInSchema } from "@/lib/backend/validation";
import { attendanceService } from "@/lib/backend/services";
import { readDemoClock } from "@/lib/backend/demo-clock";

export const POST = withPermission("attendance.checkin", async (request, _context, ctx) => {
  const body = await request.json();
  const data = validate(checkInSchema, body);

  // Demo Mode: honor the simulated Friday clock during dev/demo only.
  // readDemoClock returns null in production → real clock → M4 rules unchanged.
  const demoNow = readDemoClock(request);

  const result = await attendanceService.checkIn(
    ctx,
    { sessionToken: data.sessionToken, familyMemberIds: data.familyMemberIds },
    { now: demoNow ?? undefined }
  );

  return successResponse(result);
});