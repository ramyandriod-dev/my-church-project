-- Announcements. Written to be safe to re-run (IF NOT EXISTS / guarded constraints),
-- because some environments were created with `prisma db push` rather than migrations.

CREATE TABLE IF NOT EXISTS "announcements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" TEXT NOT NULL,
    "audience" JSONB NOT NULL,
    "audience_summary" VARCHAR(300) NOT NULL,
    "recipient_count" INTEGER NOT NULL,
    "push_delivered" INTEGER NOT NULL DEFAULT 0,
    "sender_user_id" UUID,
    "sender_name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "announcement_id" UUID;

CREATE INDEX IF NOT EXISTS "announcements_tenant_id_created_at_idx" ON "announcements"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "messages_announcement_id_idx" ON "messages"("announcement_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'announcements_tenant_id_fkey') THEN
    ALTER TABLE "announcements" ADD CONSTRAINT "announcements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_announcement_id_fkey') THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
