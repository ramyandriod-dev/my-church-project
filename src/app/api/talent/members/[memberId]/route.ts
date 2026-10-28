/**
 * /api/talent/members/[memberId]
 *
 * GET: One member's talent profile and directory row.
 * PUT: Correct or create a member's profile on their behalf.
 *
 * RBAC: requirePermission("talent.read") / requirePermission("talent.update")
 *
 * `talent.update` is the supervisory permission and is held by admin and
 * super_admin only — a leader can read the directory but cannot rewrite what a
 * member chose to submit. Writes are audited with the acting user.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { talentService } from "@/lib/backend/services";
import {
  idParamSchema,
  upsertTalentProfileSchema,
  validate,
} from "@/lib/backend/validation";

export const GET = withPermission(
  "talent.read",
  async (_request, context, ctx) => {
    const resolvedParams = await Promise.resolve(context?.params);
    const { id: memberId } = validate(idParamSchema, {
      id: resolvedParams?.memberId,
    });
    const entry = await talentService.getDirectoryEntry(ctx, memberId);
    return successResponse({ entry });
  },
);

export const PUT = withPermission(
  "talent.update",
  async (request, context, ctx) => {
    const resolvedParams = await Promise.resolve(context?.params);
    const { id: memberId } = validate(idParamSchema, {
      id: resolvedParams?.memberId,
    });
    const body = await request.json();
    const input = validate(upsertTalentProfileSchema, body);
    const profile = await talentService.saveProfileForMember(ctx, memberId, input);
    return successResponse({ profile });
  },
);

