/**
 * Seat Reservation Repository. Tenant-scoped; every query filters on the
 * server-resolved tenantId. Whether a hold still counts is decided by the caller
 * with `isActive` (lib/seating/reservation-rules), never by a stored flag.
 */

import prisma from "../prisma";

export interface ReservationRow {
  id: string;
  serviceId: string;
  memberId: string;
  sectionId: string;
  row: string;
  seatCount: number;
  status: string;
  heldUntil: Date;
  createdAt: Date;
}

const select = {
  id: true,
  serviceId: true,
  memberId: true,
  sectionId: true,
  row: true,
  seatCount: true,
  status: true,
  heldUntil: true,
  createdAt: true,
} as const;

export const seatReservationRepository = {
  /** Held and seated reservations of a service (expired holds included; filter with isActive). */
  async listLive(tenantId: string, serviceId: string): Promise<ReservationRow[]> {
    return prisma.seatReservation.findMany({
      where: { tenantId, serviceId, status: { in: ["held", "seated"] } },
      select,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  },

  async findMine(tenantId: string, serviceId: string, memberId: string): Promise<ReservationRow | null> {
    return prisma.seatReservation.findFirst({
      where: { tenantId, serviceId, memberId, status: { in: ["held", "seated"] } },
      select,
      orderBy: { createdAt: "desc" },
    });
  },

  async create(
    tenantId: string,
    data: { serviceId: string; memberId: string; sectionId: string; row: string; seatCount: number; heldUntil: Date },
  ): Promise<ReservationRow> {
    return prisma.seatReservation.create({ data: { tenantId, status: "held", ...data }, select });
  },

  async setStatus(tenantId: string, id: string, status: "held" | "seated" | "released") {
    const res = await prisma.seatReservation.updateMany({ where: { id, tenantId }, data: { status } });
    return res.count > 0;
  },

  /** Releases every live reservation this member holds in the service. */
  async releaseAllFor(tenantId: string, serviceId: string, memberId: string) {
    await prisma.seatReservation.updateMany({
      where: { tenantId, serviceId, memberId, status: { in: ["held", "seated"] } },
      data: { status: "released" },
    });
  },

  async findById(tenantId: string, id: string): Promise<ReservationRow | null> {
    return prisma.seatReservation.findFirst({ where: { id, tenantId }, select });
  },

  /** For the usher screen: live reservations with the member's name. */
  async listLiveWithMembers(tenantId: string, serviceId: string) {
    return prisma.seatReservation.findMany({
      where: { tenantId, serviceId, status: { in: ["held", "seated"] } },
      select: { ...select, member: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
};
