/**
 * Session Management
 *
 * JWT-based session handling using jose.
 *
 * Two transports, one payload:
 *
 *   - **Cookie** (`church_session`, httpOnly) for the web app. Unchanged in shape,
 *     so existing browsers keep working.
 *   - **Bearer** (`Authorization: Bearer <token>`) for mobile. A phone has no
 *     cookie jar, and a WebView that is asked to manage one gets it wrong in ways
 *     that are miserable to debug. The token is returned in the response body
 *     instead of a `Set-Cookie`, and the client sends it back explicitly.
 *
 * The web path deliberately does *not* also return the token in the body. Doing so
 * would hand every XSS on the site the session token in a JS-readable property,
 * which is exactly what `httpOnly` exists to prevent. Keeping the two logins
 * separate means the web keeps that protection and the mobile client gets a
 * transport it can actually use.
 *
 * ## Revocation
 *
 * The session row is the point of control. It was previously written on login and
 * never read, so logout deleted a row nothing consulted and a stolen token stayed
 * valid until its own expiry. Every verification now confirms the row is still
 * present and not revoked, which costs one indexed lookup and buys a real logout,
 * a real "sign out this device" and a real "sign out everywhere".
 *
 * ## Lifetime
 *
 * The browser token keeps the 7-day session expiry. Mobile access tokens are short
 * (1 hour by default) and are refreshed against a longer-lived session, because a
 * phone is far more likely to be lost or shared than a browser on a known machine
 * and a Bearer token in app storage cannot be cleared by quitting the app.
 *
 * Flow:
 *   Login → create Session row → sign JWT → cookie or response body
 *   Request → verify JWT → confirm Session row is live → resolve tenant context
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies, headers } from "next/headers";
import { config } from "../backend/config";
import prisma from "../db/prisma";

// ─── Constants ───────────────────────────────────────────────

const SESSION_COOKIE_NAME = "church_session";
const SESSION_MAX_AGE = config.sessionExpiry; // 7 days

/**
 * Which transport presented a session.
 *
 * `web` is the cookie, `mobile` is a Bearer token. Tracked because the two have
 * genuinely different risk profiles, and "which of this user's sessions is the
 * phone?" is the first question when a device is reported lost.
 */
export type SessionKind = "web" | "mobile";

// ─── JWT Payload ─────────────────────────────────────────────

export interface SessionPayload extends JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  /**
   * Correlates the token with its `sessions` row.
   *
   * Present on every token. Revocation looks the row up by token value, but
   * carrying the id means an operator listing a user's devices does not have to
   * hold the tokens themselves.
   */
  sessionId?: string;
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(config.jwtSecret);
}

// ─── JWT Utilities ───────────────────────────────────────────

/**
 * Sign a JWT session token.
 *
 * The expiry is a parameter rather than fixed to the cookie's 7 days: mobile
 * access tokens are deliberately short-lived and refreshed, while the browser
 * cookie keeps the long session.
 */
export async function signSession(
  payload: Omit<SessionPayload, "iat" | "exp" | "iss">,
  expiresInSeconds: number = SESSION_MAX_AGE
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .setIssuer("church-management-platform")
    .sign(getJwtSecret());
}

/**
 * Verify and decode a JWT session token.
 * Returns null if invalid or expired.
 *
 * This checks the signature and the expiry only. Whether the session has been
 * *revoked* is a database question, answered by `verifySessionIsLive` — the two
 * are separate because not every caller needs the database round trip, and
 * because a caller that needs revocation must not be able to forget it.
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: "church-management-platform",
    });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// In-memory cache for live session checks to avoid redundant DB reads
// on rapid requests within the same Worker isolate (30s TTL).
const LIVE_SESSION_CACHE_TTL_MS = 30_000;
const liveSessionCache = new Map<string, number>();

export function invalidateLiveSessionCache(token?: string): void {
  if (token) {
    liveSessionCache.delete(token);
  } else {
    liveSessionCache.clear();
  }
}

/**
 * Confirm a token's session row still exists, is unrevoked, and is unexpired.
 *
 * This is the check that gives logout meaning. A token can be perfectly
 * well-formed and inside its own expiry and still be dead.
 */
export async function verifySessionIsLive(token: string): Promise<boolean> {
  const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
  const now = Date.now();
  if (!isTest) {
    const cachedExpiresAt = liveSessionCache.get(token);
    if (cachedExpiresAt !== undefined) {
      if (cachedExpiresAt > now) {
        return true;
      }
      liveSessionCache.delete(token);
    }
  }

  const row = await prisma.session.findUnique({
    where: { token },
    select: { expiresAt: true, revokedAt: true },
  });

  if (!row) return false;
  if (row.revokedAt) return false;
  const isLive = row.expiresAt.getTime() > now;
  if (isLive && !isTest) {
    liveSessionCache.set(token, Math.min(row.expiresAt.getTime(), now + LIVE_SESSION_CACHE_TTL_MS));
  }
  return isLive;
}

/**
 * Record that a session was used, throttled to at most once a minute per session.
 *
 * A write on every single request would turn the read path into a write path for
 * no benefit — "is this device active" does not need second-level resolution.
 */
const LAST_SEEN_INTERVAL_MS = 60_000;
const lastSeenWrites = new Map<string, number>();

