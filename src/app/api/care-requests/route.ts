/**
 * POST /api/care-requests
 *
 * Member-facing pastoral care request endpoint.
 *
 * Resolves the authenticated member's identity automatically via `resolveOwnMember(ctx)`
 * and creates an open pastoral care follow-up record in PostgreSQL.
 *
 * Preserves staff RBAC on `/api/follow-ups` (which requires `followups.create`),
 * while allowing church members with authenticated sessions to request care for themselves.
 */

import { withAuth, createdResponse } from "@/lib/backend";
import { validate } from "@/lib/backend/validation";
import { resolveOwnMember } from "@/lib/backend/services";
import { followUpRepository } from "@/lib/db/repositories/follow-up-repository";
import { z } from "zod";

const careRequestSchema = z.object({
  careType: z.enum(["visit", "pastoral", "bereavement", "assistance"]).default("pastoral"),
  notes: z.string().max(2000).optional().default(""),
});

export const POST = withAuth(async (request, _context, ctx) => {
  const body = await request.json();
  const data = validate(careRequestSchema, body);

  const ownMember = await resolveOwnMember(ctx);

  const careTitles: Record<string, string> = {
    visit: "Member Request: Home or Hospital Visit",
    pastoral: "Member Request: Pastoral Counseling & Guidance",
    bereavement: "Member Request: Bereavement & Grief Support",
    assistance: "Member Request: General Pastoral Assistance",
  };

  const followUp = await followUpRepository.create(ctx.tenantId, {
    memberId: ownMember.id,
    type: "pastoral_care",
    reason: careTitles[data.careType] || "Member Pastoral Care Request",
    notes: data.notes?.trim() || undefined,
    priority: data.careType === "bereavement" ? "high" : "medium",
    status: "open",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
  });

  return createdResponse({
    id: followUp.id,
    status: followUp.status,
    message: "Care request created successfully",
  });
});
