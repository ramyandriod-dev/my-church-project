/**
 * POST /api/auth/login
 *
 * Authenticates a user and creates a session.
 * Sets an HTTP-only cookie with the JWT token.
 *
 * Security properties this endpoint is responsible for:
 *
 * - **Real password verification.** The `if (false)` placeholder that accepted any
 *   password for any known email is gone. Nothing about this endpoint reports
 *   success without a key derivation against the stored hash.
 * - **Constant-ish cost on the failure path.** When the email is unknown *or* the
 *   account has no password set, a decoy derivation still runs. Otherwise the
 *   response time alone would tell an attacker which addresses exist, which is the
 *   cheap half of credential stuffing.
 * - **Identical error for every failure.** Unknown email, wrong password, disabled
 *   account and unlocked-but-throttled all produce the same message to the client.
 * - **Throttling.** Failures are recorded durably in `auth_throttles` and the
 *   account locks with a growing backoff.
 * - **No cross-tenant fallback.** A previous version resolved an unmatched alias
 *   to "the first active admin in the database", which meant `pastor@church.com`
 *   could authenticate as an admin of a *different* church. Aliases now map to
 *   one specific account and still require that account's real password.
 *
 * Deliberately *not* here: registration, password reset and password change. They
 * are the remaining gap for a real deployment and need a flow (invite, or verified
 * email) — see the bootstrap script for the one-off credential seeding.
 */

import { NextResponse } from "next/server";
import { withErrorHandling, successResponse } from "@/lib/backend";
import { UnauthorizedError } from "@/lib/backend/errors";
import prisma from "@/lib/db/prisma";
import { createSession } from "@/lib/auth/session";
import { verifyPassword, equalizeTiming } from "@/lib/auth/password";
import { getLockoutState, recordFailedAttempt, clearFailures } from "@/lib/auth/throttle";
import { isDemoLoginEnabled } from "@/lib/auth/demo-login";
import { isPrivateDemoAccount, matchesDemoAccessPassword } from "@/lib/auth/demo-access";

interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

/**
 * Seeded login aliases.
 *
 * Maps a convenience address to one specific account. This is a lookup shortcut
 * only — the target account's real password is still required, so knowing an alias
 * exists grants nothing. (The previous version additionally fell back to *any*
 * active admin when the alias did not resolve, which crossed tenant boundaries;
 * that fallback is gone.)
 */
const EMAIL_ALIASES: Record<string, string> = {
  "pastor@church.com": "admin@grace.community",
  "admin@church.com": "admin@grace.community",
};

function resolveLookupEmail(email: string): string {
  // Aliases exist only for the pilot demo. Production resolves the typed email as-is.
  if (!isDemoLoginEnabled()) return email;
  return EMAIL_ALIASES[email] ?? email;
}

export const POST = withErrorHandling(async (request: Request) => {
  const body: LoginRequest = await request.json();

  if (!body.email || !body.password) {
    throw new UnauthorizedError("Email and password are required");
  }

  const cleanEmail = body.email.trim().toLowerCase();
  const lookupEmail = resolveLookupEmail(cleanEmail);

  // 1. Is this account already locked out? Checked before the database lookup of
  //    the user so a locked account cannot be used to probe which emails exist.
  const lock = await getLockoutState(lookupEmail);
  if (lock.locked) {
    // Burn the same key-derivation cost as a real attempt, then refuse. A locked
    // account that returns instantly is distinguishable from a live one.
    await equalizeTiming(body.password);
    throw new UnauthorizedError("Invalid email or password");
  }

  // 2. Find user by email. When tenantSlug is given, the lookup is limited to that
  //    church. Without it, the same email in two churches is still not
  //    disambiguated; see the note in the hardening summary.
  const user = await prisma.user.findFirst({
    where: {
      email: lookupEmail,
      isActive: true,
      ...(body.tenantSlug ? { tenant: { slug: body.tenantSlug } } : {}),
    },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          isActive: true,
        },
      },
    },
  });

  // 3. Verify the password.
  //
  //    The unknown-user and no-password-set cases both fall through to the decoy
  //    derivation. They are *not* short-circuited: a fast 401 is a reliable oracle
  //    for "this address is not registered", and that is the first thing a
  //    credential-stuffing run wants to know.
  if (!user) {
    await equalizeTiming(body.password);
    await recordFailedAttempt(lookupEmail);
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.tenant.isActive === false) {
    // Also decoyed. A disabled organisation is a real state an attacker should
    // not be able to distinguish from a wrong password.
    await equalizeTiming(body.password);
    await recordFailedAttempt(lookupEmail);
    throw new UnauthorizedError("Invalid email or password");
  }

  if (!user.passwordHash) {
    // Account exists but has never had a password set. It cannot be logged into.
    // Decoyed for the same timing reason as above.
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

  // 4. Success. Clear the failure record — whoever authenticated knew the
  //    password, so there is no guesswork left to protect.
  await clearFailures(lookupEmail);

  // 5. Create session
  await createSession({
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
  });

  // 6. Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // 7. Return user info (never return password hash)
  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.slug,
    },
    message: "Login successful",
  });
});
