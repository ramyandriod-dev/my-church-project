/**
 * /api/ideas/[id]
 *
 * GET: One idea.
 * PATCH: Edit the idea's title, description or category.
 *
 * RBAC: requirePermission("ideas.read")
 *
 * Authorization for the edit is decided in the service, not here, because it
 * depends on who submitted the idea and how far it has progressed: the submitter
 * may edit while the idea is still being heard, and a staff member with
 * `ideas.manage` may edit at any point.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { ideaService } from "@/lib/backend/services";
import { idParamSchema, updateIdeaSchema, validate } from "@/lib/backend/validation";

export const GET = withPermission("ideas.read", async (_request, context, ctx) => {
  const { id } = validate(idParamSchema, { id: (context as any).params?.id });
  const idea = await ideaService.getIdea(ctx, id);
  return successResponse({ idea });
});

export const PATCH = withPermission("ideas.read", async (request, context, ctx) => {
  const { id } = validate(idParamSchema, { id: (context as any).params?.id });
  const body = await request.json();
  const input = validate(updateIdeaSchema, body);
  const idea = await ideaService.updateIdea(ctx, id, input);
  return successResponse({ idea });
});
