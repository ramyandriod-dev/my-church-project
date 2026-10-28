-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "sender_kind" VARCHAR(10) NOT NULL,
    "sender_user_id" UUID,
    "sender_name" VARCHAR(120) NOT NULL,
    "body" TEXT NOT NULL,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'in_app',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_tenant_id_idx" ON "messages"("tenant_id");

-- CreateIndex
CREATE INDEX "messages_tenant_id_member_id_created_at_idx" ON "messages"("tenant_id", "member_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_tenant_id_member_id_sender_kind_read_at_idx" ON "messages"("tenant_id", "member_id", "sender_kind", "read_at");

-- CreateIndex
CREATE INDEX "messages_tenant_id_sender_kind_read_at_idx" ON "messages"("tenant_id", "sender_kind", "read_at");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- Compound on (member_id, tenant_id) so a message can never be filed against a
-- member belonging to another tenant.
ALTER TABLE "messages" ADD CONSTRAINT "messages_member_id_tenant_id_fkey" FOREIGN KEY ("member_id", "tenant_id") REFERENCES "members"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
