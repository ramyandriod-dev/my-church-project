/**
 * Role permission store: saved choices replace the defaults, super admin is
 * never limited, and a missing table falls back to the defaults.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/db/prisma";
import { resolveRolePermissions } from "./role-permission-store";
import { ALL_PERMISSIONS } from "./permission-catalog";
import { DEFAULT_ROLE_PERMISSIONS } from "./user-context";

// Typed loosely: Prisma's PrismaPromise return type is not worth reproducing in a mock.
const findMany = vi.mocked(prisma.rolePermission.findMany) as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue([] as any);
});

describe("resolveRolePermissions", () => {
  it("uses the defaults when the church has not changed a role", async () => {
    findMany.mockResolvedValue([] as any);
    expect(await resolveRolePermissions("t-1", "usher")).toEqual(DEFAULT_ROLE_PERMISSIONS.usher);
  });

  it("uses the saved list, dropping anything unknown", async () => {
    findMany.mockResolvedValue([{ role: "leader", permissions: ["members.read", "made.up"] }] as any);
    expect(await resolveRolePermissions("t-1", "leader")).toEqual(["members.read"]);
  });

  it("keeps the member's own-conversation grant even after a save", async () => {
    findMany.mockResolvedValue([{ role: "member", permissions: ["events.read"] }] as any);
    expect(await resolveRolePermissions("t-1", "member")).toEqual(["events.read", "messages.self"]);
  });

  it("never limits super admin, whatever is saved", async () => {
    findMany.mockResolvedValue([{ role: "super_admin", permissions: [] }] as any);
    expect(new Set(await resolveRolePermissions("t-1", "super_admin"))).toEqual(new Set(ALL_PERMISSIONS));
  });

  it("falls back to the defaults before the table exists", async () => {
    findMany.mockImplementation(async () => {
      throw Object.assign(new Error("missing table"), { code: "P2021" });
    });
    expect(await resolveRolePermissions("t-1", "pastor")).toEqual(DEFAULT_ROLE_PERMISSIONS.pastor);
  });

  it("does not hide other database errors", async () => {
    findMany.mockImplementation(async () => {
      throw new Error("connection lost");
    });
    await expect(resolveRolePermissions("t-1", "pastor")).rejects.toThrow("connection lost");
  });
});
