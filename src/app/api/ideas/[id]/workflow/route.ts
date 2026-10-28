/**
 * /api/ideas/[id]/workflow
 *
 * PATCH: Move an idea through the workflow, or attach staff notes and an owner.
 *
 * RBAC: requirePermission("ideas.manage")
 *
 * This is the staff-only side of the bank. The transition is validated against
 * the idea's current status as read from the database, so a request cannot jump
 * an idea straight from New to Implemented and skip the review the workflow
 * exists to require.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { ideaService } from "@/lib/backend/services";
import {
  idParamSchema,
  updateIdeaWorkflowSchema,
  validate,
} from "@/lib/backend/validation";

export const PATCH = withPermission(
  "ideas.manage",
  async (request, context, ctx) => {
    const { id } = validate(idParamSchema, { id: (context as any).params?.id });
    const body = await request.json();
    const input = validate(updateIdeaWorkflowSchema, body);
    const idea = await ideaService.updateWorkflow(ctx, id, input);
    return successResponse({ idea });
  },
);
