/**
 * Service Layer Architecture
 *
 * Services contain business logic. They:
 * - Validate input (via Zod schemas)
 * - Enforce authorization
 * - Orchestrate repository calls
 * - Log audit events
 * - Emit events for realtime (future)
 * - Never directly handle HTTP — that's the route's job
 */

import type { TenantContext } from "../types";
import { validateTenantContext } from "../authorization";
import prisma from "../../db/prisma";

/**
 * Base service class that all services extend.
 * Provides tenant context validation, audit logging, and common utilities.
 */
export abstract class BaseService {
  /**
   * Validate that a tenant context is present and valid.
   */
  protected ensureTenant(ctx: TenantContext | null): TenantContext {
    return validateTenantContext(ctx);
  }

  /**
   * Create an audit log entry for security-sensitive operations.
   *
   * This is the PRIMARY audit mechanism for the application.
   * Every create, update, delete operation should call this method.
   *
   * Never logs:
   * - Passwords
   * - Access tokens
   * - API secrets
   * - Raw authentication credentials
   */
  protected async audit(
    ctx: TenantContext,
    action: string,
    resource: string,
    resourceId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    try {
      // Sanitize values - remove sensitive fields
      const sanitizedOld = oldValues ? this.sanitizeValues(oldValues) : undefined;
      const sanitizedNew = newValues ? this.sanitizeValues(newValues) : undefined;

      const isUuid = resourceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action,
          resource,
          resourceId: isUuid ? resourceId : null,
          oldValues: sanitizedOld as any || undefined,
          newValues: sanitizedNew as any || undefined,
          ipAddress: metadata?.ipAddress || null,
          userAgent: metadata?.userAgent || null,
        },
      });
    } catch (error) {
      // Audit log failures should never break the main operation
      // But should be logged for monitoring
      console.error("[Audit] Failed to write audit log:", error);
    }
  }

  /**
   * Sanitize values to remove sensitive fields before logging.
   * Prevents accidental exposure of secrets in audit logs.
   */
  private sanitizeValues(values: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = [
      "password",
      "passwordHash",
      "token",
      "secret",
      "apiKey",
      "accessToken",
      "refreshToken",
    ];

    const sanitized = { ...values };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }
    return sanitized;
  }

  /**
   * Emit a realtime event to connected clients.
   *
   * Dispatches the event via Cloudflare Service Binding to church-management-realtime,
   * which broadcasts to the tenant's AttendanceHub Durable Object.
   */
  protected async emitRealtimeEvent(
    ctx: TenantContext,
    eventType: string,
    data: unknown
  ): Promise<void> {
    const payload = {
      type: eventType,
      tenantId: ctx.tenantId,
      data,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === "development") {
      console.log(`[Realtime] ${eventType} for tenant ${ctx.tenantId}`, data);
    }

    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const cfContext = await getCloudflareContext({ async: true });
      const realtimeService = (cfContext?.env as any)?.REALTIME_SERVICE;

      if (realtimeService) {
        await realtimeService.fetch("http://internal/publish", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": ctx.tenantId,
          },
          body: JSON.stringify(payload),
        });
      }
    } catch {
      // Service binding dispatch is non-blocking to database operations
    }
  }

  /**
   * Get the current request metadata for audit logging.
   * Can be called from API routes to capture IP/user-agent.
   */
  protected getRequestMetadata(request?: Request): { ipAddress?: string; userAgent?: string } {
    if (!request) return {};

    // Extract IP from common headers
    const forwarded = request.headers?.get("x-forwarded-for");
    const realIp = request.headers?.get("x-real-ip");
    const ipAddress = forwarded?.split(",")[0] || realIp || undefined;

    return {
      ipAddress,
      userAgent: request.headers?.get("user-agent") || undefined,
    };
  }
}
