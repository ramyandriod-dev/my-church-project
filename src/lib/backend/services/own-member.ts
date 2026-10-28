/**
 * Own-member resolution
 *
 * Resolves the `Member` row behind the caller's login, honouring the tenant
 * boundary. Shared by every self-service surface (talent profile, ideas,
 * messages) so the boundary check exists in exactly one place.
 *
 * ─── Why this is shared and not copied ──────────────────────
 *
 * The `User.memberId` link is a simple single-column foreign key, and the
 * schema carries an explicit warning that it can therefore hold a cross-tenant
 * pair. Every self-service read and write must re-check the tenant. That makes
 * this function a security control, and a security control that has been
 * copy-pasted into three services is one that will eventually be fixed in two of
 * them. One implementation, one place to audit.
 */

import { prisma } from "../../db/prisma";
import { NotFoundError } from "../errors";
import type { TenantContext } from "../types";

export async function resolveOwnMember(ctx: TenantContext): Promise<{ id: string }> {
  const user = await prisma.user.findFirst({
    where: { id: ctx.userId, tenantId: ctx.tenantId },
    select: { memberId: true },
  });

  if (!user?.memberId) {
    throw new NotFoundError(
      "No member record is linked to this login. Ask an administrator to link your account.",
    );
  }

  // The User->Member link is a simple FK and can hold a cross-tenant pair, so
  // the tenant is re-checked here rather than assumed. See the note on the
  // relation in schema.prisma.
  const member = await prisma.member.findFirst({
    where: { id: user.memberId, tenantId: ctx.tenantId },
    select: { id: true },
  });

  if (!member) {
    throw new NotFoundError("The linked member record is not in this church.");
  }

  return member;
}

/**
 * Whether the caller has a linked member row, without throwing.
 *
 * Used by surfaces that must degrade rather than fail — the messages page, for
 * instance, shows staff a different view, and a staff login with no `Member` row
 * is a normal state rather than an error.
 */
export async function hasOwnMember(ctx: TenantContext): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: ctx.userId, tenantId: ctx.tenantId },
    select: { memberId: true },
  });
  if (!user?.memberId) return false;
  const member = await prisma.member.findFirst({
    where: { id: user.memberId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  return Boolean(member);
}
