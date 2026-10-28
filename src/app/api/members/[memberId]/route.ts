/**
 * GET /api/members/[memberId]
 * PUT /api/members/[memberId]
 * DELETE /api/members/[memberId]
 *
 * Resource endpoints for single member operations.
 *
 * Security:
 * - GET: Requires members.read permission
 * - PUT: Requires members.update permission
 * - DELETE: Requires members.delete permission
 * - Tenant context derived from authenticated session only
 * - Cross-tenant access is rejected with 404
 */

import { withPermission, successResponse } from "@/lib/backend";
import { validate, updateMemberSchema } from "@/lib/backend/validation";
import { memberService } from "@/lib/backend/services";

export const GET = withPermission("members.read", async (_request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const memberId = resolvedParams?.memberId as string;

  const member = await memberService.getMemberById(ctx, memberId);

  return successResponse(member);
});

export const PUT = withPermission("members.update", async (request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const memberId = resolvedParams?.memberId as string;

  const body = await request.json();
  const data = validate(updateMemberSchema, body);

  const updated = await memberService.updateMember(ctx, memberId, data);

  return successResponse(updated);
});

export const PATCH = PUT;

export const DELETE = withPermission("members.delete", async (request, context, ctx) => {
  const resolvedParams = await Promise.resolve(context?.params);
  const memberId = resolvedParams?.memberId as string;

  const url = new URL(request.url);
  const isPermanent = url.searchParams.get("permanent") === "true";

  if (isPermanent) {
    const deleted = await memberService.deleteMemberPermanently(ctx, memberId, request);
    return successResponse(deleted);
  }

  const deactivated = await memberService.deactivateMember(ctx, memberId);
  return successResponse(deactivated);
});
