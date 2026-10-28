/**
 * GET /api/prayer-wall/moderation?status=pending
 *
 * The approval queue (and its history by status), with each author's name so a
 * pastor can follow up. Counts per status come back alongside for the tabs.
 *
 * RBAC: "prayer_wall.moderate" (super_admin, admin, pastor, leader).
 */

import { withPermission, successResponse } from "@/lib/backend";
import { prayerWallService } from "@/lib/backend/services";
import { prayerWallModerationQuerySchema, validate } from "@/lib/backend/validation";

export const GET = withPermission("prayer_wall.moderate", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const { status } = validate(prayerWallModerationQuerySchema, {
    status: searchParams.get("status") ?? undefined,
  });
  const result = await prayerWallService.listForModeration(ctx, status);
  return successResponse(result);
});
