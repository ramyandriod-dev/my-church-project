-- CreateTable
CREATE TABLE "attendance_exceptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'excused',
    "reason" VARCHAR(100),
    "note" TEXT,
    "recorded_by" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_exceptions_tenant_id_member_id_service_id_key" ON "attendance_exceptions"("tenant_id", "member_id", "service_id");

-- CreateIndex
CREATE INDEX "attendance_exceptions_tenant_id_idx" ON "attendance_exceptions"("tenant_id");

-- CreateIndex
CREATE INDEX "attendance_exceptions_tenant_id_service_id_idx" ON "attendance_exceptions"("tenant_id", "service_id");

-- CreateIndex
CREATE INDEX "attendance_exceptions_tenant_id_member_id_idx" ON "attendance_exceptions"("tenant_id", "member_id");

-- AddForeignKey
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;