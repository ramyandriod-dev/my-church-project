/**
 * /api/ideas/stats
 *
 * GET: Idea counts by status and category, for the dashboard.
 *
 * RBAC: requirePermission("ideas.read")
 */

import { withPermission, successResponse } from "@/lib/backend";
import { ideaService } from "@/lib/backend/services";

export const GET = withPermission("ideas.read", async (_request, _context, ctx) => {
  const stats = await ideaService.getStats(ctx);
  return successResponse(stats);
});
