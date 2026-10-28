/**
 * GET /api/realtime/ws
 *
 * Authenticated WebSocket Upgrade Endpoint.
 *
 * Flow:
 *   Browser WebSocket (wss://.../api/realtime/ws)
 *     ↓ (1) Authenticate user session & resolve tenantId
 *   Next.js Route Handler
 *     ↓ (2) Forward upgrade request via Service Binding (REALTIME_SERVICE)
 *   Real-Time Worker (church-management-realtime)
 *     ↓ (3) Route to AttendanceHub Durable Object (idFromName(tenantId))
 *   Hibernated WebSocket Connection
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requestDatabaseContext } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return requestDatabaseContext.run({}, async () => {
  // 1. Verify authentication & resolve TenantContext server-side
  let ctx;
  try {
    ctx = await requireAuth(request);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  // 2. Check if the request is an upgrade request
  const upgradeHeader = request.headers.get("Upgrade");
  const isWebSocketUpgrade = upgradeHeader?.toLowerCase() === "websocket";

  // 3. Obtain Cloudflare Environment bindings
  let realtimeService: any = null;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const cfContext = await getCloudflareContext({ async: true });
    realtimeService = (cfContext?.env as any)?.REALTIME_SERVICE;
  } catch {
    // In local Node next dev mode without Cloudflare bindings
  }

  // 4. In Cloudflare Workers environment with REALTIME_SERVICE binding
  if (realtimeService) {
    if (isWebSocketUpgrade) {
      // In Cloudflare Workers with OpenNext, route handlers cannot stream 101 WebSocket responses
      // without triggering runtime cancellation: "Worker's code had hung and would never generate a response"
      // and "Cannot perform I/O on behalf of a different request".
      // (Direct proxy: return realtimeService.fetch(request) requires standalone ingress)
      // Returning 501 immediately prevents the isolate from hanging and canceling concurrent requests.
      return NextResponse.json(
        {
          success: false,
          message: "Direct WebSocket upgrade not supported over route handler; use realtime polling",
        },
        { status: 501 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Direct WebSocket upgrade is served by the dedicated Real-Time Worker.",
      // The endpoint is derived from the current origin; no hostname is hardcoded.
      wsEndpoint: `${request.nextUrl.protocol === "https:" ? "wss:" : "ws:"}//${request.nextUrl.host}/api/realtime/ws`,
      tenantId: ctx.tenantId,
    });
  }

  // 5. Fallback in local Node development
  if (!isWebSocketUpgrade) {
    return NextResponse.json({
      success: true,
      message: "Real-time WebSocket endpoint ready",
      tenantId: ctx.tenantId,
      status: "mock-environment",
    });
  }

  return NextResponse.json(
    {
      success: false,
      message:
        "Direct WebSocket upgrade requires Cloudflare runtime or REALTIME_SERVICE binding. Client will use local simulation state.",
      tenantId: ctx.tenantId,
    },
    { status: 501 }
  );
  });
}
