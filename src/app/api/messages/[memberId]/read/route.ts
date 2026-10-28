/**
 * /api/messages/[memberId]/read
 *
 * POST: Mark the other side's messages in this thread as read.
 *
 * RBAC: "messages.read" OR "messages.self" (own thread only).
 *
 * Scoped by direction in the repository, so this can only ever mark messages the
 * caller actually received. A staff user's own outgoing message is never
 * "read by" them, which is what keeps the unread badge meaning one thing.
 */

import { withAuth, successResponse } from "@/lib/backend";
import { messageService } from "@/lib/backend/services";
import { idParamSchema, validate } from "@/lib/backend/validation";

export const POST = withAuth(async (_request, context, ctx) => {
  const { id } = validate(idParamSchema, { id: (context as any).params?.memberId });
  const marked = await messageService.markThreadRead(ctx, id);
  return successResponse({ marked });
});