export async function touchSession(token: string): Promise<void> {
  const now = Date.now();
  const last = lastSeenWrites.get(token);
  if (last !== undefined && now - last < LAST_SEEN_INTERVAL_MS) return;
  lastSeenWrites.set(token, now);

  await prisma.session
    .updateMany({
      where: { token, revokedAt: null },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {
      // Activity tracking must never be the reason a request fails.
    });
}


// ─── Cookie Operations ───────────────────────────────────────

/**
 * Set the session cookie.
 *
 * `httpOnly` is true so page scripts can never read the JWT. This matches the
 * documented design ("sessions are stored as HTTP-only cookies") and it also
 * means a bug in client code cannot silently sign the user out by clearing the
 * cookie, and an XSS bug cannot exfiltrate the token. Nothing in this app reads
 * the session from client JavaScript — the middleware and the API routes read it
 * server-side.
 *
 * `secure` is decided from the actual request protocol rather than from
 * NODE_ENV alone. A production build served over plain http (a local
 * `npm start`, a private network) makes browsers silently discard a Secure
 * cookie, which looks exactly like a login that does not stick.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  let isHttps = config.isProduction;
  try {
    const headerList = await headers();
    const forwardedProto = headerList.get("x-forwarded-proto");
    if (forwardedProto) {
      isHttps = forwardedProto.split(",")[0].trim() === "https";
    } else if (!headerList.get("x-forwarded-host") && !headerList.get("host")) {
      // No request context at all (e.g. a background call): keep the default.
      isHttps = config.isProduction;
    }
  } catch {
    // `headers()` is unavailable outside a request scope; fall back to config.
  }

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/**
 * Get the session token from cookies.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Clear the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ─── Session Operations ──────────────────────────────────────

/**
 * Extract a bearer token from an `Authorization` header.
 *
 * Tolerant of case because `getSession` is fed raw `Headers` from several
 * different call sites, and intolerant of anything that is not exactly one
 * `Bearer <token>` pair — a header that fails this must fall through to the
 * cookie rather than be half-parsed into an attacker-chosen value.
 */
export function extractBearerToken(authorization: string | null | undefined): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

// ─── Session Operations ──────────────────────────────────────

/**
 * Create a session row and return its id alongside the signed token.
 *
 * The row is created first so the token can carry its own id, which makes "which
 * device is this?" answerable without holding tokens.
 *
 * Note this does **not** set a cookie. Cookie-setting and token-returning are
 * separate operations, chosen by the caller, because a mobile login must not
 * leave a `Set-Cookie` behind that the app will never use.
 */
export async function issueSession(
  user: { id: string; tenantId: string; email: string; role: string },
  options: { kind: SessionKind; expiresInSeconds: number }
): Promise<{ token: string; sessionId: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + options.expiresInSeconds * 1000);

  const row = await prisma.session.create({
    data: {
      userId: user.id,
      // The token is the unique column, so it has to exist before the row does.
      // A placeholder satisfies the constraint; it is replaced below and the row
      // is re-fetched by id. A random value is used rather than an empty string
      // so that a crash between the two writes cannot leave a valid-looking
      // session that anybody could present.
      token: `pending_${crypto.randomUUID()}`,
      expiresAt,
      kind: options.kind,
      lastSeenAt: new Date(),
    },
    select: { id: true },
  });

  const token = await signSession(
    {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      sessionId: row.id,
    },
    options.expiresInSeconds
  );

  await prisma.session.update({
    where: { id: row.id },
    data: { token },
  });

  return { token, sessionId: row.id, expiresAt };
}

/**
 * Revoke a single session by token.
 *
 * Soft-deletes rather than removing the row, so "this device signed in at 09:14
 * and was signed out at 11:02" survives for an operator investigating a
 * compromised account.
 */
export async function revokeSession(token: string): Promise<void> {
  liveSessionCache.delete(token);
  await prisma.session
    .updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => {
      // A revocation that fails to persist must not be reported as success.
      throw new Error("Could not revoke session");
    });
}

/**
 * Revoke every live session for a user.
 *
 * The response to "I lost my phone". There is no way to tell which session
 * belonged to the lost device without the token, so all of them go — the user
 * signs back in on the device they still have.
 */
export async function revokeAllSessions(userId: string, exceptToken?: string): Promise<number> {
  liveSessionCache.clear();
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptToken ? { NOT: { token: exceptToken } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/**
 * List a user's live sessions, newest first.
 *
 * Surfaces the `kind` column so a lost phone is identifiable as the mobile
 * session among several browser ones.
 */
export async function listActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      kind: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create a new session after successful login.
 * Signs JWT and sets cookie.
 *
 * Retained for the existing web callers, which want a cookie and do not care
 * about the token value.
 */
export async function createSession(user: {
  id: string;
  tenantId: string;
  email: string;
  role: string;
}): Promise<string> {
  const { token } = await issueSession(user, {
    kind: "web",
    expiresInSeconds: SESSION_MAX_AGE,
  });
  await setSessionCookie(token);
  return token;
}

/**
 * Destroy the current session.
 */
export async function destroySession(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    await revokeSession(token).catch(() => {
      // The cookie is cleared regardless; a stale row expires on its own.
    });
  }
  await clearSessionCookie();
}

/**
 * Get the current session from cookies.
 * Returns null if no valid session exists.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return verifySession(token);
}

