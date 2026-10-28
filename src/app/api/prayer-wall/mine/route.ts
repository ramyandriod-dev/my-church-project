/**
 * GET /api/prayer-wall/mine
 *
 * The caller's own shared prayers with their status (waiting, on the wall, not
 * published), so a member can see that theirs is still waiting for approval.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { prayerWallService } from "@/lib/backend/services";

export const GET = withPermission("prayer_wall.post", async (_request, _context, ctx) => {
  const posts = await prayerWallService.listMine(ctx);
  return successResponse({ posts });
});
