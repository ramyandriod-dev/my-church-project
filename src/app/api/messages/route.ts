/**
 * /api/messages
 *
 * GET:  The staff inbox — one row per conversation, newest activity first.
 * POST: Staff send a message to a member.
 *
 * RBAC: GET requires "messages.read". POST requires "messages.send".
 *
 * ─── Why GET is not a "list every message" route ─────────────
 *
 * This returns thread summaries, not a flat feed of every message in the
 * church. A conversation is always addressed to a member, and a member is always
 * in a tenant, so a flat feed would be a much larger payload carrying every
 * pastoral conversation in the church to render a list of names. The
 * per-member aggregate also means a mistake here is bounded to the wrong
 * member's thread rather than to everybody's at once.
 *
 * A member calling GET gets a permission error rather than an empty list,
 * because an empty list is indistinguishable from "you have no messages" and
 * would hide the mistake instead of surfacing it.
 */

import { withPermission, successResponse, createdResponse } from "@/lib/backend";
import { messageService } from "@/lib/backend/services";
import { sendMessageSchema, validate } from "@/lib/backend/validation";

export const GET = withPermission("messages.read", async (_request, _context, ctx) => {
  const [threads, unread] = await Promise.all([
    messageService.listInbox(ctx),
    messageService.getInboxUnreadCount(ctx),
  ]);
  return successResponse({ threads, unread });
});

export const POST = withPermission("messages.send", async (request, _context, ctx) => {
  const body = await request.json();
  const input = validate(sendMessageSchema, body);
  const message = await messageService.sendToMember(ctx, input);
  return createdResponse({ message });
});
