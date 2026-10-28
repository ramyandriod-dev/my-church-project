-- Seat reservations (member seating). Safe to re-run: IF NOT EXISTS / guarded constraints.

CREATE TABLE IF NOT EXISTS "seat_reservations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "section_id" VARCHAR(30) NOT NULL,
    "row" VARCHAR(4) NOT NULL,
    "seat_count" INTEGER NOT NULL,
    "status" VARCHAR(12) NOT NULL DEFAULT 'held',
    "held_until" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seat_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "seat_reservations_tenant_id_service_id_status_idx" ON "seat_reservations"("tenant_id", "service_id", "status");

CREATE INDEX IF NOT EXISTS "seat_reservations_tenant_id_member_id_idx" ON "seat_reservations"("tenant_id", "member_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seat_reservations_tenant_id_fkey') THEN
    ALTER TABLE "seat_reservations" ADD CONSTRAINT "seat_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seat_reservations_service_id_fkey') THEN
    ALTER TABLE "seat_reservations" ADD CONSTRAINT "seat_reservations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seat_reservations_member_id_fkey') THEN
    ALTER TABLE "seat_reservations" ADD CONSTRAINT "seat_reservations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
