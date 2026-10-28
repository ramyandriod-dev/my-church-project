/**
 * Login throttling.
 *
 * Brute-force protection for the login endpoint, backed by the `auth_throttles`
 * table rather than process memory.
 *
 * ## Why the database
 *
 * The deployment target is Cloudflare Workers (`open-next.config.ts`). Isolates
 * there are short-lived and there is more than one edge location, so a counter
 * in module scope is reset by every request that lands on a different instance
 * and protects nothing. Durable state is the only version of this that is real.
 *
 * ## Why the key is a hash
 *
 * The row is keyed on `sha256(lowercased email)`, never the address. The login
 * path is the one place an attacker can make the application write rows on
 * demand, and storing plaintext addresses would turn that into a free mailing
 * list built from the login form alone. The hash still gives a stable key and
 * still supports "is this address being attacked", which is all the code needs.
 *
 * ## The lockout policy
 *
 * A flat "N failures and you are locked out" punishes a congregation for typos,
 * and the people most likely to mistype a password on a phone keypad at a church
 * door are the ushers this app exists for. So the lock grows with each *additional*
 * failure past the threshold and is capped, rather than resetting on success:
 *
 *   - under the threshold  → no lock, just a counter inside a rolling window
 *   - at the threshold     → base lock
 *   - each further failure → the previous lock, doubled, up to the cap
 *
 * A success clears the row. That is the standard trade-off: it lets an attacker
 * who already holds the password reset the counter, but anyone holding the
 * password does not need to guess, so there is nothing left to protect.
 *
 * ## What is deliberately not here
 *
 * No IP-based limiting. It would need a second key column, and behind a proxy or
 * a shared mobile carrier NAT it punishes whole neighbourhoods for one phone.
 * The account-level lock is the control that maps to a real threat — credential
 * stuffing against a known address — and it is the one an operator can see and
 * undo.
 */

import prisma from "../db/prisma";
import { config } from "../backend/config";

// ─── Key derivation ────────────────────────────────────────

/**
 * Stable, non-reversible key for an email address.
 *
 * Uses SHA-256 over the normalised address. This is deliberately *not* a
 * password hash and needs no salt or work factor: the input is low-entropy and
 * already known to whoever is attacking, and the output is only ever used as a
 * lookup key. A slow KDF here would add latency to the failure path for no gain.
 */
export async function throttleKeyForEmail(email: string): Promise<string> {
  const normalised = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalised));
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

// ─── State ──────────────────────────────────────────────────

export interface LockoutState {
  /** Whether this account may not attempt a login right now. */
  locked: boolean;
  /** Seconds until the lock lifts. Zero when not locked. */
  retryAfterSeconds: number;
  /** Failures recorded inside the current window. */
  failures: number;
}

const NOT_LOCKED: LockoutState = { locked: false, retryAfterSeconds: 0, failures: 0 };

/**
 * How long the lock should be, given how many failures have accumulated.
 *
 * Doubling per extra failure, capped, so a persistent attacker backs off quickly
 * while a single mistake costs the base window and no more.
 */
function lockDurationSeconds(failures: number): number {
  const over = Math.max(0, failures - config.loginMaxFailures);
  if (over === 0) return config.loginBaseLockSeconds;
  const scaled = config.loginBaseLockSeconds * 2 ** over;
  return Math.min(scaled, config.loginMaxLockSeconds);
}

/**
 * Read the current lockout state for an account.
 *
 * A missing row means no failures on record, which is the common case and must
 * not be an error.
 */
export async function getLockoutState(email: string): Promise<LockoutState> {
  const key = await throttleKeyForEmail(email);
  const row = await prisma.authThrottle.findUnique({ where: { key } });

  if (!row) return NOT_LOCKED;

  if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((row.lockedUntil.getTime() - Date.now()) / 1000),
      failures: row.failures,
    };
  }

  return { locked: false, retryAfterSeconds: 0, failures: row.failures };
}

/**
 * Record a failed attempt and return the resulting state.
 *
 * A failure that lands after the lock has already expired is treated as the
 * start of a fresh window rather than resuming the old count, otherwise a locked
 * account that simply stopped trying would still be one failure away from
 * another hour-long lock the moment it returned.
 */
export async function recordFailedAttempt(email: string): Promise<LockoutState> {
  const key = await throttleKeyForEmail(email);
  const now = new Date();

  const existing = await prisma.authThrottle.findUnique({ where: { key } });

  if (!existing) {
    // First failure. Lock only once the threshold is already met, which it is
    // not, so this row is purely a counter.
    if (config.loginMaxFailures <= 1) {
      const lockedUntil = new Date(now.getTime() + lockDurationSeconds(1) * 1000);
      const created = await prisma.authThrottle.create({
        data: { key, failures: 1, lastFailureAt: now, lockedUntil },
      });
      return { locked: true, retryAfterSeconds: lockDurationSeconds(1), failures: created.failures };
    }
    const created = await prisma.authThrottle.create({
      data: { key, failures: 1, lastFailureAt: now, windowStartedAt: now },
    });
    return { locked: false, retryAfterSeconds: 0, failures: created.failures };
  }

  const lockExpired = existing.lockedUntil
    ? existing.lockedUntil.getTime() <= now.getTime()
    : false;

  const windowExpired =
    now.getTime() - existing.windowStartedAt.getTime() > config.loginWindowSeconds * 1000;

  // Both conditions mean the previous failures no longer describe the present.
  const startingFresh = lockExpired || windowExpired;
  const failures = startingFresh ? 1 : existing.failures + 1;

  const shouldLock = failures >= config.loginMaxFailures;
  const lockedUntil = shouldLock
    ? new Date(now.getTime() + lockDurationSeconds(failures) * 1000)
    : null;

  const updated = await prisma.authThrottle.update({
    where: { key },
    data: {
      failures,
      lastFailureAt: now,
      lockedUntil,
      ...(startingFresh ? { windowStartedAt: now } : {}),
    },
  });

  return {
    locked: shouldLock,
    retryAfterSeconds: shouldLock ? lockDurationSeconds(failures) : 0,
    failures: updated.failures,
  };
}

/**
 * Clear the record after a successful login.
 *
 * A success is proof that whoever authenticated knew the password, so there is
 * no residual guesswork left to protect.
 */
export async function clearFailures(email: string): Promise<void> {
  const key = await throttleKeyForEmail(email);
  await prisma.authThrottle.deleteMany({ where: { key } });
}
