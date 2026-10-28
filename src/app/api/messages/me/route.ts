/**
 * /api/messages/me
 *
 * GET: The caller's own conversation, oldest first.
 *
 * RBAC: "messages.self" — a member's own thread. No member id is taken from the
 * request at all, so there is no parameter to tamper with and nothing for a
 * client to get wrong.
 *
 * This exists as a separate route rather than a spelling of `/api/messages/:id`
 * because that route validates its id as a UUID, and "me" is not one. A member
 * would get a validation error instead of their messages, which reads like a
 * broken feature rather than a scope decision.
 *
 * A member login with no linked member row gets 404. That is the honest answer:
 * there is no thread to show, and no thread is created by looking.
 */

import { withAuth, successResponse } from "@/lib/backend";
import { messageService } from "@/lib/backend/services";

export const GET = withAuth(async (_request, _context, ctx) => {
  const messages = await messageService.getMyThread(ctx);
  return successResponse({ messages });
});
