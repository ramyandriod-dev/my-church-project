/**
 * POST /api/auth/login tests.
 *
 * This endpoint used to accept **any** password for any known email, in every
 * environment. The tests below are mostly about it never doing that again, and
 * about not leaking which of the several ways a login failed.
 *
 * The properties worth stating plainly:
 *
 *   1. A wrong password never authenticates. The previous `if (false)` guard
 *      meant success was decided before the password was looked at.
 *   2. A user with no password set cannot log in. All 9 seeded accounts were in
 *      this state, so this is the case that actually runs today.
 *   3. Every failure returns the same 401 with the same message, and each one
 *      costs a key derivation. An attacker should not be able to tell a typo from
 *      a non-existent address, or a disabled church from a wrong password, by
 *      either the body or the response time.
 *   4. Failures accumulate into a durable lockout.
 *   5. The `pastor@church.com` alias no longer falls back to "some admin of some
 *      other church" — that crossed a tenant boundary and is the single most
 *      serious thing this file guards.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { throttleKeyForEmail } from "@/lib/auth/throttle";
import type { RouteHandler } from "@/lib/backend/api-response";

/**
 * A cookie jar, so `setSessionCookie` has a request scope to write to.
 *
 * Next throws "`cookies` was called outside a request scope" when these are called
 * directly rather than from inside a route handler. In the running app the handler
 * *is* the request scope, so this stands in for it here. Without it every success
 * case below is a 500 and the failure cases pass for the wrong reason.
 */
const cookieJar = {
  get: vi.fn(() => undefined),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: async () => cookieJar,
  headers: async () => new Headers({ host: "localhost" }),
}));

const mocked = prisma as unknown as Record<string, any>;

/** Stored under the mocked config cost so hashing stays fast in tests. */
let realHash: string;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();

  realHash = await hashPassword("correct-password");

  mocked.user.findFirst.mockResolvedValue(null);
  mocked.user.update.mockResolvedValue({});
  mocked.session.create.mockResolvedValue({ id: "session-1" });
  mocked.session.update.mockResolvedValue({});
  mocked.authThrottle.findUnique.mockResolvedValue(null);
  mocked.authThrottle.create.mockImplementation(async ({ data }: any) => ({ id: "t1", ...data }));
  mocked.authThrottle.update.mockImplementation(async ({ data }: any) => ({ id: "t1", ...data }));
  mocked.authThrottle.deleteMany.mockResolvedValue({ count: 1 });
});

/** A stored user row as `findFirst` returns it. */
function user(overrides: Record<string, unknown> = {}) {
  const { tenant, ...rest } = overrides;
  return {
    id: "user-1",
    tenantId: "tenant-1",
    email: "admin@grace.community",
    name: "Grace Admin",
    role: "admin",
    passwordHash: realHash,
    ...rest,
    // Read after the spread so a caller can override the organisation. Having it
    // before meant `tenant` in `overrides` was silently discarded and the
    // inactive-organisation case tested nothing.
    tenant: tenant ?? { id: "tenant-1", slug: "grace", isActive: true },
  };
}

function post(body: unknown): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Import the route fresh so it picks up the current mock state. */
async function loginRoute() {
  return (await import("./route")).POST;
}

/**
 * Invoke the handler the way Next would.
 *
 * `withErrorHandling` returns a `RouteHandler`, which is typed as taking a
 * request *and* a context object. Login has no dynamic segments so the context is
 * always empty, but the type still requires it.
 */
async function call(POST: RouteHandler, body: unknown) {
  return POST(post(body), {} as never);
}

