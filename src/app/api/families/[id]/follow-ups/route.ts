/**
 * /api/families/[id]/follow-ups
 *
 * GET: The open follow-ups belonging to the members of this family.
 *
 * This is a read-only view over the EXISTING follow-up workflow, scoped to the
 * household. Nothing is created here and no family-level score is computed; the
 * response is the follow-ups that already exist for these members, each of
 * which links back into the normal follow-up screen.
 *
 * RBAC:
 * - GET: requirePermission("families.read")
 */

import { withPermission, successResponse } from "@/lib/backend";
import { familyService } from "@/lib/backend/services";

export const GET = withPermission("families.read", async (_request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const familyId = resolvedParams?.id as string;

  const followUps = await familyService.listOpenFollowUpsForFamily(ctx, familyId);
  return successResponse({ items: followUps, total: followUps.length });
});
