/**
 * The route gate (requirePermission) must follow what the church set in
 * Settings → Access & roles, not the code defaults. Both directions matter:
 * a permission added to a role must open the door, and one removed must
 * close it.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { signSession } from "@/lib/auth";
import { requirePermission } from "./require-auth";
import { ForbiddenError } from "../backend/errors";

const user = (role: string) => ({ id: `u-${role}`, tenantId: "t-1", email: `${role}@x.org`, name: role, role, isActive: true, memberId: null });

async function request(role: string) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user(role) as any);
  const token = await signSession({ userId: `u-${role}`, tenantId: "t-1", email: `${role}@x.org`, role });
  return new NextRequest("http://localhost/api/anything", { headers: { cookie: `church_session=${token}` } });
}

const saved = (rows: { role: string; permissions: string[] }[]) =>
  (vi.mocked(prisma.rolePermission.findMany) as any).mockResolvedValue(rows);

beforeEach(() => saved([]));

describe("requirePermission follows the church's saved roles", () => {
  it("opens the door for a permission the church added", async () => {
    saved([{ role: "usher", permissions: ["followups.read"] }]);
    const ctx = await requirePermission(await request("usher"), "followups.read");
    expect(ctx.role).toBe("usher");
  });

  it("closes the door on a permission the church removed", async () => {
    saved([{ role: "leader", permissions: ["events.read"] }]);
    await expect(requirePermission(await request("leader"), "members.read")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("gives a member no feature access until an admin ticks it", async () => {
    // Nothing saved for Member: every feature is closed.
    await expect(requirePermission(await request("member"), "families.read")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(requirePermission(await request("member"), "attendance.checkin")).rejects.toBeInstanceOf(ForbiddenError);
    // The admin ticks one box for Member, and only that door opens.
    saved([{ role: "member", permissions: ["attendance.checkin"] }]);
    await expect(requirePermission(await request("member"), "attendance.checkin")).resolves.toBeTruthy();
    await expect(requirePermission(await request("member"), "families.read")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("uses the defaults when nothing was changed", async () => {
    await expect(requirePermission(await request("usher"), "attendance.checkin")).resolves.toBeTruthy();
    await expect(requirePermission(await request("usher"), "followups.read")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