describe("POST /api/auth/login", () => {
  describe("successful authentication", () => {
    it("authenticates with the correct password", async () => {
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      const res = await call(POST, { email: "admin@grace.community", password: "correct-password" });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("admin@grace.community");
    });

    it("never returns the password hash", async () => {
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      const res = await call(POST, { email: "admin@grace.community", password: "correct-password" });
      const text = JSON.stringify(await res.json());

      expect(text).not.toContain(realHash);
      expect(text).not.toContain("passwordHash");
      expect(text).not.toContain("correct-password");
    });

    it("creates a session row", async () => {
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      await call(POST, { email: "admin@grace.community", password: "correct-password" });

      // The row is what makes revocation possible, so its absence would silently
      // turn logout back into a no-op.
      expect(mocked.session.create).toHaveBeenCalledOnce();
    });

    it("clears the throttle record on success", async () => {
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      await call(POST, { email: "admin@grace.community", password: "correct-password" });

      expect(mocked.authThrottle.deleteMany).toHaveBeenCalledWith({
        where: { key: await throttleKeyForEmail("admin@grace.community") },
      });
    });

    it("records the login timestamp", async () => {
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      await call(POST, { email: "admin@grace.community", password: "correct-password" });

      expect(mocked.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lastLoginAt: expect.any(Date) }) })
      );
    });

    it("accepts the email case-insensitively", async () => {
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      const res = await call(POST, { email: "Admin@Grace.Community", password: "correct-password" });

      expect(res.status).toBe(200);
      expect(mocked.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ email: "admin@grace.community" }) })
      );
    });
  });

  describe("rejected credentials", () => {
    it("refuses the wrong password", async () => {
      // The regression that matters most. This used to return 200.
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      const res = await call(POST, { email: "admin@grace.community", password: "not-the-password" });

      expect(res.status).toBe(401);
      expect(mocked.session.create).not.toHaveBeenCalled();
    });

    it("refuses a user whose password has never been set", async () => {
      // This is the state all 9 seeded accounts were in, so it is the path that
      // runs in the current database. Enabling verification before seeding hashes
      // would have locked every user out.
      mocked.user.findFirst.mockResolvedValue(user({ passwordHash: null }));
      const POST = await loginRoute();

      const res = await call(POST, { email: "admin@grace.community", password: "anything" });

      expect(res.status).toBe(401);
      expect(mocked.session.create).not.toHaveBeenCalled();
    });

    it("refuses an unknown email", async () => {
      mocked.user.findFirst.mockResolvedValue(null);
      const POST = await loginRoute();

      const res = await call(POST, { email: "nobody@example.com", password: "correct-password" });

      expect(res.status).toBe(401);
      expect(mocked.session.create).not.toHaveBeenCalled();
    });

    it("refuses when the organisation is inactive", async () => {
      mocked.user.findFirst.mockResolvedValue(
        user({ tenant: { id: "tenant-1", slug: "grace", isActive: false } })
      );
      const POST = await loginRoute();

      const res = await call(POST, { email: "admin@grace.community", password: "correct-password" });

      expect(res.status).toBe(401);
      expect(mocked.session.create).not.toHaveBeenCalled();
    });

    it("refuses a missing email or password", async () => {
      const POST = await loginRoute();

      expect((await call(POST, { password: "x" })).status).toBe(401);
      expect((await call(POST, { email: "admin@grace.community" })).status).toBe(401);
      expect(mocked.session.create).not.toHaveBeenCalled();
    });

    it("still rejects when a correct password is checked against a tampered hash", async () => {
      // Guards against "the comparison is not actually run".
      mocked.user.findFirst.mockResolvedValue(
        user({ passwordHash: `pbkdf2-sha256$1000$${"0".repeat(32)}${"0".repeat(64)}` })
      );
      const POST = await loginRoute();

      const res = await call(POST, { email: "admin@grace.community", password: "correct-password" });
      expect(res.status).toBe(401);
    });
  });

  describe("no user enumeration", () => {
    it("returns an identical body for every failure mode", async () => {
      const POST = await loginRoute();

      const wrongPassword = await (
        await (async () => {
          mocked.user.findFirst.mockResolvedValue(user());
          return call(POST, { email: "admin@grace.community", password: "wrong" });
        })()
      ).json();

      const unknownUser = await (
        await (async () => {
          mocked.user.findFirst.mockResolvedValue(null);
          return call(POST, { email: "nobody@example.com", password: "wrong" });
        })()
      ).json();

      const noPassword = await (
        await (async () => {
          mocked.user.findFirst.mockResolvedValue(user({ passwordHash: null }));
          return call(POST, { email: "admin@grace.community", password: "wrong" });
        })()
      ).json();

      const inactiveOrg = await (
        await (async () => {
          mocked.user.findFirst.mockResolvedValue(
            user({ tenant: { id: "t", slug: "grace", isActive: false } })
          );
          return call(POST, { email: "admin@grace.community", password: "wrong" });
        })()
      ).json();

      expect(wrongPassword).toEqual(unknownUser);
      expect(wrongPassword).toEqual(noPassword);
      expect(wrongPassword).toEqual(inactiveOrg);
    });

    it("records a failure for an unknown email, so probing cannot go untracked", async () => {
      mocked.user.findFirst.mockResolvedValue(null);
      const POST = await loginRoute();

      await call(POST, { email: "nobody@example.com", password: "guess" });

      expect(mocked.authThrottle.create).toHaveBeenCalledOnce();
    });
  });

  describe("throttling", () => {
    it("refuses a locked account without looking the user up", async () => {
      // Not looking the user up is deliberate: a locked account should not double
      // as a way to test which addresses exist.
      mocked.authThrottle.findUnique.mockResolvedValue({
        failures: 5,
        lockedUntil: new Date(Date.now() + 60_000),
      });
      const POST = await loginRoute();

      const res = await call(POST, { email: "admin@grace.community", password: "correct-password" });

      expect(res.status).toBe(401);
      expect(mocked.user.findFirst).not.toHaveBeenCalled();
    });

    it("refuses a locked account even with the right password", async () => {
      mocked.authThrottle.findUnique.mockResolvedValue({
        failures: 5,
        lockedUntil: new Date(Date.now() + 60_000),
      });
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      const res = await call(POST, { email: "admin@grace.community", password: "correct-password" });
      expect(res.status).toBe(401);
    });

    it("allows an account whose lock has expired", async () => {
      mocked.authThrottle.findUnique.mockResolvedValue({
        failures: 5,
        lockedUntil: new Date(Date.now() - 1000),
      });
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      const res = await call(POST, { email: "admin@grace.community", password: "correct-password" });
      expect(res.status).toBe(200);
    });
  });

  describe("email aliases", () => {
    it("resolves pastor@church.com to the seeded admin and still needs the password", async () => {
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      const res = await call(POST, { email: "pastor@church.com", password: "correct-password" });

      expect(res.status).toBe(200);
      expect(mocked.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ email: "admin@grace.community" }) })
      );
    });

    it("does not fall back to some other admin when the alias resolves to nothing", async () => {
      // The previous version, on finding no match for the alias, queried for the
      // first active admin in the database. `pastor@church.com` could therefore
      // authenticate as an administrator of a different church, and the only
      // password ever required was any password.
      mocked.user.findFirst.mockResolvedValue(null);
      const POST = await loginRoute();

      const res = await call(POST, { email: "pastor@church.com", password: "anything" });

      expect(res.status).toBe(401);
      expect(mocked.session.create).not.toHaveBeenCalled();
      // Exactly one lookup: the alias target. No second, broader query.
      expect(mocked.user.findFirst).toHaveBeenCalledOnce();
    });
  });

  describe("private demo password", () => {
    const original = process.env.DEMO_ACCESS_PASSWORD;
    afterEach(() => {
      if (original === undefined) delete process.env.DEMO_ACCESS_PASSWORD;
      else process.env.DEMO_ACCESS_PASSWORD = original;
    });

    it("lets a demo account in with the owner's password only", async () => {
      process.env.DEMO_ACCESS_PASSWORD = "owner-only-password";
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      const ok = await call(POST, { email: "admin@grace.community", password: "owner-only-password" });
      expect(ok.status).toBe(200);
    });

    it("refuses the stored password and both old public passwords for a demo account", async () => {
      process.env.DEMO_ACCESS_PASSWORD = "owner-only-password";
      mocked.user.findFirst.mockResolvedValue(user());
      const POST = await loginRoute();

      for (const password of ["correct-password", "password", "ChurchDemo!2026"]) {
        const res = await call(POST, { email: "admin@grace.community", password });
        expect(res.status, password).toBe(401);
      }
      expect(mocked.session.create).not.toHaveBeenCalled();
    });

    it("does not touch ordinary accounts", async () => {
      process.env.DEMO_ACCESS_PASSWORD = "owner-only-password";
      mocked.user.findFirst.mockResolvedValue(user({ email: "real.pastor@church.org" }));
      const POST = await loginRoute();

      expect((await call(POST, { email: "real.pastor@church.org", password: "correct-password" })).status).toBe(200);
      expect((await call(POST, { email: "real.pastor@church.org", password: "owner-only-password" })).status).toBe(401);
    });
  });

  describe("hash round-trip", () => {
    it("verifies a hash produced by the module under test", async () => {
      // Guards the test fixture itself: if `realHash` ever stopped matching
      // "correct-password", every success case above would be passing for the
      // wrong reason and the failure cases would be vacuous.
      expect(await verifyPassword(realHash, "correct-password")).toBe(true);
      expect(await verifyPassword(realHash, "wrong")).toBe(false);
    });
  });
});
