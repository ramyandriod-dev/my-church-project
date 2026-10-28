/**
 * GET /api/debug-db tests.
 *
 * This endpoint was found reachable by anyone, unauthenticated, in production
 * — it fell through both middleware guards because it appeared in neither
 * `PROTECTED_API_ROUTES` nor `PUBLIC_ROUTES`. These tests exist to stop that
 * regressing silently, because the failure mode is invisible in normal use:
 * nothing breaks, the app just quietly answers strangers with a real admin's
 * email and a stack trace.
 *
 * The two properties worth locking down are:
 *
 *   1. In production it does not exist — 404, not 403. A 403 would confirm the
 *      endpoint is present and hint that it is worth probing further.
 *   2. Even in development it still requires an authenticated admin. Dev
 *      servers get shared, port-forwarded, and pointed at from phones; "it's
 *      only dev" is not a control.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "@/lib/db/prisma";
import { signSession } from "@/lib/auth/session";

const mocked = prisma as unknown as Record<string, any>;

/**
 * A request with a real signed session cookie.
 *
 * A placeholder string would be rejected by the signature check before the
 * route's own logic runs, so the "authorised" case would pass for the wrong
 * reason. The live-row check is satisfied by the default `session.findUnique`
 * in `tests/setup.ts`.
 *
 * The handler is invoked directly rather than over `fetch`, so the test does not
 * need a running server — and so a production build can be exercised by
 * stubbing `NODE_ENV` alone.
 */
async function request(cookie?: string) {
  const headers = new Headers();
  if (cookie !== undefined) {
    headers.set(
      "cookie",
      `church_session=${
        cookie === "valid"
          ? await signSession({
              userId: "user-1",
              tenantId: "tenant-1",
              email: "admin@grace.community",
              role: "admin",
            })
          : cookie
      }`
    );
  }
  return new Request("http://localhost/api/debug-db", { headers });
}

async function call(cookie?: string) {
  const { GET } = await import("./route");
  return GET(await request(cookie), {} as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  // `resolveTenantContext` re-reads the user from the database rather than
  // trusting the token's role, and rejects when the row's tenant does not match
  // the session's. The permission decision therefore runs against real data,
  // not the signed payload.
  mocked.user.findUnique.mockResolvedValue({
    id: "user-1",
    tenantId: "tenant-1",
    email: "admin@grace.community",
    name: "Grace Admin",
    role: "admin",
    isActive: true,
  });
  mocked.user.count.mockResolvedValue(9);
  mocked.tenant.count.mockResolvedValue(2);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/debug-db — production", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
  });

  it("returns 404 for an unauthenticated caller", async () => {
    const res = await call();
    expect(res.status).toBe(404);
  });

  it("returns 404 even for a valid admin session", async () => {
    // Proves the environment gate is not merely a side effect of the auth
    // check failing. If this ever returns 200, the dev-only gate is gone.
    const res = await call("valid");
    expect(res.status).toBe(404);
  });

  it("does not disclose the diagnostic payload", async () => {
    const body = await (await call("valid")).text();
    expect(body).not.toContain("connectivity");
    expect(body).not.toContain("counts");
    expect(body).not.toMatch(/stack/i);
  });

  it("never reaches the database", async () => {
    await call("valid");
    expect(mocked.user.count).not.toHaveBeenCalled();
    expect(mocked.tenant.count).not.toHaveBeenCalled();
  });
});

describe("GET /api/debug-db — development", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  it("rejects a caller with no session", async () => {
    const res = await call();
    expect(res.status).toBe(401);
  });

  it("rejects a forged session token", async () => {
    const res = await call("not-a-real-jwt");
    expect(res.status).toBe(401);
  });

  it("returns connectivity and counts for an authenticated caller", async () => {
    const res = await call("valid");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.connectivity).toBe("ok");
    expect(body.data.counts).toEqual({ users: 9, tenants: 2 });
  });

  it("rejects a signed-in member, who lacks audit.read", async () => {
    // A valid session is not sufficient. Without this the 200 case above would
    // pass just because *any* session works, and the permission requirement
    // would be decorative.
    mocked.user.findUnique.mockResolvedValue({
      id: "user-9",
      tenantId: "tenant-1",
      email: "member@grace.community",
      name: "Mary Member",
      role: "member",
      isActive: true,
    });

    const res = await call("valid");
    expect(res.status).toBe(403);
    expect(mocked.user.count).not.toHaveBeenCalled();
  });

  it("rejects a session whose tenant does not match the user row", async () => {
    // Guards the JWT-tampering case: a token claiming another church must not
    // pass just because the signature is valid.
    mocked.user.findUnique.mockResolvedValue({
      id: "user-1",
      tenantId: "tenant-2",
      email: "admin@hope.fellowship",
      name: "Hope Admin",
      role: "admin",
      isActive: true,
    });

    const res = await call("valid");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(mocked.user.count).not.toHaveBeenCalled();
  });

  it("reports only whether the connection string is present, never its value", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:hunter2@host/db");
    const body = await (await call("valid")).json();

    expect(body.data.databaseUrl).toBe("SET");
    expect(JSON.stringify(body)).not.toContain("hunter2");
  });
});
