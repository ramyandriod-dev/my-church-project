/**
 * Pilot demo login switch.
 *
 * Controls the demo password fallback and the seeded email aliases in both login
 * routes. On only when DEMO_LOGIN_ENABLED is exactly "true". Only the pilot
 * preview sets it, in wrangler.jsonc. Production must not set it.
 *
 * Kept in its own module, not in config.ts, so tests that mock the config module
 * cannot make this check silently disappear. Read at call time, not at load.
 */
export function isDemoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN_ENABLED === "true";
}
