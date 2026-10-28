-- CreateTable
CREATE TABLE "families" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "family_photo_url" VARCHAR(500),
    "head_member_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_relationships" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "from_member_id" UUID NOT NULL,
    "to_member_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "families_tenant_id_idx" ON "families"("tenant_id");

-- CreateIndex
CREATE INDEX "families_tenant_id_head_member_id_idx" ON "families"("tenant_id", "head_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "families_tenant_id_name_key" ON "families"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "family_relationships_tenant_id_family_id_idx" ON "family_relationships"("tenant_id", "family_id");

-- CreateIndex
CREATE INDEX "family_relationships_tenant_id_from_member_id_idx" ON "family_relationships"("tenant_id", "from_member_id");

-- CreateIndex
CREATE INDEX "family_relationships_tenant_id_to_member_id_idx" ON "family_relationships"("tenant_id", "to_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_relationships_tenant_id_family_id_from_member_id_to__key" ON "family_relationships"("tenant_id", "family_id", "from_member_id", "to_member_id", "type");

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_head_member_id_fkey" FOREIGN KEY ("head_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_relationships" ADD CONSTRAINT "family_relationships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_relationships" ADD CONSTRAINT "family_relationships_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_relationships" ADD CONSTRAINT "family_relationships_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_relationships" ADD CONSTRAINT "family_relationships_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

