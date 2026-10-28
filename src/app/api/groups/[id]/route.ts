/**
 * GET /api/groups/[id]
 * PUT /api/groups/[id]
 * DELETE /api/groups/[id]
 *
 * REST endpoints for individual Church Group.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { validate, updateGroupSchema } from "@/lib/backend/validation";
import { groupService } from "@/lib/backend/services/group-service";

export const GET = withPermission("groups.read", async (_request, context, ctx) => {
  const { id } = await context.params;
  const group = await groupService.getGroupById(ctx, id);
  return successResponse(group);
});

export const PUT = withPermission("groups.update", async (request, context, ctx) => {
  const { id } = await context.params;
  const body = await request.json();
  const data = validate(updateGroupSchema, body);

  const updated = await groupService.updateGroup(ctx, id, data);
  return successResponse(updated);
});

export const DELETE = withPermission("groups.delete", async (_request, context, ctx) => {
  const { id } = await context.params;
  const result = await groupService.deleteGroup(ctx, id);
  return successResponse(result);
});
