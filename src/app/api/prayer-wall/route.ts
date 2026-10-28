/**
 * /api/prayer-wall
 *
 * GET:  The wall. Approved prayers only, newest first; ?kind=answered for
 *       answered prayers. Names appear only where the author chose to show them.
 * POST: Share a prayer or an answered prayer. It waits for a pastor or leader
 *       before anyone sees it.
 *
 * RBAC: "prayer_wall.read" / "prayer_wall.post" (every role). The author is taken
 * from the login by the service, never from the body.
 */

import { withPermission, successResponse, createdResponse } from "@/lib/backend";
import { prayerWallService } from "@/lib/backend/services";
import { prayerWallQuerySchema, sharePrayerWallSchema, validate } from "@/lib/backend/validation";

export const GET = withPermission("prayer_wall.read", async (request, _context, ctx) => {
  const { kind } = validate(prayerWallQuerySchema, {
    kind: new URL(request.url).searchParams.get("kind") ?? undefined,
  });
  const posts = await prayerWallService.listWall(ctx, kind);
  return successResponse({ posts });
});

export const POST = withPermission("prayer_wall.post", async (request, _context, ctx) => {
  const input = validate(sharePrayerWallSchema, await request.json());
  const post = await prayerWallService.share(ctx, input);
  return createdResponse({ post });
});
