/**
 * GET /api/prayers/[id]
 * PUT /api/prayers/[id]
 * DELETE /api/prayers/[id]
 *
 * REST endpoints for individual Prayer Request.
 */

import { withAuth, withPermission, successResponse } from "@/lib/backend";
import { validate, updatePrayerRequestSchema } from "@/lib/backend/validation";
import { prayerService } from "@/lib/backend/services/prayer-service";

export const GET = withAuth(async (_request, context, ctx) => {
  const { id } = await context.params;
  const prayer = await prayerService.getPrayerById(ctx, id);
  return successResponse(prayer);
});

export const PUT = withPermission("prayers.update", async (request, context, ctx) => {
  const { id } = await context.params;
  const body = await request.json();
  const data = validate(updatePrayerRequestSchema, body);

  const updated = await prayerService.updatePrayer(ctx, id, data);
  return successResponse(updated);
});

export const DELETE = withPermission("prayers.delete", async (_request, context, ctx) => {
  const { id } = await context.params;
  const result = await prayerService.deletePrayer(ctx, id);
  return successResponse(result);
});
