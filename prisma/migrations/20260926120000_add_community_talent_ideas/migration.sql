-- AlterTable
ALTER TABLE "users" ADD COLUMN     "member_id" UUID;

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(60),
    "is_suggested" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "profession_category" VARCHAR(60),
    "profession" VARCHAR(150),
    "experience" TEXT,
    "years_experience" INTEGER,
    "willingness" VARCHAR(20) NOT NULL DEFAULT 'maybe',
    "willing_areas" TEXT,
    "is_discoverable" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_skills" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ideas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "submitted_by_member_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "category_other" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "internal_notes" TEXT,
    "owner_id" UUID,
    "status_changed_at" TIMESTAMP(3),
    "status_changed_by_id" UUID,
    "implemented_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skills_tenant_id_idx" ON "skills"("tenant_id");

-- CreateIndex
CREATE INDEX "skills_tenant_id_category_idx" ON "skills"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "skills_tenant_id_name_key" ON "skills"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_id_tenant_id_key" ON "skills"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "talent_profiles_tenant_id_idx" ON "talent_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "talent_profiles_tenant_id_is_discoverable_idx" ON "talent_profiles"("tenant_id", "is_discoverable");

-- CreateIndex
CREATE INDEX "talent_profiles_tenant_id_willingness_idx" ON "talent_profiles"("tenant_id", "willingness");

-- CreateIndex
CREATE INDEX "talent_profiles_tenant_id_profession_category_idx" ON "talent_profiles"("tenant_id", "profession_category");

-- CreateIndex
CREATE UNIQUE INDEX "talent_profiles_member_id_key" ON "talent_profiles"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "talent_profiles_member_id_tenant_id_key" ON "talent_profiles"("member_id", "tenant_id");

-- CreateIndex
CREATE INDEX "member_skills_tenant_id_idx" ON "member_skills"("tenant_id");

-- CreateIndex
CREATE INDEX "member_skills_tenant_id_skill_id_idx" ON "member_skills"("tenant_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_skills_member_id_skill_id_key" ON "member_skills"("member_id", "skill_id");

-- CreateIndex
CREATE INDEX "ideas_tenant_id_idx" ON "ideas"("tenant_id");

-- CreateIndex
CREATE INDEX "ideas_tenant_id_status_idx" ON "ideas"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "ideas_tenant_id_category_idx" ON "ideas"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "ideas_tenant_id_submitted_by_member_id_idx" ON "ideas"("tenant_id", "submitted_by_member_id");

-- CreateIndex
CREATE INDEX "ideas_tenant_id_created_at_idx" ON "ideas"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_member_id_key" ON "users"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_tenant_id_key" ON "users"("id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_id_tenant_id_key" ON "members"("id", "tenant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_profiles" ADD CONSTRAINT "talent_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_profiles" ADD CONSTRAINT "talent_profiles_member_id_tenant_id_fkey" FOREIGN KEY ("member_id", "tenant_id") REFERENCES "members"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_profiles" ADD CONSTRAINT "talent_profiles_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_skills" ADD CONSTRAINT "member_skills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_skills" ADD CONSTRAINT "member_skills_member_id_tenant_id_fkey" FOREIGN KEY ("member_id", "tenant_id") REFERENCES "members"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_skills" ADD CONSTRAINT "member_skills_skill_id_tenant_id_fkey" FOREIGN KEY ("skill_id", "tenant_id") REFERENCES "skills"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_submitted_by_member_id_tenant_id_fkey" FOREIGN KEY ("submitted_by_member_id", "tenant_id") REFERENCES "members"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_status_changed_by_id_fkey" FOREIGN KEY ("status_changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

