/**
 * POST /api/attendance/reset
 *
 * Reset attendance records for the current tenant.
 * Used during testing/demo to clear attendance records so members can be re-checked in.
 *
 * Security:
 * - Requires authenticated session + attendance.checkin permission
 * - Strictly scoped to the authenticated tenant (tenant isolation)
 */

import { withPermission, successResponse } from "@/lib/backend";
import { attendanceService } from "@/lib/backend/services/attendance-service";

export const POST = withPermission("attendance.checkin", async (_request, _context, ctx) => {
  const result = await attendanceService.resetAttendance(ctx);

  return successResponse({
    count: result.count,
    message: "Attendance records reset successfully",
  });
});
