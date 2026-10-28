/**
 * /api/follow-ups/[id]
 *
 * GET: Retrieve follow-up details with complete activity log.
 * PATCH: Update follow-up status, owner assignment, due date, notes, next action.
 *
 * RBAC:
 * - GET: requirePermission("followups.read")
 * - PATCH: requirePermission("followups.update")
 */

import { NextRequest } from "next/server";
import {
  withPermission,
  successResponse,
} from "@/lib/backend";
import { followUpService } from "@/lib/backend/services";

export const GET = withPermission("followups.read", async (_request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id as string;

  const followUp = await followUpService.getFollowUp(ctx, id);
  return successResponse(followUp);
});

export const PATCH = withPermission("followups.update", async (request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id as string;
  const body = await request.json();

  const updated = await followUpService.updateFollowUp(ctx, id, body);
  return successResponse(updated);
});
