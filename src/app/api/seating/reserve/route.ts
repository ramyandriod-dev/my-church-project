/**
 * POST /api/seating/reserve
 *
 * Hold seats in one row for 5 minutes. Needs a check-in for the current service.
 * Replaces the caller's earlier reservation. RBAC: "seating.reserve".
 */

import { withPermission, successResponse } from "@/lib/backend";
import { seatingService } from "@/lib/backend/services";
import { reserveSeatsSchema, validate } from "@/lib/backend/validation";

export const POST = withPermission("seating.reserve", async (request, _context, ctx) => {
  const input = validate(reserveSeatsSchema, await request.json());
  return successResponse({ reservation: await seatingService.reserve(ctx, input) });
});
