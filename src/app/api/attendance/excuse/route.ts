/**
 * POST /api/attendance/excuse
 *
 * Authorized user records an EXPLICIT attendance exception:
 *   { status: "excused", reason: "sick" | "travel" | ... }
 *   { status: "not_expected" }     (no reason allowed)
 *
 * An excuse is NEVER inferred. The body must carry an explicit reason for
 * "excused"; recordedBy is set server-side from the authenticated user.
 *
 * Security:
 * - Requires authenticated session + attendance.create permission
 *   (authorized church roles: admin / pastor / leader).
 * - Member and service must belong to the authenticated tenant.
 */

import { withPermission, createdResponse } from "@/lib/backend";
import { validate, recordExcuseSchema } from "@/lib/backend/validation";
import { attendanceService } from "@/lib/backend/services";

export const POST = withPermission("attendance.create", async (request, _context, ctx) => {
  const body = await request.json();
  const data = validate(recordExcuseSchema, body);

  const exception = await attendanceService.recordExcuse(ctx, data);

  return createdResponse(exception);
});