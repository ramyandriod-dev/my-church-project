/**
 * /api/talent/directory
 *
 * GET: The Talent Directory.
 *
 * RBAC: requirePermission("talent.read")
 *
 * Ordinary members have no `talent.read`, so this route is the administrative
 * directory and is not reachable by them. Contact details are included only when
 * the caller also holds the permission that governs the member directory; the
 * repository omits the fields entirely otherwise.
 *
 * `skills` may be repeated (`?skills=a&skills=b`) or comma-separated; `skillMode`
 * chooses whether they combine as "any" or "all". The response carries `facets`,
 * the per-skill counts for the current filter, so the panel and the rows come
 * from one consistent read.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { talentService } from "@/lib/backend/services";
import { talentDirectoryQuerySchema, validate } from "@/lib/backend/validation";

export const GET = withPermission("talent.read", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const query = validate(talentDirectoryQuerySchema, {
    search: searchParams.get("search") ?? undefined,
    professionCategory: searchParams.get("professionCategory") ?? undefined,
    skill: searchParams.get("skill") ?? undefined,
    // getAll keeps repeated params; the schema also accepts one comma-separated
    // value, so both link styles work.
    skills: searchParams.getAll("skills").flatMap((v) => v.split(",")),
    skillMode: searchParams.get("skillMode") ?? undefined,
    ministry: searchParams.get("ministry") ?? undefined,
    group: searchParams.get("group") ?? undefined,
    willingness: searchParams.get("willingness") ?? undefined,
    includeNotDiscoverable: searchParams.get("includeNotDiscoverable") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  const result = await talentService.listDirectory(ctx, query);
  return successResponse(result);
});
