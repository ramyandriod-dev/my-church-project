/**
 * Private demo access
 *
 * The demo accounts (see demo-accounts.ts) used to share public passwords, printed
 * on the login screen. When DEMO_ACCESS_PASSWORD is set, they accept ONLY that
 * password: the stored password and the old public ones are ignored, so a tester
 * who is sent the app cannot sign in as the demo admin.
 *
 * Set it once as a secret (it is never in the code or the repository):
 *   (set it as an environment variable)
 *
 * Unset (or shorter than 8 characters), nothing changes: local development and the
 * test suite keep the old behaviour.
 *
 * Failed attempts are throttled per email by the login routes, as for any account.
 */

import { DEMO_ACCOUNT_EMAILS } from "./demo-accounts";

export const MIN_DEMO_ACCESS_PASSWORD_LENGTH = 8;

export function demoAccessPassword(): string | null {
  const value = process.env.DEMO_ACCESS_PASSWORD;
  return value && value.length >= MIN_DEMO_ACCESS_PASSWORD_LENGTH ? value : null;
}

/** True when this email is a demo account AND the private password is in force. */
export function isPrivateDemoAccount(email: string): boolean {
  return demoAccessPassword() !== null && DEMO_ACCOUNT_EMAILS.has(email.trim().toLowerCase());
}

/** Compares in constant time (both sides hashed to the same length first). */
export async function matchesDemoAccessPassword(candidate: string): Promise<boolean> {
  const secret = demoAccessPassword();
  if (!secret) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(secret)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
