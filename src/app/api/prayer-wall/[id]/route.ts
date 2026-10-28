/**
 * /api/prayer-wall/[id]
 *
 * PATCH:  Approve, reject or archive a prayer ("prayer_wall.moderate").
 * DELETE: The author withdraws their own prayer, or a moderator removes one.
 *         Who may delete is decided in the service, which knows the author.
 */

import { withAuth, withPermission, successResponse } from "@/lib/backend";
import { prayerWallService } from "@/lib/backend/services";
import { idParamSchema, moderatePrayerWallSchema, validate } from "@/lib/backend/validation";

export const PATCH = withPermission("prayer_wall.moderate", async (request, context, ctx) => {
  const { id } = validate(idParamSchema, await context.params);
  const input = validate(moderatePrayerWallSchema, await request.json());
  const post = await prayerWallService.moderate(ctx, id, input);
  return successResponse({ post });
});

export const DELETE = withAuth(async (_request, context, ctx) => {
  const { id } = validate(idParamSchema, await context.params);
  const result = await prayerWallService.remove(ctx, id);
  return successResponse(result);
});
