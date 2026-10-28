/**
 * /api/messages/unread
 *
 * GET: How many messages are waiting for the CALLER, for a badge.
 *
 * RBAC: authentication only.
 *
 * Returns 0 rather than an error for a login that maps to neither side, because
 * a staff account opening the messages page should render a staff view with no
 * badge — not an error page. That is why this is a separate route instead of a
 * field on the inbox response: the badge has to be answerable for both audiences
 * from one call, including the staff user who has no member row at all.
 *
 * Note the direction the number is counted in, because it is easy to get wrong:
 * staff get *unanswered member* messages, members get *unanswered staff*
 * messages. Neither audience is ever shown its own sent mail as unread.
 */

import { withAuth, successResponse } from "@/lib/backend";
import { messageService } from "@/lib/backend/services";

export const GET = withAuth(async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience") ?? undefined;
  const unread = await messageService.getMyUnreadCount(ctx, audience);
  return successResponse({ unread });
});
