/**
 * Next.js Middleware
 *
 * Runs on every request to protected routes.
 * Handles:
 * - Security headers
 * - Auth token verification (basic check)
 * - Redirect unauthenticated users from protected routes
 * - Security response headers
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Protected Route Patterns ────────────────────────────────

const PROTECTED_API_ROUTES = [
  "/api/members",
  "/api/attendance",
  "/api/groups",
  "/api/ministries",
  "/api/events",
  "/api/follow-ups",
  "/api/shepherding",
  "/api/prayer-requests",
  "/api/realtime",
  "/api/reports",
  "/api/settings",
  "/api/audit",
];

const PUBLIC_ROUTES = [
  "/api/health",
  "/api/auth/login",
  // Returns a bearer token in the body rather than a cookie, so a phone can use
  // it. Listed explicitly because it is a second credential endpoint and should
  // not depend on the `/api/auth/*` prefix being absent from the protected list.
  "/api/auth/mobile/login",
  // Self-authenticating: the caller presents the token being exchanged.
  "/api/auth/refresh",
  "/api/auth/logout",
  "/login",
  "/staff-checkin-demo",
  "/checkin-scanner",
  "/usher",
  "/manifest-usher.json",
  "/login-bg.jpg",
  "/mobile",
  "/",
];

// ─── Middleware ───────────────────────────────────────────────

/**
 * Whether the request carries *any* credential, without validating it.
 *
 * This is a presence check, not an authentication check. The middleware runs on
 * the edge where the session table is not reachable, and full verification happens
 * in `getSession` behind `requireAuth`. Treating a merely-present token as
 * authenticated here is safe because this middleware's only job is to let a
 * plausible request through to a handler that will actually verify it — the 401
 * below is an early rejection, not the security boundary.
 *
 * Both transports count. A phone has no cookie jar, and checking cookies only
 * would 401 every mobile request before it reached a handler.
 */
function hasCredentials(request: NextRequest): boolean {
  const hasCookie = Boolean(request.cookies.get("church_session")?.value);
  const hasBearer = Boolean(request.headers.get("authorization"));
  const devBypass =
    process.env.NODE_ENV === "development" &&
    request.headers.get("x-dev-auth-bypass") === "enabled";
  return hasCookie || hasBearer || devBypass;
}

/**
 * The origin to echo in Access-Control-Allow-Origin, or null.
 *
 * Only the site's own origin and origins listed in CORS_ALLOWED_ORIGINS
 * (comma-separated) get credentialed cross-origin access. Any other origin
 * gets no CORS headers, so the browser blocks its reads.
 */
function allowedCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (origin === request.nextUrl.origin) return origin;
  const extra = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(origin) ? origin : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Create base response
  const response = NextResponse.next();

  // 2. Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    // camera=(self) enables the optional real-device scan path in the M5
    // check-in scanner demo; the deterministic simulated scan is the default.
    "camera=(self), microphone=(), geolocation=()"
  );

  // 3. CORS headers for API routes
  if (pathname.startsWith("/api/")) {
    const allowedOrigin = allowedCorsOrigin(request);
    if (allowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    // `Authorization` must stay listed here or the browser preflight for a Bearer
    // request fails and the mobile web build cannot call the API at all.
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    // Vary on Origin so a cache cannot serve one origin's CORS headers to another.
    response.headers.append("Vary", "Origin");
  }

  // 4. Handle preflight requests
  if (request.method === "OPTIONS") {
    const preflightHeaders = new Headers(response.headers);
    const allowedOrigin = allowedCorsOrigin(request);
    if (allowedOrigin) {
      preflightHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
    } else {
      preflightHeaders.delete("Access-Control-Allow-Origin");
      preflightHeaders.delete("Access-Control-Allow-Credentials");
    }
    return new NextResponse(null, { status: 204, headers: preflightHeaders });
  }

  // 5. Check if route is public
  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
  if (isPublic) {
    return response;
  }

  // 6. Check if API route requires auth
  const isProtectedApi = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedApi) {
    if (!hasCredentials(request)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      );
    }
  }

  // 7. Check protected dashboard routes
  const isProtectedDashboard = pathname.startsWith("/") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/api/") &&
    pathname !== "/";

  if (isProtectedDashboard) {
    if (!hasCredentials(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 8. Set request metadata for downstream use
  const requestId = crypto.randomUUID();
  response.headers.set("X-Request-ID", requestId);

  return response;
}

// ─── Middleware Configuration ─────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
