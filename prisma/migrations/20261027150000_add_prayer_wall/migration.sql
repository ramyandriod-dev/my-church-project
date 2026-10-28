-- Prayer wall. Written to be safe to re-run (IF NOT EXISTS / guarded constraints),
-- because some environments were created with `prisma db push` rather than migrations.

CREATE TABLE IF NOT EXISTS "prayer_wall_posts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "author_member_id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'prayer',
    "body" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_wall_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "prayer_wall_prayers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_wall_prayers_pkey" PRIMARY KEY ("id")
);

-- Added after the first release: the author may choose to show their name.
ALTER TABLE "prayer_wall_posts" ADD COLUMN IF NOT EXISTS "show_name" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "prayer_wall_posts_tenant_id_status_created_at_idx" ON "prayer_wall_posts"("tenant_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "prayer_wall_posts_tenant_id_author_member_id_idx" ON "prayer_wall_posts"("tenant_id", "author_member_id");

CREATE UNIQUE INDEX IF NOT EXISTS "prayer_wall_prayers_post_id_user_id_key" ON "prayer_wall_prayers"("post_id", "user_id");

CREATE INDEX IF NOT EXISTS "prayer_wall_prayers_tenant_id_idx" ON "prayer_wall_prayers"("tenant_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prayer_wall_posts_tenant_id_fkey') THEN
    ALTER TABLE "prayer_wall_posts" ADD CONSTRAINT "prayer_wall_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prayer_wall_posts_author_member_id_fkey') THEN
    ALTER TABLE "prayer_wall_posts" ADD CONSTRAINT "prayer_wall_posts_author_member_id_fkey" FOREIGN KEY ("author_member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prayer_wall_posts_reviewed_by_user_id_fkey') THEN
    ALTER TABLE "prayer_wall_posts" ADD CONSTRAINT "prayer_wall_posts_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prayer_wall_prayers_tenant_id_fkey') THEN
    ALTER TABLE "prayer_wall_prayers" ADD CONSTRAINT "prayer_wall_prayers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prayer_wall_prayers_post_id_fkey') THEN
    ALTER TABLE "prayer_wall_prayers" ADD CONSTRAINT "prayer_wall_prayers_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "prayer_wall_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prayer_wall_prayers_user_id_fkey') THEN
    ALTER TABLE "prayer_wall_prayers" ADD CONSTRAINT "prayer_wall_prayers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
