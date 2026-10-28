/**
 * POST /api/realtime/publish
 *
 * Realtime event publishing endpoint.
 *
 * Dispatches verified events to church-management-realtime via Service Binding.
 * Security:
 * - Requires authentication
 * - Events are scoped strictly to the authenticated user's tenant
 */

import { withAuth, successResponse } from "@/lib/backend";

export const POST = withAuth(async (request, _context, ctx) => {
  const body = await request.json();

  const payload = {
    type: body.type || "attendance.event",
    tenantId: ctx.tenantId,
    data: body.data || {},
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
