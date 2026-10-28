/**
 * POST /api/auth/change-password tests.
 *
 * The properties that matter here are the two that justify this endpoint existing
 * separately from a generic profile update:
 *
 *   1. **The current password is required.** Otherwise a stolen session could
 *      change the password and lock the real owner out permanently — taking the
 *      account over rather than merely misusing it.
 *   2. **Other sessions are revoked.** Changing a password is what someone does
 *      when they think something is wrong; leaving other devices signed in would
 *      ignore the reason they did it.
 *
 * Plus the ordering guarantee: the caller must not be logged out of the tab they
 * are standing in.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/session";

const cookieJar = { get: vi.fn(() => undefined), set: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: async () => cookieJar,
  headers: async () => new Headers({ host: "localhost" }),
}));

const mocked = prisma as unknown as Record<string, any>;

let realHash: string;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  realHash = await hashPassword("current-password-1");

  mocked.user.findUnique.mockResolvedValue({
    id: "user-1",
    email: "admin@grace.community",
    passwordHash: realHash,
    isActive: true,
  });
  mocked.user.update.mockResolvedValue({});
  mocked.session.updateMany.mockResolvedValue({ count: 2 });
  mocked.authThrottle.deleteMany.mockResolvedValue({ count: 1 });
});

/**
 * A request carrying a real signed session cookie.
 *
 * A placeholder string would be rejected by the signature check before the route's
 * own logic runs, so the failure cases would pass for the wrong reason. The session
 * row check is satisfied by the default `session.findUnique` in `tests/setup.ts`.
 */
async function post(body: unknown, cookie?: string) {
  const token =
    cookie !== undefined
      ? cookie
      : `church_session=${await signSession({
          userId: "user-1",
          tenantId: "tenant-1",
          email: "admin@grace.community",
          role: "admin",
        })}`;
  return new Request("http://localhost/api/auth/change-password", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: token },
    body: JSON.stringify(body),
  });
}

async function route() {
  return (await import("./route")).POST;
}

async function call(body: unknown, req?: Request) {
  const POST = await route();
  return POST(req ?? (await post(body)), {} as never);
}

