/**
 * /api/messages/reply
 *
 * POST: The member replies on their own thread.
 *
 * RBAC: "messages.self" — the narrow member grant.
 *
 * There is deliberately no `memberId` in the body. The target is resolved from
 * the login, so a member cannot start a conversation with another member by
 * editing a field, and cannot forge a message that appears to come from a
 * different person. `messages.send` (staff) is NOT accepted here, so this cannot
 * be used to impersonate a staff sender either.
 *
 * WhatsApp is not offered on this route: a member replying to their own church
 * already has the app open, and a recorded "WhatsApp request" from a member would
 * describe something the church cannot verify or act on.
 */

import { withAuth, createdResponse } from "@/lib/backend";
import { messageService } from "@/lib/backend/services";
import { messageReplySchema, validate } from "@/lib/backend/validation";

export const POST = withAuth(async (request, _context, ctx) => {
  const body = await request.json();
  const input = validate(messageReplySchema, body);
  const message = await messageService.replyAsMember(ctx, input.body);
  return createdResponse({ message });
});
