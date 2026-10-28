/**
 * /api/ideas
 *
 * GET: List the Ideas Bank for the authenticated tenant.
 * POST: Submit an idea.
 *
 * RBAC:
 * - GET: requirePermission("ideas.read")
 * - POST: requirePermission("ideas.create")
 *
 * The submitter is taken from the login by the service, never from the request
 * body, so a member cannot file an idea as somebody else. Staff-only internal
 * notes are returned only to `ideas.manage` holders.
 */

import { withPermission, successResponse, createdResponse } from "@/lib/backend";
import { ideaService } from "@/lib/backend/services";
import { createIdeaSchema, ideaQuerySchema, validate } from "@/lib/backend/validation";

export const GET = withPermission("ideas.read", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);

  // `mine=1` is the mobile "My Ideas" list; it resolves the member server-side.
  if (searchParams.get("mine") === "1") {
    const items = await ideaService.listMyIdeas(ctx);
    return successResponse({ items, total: items.length });
  }

  const rawStatus = searchParams.get("status");
  const query = validate(ideaQuerySchema, {
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    // A repeated status param is an OR list, which is what the status filter
    // chips send.
    status: rawStatus
      ? searchParams.getAll("status")
      : undefined,
    submittedByMemberId: searchParams.get("submittedByMemberId") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  const result = await ideaService.listIdeas(ctx, query);
  return successResponse(result);
});

export const POST = withPermission("ideas.create", async (request, _context, ctx) => {
  const body = await request.json();
  const input = validate(createIdeaSchema, body);
  const idea = await ideaService.createIdea(ctx, input);
  return createdResponse({ idea });
});
