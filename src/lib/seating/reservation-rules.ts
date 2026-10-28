/**
 * Seat reservation rules (pure, no database).
 *
 * A member reserves a COUNT of seats in one ROW; the usher shows them the exact
 * seats. A reservation is a hold for HOLD_MINUTES. It frees itself: whether a hold
 * still counts is decided from the clock whenever it is read, so no timer or job
 * has to run, and nobody has to confirm anything for the seats to come back.
 *
 *   held    counts until `heldUntil`, then stops counting
 *   seated  counts for the rest of the service (member or usher confirmed)
 *   released  never counts
 */

import { SANCTUARY_SECTIONS } from "./seating-store";
import type { SectionId } from "./seating-types";

export const HOLD_MINUTES = 5;
export const MAX_SEATS_PER_RESERVATION = 6;

export type ReservationStatus = "held" | "seated" | "released";

export interface ReservationLike {
  sectionId: string;
  row: string;
  seatCount: number;
  status: string;
  heldUntil: Date | string;
}

export function holdExpiry(now: Date): Date {
  return new Date(now.getTime() + HOLD_MINUTES * 60_000);
}

/** True while the reservation takes seats away from other people. */
export function isActive(r: Pick<ReservationLike, "status" | "heldUntil">, now: Date): boolean {
  if (r.status === "seated") return true;
  if (r.status !== "held") return false;
  return new Date(r.heldUntil).getTime() > now.getTime();
}

export function rowCapacity(sectionId: string, row: string): number | null {
  const section = SANCTUARY_SECTIONS.find((s) => s.id === sectionId);
  if (!section || !section.rows.includes(row)) return null;
  return section.seatsPerRow;
}

export function freeSeatsInRow(
  sectionId: string,
  row: string,
  reservations: readonly ReservationLike[],
  now: Date,
): number {
  const capacity = rowCapacity(sectionId, row);
  if (capacity === null) return 0;
  const taken = reservations
    .filter((r) => r.sectionId === sectionId && r.row === row && isActive(r, now))
    .reduce((sum, r) => sum + r.seatCount, 0);
  return Math.max(0, capacity - taken);
}

export interface RowAvailability {
  row: string;
  total: number;
  available: number;
}
export interface SectionAvailability {
  id: SectionId;
  nameEn: string;
  nameAr: string;
  available: number;
  rows: RowAvailability[];
}

export function buildAvailability(reservations: readonly ReservationLike[], now: Date): SectionAvailability[] {
  return SANCTUARY_SECTIONS.map((s) => {
    const rows = s.rows.map((row) => ({
      row,
      total: s.seatsPerRow,
      available: freeSeatsInRow(s.id, row, reservations, now),
    }));
    return {
      id: s.id,
      nameEn: s.nameEn,
      nameAr: s.nameAr,
      available: rows.reduce((n, r) => n + r.available, 0),
      rows,
    };
  });
}
