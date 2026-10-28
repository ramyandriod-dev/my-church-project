/**
 * GET /api/ministries/[id]
 * PUT /api/ministries/[id]
 * DELETE /api/ministries/[id]
 *
 * REST endpoints for individual Church Ministry.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { validate, updateMinistrySchema } from "@/lib/backend/validation";
import { ministryService } from "@/lib/backend/services/ministry-service";

export const GET = withPermission("ministries.read", async (_request, context, ctx) => {
  const { id } = await context.params;
  const ministry = await ministryService.getMinistryById(ctx, id);
  return successResponse(ministry);
});

export const PUT = withPermission("ministries.update", async (request, context, ctx) => {
  const { id } = await context.params;
  const body = await request.json();
  const data = validate(updateMinistrySchema, body);

  const updated = await ministryService.updateMinistry(ctx, id, data);
  return successResponse(updated);
});

export const DELETE = withPermission("ministries.delete", async (_request, context, ctx) => {
  const { id } = await context.params;
  const result = await ministryService.deleteMinistry(ctx, id);
  return successResponse(result);
});
