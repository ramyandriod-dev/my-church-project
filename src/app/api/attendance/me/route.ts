/**
 * GET /api/attendance/me
 *
 * Returns the authenticated member's check-in history, attendance streak, and rate.
 *
 * Security:
 * - Requires a valid authenticated session (any role)
 * - Resolves member identity strictly from server-side session
 * - Tenant isolation enforced strictly from session TenantContext
 */

import { withAuth, successResponse } from "@/lib/backend";
import { attendanceService } from "@/lib/backend/services";

export const GET = withAuth(async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

  const result = await attendanceService.getMyAttendanceHistory(ctx, { limit });

  return successResponse(result);
});
