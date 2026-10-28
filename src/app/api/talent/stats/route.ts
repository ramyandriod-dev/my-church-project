/**
 * /api/talent/stats
 *
 * GET: Headline counts for the Talent Directory and the Community dashboard.
 *
 * RBAC: requirePermission("talent.read")
 */

import { withPermission, successResponse } from "@/lib/backend";
import { talentService } from "@/lib/backend/services";

export const GET = withPermission("talent.read", async (_request, _context, ctx) => {
  const stats = await talentService.getStats(ctx);
  return successResponse(stats);
});
