/**
 * /api/messages/[memberId]
 *
 * GET: One member's conversation, oldest first.
 *
 * RBAC: "messages.read" (any thread in this church) OR "messages.self" (the
 * caller's own thread only).
 *
 * Authentication only at the route, with the scope decision in the service —
 * because the two audiences are not a fixed permission, they are a permission
 * PLUS an ownership comparison against the caller's own member row, and that
 * comparison needs the database.
 *
 * A member who names somebody else's memberId gets 404, not 403: answering
 * "forbidden" would confirm that the thread exists.
 */

import { withAuth, successResponse } from "@/lib/backend";
import { messageService } from "@/lib/backend/services";
import { idParamSchema, validate } from "@/lib/backend/validation";

export const GET = withAuth(async (_request, context, ctx) => {
  const { id } = validate(idParamSchema, { id: (context as any).params?.memberId });
  const messages = await messageService.getThread(ctx, id);
  return successResponse({ messages });
});
