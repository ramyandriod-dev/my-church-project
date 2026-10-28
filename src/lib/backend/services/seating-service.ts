/**
 * Seating Service
 *
 * A checked-in member holds seats in one row for 5 minutes. The hold frees
 * itself: whether it still counts is decided from the clock on every read (see
 * lib/seating/reservation-rules), so nothing has to run and nobody has to confirm
 * for the seats to come back. Confirming ("I'm seated" from the member, or the
 * usher) only makes the hold permanent for the rest of the service.
 *
 * Rules:
 * - Seating is open while there is a service that has not been completed.
 * - Reserving needs the member to be checked in to that service.
 * - One reservation per member: a new one replaces the old.
 * - The member is taken from the login, never from the request.
 * - Two people taking the last seats at once: the reservation is written, then the
 *   row is re-counted in arrival order; whoever is over capacity is released and
 *   told the row filled up. (No transaction, to keep Worker CPU low.)
 */

import { BaseService } from "./base-service";
import { resolveOwnMember } from "./own-member";
import { attendanceRepository } from "../../db/repositories/attendance-repository";
import { seatReservationRepository } from "../../db/repositories/seat-reservation-repository";
import { requirePermission } from "../authorization";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import {
  MAX_SEATS_PER_RESERVATION,
  buildAvailability,
  holdExpiry,
  isActive,
  rowCapacity,
  type SectionAvailability,
} from "@/lib/seating/reservation-rules";
import type { TenantContext } from "../types";

export interface MySeatReservation {
  id: string;
  sectionId: string;
  row: string;
  seatCount: number;
  status: "held" | "seated";
  heldUntil: string;
}

export interface SeatingOverview {
  serviceId: string;
  serviceName: string;
  checkedIn: boolean;
  sections: SectionAvailability[];
  mine: MySeatReservation | null;
  holdMinutes: number;
  maxSeats: number;
  serverTime: string;
}

export interface UsherReservation extends MySeatReservation {
  memberName: string;
  expired: false;
}

export class SeatingService extends BaseService {
  private async activeService(ctx: TenantContext) {
    const service = await attendanceRepository.findActiveSession(ctx.tenantId, new Date());
    if (!service || service.status === "completed") {
      throw new NotFoundError("Seating opens during a service.");
    }
    return service;
  }

  private toMine(r: { id: string; sectionId: string; row: string; seatCount: number; status: string; heldUntil: Date }, now: Date): MySeatReservation | null {
    if (!isActive(r, now)) return null;
    return {
      id: r.id,
      sectionId: r.sectionId,
      row: r.row,
      seatCount: r.seatCount,
      status: r.status === "seated" ? "seated" : "held",
      heldUntil: r.heldUntil.toISOString(),
    };
  }

  async overview(ctx: TenantContext): Promise<SeatingOverview> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "seating.reserve");
    const member = await resolveOwnMember(ctx);
    const service = await this.activeService(ctx);
    const now = new Date();
    const [live, mine, checkIn] = await Promise.all([
      seatReservationRepository.listLive(ctx.tenantId, service.id),
      seatReservationRepository.findMine(ctx.tenantId, service.id, member.id),
      attendanceRepository.findCheckIn(ctx.tenantId, member.id, service.id),
    ]);
    return {
      serviceId: service.id,
      serviceName: service.name,
      checkedIn: !!checkIn,
      sections: buildAvailability(live, now),
      mine: mine ? this.toMine(mine, now) : null,
      holdMinutes: 5,
      maxSeats: MAX_SEATS_PER_RESERVATION,
      serverTime: now.toISOString(),
    };
  }

  async reserve(ctx: TenantContext, input: { sectionId: string; row: string; count: number }): Promise<MySeatReservation> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "seating.reserve");
    const { sectionId, row, count } = input;
    if (rowCapacity(sectionId, row) === null) throw new ValidationError({ row: ["Choose a row from the seating map"] });
    if (!Number.isInteger(count) || count < 1 || count > MAX_SEATS_PER_RESERVATION) {
      throw new ValidationError({ count: [`Choose between 1 and ${MAX_SEATS_PER_RESERVATION} seats`] });
    }

    const member = await resolveOwnMember(ctx);
    const service = await this.activeService(ctx);
    const checkIn = await attendanceRepository.findCheckIn(ctx.tenantId, member.id, service.id);
    if (!checkIn) throw new ForbiddenError("Check in first, then you can reserve seats.");

    // A new reservation replaces the member's old one.
    await seatReservationRepository.releaseAllFor(ctx.tenantId, service.id, member.id);

    const now = new Date();
    const created = await seatReservationRepository.create(ctx.tenantId, {
      serviceId: service.id,
      memberId: member.id,
      sectionId,
      row,
      seatCount: count,
      heldUntil: holdExpiry(now),
    });

    // Re-count the row in arrival order; if mine does not fit, give it back.
    const live = await seatReservationRepository.listLive(ctx.tenantId, service.id);
    const capacity = rowCapacity(sectionId, row) as number;
    let used = 0;
    for (const r of live) {
      if (r.sectionId !== sectionId || r.row !== row || !isActive(r, now)) continue;
      used += r.seatCount;
      if (r.id === created.id) break;
    }
    if (used > capacity) {
      await seatReservationRepository.setStatus(ctx.tenantId, created.id, "released");
      throw new ConflictError("Not enough free seats left in that row. Please choose another row.");
    }

    return this.toMine(created, now) as MySeatReservation;
  }

  /** "I'm seated": the member confirms their own hold. */
  async confirmMine(ctx: TenantContext): Promise<MySeatReservation> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "seating.reserve");
    const member = await resolveOwnMember(ctx);
    const service = await this.activeService(ctx);
    const now = new Date();
    const mine = await seatReservationRepository.findMine(ctx.tenantId, service.id, member.id);
    if (!mine || !isActive(mine, now)) throw new NotFoundError("Your reservation has expired. Please reserve again.");
    await seatReservationRepository.setStatus(ctx.tenantId, mine.id, "seated");
    return this.toMine({ ...mine, status: "seated" }, now) as MySeatReservation;
  }

  async releaseMine(ctx: TenantContext): Promise<void> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "seating.reserve");
    const member = await resolveOwnMember(ctx);
    const service = await this.activeService(ctx);
    await seatReservationRepository.releaseAllFor(ctx.tenantId, service.id, member.id);
  }

  // ─── Ushers ────────────────────────────────────────────────

  async listForUsher(ctx: TenantContext): Promise<UsherReservation[]> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "seating.manage");
    const service = await this.activeService(ctx);
    const now = new Date();
    const rows = await seatReservationRepository.listLiveWithMembers(ctx.tenantId, service.id);
    return rows
      .filter((r) => isActive(r, now))
      .map((r) => ({
        ...(this.toMine(r, now) as MySeatReservation),
        memberName: `${r.member.firstName} ${r.member.lastName}`.trim(),
        expired: false as const,
      }));
  }

  async usherSetStatus(ctx: TenantContext, id: string, status: "seated" | "released"): Promise<void> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "seating.manage");
    const r = await seatReservationRepository.findById(ctx.tenantId, id);
    if (!r) throw new NotFoundError("Reservation not found");
    if (status === "seated" && !isActive(r, new Date())) {
      throw new ConflictError("That hold has already expired.");
    }
    await seatReservationRepository.setStatus(ctx.tenantId, id, status);
  }
}

export const seatingService = new SeatingService();
