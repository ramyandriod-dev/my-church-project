/**
 * Login throttling tests.
 *
 * The behaviour under test is the lockout *policy*, because that is a judgement
 * call rather than a library: too strict and a congregation locks each other out
 * at a Sunday service, too lax and the account is guessable indefinitely. The
 * cases below pin the boundaries of that policy.
 *
 * The key derivation is tested too, because the choice not to store plaintext
 * addresses is a privacy guarantee that is easy to regress by accident.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { config } from "../backend/config";
import prisma from "../db/prisma";
import {
  throttleKeyForEmail,
  getLockoutState,
  recordFailedAttempt,
  clearFailures,
} from "./throttle";

const mocked = prisma as unknown as {
  authThrottle: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

/** A throttle row as `findUnique` would return it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    key: "k",
    failures: 0,
    windowStartedAt: new Date(),
    lockedUntil: null,
    lastFailureAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocked.authThrottle.findUnique.mockResolvedValue(null);
  mocked.authThrottle.create.mockImplementation(async ({ data }: any) => ({ id: "t1", ...data }));
  mocked.authThrottle.update.mockImplementation(async ({ data }: any) => ({ id: "t1", ...data }));
  mocked.authThrottle.deleteMany.mockResolvedValue({ count: 1 });
});

describe("throttleKeyForEmail", () => {
  it("is a 64-character hex digest", async () => {
    expect(await throttleKeyForEmail("user@example.com")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never contains the email address", async () => {
    // The reason the key is hashed: this table is the most attractive thing in the
    // schema to dump, and login is an endpoint an unauthenticated caller can make
    // the application write rows on.
    const key = await throttleKeyForEmail("congregant@grace.community");
    expect(key).not.toContain("congregant");
    expect(key).not.toContain("grace.community");
  });

  it("is stable for the same address", async () => {
    const a = await throttleKeyForEmail("user@example.com");
    const b = await throttleKeyForEmail("user@example.com");
    expect(a).toBe(b);
  });

  it("normalises case and surrounding whitespace", async () => {
    // Without this, "User@Example.com" and "user@example.com " would be two
    // separate throttles and an attacker could simply vary the case to reset
    // their own counter.
    const canonical = await throttleKeyForEmail("user@example.com");
    expect(await throttleKeyForEmail("USER@EXAMPLE.COM")).toBe(canonical);
    expect(await throttleKeyForEmail("  user@example.com  ")).toBe(canonical);
  });

  it("distinguishes different addresses", async () => {
    const a = await throttleKeyForEmail("one@example.com");
    const b = await throttleKeyForEmail("two@example.com");
    expect(a).not.toBe(b);
  });
});

describe("getLockoutState", () => {
  it("reports no lockout when there is no row", async () => {
    // The common case must not be an error.
    expect(await getLockoutState("nobody@example.com")).toEqual({
      locked: false,
      retryAfterSeconds: 0,
      failures: 0,
    });
  });

  it("reports unlocked while failures are under the threshold", async () => {
    mocked.authThrottle.findUnique.mockResolvedValue(row({ failures: 2 }));
    expect(await getLockoutState("user@example.com")).toEqual({
      locked: false,
      retryAfterSeconds: 0,
      failures: 2,
    });
  });

  it("reports locked while the lock is in the future", async () => {
    mocked.authThrottle.findUnique.mockResolvedValue(
      row({ failures: 5, lockedUntil: new Date(Date.now() + 120_000) })
    );
    const state = await getLockoutState("user@example.com");
    expect(state.locked).toBe(true);
    expect(state.retryAfterSeconds).toBeGreaterThan(0);
    expect(state.retryAfterSeconds).toBeLessThanOrEqual(120);
  });

  it("reports unlocked once the lock has expired, but keeps the failure count", async () => {
    // The count is preserved so a caller can see this account is under attack
    // even while it is currently allowed to try again.
    mocked.authThrottle.findUnique.mockResolvedValue(
      row({ failures: 5, lockedUntil: new Date(Date.now() - 1000) })
    );
    expect(await getLockoutState("user@example.com")).toEqual({
      locked: false,
      retryAfterSeconds: 0,
      failures: 5,
    });
  });
});

describe("recordFailedAttempt", () => {
  it("creates a counter row on the first failure", async () => {
    const state = await recordFailedAttempt("user@example.com");

    expect(state.failures).toBe(1);
    expect(state.locked).toBe(false);
    expect(mocked.authThrottle.create).toHaveBeenCalledOnce();
    expect(mocked.authThrottle.update).not.toHaveBeenCalled();
  });

  it("increments an existing counter", async () => {
    mocked.authThrottle.findUnique.mockResolvedValue(row({ failures: 2 }));
    const state = await recordFailedAttempt("user@example.com");

    expect(state.failures).toBe(3);
    expect(mocked.authThrottle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: expect.any(String) },
        data: expect.objectContaining({ failures: 3, lockedUntil: null }),
      })
    );
  });

  it("locks the account once the threshold is reached", async () => {
    mocked.authThrottle.findUnique.mockResolvedValue(
      row({ failures: config.loginMaxFailures - 1 })
    );
    const state = await recordFailedAttempt("user@example.com");

    expect(state.failures).toBe(config.loginMaxFailures);
    expect(state.locked).toBe(true);
    expect(state.retryAfterSeconds).toBe(config.loginBaseLockSeconds);
  });

  it("grows the lock with each failure past the threshold", async () => {
    // A persistent attacker should back off quickly, but one extra typo should not
    // cost an usher an hour of their Sunday.
    mocked.authThrottle.findUnique.mockResolvedValue(
      row({ failures: config.loginMaxFailures })
    );
    const state = await recordFailedAttempt("user@example.com");
    expect(state.retryAfterSeconds).toBe(config.loginBaseLockSeconds * 2);
  });

  it("caps the lock duration", async () => {
    mocked.authThrottle.findUnique.mockResolvedValue(row({ failures: 500 }));
    const state = await recordFailedAttempt("user@example.com");
    expect(state.retryAfterSeconds).toBe(config.loginMaxLockSeconds);
  });

  it("starts a fresh window when the previous lock has already expired", async () => {
    // Otherwise an account that simply stopped trying would still be one failure
    // away from another full lock the moment it came back.
    mocked.authThrottle.findUnique.mockResolvedValue(
      row({ failures: 40, lockedUntil: new Date(Date.now() - 60_000) })
    );
    const state = await recordFailedAttempt("user@example.com");

    expect(state.failures).toBe(1);
    expect(state.locked).toBe(false);
    expect(mocked.authThrottle.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ windowStartedAt: expect.any(Date) }),
      })
    );
  });

  it("starts a fresh window when the failure window has elapsed without a lock", async () => {
    mocked.authThrottle.findUnique.mockResolvedValue(
      row({
        failures: 3,
        lockedUntil: null,
        windowStartedAt: new Date(Date.now() - config.loginWindowSeconds * 1000 - 1000),
      })
    );
    const state = await recordFailedAttempt("user@example.com");
    expect(state.failures).toBe(1);
    expect(state.locked).toBe(false);
  });

  it("keeps counting while the window is still open", async () => {
    mocked.authThrottle.findUnique.mockResolvedValue(
      row({ failures: 3, windowStartedAt: new Date(Date.now() - 1000) })
    );
    const state = await recordFailedAttempt("user@example.com");
    expect(state.failures).toBe(4);
  });
});

describe("clearFailures", () => {
  it("deletes the row so a successful login resets the counter", async () => {
    // Whoever authenticated knew the password, so there is no guesswork left to
    // protect.
    await clearFailures("user@example.com");
    expect(mocked.authThrottle.deleteMany).toHaveBeenCalledWith({
      where: { key: await throttleKeyForEmail("user@example.com") },
    });
  });

  it("is safe when no row exists", async () => {
    // `deleteMany` rather than `delete`: a user with no failures has no row, and
    // a successful login must not fail because there was nothing to clear.
    await expect(clearFailures("never-failed@example.com")).resolves.toBeUndefined();
  });
});
