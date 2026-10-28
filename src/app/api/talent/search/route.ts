/**
 * /api/talent/search
 *
 * POST: Answer a question about the church's skills in plain language.
 *
 * RBAC: requirePermission("talent.read")
 *
 * The request carries only a question. It is turned into structured criteria
 * server-side — by the AI provider when the caller holds `ai.use` and one is
 * registered, otherwise by the deterministic parser — and the response says
 * which path ran in `interpretation.aiUsed`, so the UI can disclose it.
 *
 * No member data is ever sent to the provider: the interpreter is given the
 * question and nothing else.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { talentService } from "@/lib/backend/services";
import { talentSearchRequestSchema, validate } from "@/lib/backend/validation";

export const POST = withPermission("talent.read", async (request, _context, ctx) => {
  const body = await request.json();
  const input = validate(talentSearchRequestSchema, body);
  const result = await talentService.search(ctx, input);
  return successResponse(result);
});
