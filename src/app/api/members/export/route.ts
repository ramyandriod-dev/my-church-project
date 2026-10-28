/**
 * GET /api/members/export
 *
 * Export members as RFC 4180 compliant CSV.
 *
 * Security:
 * - Requires members.read permission
 * - Tenant isolation enforced strictly from session TenantContext
 * - Supports optional query filters: status, ministry, search
 */

import { NextResponse } from "next/server";
import { withPermission } from "@/lib/backend";
import { validate, exportMembersQuerySchema } from "@/lib/backend/validation";
import { memberService } from "@/lib/backend/services";

export const GET = withPermission("members.read", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const query = validate(exportMembersQuerySchema, Object.fromEntries(searchParams));

  const { csv } = await memberService.exportMembersCsv(ctx, query);

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `church-members-export-${dateStr}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
