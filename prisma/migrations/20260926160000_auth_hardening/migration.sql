-- Auth hardening (Phase 0).
--
-- Adds durable failed-login throttling and real session revocation.
--
-- ## Why this file is written to be re-runnable
--
-- The live database was created with `prisma db push`, not `prisma migrate`, so it
-- has no `_prisma_migrations` history. An earlier pass already created
-- `auth_throttles` and the three new `sessions` columns there by pushing the
-- schema. This migration is therefore written to be safe against a database where
-- some or all of it already exists: every statement is guarded. A fresh
-- environment created from the migration history gets the full schema; the live
-- one is a no-op rather than a `CREATE TABLE` collision.
--
-- ## 1. auth_throttles — persistent failed-login state
--
-- Rate limiting cannot live in process memory. The deployment target is
-- Cloudflare Workers (`open-next.config.ts`), where isolates are short-lived and
-- there is more than one edge location, so an in-memory counter is reset by every
-- request that lands elsewhere and protects nothing.
--
-- Keyed on a hash of the email, never the address: this is the most attractive
-- table in the schema to dump, and login is an endpoint an unauthenticated caller
-- can make the application write rows on.
--
-- ## 2. sessions — revocation, activity, provenance
--
-- Session rows were already written on login but never read back, so logout
-- deleted a row nothing consulted and a stolen token stayed valid for its full
-- seven days. `revoked_at` is what turns the table from an audit log into a
-- control.
--
-- `kind` exists because a mobile Bearer token is a materially different risk from
-- a browser cookie: it is held in app storage, survives the app being closed, and
-- cannot be protected by `httpOnly`. The two are tracked separately so one can be
-- tightened without the other.

-- ─── Failed-login throttling ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "auth_throttles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(64) NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "window_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_throttles_pkey" PRIMARY KEY ("id")
);

-- Named to match the index that already exists in the live database, and mapped
-- to the same name in schema.prisma, so Prisma does not see drift.
CREATE UNIQUE INDEX IF NOT EXISTS "auth_throttles_key_unique" ON "auth_throttles"("key");

-- Supports the sweep for rows whose lock has expired.
CREATE INDEX IF NOT EXISTS "auth_throttles_locked_until_idx" ON "auth_throttles"("locked_until");

-- ─── Session revocation, activity and provenance ───────────────────────────

-- A non-null revoked_at means the token is refused even though its own exp has not
-- passed. This is the column that makes "sign out this device" real rather than
-- advisory. Verification finds the row by `token`, which is already unique.
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3);

-- Lets an operator see which of a user's devices are actually in use.
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMP(3);

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "kind" VARCHAR(20) NOT NULL DEFAULT 'web';

-- The live database already carries a partial index
-- (`sessions_user_id_active_idx`, `WHERE revoked_at IS NULL`) from the schema
-- push. Prisma cannot express a partial index in `@@index`, so it is left as it
-- is and deliberately not declared: recreating it as a full index would add a
-- second structure that nothing queries.
