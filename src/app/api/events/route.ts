/**
 * GET /api/events
 * POST /api/events
 *
 * REST endpoint for Church Events.
 */

import { withPermission, successResponse, createdResponse } from "@/lib/backend";
import { validate, createEventSchema } from "@/lib/backend/validation";
import { eventService } from "@/lib/backend/services/event-service";

export const GET = withPermission("events.read", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const upcomingOnly = searchParams.get("upcoming") === "true";

  const events = await eventService.listEvents(ctx, {
    status,
    category,
    search,
    upcomingOnly,
  });

  return successResponse(events);
});

export const POST = withPermission("events.create", async (request, _context, ctx) => {
  const body = await request.json();
  const data = validate(createEventSchema, body);

  const event = await eventService.createEvent(ctx, data);
  return createdResponse(event);
});
