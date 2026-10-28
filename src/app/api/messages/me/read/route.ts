/**
 * /api/messages/me/read
 *
 * POST: Mark the caller's own thread as read.
 *
 * RBAC: "messages.self" — the caller's own thread only. No member id is read
 * from the request, so this cannot be pointed at somebody else's conversation.
 *
 * The repository is told the *opposite* sender kind (`staff`) so it clears the
 * staff messages this member has now seen, and leaves the member's own sent
 * messages alone. Getting that direction backwards would either clear nothing or
 * mark the member's own replies as read.
 */

import { withAuth, successResponse } from "@/lib/backend";
import { messageService } from "@/lib/backend/services";

export const POST = withAuth(async (_request, _context, ctx) => {
  const marked = await messageService.markMyThreadRead(ctx);
  return successResponse({ marked });
});
