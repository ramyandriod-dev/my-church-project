/**
 * GET /api/members/me
 * PATCH /api/members/me
 *
 * GET: Returns the directory record of the authenticated user with talents and family.
 * PATCH: Self-service profile update (contact, ministry, group, talents, family)
 *        with immediate real-time event dispatching for CRM dashboards.
 *
 * Security:
 * - Requires a valid authenticated session (any role: super_admin, admin, pastor, leader, member)
 * - Does NOT require general `members.update` CRM privilege, as members can update their own profile
 * - Tenant isolation enforced strictly from session TenantContext
 */

import { withAuth, successResponse } from "@/lib/backend";
import { memberService } from "@/lib/backend/services";
import { updateMyProfileSchema, requestProfileDeletionSchema, validate } from "@/lib/backend/validation";

export const GET = withAuth(async (_request, _context, ctx) => {
  const member = await memberService.getMyMemberProfile(ctx);
  return successResponse(member);
});

export const PATCH = withAuth(async (request, _context, ctx) => {
  const body = await request.json();
  const input = validate(updateMyProfileSchema, body);
  const updated = await memberService.updateMyProfile(ctx, input, request);
  return successResponse(updated);
});

export const DELETE = withAuth(async (request, _context, ctx) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // JSON body is optional for DELETE
  }
  const input = validate(requestProfileDeletionSchema, body || {});
  const result = await memberService.requestProfileDeletion(ctx, input, request);

  const response = successResponse(result);
  response.headers.set(
    "Set-Cookie",
    "church_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
  );
  return response;
});

