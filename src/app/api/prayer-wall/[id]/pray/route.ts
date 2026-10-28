/**
 * /api/prayer-wall/[id]/pray
 *
 * POST:   "I prayed for this". Counts once per login however often it is tapped.
 * DELETE: Undo.
 *
 * Only approved prayers can be prayed for; any other id answers 404.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { prayerWallService } from "@/lib/backend/services";
import { idParamSchema, validate } from "@/lib/backend/validation";

export const POST = withPermission("prayer_wall.read", async (_request, context, ctx) => {
  const { id } = validate(idParamSchema, await context.params);
  return successResponse(await prayerWallService.pray(ctx, id));
});

export const DELETE = withPermission("prayer_wall.read", async (_request, context, ctx) => {
  const { id } = validate(idParamSchema, await context.params);
  return successResponse(await prayerWallService.unpray(ctx, id));
});
