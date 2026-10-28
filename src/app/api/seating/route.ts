/**
 * GET /api/seating
 *
 * Free seats per row for the service happening now, the caller's own reservation
 * and whether they are checked in. Holds that ran out are already counted as free.
 *
 * RBAC: "seating.reserve".
 */

import { withPermission, successResponse } from "@/lib/backend";
import { seatingService } from "@/lib/backend/services";

export const GET = withPermission("seating.reserve", async (_request, _context, ctx) => {
  return successResponse(await seatingService.overview(ctx));
});
