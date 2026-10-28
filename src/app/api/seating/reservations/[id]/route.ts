/**
 * PATCH /api/seating/reservations/[id]
 *
 * Usher confirms a member is seated, or releases the seats.
 * RBAC: "seating.manage".
 */

import { withPermission, successResponse } from "@/lib/backend";
import { seatingService } from "@/lib/backend/services";
import { idParamSchema, usherSeatActionSchema, validate } from "@/lib/backend/validation";

export const PATCH = withPermission("seating.manage", async (request, context, ctx) => {
  const { id } = validate(idParamSchema, await context.params);
  const { status } = validate(usherSeatActionSchema, await request.json());
  await seatingService.usherSetStatus(ctx, id, status);
  return successResponse({ id, status });
});
