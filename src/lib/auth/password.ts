/**
 * Password hashing.
 *
 * ## Why WebCrypto PBKDF2 and not bcrypt or Argon2
 *
 * The obvious choices are deliberately unavailable here. This application is
 * deployed to Cloudflare Workers through `@opennextjs/cloudflare`
 * (`open-next.config.ts`), and the Workers runtime cannot load native addons, so
 * `bcrypt` and `argon2` would fail to deploy. `node:crypto`'s `scryptSync` is
 * likewise not dependable on that runtime.
 *
 * PBKDF2 via `crypto.subtle` is the one option that behaves identically in Node
 * and in the Workers runtime, needs no dependency, and is what the WebCrypto
 * standard actually defines. OWASP rates PBKDF2-HMAC-SHA256 as acceptable
 * (alongside scrypt and Argon2id) at 600,000 iterations.
 *
 * The iteration count is a cost question with a runtime caveat: Workers enforces
 * a CPU-time ceiling per request, so a very high count can trade a fast reject
 * for a timeout. It is read from configuration rather than hard-coded so it can
 * be tuned per environment without touching this file.
 *
 * ## The stored format is self-describing
 *
 * `pbkdf2-sha256$<iterations>$<saltHex>$<hashHex>`
 *
 * Carrying the parameters inside the string means the work factor can be raised
 * later without invalidating anyone's password: each hash is verified with the
 * settings it was created under, and re-hashed on next successful login. A fixed
 * `format$hash` string would force a full reset to change the cost.
 *
 * ## Verification fails closed
 *
 * `verifyPassword` returns `false` for a null, empty, or malformed stored value
 * rather than throwing or defaulting to "valid". A user row with
 * `passwordHash = NULL` cannot be logged into, which is the only safe reading of
 * a missing hash.
 */

import { config } from "../backend/config";

const ALGORITHM = "PBKDF2";
const DIGEST = "SHA-256";
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const PREFIX = "pbkdf2-sha256";

/**
 * A precomputed hash of a value nobody can supply, used to spend the same CPU on
 * a login for an email that does not exist as on one that does.
 *
 * Without it, a missing user returns measurably faster than a present user with
 * a wrong password, and that difference is enough to enumerate which emails have
 * accounts. The salt and hash are constants; only the derived output varies.
 */
const TIMING_DECOY = `${PREFIX}$${config.passwordHashIterations}$${"0".repeat(32)}$${"0".repeat(64)}`;

// ─── Encoding helpers ────────────────────────────────────────
//
// Hex rather than base64: it has no padding or alphabet edge cases, so the same
// code produces byte-identical output on Node and on Workers.

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

function fromHex(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

// ─── Core derivation ─────────────────────────────────────────

interface ParsedHash {
  iterations: number;
  salt: Uint8Array;
  hash: Uint8Array;
}

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 4) return null;
  const [prefix, iterationText, saltHex, hashHex] = parts;
  if (prefix !== PREFIX) return null;

  const iterations = Number.parseInt(iterationText, 10);
  if (!Number.isInteger(iterations) || iterations < 1) return null;

  const salt = fromHex(saltHex);
  const hash = fromHex(hashHex);
  if (!salt || !hash || salt.length === 0 || hash.length === 0) return null;

  return { iterations, salt, hash };
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    ALGORITHM,
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: ALGORITHM,
      // `salt` is typed as BufferSource; the copy satisfies Workers' narrower type.
      salt: new Uint8Array(salt) as unknown as BufferSource,
      iterations,
      hash: DIGEST,
    },
    material,
    KEY_BYTES * 8
  );
  return new Uint8Array(bits);
}

/**
 * Compare two byte strings without an early return.
 *
 * `===` on strings and `Array.every` both stop at the first difference, and the
 * time that takes leaks how much of a secret was guessed correctly. The loop
 * below always walks the full length.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Hash a password for storage.
 *
 * Returns a self-describing string; pass it straight to `User.passwordHash`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const iterations = config.passwordHashIterations;
  const hash = await derive(password, salt, iterations);
  return `${PREFIX}$${iterations}$${toHex(salt)}$${toHex(hash)}`;
}

/**
 * Check a password against a stored hash.
 *
 * Returns `false` — never throws, never defaults to true — when the stored value
 * is absent or unreadable.
 */
export async function verifyPassword(
  stored: string | null | undefined,
  password: string
): Promise<boolean> {
  if (!stored) return false;
  const parsed = parseHash(stored);
  if (!parsed) return false;
  const candidate = await derive(password, parsed.salt, parsed.iterations);
  return timingSafeEqual(candidate, parsed.hash);
}

/**
 * Burn comparable CPU on a login for an email that does not exist.
 *
 * Call this when no user was found, so the response time does not reveal whether
 * the account is real. It is deliberately cheap to skip internally but must
 * actually run — the caller is responsible for awaiting it.
 */
export async function equalizeTiming(password: string): Promise<void> {
  await verifyPassword(TIMING_DECOY, password);
}

/**
 * Whether a stored hash was made with weaker settings than the current
 * configuration, and so should be replaced on this user's next successful login.
 */
export function needsRehash(stored: string | null | undefined): boolean {
  if (!stored) return true;
  const parsed = parseHash(stored);
  if (!parsed) return true;
  return parsed.iterations < config.passwordHashIterations;
}
