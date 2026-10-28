/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's information.
 * Used by the frontend to verify authentication status.
 *
 * Security:
 * - Requires valid session
 * - Returns only the authenticated user's data
 */

import { withAuth, successResponse } from "@/lib/backend";
import prisma from "@/lib/db/prisma";

export const GET = withAuth(async (_request, _context, ctx) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      tenantId: true,
      memberId: true,
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          avatarUrl: true,
          ministry: true,
          tenantId: true,
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!user) {
    // This shouldn't happen if session is valid
    return successResponse(null, 404);
  }

  // Auto-healing: If member is not linked, attempt to link by email within the tenant
  let linkedMember = user.member && user.member.tenantId === user.tenantId ? user.member : null;
  if (!linkedMember && user.email) {
    const matched = await prisma.member.findFirst({
      where: {
        tenantId: user.tenantId,
        email: user.email.trim().toLowerCase(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        avatarUrl: true,
        ministry: true,
        tenantId: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (matched) {
      linkedMember = matched;
      await prisma.user
        .update({
          where: { id: user.id },
          data: { memberId: matched.id },
        })
        .catch(() => {});
    }
  }

  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      tenant: user.tenant,
      permissions: ctx.permissions,
      memberId: linkedMember ? linkedMember.id : null,
      member: linkedMember
        ? {
            id: linkedMember.id,
            firstName: linkedMember.firstName,
            lastName: linkedMember.lastName,
            email: linkedMember.email,
            phone: linkedMember.phone,
            status: linkedMember.status,
            avatarUrl: linkedMember.avatarUrl,
            ministry: linkedMember.ministry,
            group: linkedMember.group,
          }
        : null,
    },
  });
});
