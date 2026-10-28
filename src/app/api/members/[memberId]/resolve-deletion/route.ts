/**
 * POST /api/members/[memberId]/resolve-deletion
 *
 * Resolves a pending member deletion request from the CRM:
 * - action: 'delete_permanently' -> permanently purges user & member record.
 * - action: 'keep_for_followup'  -> sets status to 'inactive', retains records,
 *                                   and schedules pastoral follow-up.
 *
 * Security:
 * - Requires members.delete permission.
 * - Strictly tenant-isolated.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { validate, resolveMemberDeletionSchema } from "@/lib/backend/validation";
import { memberService } from "@/lib/backend/services";

export const POST = withPermission("members.delete", async (request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const memberId = resolvedParams?.memberId as string;

  const body = await request.json();
  const input = validate(resolveMemberDeletionSchema, body);

  const result = await memberService.resolveMemberDeletion(ctx, memberId, input, request);

  return successResponse(result);
});
