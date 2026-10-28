/**
 * /api/families/[id]/relationships
 *
 * GET: List the relationships recorded inside a family.
 * POST: Add a relationship between two members of the family.
 *
 * RBAC:
 * - GET: requirePermission("families.read")
 * - POST: requirePermission("families.update")
 *
 * Integrity (self-links, cross-tenant members, duplicates, impossible
 * parent/child combinations) is enforced in the service, not here.
 */

import {
  withPermission,
  successResponse,
  createdResponse,
} from "@/lib/backend";
import { familyService } from "@/lib/backend/services";
import { createFamilyRelationshipSchema, validate } from "@/lib/backend/validation";

export const GET = withPermission("families.read", async (_request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const familyId = resolvedParams?.id as string;

  const relationships = await familyService.listRelationships(ctx, familyId);
  return successResponse(relationships);
});

export const POST = withPermission("families.update", async (request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const familyId = resolvedParams?.id as string;
  const input = validate(createFamilyRelationshipSchema, await request.json());

  const relationship = await familyService.addRelationship(ctx, familyId, input, request);
  return createdResponse(relationship);
});
