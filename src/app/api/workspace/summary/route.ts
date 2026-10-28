/**
 * GET /api/workspace/summary
 *
 * The live service and what is waiting for the caller, for the top bar and the
 * dashboard banner. Counts the caller has no permission for come back as null.
 */

import { withAuth, successResponse } from "@/lib/backend";
import { workspaceSummaryService } from "@/lib/backend/services";

export const GET = withAuth(async (_request, _context, ctx) => {
  return successResponse(await workspaceSummaryService.getSummary(ctx));
});
