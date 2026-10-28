/**
 * /api/community/stats
 *
 * GET: Combined talent and idea counts for the Community dashboard.
 *
 * RBAC: requirePermission("talent.read") AND requirePermission("ideas.read")
 *
 * Both are required, because the dashboard presents the two halves as one
 * picture. A caller who can see the directory but not the idea bank should not
 * get a card that quietly reports only the half they may see.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { talentService } from "@/lib/backend/services";

export const GET = withPermission("talent.read", async (_request, _context, ctx) => {
  const stats = await talentService.getCommunityStats(ctx);
  return successResponse(stats);
});
