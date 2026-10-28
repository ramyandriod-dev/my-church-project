/**
 * /api/families
 *
 * GET: List families for the authenticated tenant.
 * POST: Create a family.
 *
 * RBAC:
 * - GET: requirePermission("families.read")
 * - POST: requirePermission("families.create")
 *
 * The tenant is always taken from the server-resolved TenantContext. No route
 * in this domain accepts a client-supplied tenantId.
 */

import {
  withPermission,
  successResponse,
  createdResponse,
} from "@/lib/backend";
import { familyService } from "@/lib/backend/services";
import { createFamilySchema, familyQuerySchema, validate } from "@/lib/backend/validation";

export const GET = withPermission("families.read", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const query = validate(familyQuerySchema, {
    search: searchParams.get("search") ?? undefined,
    headMemberId: searchParams.get("headMemberId") ?? undefined,
    hasPhoto: searchParams.get("hasPhoto") ?? undefined,
    hasChildren: searchParams.get("hasChildren") ?? undefined,
    minSize: searchParams.get("minSize") ?? undefined,
    maxSize: searchParams.get("maxSize") ?? undefined,
    relationshipType: searchParams.get("relationshipType") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  // `view=directory` returns the household summary the Families table renders;
  // the default stays the plain list so existing callers are unaffected.
  if (searchParams.get("view") === "directory") {
    const entries = await familyService.listFamilyDirectory(ctx, query);
    return successResponse({ items: entries, total: entries.length });
  }

  const result = await familyService.listFamilies(ctx, query);
  return successResponse(result);
});

export const POST = withPermission("families.create", async (request, _context, ctx) => {
  const body = await request.json();
  const input = validate(createFamilySchema, body);
  const family = await familyService.createFamily(ctx, input, request);
  return createdResponse(family);
});
