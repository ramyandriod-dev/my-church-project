/**
 * POST /api/announcements/preview — how many people an audience would reach.
 * RBAC: "announcements.send".
 */

import { withPermission, successResponse } from "@/lib/backend";
import { announcementService } from "@/lib/backend/services";
import { previewAnnouncementSchema, validate } from "@/lib/backend/validation";

export const POST = withPermission("announcements.send", async (request, _context, ctx) => {
  const { audience } = validate(previewAnnouncementSchema, await request.json());
  return successResponse(await announcementService.previewAudience(ctx, audience));
});