describe("POST /api/auth/change-password", () => {
  it("changes the password when the current one is correct", async () => {
    const res = await call({
      currentPassword: "current-password-1",
      newPassword: "a-brand-new-password",
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocked.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { passwordHash: expect.stringContaining("pbkdf2-sha256$") },
      })
    );
  });

  it("never returns the new hash to the client", async () => {
    const res = await call({
      currentPassword: "current-password-1",
      newPassword: "a-brand-new-password",
    });
    const text = JSON.stringify(await res.json());

    expect(text).not.toContain(realHash);
    expect(text).not.toContain("a-brand-new-password");
    expect(text).not.toContain("passwordHash");
  });

  describe("re-authentication", () => {
    it("refuses when the current password is wrong", async () => {
      // The takeover case: a stolen session must not be enough to change the
      // password and lock the owner out.
      const res = await call({
        currentPassword: "not-the-current-password",
        newPassword: "a-brand-new-password",
      });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.message).toMatch(/current password is incorrect/i);
      expect(mocked.user.update).not.toHaveBeenCalled();
    });

    it("does not revoke sessions when re-authentication fails", async () => {
      // Otherwise a wrong current password would sign the attacker out too,
      // destroying the evidence and warning them something is wrong.
      //
      // Note this checks for a *revocation*, not for no write at all: resolving
      // the session records last-seen activity, which is also an updateMany.
      await call({ currentPassword: "wrong", newPassword: "a-brand-new-password" });

      const revocations = mocked.session.updateMany.mock.calls.filter(
        ([arg]: [any]) => arg?.data?.revokedAt instanceof Date
      );
      expect(revocations).toHaveLength(0);
    });

    it("refuses when the account has no password set", async () => {
      mocked.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "admin@grace.community",
        passwordHash: null,
        isActive: true,
      });

      const res = await call({
        currentPassword: "anything",
        newPassword: "a-brand-new-password",
      });

      expect(res.status).toBe(409);
      expect(mocked.user.update).not.toHaveBeenCalled();
    });

    it("refuses for a deactivated account", async () => {
      mocked.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "admin@grace.community",
        passwordHash: realHash,
        isActive: false,
      });

      const res = await call({
        currentPassword: "current-password-1",
        newPassword: "a-brand-new-password",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("new password rules", () => {
    it("requires both fields", async () => {
      expect((await call({ newPassword: "a-brand-new-password" })).status).toBe(400);
      expect((await call({ currentPassword: "current-password-1" })).status).toBe(400);
      expect(mocked.user.update).not.toHaveBeenCalled();
    });

    it("requires at least 12 characters", async () => {
      const res = await call({
        currentPassword: "current-password-1",
        newPassword: "elevenchars",
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error.message).toMatch(/at least 12/i);
    });

    it("accepts exactly 12 characters", async () => {
      const res = await call({
        currentPassword: "current-password-1",
        newPassword: "twelvechars!",
      });
      expect(res.status).toBe(200);
    });

    it("rejects a pathologically long password", async () => {
      // Bounds the PBKDF2 work. This endpoint is authenticated, but nothing else
      // stops a very large "password".
      const res = await call({
        currentPassword: "current-password-1",
        newPassword: "x".repeat(5000),
      });
      expect(res.status).toBe(400);
    });

    it("rejects a new password identical to the current one", async () => {
      // Otherwise a "change" could report success while changing nothing.
      const res = await call({
        currentPassword: "current-password-1",
        newPassword: "current-password-1",
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error.message).toMatch(/different/i);
    });

    it("does not require a symbol, only length", async () => {
      // Length is what drives strength; a composition rule mostly produces
      // "Password1!" and annoys people into writing it down.
      const res = await call({
        currentPassword: "current-password-1",
        newPassword: "aaaaaaaaaaaaaa",
      });
      expect(res.status).toBe(200);
    });
  });

  describe("session revocation", () => {
    it("revokes other sessions and reports how many", async () => {
      const req = await post({
        currentPassword: "current-password-1",
        newPassword: "a-brand-new-password",
      });
      const presented = req.headers.get("cookie")!.replace("church_session=", "");
      const res = await call(null, req);
      const body = await res.json();

      expect(body.data.otherSessionsRevoked).toBe(2);
      // The caller keeps working: a password change should not log you out of the
      // tab you just used to make it.
      expect(mocked.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            revokedAt: null,
            NOT: { token: presented },
          }),
        })
      );
    });

    it("keeps a Bearer caller signed in too", async () => {
      // A phone has no cookie, so the exclusion has to come from the header.
      const mobileToken = await signSession({
        userId: "user-1",
        tenantId: "tenant-1",
        email: "admin@grace.community",
        role: "admin",
      });
      const req = new Request("http://localhost/api/auth/change-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${mobileToken}`,
        },
        body: JSON.stringify({
          currentPassword: "current-password-1",
          newPassword: "a-brand-new-password",
        }),
      });

      const res = await call(null, req);
      expect(res.status).toBe(200);
      expect(mocked.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ NOT: { token: mobileToken } }),
        })
      );
    });

    it("clears the lockout counter", async () => {
      // The user just proved they know the password, so any accumulated failures
      // describe the past, not the present.
      await call({
        currentPassword: "current-password-1",
        newPassword: "a-brand-new-password",
      });
      expect(mocked.authThrottle.deleteMany).toHaveBeenCalledWith({
        where: { key: expect.any(String) },
      });
    });
  });

  describe("authentication", () => {
    it("refuses an unauthenticated request", async () => {
      // `post` is async, so this must be awaited — passing the promise gave the
      // handler an object with no `.headers`.
      const res = await call(
        { currentPassword: "current-password-1", newPassword: "a-brand-new-password" },
        await post({}, "")
      );
      expect(res.status).toBe(401);
      expect(mocked.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
