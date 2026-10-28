/**
 * GET /api/announcements/options — the groups and ministries the sender may pick.
 * RBAC: "announcements.send".
 */

import { withPermission, successResponse } from "@/lib/backend";
import { announcementService } from "@/lib/backend/services";

export const GET = withPermission("announcements.send", async (_request, _context, ctx) => {
  return successResponse(await announcementService.getOptions(ctx));
});
