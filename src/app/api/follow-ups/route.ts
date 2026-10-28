/**
 * /api/follow-ups
 *
 * GET: List follow-ups for the authenticated tenant with query filters & KPIs.
 * POST: Create a new follow-up with duplicate check and validation.
 *
 * RBAC:
 * - GET: requirePermission("followups.read")
 * - POST: requirePermission("followups.create")
 */

import { NextRequest } from "next/server";
import {
  withPermission,
  successResponse,
  createdResponse,
} from "@/lib/backend";
import { followUpService } from "@/lib/backend/services";

export const GET = withPermission("followups.read", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const type = searchParams.get("type") || undefined;
  const assignedTo = searchParams.get("assignedTo") || undefined;
  const memberId = searchParams.get("memberId") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

  // Check duplicate endpoint query: /api/follow-ups?checkDuplicate=true&memberId=...
  if (searchParams.get("checkDuplicate") === "true" && memberId) {
    const checkResult = await followUpService.checkDuplicate(
      ctx,
      memberId,
      searchParams.get("reason") || undefined
    );
    return successResponse(checkResult);
  }

  const result = await followUpService.listFollowUps(ctx, {
    status,
    priority,
    type,
    assignedTo,
    memberId,
    search,
    page,
    limit,
  });

  return successResponse(result);
});

export const POST = withPermission("followups.create", async (request, _context, ctx) => {
  const body = await request.json();
  const result = await followUpService.createFollowUp(ctx, body);
  return createdResponse(result);
});
