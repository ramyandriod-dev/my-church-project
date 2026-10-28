/**
 * /api/announcements
 *
 * GET:  Sent announcements, newest first.
 * POST: Send an announcement to an audience (everyone, roles, groups, ministries).
 *
 * RBAC: both require "announcements.send" (admin, pastor, leader). Leaders are
 * limited to the groups they lead; the service enforces that.
 */

import { withPermission, successResponse, createdResponse } from "@/lib/backend";
import { announcementService } from "@/lib/backend/services";
import { sendAnnouncementSchema, validate } from "@/lib/backend/validation";

export const GET = withPermission("announcements.send", async (_request, _context, ctx) => {
  const announcements = await announcementService.list(ctx);
  return successResponse({ announcements });
});

export const POST = withPermission("announcements.send", async (request, _context, ctx) => {
  const input = validate(sendAnnouncementSchema, await request.json());
  const announcement = await announcementService.send(ctx, input);
  return createdResponse({ announcement });
});
