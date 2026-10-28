/**
 * /api/families/[id]/relationships/[relationshipId]
 *
 * PATCH: Correct a relationship's members or type.
 * DELETE: Remove a relationship.
 *
 * RBAC:
 * - PATCH / DELETE: requirePermission("families.update")
 */

import {
  withPermission,
  successResponse,
  noContentResponse,
} from "@/lib/backend";
import { familyService } from "@/lib/backend/services";
import { updateFamilyRelationshipSchema, validate } from "@/lib/backend/validation";

export const PATCH = withPermission("families.update", async (request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const familyId = resolvedParams?.id as string;
  const relationshipId = resolvedParams?.relationshipId as string;
  const input = validate(updateFamilyRelationshipSchema, await request.json());

  const relationship = await familyService.updateRelationship(
    ctx,
    familyId,
    relationshipId,
    input,
    request,
  );
  return successResponse(relationship);
});

export const DELETE = withPermission("families.update", async (request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const familyId = resolvedParams?.id as string;
  const relationshipId = resolvedParams?.relationshipId as string;

  await familyService.deleteRelationship(ctx, familyId, relationshipId, request);
  return noContentResponse();
});
