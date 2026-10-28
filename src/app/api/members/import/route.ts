/**
 * POST /api/members/import
 *
 * Batch member import endpoint.
 *
 * Security:
 * - Requires members.create permission
 * - Tenant isolation enforced strictly from session TenantContext
 * - Duplicate email resolution strategies: 'skip' | 'update'
 */

import { NextResponse } from "next/server";
import { withPermission } from "@/lib/backend";
import { validate, importMembersSchema } from "@/lib/backend/validation";
import { memberService } from "@/lib/backend/services";

export const POST = withPermission("members.create", async (request, _context, ctx) => {
  const body = await request.json();
  const input = validate(importMembersSchema, body);

  const result = await memberService.importMembers(ctx, input);

  return NextResponse.json({
    success: true,
    data: result,
    message: `Processed ${input.members.length} member(s): ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped${result.errors > 0 ? `, ${result.errors} errors` : ""}.`,
  });
});
