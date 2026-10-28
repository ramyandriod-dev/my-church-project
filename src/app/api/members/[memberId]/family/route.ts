/**
 * /api/members/[memberId]/family
 *
 * GET: Return the family tree for one member, oriented around that member.
 *
 * This is the endpoint Member 360 uses. Because the family is resolved from
 * the relationship graph, opening the father, the mother or a child all
 * return the same family — only the highlighted member and the relationship
 * labels differ.
 *
 * RBAC:
 * - GET: requirePermission("families.read")
 */

import { withPermission, successResponse } from "@/lib/backend";
import { familyService } from "@/lib/backend/services";

export const GET = withPermission("families.read", async (_request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const memberId = resolvedParams?.memberId as string;

  const tree = await familyService.getFamilyTreeForMember(ctx, memberId);
  return successResponse(tree);
});
