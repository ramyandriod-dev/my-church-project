/**
 * POST /api/realtime/publish
 *
 * Realtime event publishing endpoint.
 *
 * Dispatches verified events to church-management-realtime via Service Binding.
 * Security:
 * - Requires the "attendance.create" permission (staff), not just a login: a member
 *   must not be able to put events on the church's live dashboard
 * - Only the "attendance.check_in" event type is accepted, with a size-capped payload
 * - Events are scoped strictly to the authenticated user's tenant
 */

import { withPermission, successResponse } from "@/lib/backend";
import { publishRealtimeSchema, validate } from "@/lib/backend/validation";

export const POST = withPermission("attendance.create", async (request, _context, ctx) => {
  const body = validate(publishRealtimeSchema, await request.json());

  const payload = {
    type: body.type,
    tenantId: ctx.tenantId,
    data: body.data,
    timestamp: new Date().toISOString(),
  };

  let delivered = 0;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const cfContext = await getCloudflareContext({ async: true });
    const realtimeService = (cfContext?.env as any)?.REALTIME_SERVICE;

    if (realtimeService) {
      const res = await realtimeService.fetch("http://internal/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": ctx.tenantId,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = (await res.json()) as { delivered?: number };
        delivered = json.delivered ?? 0;
      }
    }
  } catch {
    // Non-blocking dispatch in dev or disconnected environment
  }

  return successResponse({
    published: true,
    eventType: payload.type,
    tenantId: ctx.tenantId,
    delivered,
    timestamp: payload.timestamp,
  });
});
