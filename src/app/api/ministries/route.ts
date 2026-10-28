/**
 * GET /api/ministries
 * POST /api/ministries
 *
 * REST endpoint for Church Ministries.
 */

import { withPermission, successResponse, createdResponse } from "@/lib/backend";
import { validate, createMinistrySchema } from "@/lib/backend/validation";
import { ministryService } from "@/lib/backend/services/ministry-service";

export const GET = withPermission("ministries.read", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  const ministries = await ministryService.listMinistries(ctx, {
    status,
    search,
  });

  return successResponse(ministries);
});

export const POST = withPermission("ministries.create", async (request, _context, ctx) => {
  const body = await request.json();
  const data = validate(createMinistrySchema, body);

  const ministry = await ministryService.createMinistry(ctx, data);
  return createdResponse(ministry);
});
