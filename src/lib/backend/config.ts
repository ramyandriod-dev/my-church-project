/**
 * Environment Configuration
 *
 * Centralized config with validation.
 * Fails fast if required env vars are missing.
 *
 * Configured for Neon PostgreSQL with Cloudflare Hyperdrive support.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string = ""): string {
  return process.env[name] || fallback;
}

export const config = {
  // Database
  databaseUrl: requireEnv("DATABASE_URL"),

  // Neon-specific database settings
  isNeon: process.env.DATABASE_URL?.includes("neon.tech") ?? false,

  // Auth
  jwtSecret: requireEnv("JWT_SECRET"),
  sessionExpiry: parseInt(optionalEnv("SESSION_EXPIRY", "604800"), 10),

  /**
   * Access-token lifetime for the mobile Bearer path.
   *
   * Deliberately short. A mobile device is far more likely to be lost, shared or
   * stolen than a browser session on a known machine, and a leaked Bearer token
   * cannot be revoked by clearing a cookie jar. Pairing a short access token
   * with refresh rotation bounds the damage.
   */
  mobileAccessTokenExpiry: parseInt(optionalEnv("MOBILE_ACCESS_TOKEN_EXPIRY", "3600"), 10),

  /**
   * Refresh-token lifetime. This is the real ceiling on how long a stolen mobile
   * device stays useful, because revoking the session invalidates the refresh
   * token too.
   */
  mobileRefreshTokenExpiry: parseInt(
    optionalEnv("MOBILE_REFRESH_TOKEN_EXPIRY", `${60 * 60 * 24 * 30}`),
    10
  ),

  /**
   * PBKDF2 work factor. OWASP's floor for PBKDF2-HMAC-SHA256 is 600,000.
   *
   * Tunable because the cost is paid inside a request and the Workers runtime
   * enforces a per-request CPU ceiling — a value tuned for a long-lived server
   * can become a timeout on a smaller one. Storing the count inside each hash
   * (see `lib/auth/password.ts`) means changing it never invalidates an existing
   * password: old hashes keep verifying under their own settings and are upgraded
   * on next login.
   */
  passwordHashIterations: parseInt(
    optionalEnv("PASSWORD_HASH_ITERATIONS", "600000"),
    10
  ),


  /**
   * Login throttling.
   *
   * `maxFailures` is the number of wrong passwords tolerated inside
   * `windowSeconds` before the account is locked. Lockout length then grows with
   * each subsequent failure rather than resetting, so a slow guesser is stopped
   * without letting a single typo lock a usher out of a Sunday service.
   */
  loginMaxFailures: parseInt(optionalEnv("LOGIN_MAX_FAILURES", "5"), 10),
  loginWindowSeconds: parseInt(optionalEnv("LOGIN_WINDOW_SECONDS", "900"), 10),
  loginBaseLockSeconds: parseInt(optionalEnv("LOGIN_BASE_LOCK_SECONDS", "300"), 10),
  loginMaxLockSeconds: parseInt(optionalEnv("LOGIN_MAX_LOCK_SECONDS", "3600"), 10),

  // App
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  appUrl: optionalEnv("APP_URL", "http://localhost:3000"),
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",

  // AI (future)
  aiProvider: optionalEnv("AI_PROVIDER", "openai"),
  aiApiKey: optionalEnv("AI_API_KEY"),
  aiModel: optionalEnv("AI_MODEL", "gpt-4"),

  // Realtime (future)
  realtimeUrl: optionalEnv("REALTIME_URL"),

  // Cloudflare Hyperdrive (for production deployment)
  // When using Hyperdrive, the DATABASE_URL is automatically configured
  // by the Hyperdrive binding, so we don't need to set it manually
  hyperdriveEnabled: process.env.HYPERDRIVE_ENABLED === "true",
} as const;
