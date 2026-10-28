/**
 * GET /api/prayers
 * POST /api/prayers
 *
 * REST endpoint for Prayer Requests.
 */

import { withAuth, withPermission, successResponse, createdResponse } from "@/lib/backend";
import { validate, createPrayerRequestSchema } from "@/lib/backend/validation";
import { prayerService } from "@/lib/backend/services/prayer-service";

export const GET = withAuth(async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const category = searchParams.get("category") || undefined;
  const memberId = searchParams.get("memberId") || undefined;

  const prayers = await prayerService.listPrayers(ctx, {
    status,
    category,
    memberId,
  });

  return successResponse(prayers);
});

export const POST = withPermission("prayers.create", async (request, _context, ctx) => {
  const body = await request.json();
  const data = validate(createPrayerRequestSchema, body);

  const prayer = await prayerService.createPrayer(ctx, data);
  return createdResponse(prayer);
});
