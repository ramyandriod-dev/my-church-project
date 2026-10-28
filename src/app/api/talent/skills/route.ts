/**
 * /api/talent/skills
 *
 * GET: The tenant's existing skill vocabulary, for the picker's suggestions.
 *
 * RBAC: requirePermission("talent.read")
 *
 * Suggestions only. A member can always type a skill the church has never
 * heard of; the repository creates the row on save.
 */

import { withPermission, successResponse } from "@/lib/backend";
import { talentService } from "@/lib/backend/services";

export const GET = withPermission("talent.read", async (_request, _context, ctx) => {
  const skills = await talentService.listSkills(ctx);
  return successResponse({ items: skills });
});
