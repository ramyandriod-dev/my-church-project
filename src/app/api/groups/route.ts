/**
 * GET /api/groups
 * POST /api/groups
 *
 * REST endpoint for Church Groups.
 */

import { withPermission, successResponse, createdResponse } from "@/lib/backend";
import { validate, createGroupSchema } from "@/lib/backend/validation";
import { groupService } from "@/lib/backend/services/group-service";

export const GET = withPermission("groups.read", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const ministryId = searchParams.get("ministryId") || undefined;
  const search = searchParams.get("search") || undefined;

  const groups = await groupService.listGroups(ctx, {
    status,
    ministryId,
    search,
  });

  return successResponse(groups);
});

export const POST = withPermission("groups.create", async (request, _context, ctx) => {
  const body = await request.json();
  const data = validate(createGroupSchema, body);

  const group = await groupService.createGroup(ctx, data);
  return createdResponse(group);
});
