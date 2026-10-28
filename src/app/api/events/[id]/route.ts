/**
 * GET /api/events/[id]
 * PUT /api/events/[id]
 * DELETE /api/events/[id]
 *
 * REST endpoints for individual Church Event.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { validate, updateEventSchema } from "@/lib/backend/validation";
import { eventService } from "@/lib/backend/services/event-service";

export const GET = withPermission("events.read", async (_request, context, ctx) => {
  const { id } = await context.params;
  const event = await eventService.getEventById(ctx, id);
  return successResponse(event);
});

export const PUT = withPermission("events.update", async (request, context, ctx) => {
  const { id } = await context.params;
  const body = await request.json();
  const data = validate(updateEventSchema, body);

  const updated = await eventService.updateEvent(ctx, id, data);
  return successResponse(updated);
});

export const DELETE = withPermission("events.delete", async (_request, context, ctx) => {
  const { id } = await context.params;
  const result = await eventService.deleteEvent(ctx, id);
  return successResponse(result);
});
