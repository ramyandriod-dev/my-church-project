/**
 * /api/talent/me
 *
 * GET: The caller's own talent profile, for "My Skills & Expertise".
 * PUT: Create or update the caller's own talent profile.
 *
 * RBAC: authentication only.
 *
 * Deliberately NOT behind `talent.update`. The `member` role has no
 * `talent.update` on purpose, because a blanket write permission would let any
 * member rewrite anyone else's profile. A member writes their own profile by
 * ownership instead, and the service resolves the member from the login rather
 * than from the request body, so the subject of the edit cannot be forged.
 */

import {
  withAuth,
  successResponse,
  createdResponse,
} from "@/lib/backend";
import { talentService } from "@/lib/backend/services";
import { upsertTalentProfileSchema, validate } from "@/lib/backend/validation";

export const GET = withAuth(async (_request, _context, ctx) => {
  const profile = await talentService.getMyProfile(ctx);
  // No profile yet is a normal state, not an error, so this is 200 with null and
  // the screen renders an empty form.
  return successResponse({ profile });
});

export const PUT = withAuth(async (request, _context, ctx) => {
  const body = await request.json();
  const input = validate(upsertTalentProfileSchema, body);
  const existed = (await talentService.getMyProfile(ctx)) !== null;
  const profile = await talentService.saveMyProfile(ctx, input);
  return existed ? successResponse({ profile }) : createdResponse({ profile });
});
