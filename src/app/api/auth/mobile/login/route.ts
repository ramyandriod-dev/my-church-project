/**
 * POST /api/auth/mobile/login
 *
 * Authenticates a user and returns tokens **in the response body** instead of
 * setting a cookie.
 *
 * Why a separate endpoint rather than a flag on `/api/auth/login`:
 *
 * The web login deliberately does not return its token in the body, because the
 * session is then only reachable through an `httpOnly` cookie and an XSS on the
 * site cannot read it. Returning the token from the same endpoint would throw that
 * away for the browser. Keeping them separate means the web keeps `httpOnly` and
 * the phone gets a transport it can actually use.
 *
 * ## Token shape
 *
 * A single bearer token, not an access/refresh pair.
 *
 * A short-lived access token plus a rotating refresh token is the textbook design
 * and it is what `config.mobileAccessTokenExpiry` / `mobileRefreshTokenExpiry` are
 * for. It is deliberately not built here: the actual rotation machinery needs a
 * second token column on `sessions` and a client-side retry contract, and shipping
 * a half-built version of it would be worse than shipping the simpler thing
 * honestly. Mobile sessions are short-lived and revocable, so the exposure this
 * defers is bounded; see `/api/auth/refresh` for the current behaviour.
 *
 * ## What is shared with the web login
 *
 * Real password verification, the same throttling, the same generic error, and
 * the same decoy key-derivation on the failure path. The credentials path is
 * identical — the only difference between the two endpoints is how the resulting
 * token is delivered.
 */

import { NextResponse } from "next/server";
import { withErrorHandling, successResponse } from "@/lib/backend";
import { UnauthorizedError } from "@/lib/backend/errors";
import prisma from "@/lib/db/prisma";
import { config } from "@/lib/backend/config";
import { isDemoLoginEnabled } from "@/lib/auth/demo-login";
import { isPrivateDemoAccount, matchesDemoAccessPassword } from "@/lib/auth/demo-access";
import { issueSession } from "@/lib/auth/session";
import { verifyPassword, equalizeTiming, needsRehash } from "@/lib/auth/password";
import { getLockoutState, recordFailedAttempt, clearFailures } from "@/lib/auth/throttle";

interface MobileLoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

// Pilot demo only. Used when config.demoLoginEnabled is true.
const EMAIL_ALIASES: Record<string, string> = {
  "pastor@church.com": "admin@grace.community",
  "admin@church.com": "admin@grace.community",
};

export const POST = withErrorHandling(async (request: Request) => {
  const body: MobileLoginRequest = await request.json();

  if (!body.email || !body.password) {
    throw new UnauthorizedError("Email and password are required");
  }

  const cleanEmail = body.email.trim().toLowerCase();
  const lookupEmail = isDemoLoginEnabled()
    ? (EMAIL_ALIASES[cleanEmail] ?? cleanEmail)
    : cleanEmail;

  // 1. Lockout check before the user lookup, so a locked account cannot be used to
  //    discover which addresses exist.
  const lock = await getLockoutState(lookupEmail);
  if (lock.locked) {
    await equalizeTiming(body.password);
    throw new UnauthorizedError("Invalid email or password");
  }

  // 2. Find user
  // When tenantSlug is given, the lookup is limited to that church.
  const user = await prisma.user.findFirst({
    where: {
      email: lookupEmail,
      isActive: true,
      ...(body.tenantSlug ? { tenant: { slug: body.tenantSlug } } : {}),
    },
    include: {
      tenant: { select: { slug: true, isActive: true } },
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
    },
  });

  // 3. Refuse, at constant cost, for every non-success case.
  if (!user || user.tenant.isActive === false || !user.passwordHash) {
    await equalizeTiming(body.password);
    await recordFailedAttempt(lookupEmail);
    throw new UnauthorizedError("Invalid email or password");
  }

  // Demo accounts accept only the owner's private password when one is set
  // (DEMO_ACCESS_PASSWORD); their stored and old public passwords are ignored.
  const privateDemo = isPrivateDemoAccount(lookupEmail);
  let passwordOk = privateDemo
    ? await matchesDemoAccessPassword(body.password)
    : await verifyPassword(user.passwordHash, body.password);
  if (!privateDemo && !passwordOk && isDemoLoginEnabled() && (body.password === "password" || body.password === "ChurchDemo!2026")) {
    const fallbackPassword = body.password === "password" ? "ChurchDemo!2026" : "password";
    passwordOk = await verifyPassword(user.passwordHash, fallbackPassword);
  }
  if (!passwordOk) {
    await recordFailedAttempt(lookupEmail);
    throw new UnauthorizedError("Invalid email or password");
  }

  await clearFailures(lookupEmail);

  // 4. Upgrade a hash made under a weaker work factor, now that we hold the
  //    plaintext. This is the only moment it is available, and it is what lets the
  //    iteration count be raised later without a reset.
  if (needsRehash(user.passwordHash)) {
    const { hashPassword } = await import("@/lib/auth/password");
    const upgraded = await hashPassword(body.password);
    await prisma.user
      .update({ where: { id: user.id }, data: { passwordHash: upgraded } })
      .catch(() => {
        // Not fatal: the user is already authenticated with a valid hash. The next
        // login will simply upgrade it again.
      });
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

  // 5. Issue a mobile-kind session and hand the token back in the body.
  const { token, expiresAt } = await issueSession(
    { id: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
    { kind: "mobile", expiresInSeconds: config.mobileAccessTokenExpiry }
  );

  await prisma.user
    .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    .catch(() => {
      // A missing "last seen" timestamp must not fail a successful login.
    });

  return successResponse({
    // Named `accessToken` so that when refresh rotation lands, a `refreshToken`
    // can be added here without renaming this field and breaking shipped clients.
    accessToken: token,
    tokenType: "Bearer",
    expiresIn: config.mobileAccessTokenExpiry,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.slug,
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
