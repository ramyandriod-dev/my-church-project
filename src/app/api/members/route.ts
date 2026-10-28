/**
 * GET /api/members
 * POST /api/members
 *
 * Client-independent member management endpoints.
 * Both web dashboard and mobile app consume these.
 *
 * Security:
 * - GET: Requires members.read permission
 * - POST: Requires members.create permission
 * - Tenant context derived from authenticated session only
 */

import { NextResponse } from "next/server";
import { withPermission, createdResponse } from "@/lib/backend";
import { validate, memberQuerySchema, createMemberSchema } from "@/lib/backend/validation";
import { memberService } from "@/lib/backend/services";

export const GET = withPermission("members.read", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const query = validate(memberQuerySchema, Object.fromEntries(searchParams));

  const result = await memberService.listMembers(ctx, query);

  return NextResponse.json({
    success: true,
    data: result.members,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
});

export const POST = withPermission("members.create", async (request, _context, ctx) => {
  const body = await request.json();
  const data = validate(createMemberSchema, body);

  const member = await memberService.createMember(ctx, data);

  return createdResponse(member);
});
