/**
 * /api/ideas/search
 *
 * POST: Answer a question about the idea bank in plain language.
 *
 * RBAC: requirePermission("ideas.read")
 *
 * Mirrors /api/talent/search: the question is interpreted server-side, and
 * `interpretation.aiUsed` discloses whether the AI provider or the
 * deterministic parser produced the filters.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { ideaService } from "@/lib/backend/services";
import { ideaSearchRequestSchema, validate } from "@/lib/backend/validation";

export const POST = withPermission("ideas.read", async (request, _context, ctx) => {
  const body = await request.json();
  const input = validate(ideaSearchRequestSchema, body);
  const result = await ideaService.search(ctx, input);
  return successResponse(result);
});
