/**
 * GET /api/seating/reservations
 *
 * Usher view: reservations that still count (holds not yet expired, and seated).
 * RBAC: "seating.manage".
 */

import { withPermission, successResponse } from "@/lib/backend";
import { seatingService } from "@/lib/backend/services";

export const GET = withPermission("seating.manage", async (_request, _context, ctx) => {
  return successResponse({ reservations: await seatingService.listForUsher(ctx) });
});
