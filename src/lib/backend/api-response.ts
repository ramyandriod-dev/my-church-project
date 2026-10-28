/**
 * API Response Helpers
 *
 * Standardized Next.js API route response utilities.
 * Ensures consistent response format across all endpoints.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse, PaginationMeta, TenantContext } from "./types";
import { AppError, UnauthorizedError, ForbiddenError, ValidationError, toApiResponse } from "./errors";
import { requestDatabaseContext } from "@/lib/db/prisma";

// ─── Success Responses ───────────────────────────────────────

export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function createdResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function paginatedResponse<T>(
  data: T[],
  meta: PaginationMeta
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({ success: true, data, meta }, { status: 200 });
}

// ─── Error Response ──────────────────────────────────────────

export function errorResponse(error: unknown): NextResponse<ApiResponse> {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      toApiResponse(error),
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      toApiResponse(error),
      { status: 403 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      toApiResponse(error),
      { status: error.statusCode }
    );
  }

  const message = (error as any)?.message || String(error);

  console.error("[Unhandled Error]", error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message,
      },
    },
    { status: 500 }
  );
}

// ─── Route Handler Wrappers ──────────────────────────────────

type RouteContext = { params: Promise<Record<string, string>> };

export type RouteHandler = (
  request: Request,
  context: RouteContext
) => Promise<NextResponse>;

type AuthenticatedHandler = (
  request: Request,
  context: RouteContext,
  ctx: TenantContext
) => Promise<NextResponse>;

/**
 * Wraps a route handler with standardized error handling and per-request database context.
 * Catches all errors and returns proper HTTP responses.
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    return requestDatabaseContext.run({}, async () => {
      try {
        return await handler(request, context);
      } catch (error) {
        return errorResponse(error);
      }
    });
  };
}

/**
 * Wraps a route handler with authentication.
 * Requires a valid session — returns 401 if unauthenticated.
 * Passes the authenticated TenantContext to the handler.
 *
 * Usage:
 *   export const GET = withAuth(async (request, context, ctx) => {
 *     // ctx is guaranteed to be authenticated
 *   });
 */
export function withAuth(handler: AuthenticatedHandler): RouteHandler {
  return withErrorHandling(async (request, context) => {
    const { requireAuth } = await import("@/lib/auth");
    const ctx = await requireAuth(request as NextRequest);
    return handler(request, context, ctx);
  });
}

/**
 * Wraps a route handler with authentication and permission check.
 * Requires a valid session AND specific permission.
 *
 * Usage:
 *   export const GET = withPermission("members.read", async (request, context, ctx) => {
 *     // ctx has members.read permission
 *   });
 */
export function withPermission(
  permission: string,
  handler: AuthenticatedHandler
): RouteHandler {
  return withErrorHandling(async (request, context) => {
    const { requirePermission } = await import("@/lib/auth");
    const ctx = await requirePermission(request as NextRequest, permission as any);
    return handler(request, context, ctx);
  });
}
