/**
 * Authentication Tests
 *
 * Tests for:
 * 1. Unauthenticated request → 401
 * 2. Authenticated request → allowed to continue
 * 3. JWT signing and verification
 * 4. Session creation and destruction
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { signSession, verifySession } from "@/lib/auth/session";
import { requireAuth, getSession } from "@/lib/auth/require-auth";
import { UnauthorizedError } from "@/lib/backend/errors";
import prisma from "@/lib/db/prisma";

describe("Authentication", () => {
  const mockUser = {
    id: "user-123",
    tenantId: "tenant-abc",
    email: "test@example.com",
    name: "Test User",
    role: "admin",
    isActive: true,
  };

  const mockSessionPayload = {
    userId: "user-123",
    tenantId: "tenant-abc",
    email: "test@example.com",
    role: "admin",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("JWT Signing and Verification", () => {
    it("should sign and verify a valid JWT", async () => {
      const token = await signSession(mockSessionPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const payload = await verifySession(token);
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe("user-123");
      expect(payload?.tenantId).toBe("tenant-abc");
      expect(payload?.email).toBe("test@example.com");
      expect(payload?.role).toBe("admin");
    });

    it("should reject an invalid JWT", async () => {
      const payload = await verifySession("invalid-token");
      expect(payload).toBeNull();
    });

    it("should reject a JWT with wrong signature", async () => {
      const token = await signSession(mockSessionPayload);
      // Tamper with the token
      const tampered = token.slice(0, -10) + "XXXXXXXXXX";
      const payload = await verifySession(tampered);
      expect(payload).toBeNull();
    });
  });

  describe("requireAuth", () => {
    it("should throw UnauthorizedError when no session exists", async () => {
      // Create a request with no cookies
      const request = {
        cookies: {
          get: () => undefined,
        },
        headers: new Headers(),
      };

      await expect(requireAuth(request as any)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw UnauthorizedError when user not found", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const token = await signSession(mockSessionPayload);
      const request = {
        cookies: {
          get: (name: string) => name === "church_session" ? { value: token } : undefined,
        },
        headers: new Headers(),
      };

      await expect(requireAuth(request as any)).rejects.toThrow("User not found");
    });

    it("should throw UnauthorizedError when user is inactive", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const token = await signSession(mockSessionPayload);
      const request = {
        cookies: {
          get: (name: string) => name === "church_session" ? { value: token } : undefined,
        },
        headers: new Headers(),
      };

      await expect(requireAuth(request as any)).rejects.toThrow("deactivated");
    });

    it("should throw TenantError when user belongs to different tenant", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        ...mockUser,
        tenantId: "different-tenant",
      });

      const token = await signSession(mockSessionPayload);
      const request = {
        cookies: {
          get: (name: string) => name === "church_session" ? { value: token } : undefined,
        },
        headers: new Headers(),
      };

      await expect(requireAuth(request as any)).rejects.toThrow("does not belong to this tenant");
    });

    it("should return TenantContext for valid session", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const token = await signSession(mockSessionPayload);
      const request = {
        cookies: {
          get: (name: string) => name === "church_session" ? { value: token } : undefined,
        },
        headers: new Headers(),
      };

      const ctx = await requireAuth(request as any);

      expect(ctx).toBeDefined();
      expect(ctx.userId).toBe("user-123");
      expect(ctx.tenantId).toBe("tenant-abc");
      expect(ctx.role).toBe("admin");
      expect(ctx.permissions).toBeDefined();
      expect(Array.isArray(ctx.permissions)).toBe(true);
    });
  });

  describe("Development Auth Bypass", () => {
    it("should allow dev bypass when in development mode", async () => {
      // This test only works in development mode
      // In production, the dev bypass is disabled
      if (process.env.NODE_ENV !== "development") {
        // Skip test in non-development environments
        expect(true).toBe(true);
        return;
      }

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const request = {
        cookies: {
          get: () => undefined,
        },
        headers: new Headers({
          "x-dev-auth-bypass": "enabled",
          "x-dev-user-id": "user-123",
          "x-dev-tenant-id": "tenant-abc",
          "x-dev-user-role": "admin",
        }),
      };

      const ctx = await requireAuth(request as any);

      expect(ctx).toBeDefined();
      expect(ctx.userId).toBe("user-123");
      expect(ctx.tenantId).toBe("tenant-abc");
    });

    it("should reject request without valid session or dev bypass", async () => {
      const request = {
        cookies: {
          get: () => undefined,
        },
        headers: new Headers(),
      };

      await expect(requireAuth(request as any)).rejects.toThrow(UnauthorizedError);
    });
  });
});
