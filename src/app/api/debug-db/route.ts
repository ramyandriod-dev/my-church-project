/**
 * GET /api/debug-db — database connectivity diagnostic.
 *
 * ─── Why this route is guarded the way it is ─────────────────────────────
 *
 * This endpoint previously sat in *neither* `PROTECTED_API_ROUTES` nor
 * `PUBLIC_ROUTES` in `src/middleware.ts`. Because it starts with `/api/` and
 * matched no protected prefix, it fell through both middleware guards and was
 * reachable by anyone, unauthenticated, in production. It returned a real
 * seeded administrator's id/email/name and, on failure, a 500-character stack
 * trace.
 *
 * It was a leftover debugging aid from before the Phase 0 security work, and
 * it was never something production should expose.
 *
 * Two independent gates now apply, in this order:
 *
 *   1. **Environment gate.** Outside `development` the route does not exist. It
 *      answers `404`, not `403` — a `403` would confirm the endpoint is present
 *      and invite a search for a way around it.
 *   2. **Permission gate.** Inside `development` it additionally requires an
 *      authenticated session holding `audit.read`, which only `super_admin` and
 *      `admin` carry. A shared dev machine, or a phone pointed at a dev server,
 *      therefore still cannot read the database.
 *
 * The environment gate runs first so that the *reason* a production request
 * fails stays opaque rather than degrading into an auth oracle.
 *
 * Credential material is never returned, only a boolean saying whether the
 * variable is present. Note this reports a connection *boolean* and row counts
 * only — no rows, and no per-user identifiers.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { withErrorHandling } from "@/lib/backend/api-response";

/** Admin-level, read-only. Excludes members and ushers by design. */
const REQUIRED_PERMISSION = "audit.read";

export const GET = withErrorHandling(async (request: Request) => {
  // ─── Gate 1: development only ─────────────────────────────────────────
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Not found" },
      },
      { status: 404 }
    );
  }

  // ─── Gate 2: authenticated admin ──────────────────────────────────────
  const { requirePermission } = await import("@/lib/auth");
  await requirePermission(request as NextRequest, REQUIRED_PERMISSION);

  // ─── Diagnostic ───────────────────────────────────────────────────────
  // Failures are deliberately not caught here. `withErrorHandling` owns the
  // response shape, and in production it strips message and stack, so a stack
  // trace is never serialised. One error path is easier to audit than two
  // that can drift apart.
  const [users, tenants] = await Promise.all([
    prisma.user.count(),
    prisma.tenant.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      connectivity: "ok",
      counts: { users, tenants },
      databaseUrl: process.env.DATABASE_URL ? "SET" : "MISSING",
      nodeEnv: process.env.NODE_ENV,
    },
  });
});
