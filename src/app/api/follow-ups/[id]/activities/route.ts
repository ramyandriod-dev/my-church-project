/**
 * /api/follow-ups/[id]/activities
 *
 * POST: Record a contact activity (Phone, WhatsApp, Visit, In Person, Other).
 * Updates follow-up lastContact and transitions status to in_progress if open.
 *
 * RBAC:
 * - POST: requirePermission("followups.update")
 */

import { NextRequest } from "next/server";
import {
  withPermission,
  createdResponse,
} from "@/lib/backend";
import { followUpService } from "@/lib/backend/services";

export const POST = withPermission("followups.update", async (request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id as string;
  const body = await request.json();

  const result = await followUpService.logActivity(ctx, id, body);
  return createdResponse(result);
});
