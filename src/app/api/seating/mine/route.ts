/**
 * /api/seating/mine
 *
 * POST:   "I'm seated": makes the caller's hold last for the service.
 * DELETE: Give the seats back.
 *
 * RBAC: "seating.reserve".
 */

import { withPermission, successResponse } from "@/lib/backend";
import { seatingService } from "@/lib/backend/services";

export const POST = withPermission("seating.reserve", async (_request, _context, ctx) => {
  return successResponse({ reservation: await seatingService.confirmMine(ctx) });
});

export const DELETE = withPermission("seating.reserve", async (_request, _context, ctx) => {
  await seatingService.releaseMine(ctx);
  return successResponse({ released: true });
});
