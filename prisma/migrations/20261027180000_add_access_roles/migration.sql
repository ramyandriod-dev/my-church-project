-- Access & roles. Written to be safe to re-run (IF NOT EXISTS / guarded constraints),
-- because some environments were created with `prisma db push` rather than migrations.

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "tenant_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "permissions" JSONB NOT NULL,
    "updated_by_user_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("tenant_id", "role")
);

CREATE TABLE IF NOT EXISTS "role_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "requested_role" VARCHAR(50) NOT NULL,
    "note" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "role_requests_tenant_id_status_created_at_idx" ON "role_requests"("tenant_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "role_requests_user_id_idx" ON "role_requests"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_tenant_id_fkey') THEN
    ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_requests_tenant_id_fkey') THEN
    ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_requests_user_id_fkey') THEN
    ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_requests_reviewed_by_user_id_fkey') THEN
    ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
