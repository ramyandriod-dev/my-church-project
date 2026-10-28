/**
 * /api/messages/bulk
 *
 * POST: Staff send a support message / notification to multiple members in bulk.
 *
 * RBAC: requirePermission("messages.send")
 */

import { withPermission, createdResponse } from "@/lib/backend";
import { messageService } from "@/lib/backend/services";
import { sendBulkMessageSchema, validate } from "@/lib/backend/validation";

export const POST = withPermission("messages.send", async (request, _context, ctx) => {
  const body = await request.json();
  const input = validate(sendBulkMessageSchema, body);
  const result = await messageService.sendBulkToMembers(ctx, input);
  return createdResponse(result);
});
