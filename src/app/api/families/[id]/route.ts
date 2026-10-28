/**
 * /api/families/[id]
 *
 * GET: Retrieve a family with its relationships.
 * PATCH: Update name, family photo, designated head, or notes.
 * DELETE: Remove the family and its relationships.
 *
 * RBAC:
 * - GET: requirePermission("families.read")
 * - PATCH: requirePermission("families.update")
 * - DELETE: requirePermission("families.delete")
 */

import {
  withPermission,
  successResponse,
  noContentResponse,
} from "@/lib/backend";
import { familyService } from "@/lib/backend/services";
import { updateFamilySchema, validate } from "@/lib/backend/validation";

export const GET = withPermission("families.read", async (_request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id as string;

  const family = await familyService.getFamily(ctx, id);
  return successResponse(family);
});

export const PATCH = withPermission("families.update", async (request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id as string;
  const input = validate(updateFamilySchema, await request.json());

  const family = await familyService.updateFamily(ctx, id, input, request);
  return successResponse(family);
});

export const DELETE = withPermission("families.delete", async (request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id as string;

  await familyService.deleteFamily(ctx, id, request);
  return noContentResponse();
});
