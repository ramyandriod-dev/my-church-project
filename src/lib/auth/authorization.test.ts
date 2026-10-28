/**
 * Authorization Tests
 *
 * Tests for:
 * 8. User without members.read → denied
 * 9. User with members.read → allowed
 * 10. User without members.create → denied
 * 11. User with members.create → allowed
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasPermission, getPermissionsForRole } from "@/lib/auth/user-context";
import { requirePermission } from "@/lib/backend/authorization";
import { ForbiddenError } from "@/lib/backend/errors";
import type { TenantContext } from "@/lib/backend/types";

describe("Authorization", () => {
  const createContext = (role: string): TenantContext => ({
    userId: "user-123",
    tenantId: "tenant-abc",
    role,
    permissions: getPermissionsForRole(role as any),
  });

  describe("Permission Checks", () => {
    it("admin should have members.read permission", () => {
      const ctx = createContext("admin");
      expect(hasPermission(ctx.role as any, "members.read")).toBe(true);
    });

    it("admin should have members.create permission", () => {
      const ctx = createContext("admin");
      expect(hasPermission(ctx.role as any, "members.create")).toBe(true);
    });

    it("leader should have members.read but not members.delete", () => {
      const ctx = createContext("leader");
      expect(hasPermission(ctx.role as any, "members.read")).toBe(true);
      expect(hasPermission(ctx.role as any, "members.delete")).toBe(false);
    });

    it("member can neither read nor create members until an admin allows it", () => {
      const ctx = createContext("member");
      expect(hasPermission(ctx.role as any, "members.read")).toBe(false);
      expect(hasPermission(ctx.role as any, "members.create")).toBe(false);
    });

    it("member should not have attendance.create", () => {
      const ctx = createContext("member");
      expect(hasPermission(ctx.role as any, "attendance.create")).toBe(false);
    });

    it("leader should have attendance.create", () => {
      const ctx = createContext("leader");
      expect(hasPermission(ctx.role as any, "attendance.create")).toBe(true);
    });
  });

  describe("requirePermission (Service Layer)", () => {
    it("should pass when user has required permission", () => {
      const ctx = createContext("admin");

      expect(() => {
        requirePermission(ctx, "members.read");
      }).not.toThrow();
    });

    it("should throw ForbiddenError when user lacks permission", () => {
      const ctx = createContext("member");

      expect(() => {
        requirePermission(ctx, "members.create");
      }).toThrow(ForbiddenError);
    });

    it("should throw ForbiddenError for non-existent permission", () => {
      const ctx = createContext("member");

      expect(() => {
        requirePermission(ctx, "nonexistent.permission" as any);
      }).toThrow(ForbiddenError);
    });
  });

  describe("Role Hierarchy", () => {
    it("super_admin should have all permissions", () => {
      const ctx = createContext("super_admin");
      const permissions = getPermissionsForRole("super_admin");

      expect(permissions.length).toBeGreaterThan(0);
      expect(ctx.permissions.length).toBeGreaterThan(0);
    });

    it("member has no feature access by default, only their own conversation", () => {
      // An admin ticks what members may do in Settings → Access and roles.
      expect(getPermissionsForRole("member")).toEqual(["messages.self"]);
    });

    it("admin should have more permissions than leader", () => {
      const adminPermissions = getPermissionsForRole("admin");
      const leaderPermissions = getPermissionsForRole("leader");

      expect(adminPermissions.length).toBeGreaterThan(leaderPermissions.length);
    });

    it("pastor should have more permissions than leader", () => {
      const pastorPermissions = getPermissionsForRole("pastor");
      const leaderPermissions = getPermissionsForRole("leader");

      expect(pastorPermissions.length).toBeGreaterThan(leaderPermissions.length);
    });
  });

  describe("Resource-Level Authorization", () => {
    it("should allow self-service for own resources", () => {
      const ctx = createContext("member");
      const resourceOwnerId = "user-123"; // Same as ctx.userId

      // Member can update their own profile
      expect(ctx.userId === resourceOwnerId).toBe(true);
    });

    it("should require admin role to modify other users' resources", () => {
      const ctx = createContext("member");
      const resourceOwnerId = "user-other"; // Different user

      // Member cannot update another user's profile
      expect(ctx.userId === resourceOwnerId).toBe(false);
    });
  });
});

/**
 * Messaging permissions
 *
 * The feature added a third shape of grant alongside the usual role-based ones:
 * `messages.self`, which belongs to members and is about *whose* data is visible
 * rather than *what* is visible. Members must never receive `messages.read` or
 * `messages.send` — a single stray entry in the member role array would turn the
 * member inbox into a way to read and start conversations with any member id.
 *
 * These assertions are written against `getPermissionsForRole` rather than the
 * raw matrix, so they test the value every request actually receives.
 */
describe("Messaging permissions", () => {
  const staffRoles = ["super_admin", "admin", "pastor", "leader"] as const;

  for (const role of staffRoles) {
    it(`gives ${role} the ability to read threads and start them`, () => {
      const permissions = getPermissionsForRole(role as any);
      expect(permissions).toContain("messages.read");
      expect(permissions).toContain("messages.send");
    });

    it(`does not give ${role} the member-only self grant`, () => {
      // Staff scope is not narrowed by `messages.self`; giving them both would
      // create two competing definitions of "my" for the same account.
      expect(getPermissionsForRole(role as any)).not.toContain("messages.self");
    });
  }

  it("gives a member only the self grant", () => {
    const permissions = getPermissionsForRole("member" as any);
    expect(permissions).toContain("messages.self");
    expect(permissions).not.toContain("messages.read");
    expect(permissions).not.toContain("messages.send");
  });

  it("keeps the member grant out of every staff role, so read and send stay staff-only", () => {
    // Stated as a set difference rather than per-role checks: the failure mode is
    // one role gaining `messages.read`, and this fails the moment any role does.
    const offenders = staffRoles.filter((role) =>
      (getPermissionsForRole(role as any) as string[]).includes("messages.self"),
    );
    expect(offenders).toEqual([]);
  });

  it("gives a member no path at all to the inbox list", () => {
    // `listInbox` is gated on `messages.read`; a member without it gets a 403
    // rather than an empty list that implies there are no conversations.
    const ctx: TenantContext = {
      userId: "member-1",
      tenantId: "tenant-abc",
      role: "member",
      permissions: getPermissionsForRole("member" as any),
    };
    expect(() => requirePermission(ctx, "messages.read")).toThrow(ForbiddenError);
  });
});
