/**
 * Members have no feature access by default; an admin ticks what they may do in
 * Settings → Access and roles. Route tests that act as a member use this to say
 * "the admin has ticked these boxes for Member", the same way production stores
 * it (a saved row in role_permissions).
 */

import { vi } from "vitest";
import prisma from "@/lib/db/prisma";

export function grantMemberPermissions(permissions: string[]): void {
  (prisma.rolePermission.findMany as unknown as ReturnType<typeof vi.fn>).mockImplementation(async () => [
    { role: "member", permissions },
  ]);
}
