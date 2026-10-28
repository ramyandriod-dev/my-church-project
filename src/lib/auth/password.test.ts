/**
 * Password hashing tests.
 *
 * The point of these is not that PBKDF2 round-trips. It is that the module
 * **fails closed** and that its edge cases are what the security properties rest
 * on. Every "returns false" case below corresponds to a way a login could
 * otherwise succeed or leak.
 *
 * The work factor is not under test — the parser reads it back out of the stored
 * string, which is exactly what lets it be tuned in production later without a
 * password reset, and that round-trip *is* covered. The cost itself comes from the
 * mocked config in `tests/setup.ts`, which is pinned low so the suite stays fast.
 * These tests read that value back instead of assuming it, so changing the mock
 * cannot silently turn an assertion into a lie.
 */

import { describe, it, expect, vi } from "vitest";
import { config } from "../backend/config";
import { hashPassword, verifyPassword, equalizeTiming, needsRehash } from "./password";

const ITERATIONS = config.passwordHashIterations;

/** Build a syntactically valid stored hash at an arbitrary cost. */
function storedAt(iterations: number): string {
  return `pbkdf2-sha256$${iterations}$${"0".repeat(32)}$${"0".repeat(64)}`;
}

describe("password hashing", () => {
  describe("hashPassword", () => {
    it("produces a self-describing string that carries its own parameters", async () => {
      const stored = await hashPassword("correct horse battery staple");
      const [prefix, iterations, salt, hash] = stored.split("$");

      expect(prefix).toBe("pbkdf2-sha256");
      // Carrying the count inside the hash is what allows the work factor to be
      // raised later without invalidating anyone's password.
      expect(iterations).toBe(String(ITERATIONS));
      // 16-byte salt and 32-byte key, hex-encoded.
      expect(salt).toMatch(/^[0-9a-f]{32}$/);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("never stores the password in any form", async () => {
      const stored = await hashPassword("hunter2");
      expect(stored).not.toContain("hunter2");
    });

    it("produces a different result for the same password every time", async () => {
      // A random salt per hash. Identical outputs for identical passwords would
      // mean two users who chose the same password are visibly linked in the
      // database, and a single leaked hash would expose every holder of it.
      const a = await hashPassword("same-password");
      const b = await hashPassword("same-password");
      expect(a).not.toBe(b);
    });
  });

  describe("verifyPassword", () => {
    it("accepts the correct password", async () => {
      const stored = await hashPassword("my-real-password");
      expect(await verifyPassword(stored, "my-real-password")).toBe(true);
    });

    it("rejects the wrong password", async () => {
      const stored = await hashPassword("my-real-password");
      expect(await verifyPassword(stored, "my-wrong-password")).toBe(false);
    });

    it("is case sensitive", async () => {
      const stored = await hashPassword("Password");
      expect(await verifyPassword(stored, "password")).toBe(false);
    });

    it("rejects a null stored hash instead of throwing or returning true", async () => {
      // This is the state all 9 existing accounts are in. A login against it must
      // be refused, not accepted and not crash.
      expect(await verifyPassword(null, "anything")).toBe(false);
      expect(await verifyPassword(undefined, "anything")).toBe(false);
      expect(await verifyPassword("", "anything")).toBe(false);
    });

    it.each([
      ["no delimiter", "notahash"],
      ["wrong algorithm", "bcrypt$1000$abcd$abcd"],
      ["truncated", "pbkdf2-sha256$1000$abcd"],
      ["extra segment", "pbkdf2-sha256$1000$abcd$abcd$abcd"],
      ["non-numeric iteration count", "pbkdf2-sha256$abc$abcd$abcd"],
      ["zero iterations", "pbkdf2-sha256$0$abcd$abcd"],
      ["negative iterations", "pbkdf2-sha256$-5$abcd$abcd"],
      ["non-hex salt", "pbkdf2-sha256$1000$zzzz$abcd"],
      ["odd-length hex", "pbkdf2-sha256$1000$abc$abcd"],
      ["empty hash", "pbkdf2-sha256$1000$abcd$"],
    ])("rejects a malformed stored value (%s)", async (_label, stored) => {
      // Every one of these must be a refusal, not an exception. An unhandled
      // parse error on the login path is a 500, and a 500 is distinguishable from
      // a 401 by anyone probing the endpoint.
      expect(await verifyPassword(stored, "password")).toBe(false);
    });

    it("rejects a password that is a prefix of the real one", async () => {
      const stored = await hashPassword("password123");
      expect(await verifyPassword(stored, "password")).toBe(false);
    });

    it("verifies a hash made at a different work factor", async () => {
      // The scenario that makes the self-describing format worth the extra bytes:
      // a password hashed when the cost was 1000 must still verify after the cost
      // is raised, and get upgraded on that user's next login.
      //
      // The hash has to genuinely be produced at the old cost, so a second module
      // instance is loaded with a lower mocked config. Rewriting the iteration
      // field of a hash without re-deriving it would not test this — it would
      // just be a hash that does not match, which is correct behaviour.
      vi.resetModules();
      vi.doMock("../backend/config", () => ({
        config: { ...config, passwordHashIterations: 1000 },
      }));
      const legacyMod = await import("./password");
      const legacy = await legacyMod.hashPassword("legacy-password");
      expect(legacy.startsWith("pbkdf2-sha256$1000$")).toBe(true);

      // Back at the higher configured cost, against a fresh module instance.
      vi.resetModules();
      vi.doMock("../backend/config", () => ({
        config: { ...config, passwordHashIterations: 4000 },
      }));
      const raisedMod = await import("./password");

      expect(await raisedMod.verifyPassword(legacy, "legacy-password")).toBe(true);
      expect(await raisedMod.verifyPassword(legacy, "wrong-password")).toBe(false);
      // And it is flagged for upgrade, which is the mechanism that retires it.
      expect(raisedMod.needsRehash(legacy)).toBe(true);

      // Leave the module registry as the suite expects to find it.
      vi.doMock("../backend/config", () => ({ config }));
      vi.resetModules();
    });
  });

  describe("needsRehash", () => {
    it("wants a rehash when nothing is stored", () => {
      expect(needsRehash(null)).toBe(true);
      expect(needsRehash(undefined)).toBe(true);
      expect(needsRehash("")).toBe(true);
    });

    it("wants a rehash when the stored hash is unreadable", () => {
      expect(needsRehash("garbage")).toBe(true);
    });

    it("does not want a rehash for a hash at the current cost", () => {
      expect(needsRehash(storedAt(ITERATIONS))).toBe(false);
    });

    it("wants a rehash when the stored cost is below the configured cost", () => {
      expect(needsRehash(storedAt(ITERATIONS - 100))).toBe(true);
    });

    it("does not want a rehash when the stored cost is above the configured cost", () => {
      // Lowering the configured cost must not invalidate stronger existing
      // hashes; they stay valid, and stay as they are.
      expect(needsRehash(storedAt(ITERATIONS + 100))).toBe(false);
    });
  });

  describe("equalizeTiming", () => {
    it("resolves without throwing for an unknown account", async () => {
      // The whole point is that this is awaited on the failure path.
      await expect(equalizeTiming("any-password")).resolves.toBeUndefined();
    });

    it("accepts an empty password", async () => {
      await expect(equalizeTiming("")).resolves.toBeUndefined();
    });
  });
});
