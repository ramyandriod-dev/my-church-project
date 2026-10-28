/**
 * Sanctuary Seating & Capacity Types
 * Total Sanctuary Capacity: 600 seats
 */

export type SectionId = "ground_left" | "ground_center" | "ground_right" | "gallery";

export interface SanctuarySectionDef {
  id: SectionId;
  nameEn: string;
  nameAr: string;
  totalSeats: number;
  rows: string[];
  seatsPerRow: number;
}

export interface SeatInfo {
  id: string; // e.g., "ground_left-A-1"
  sectionId: SectionId;
  row: string; // e.g., "A"
  number: number; // 1-indexed
  isOccupied: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UsherNotification {
  id: string;
  timestamp: string;
  sectionId: SectionId;
  row?: string;
  availableSeats: number;
  messageEn: string;
  messageAr: string;
  usherName: string;
}

export interface SeatingSnapshot {
  totalCapacity: number; // 600
  totalOccupied: number;
  totalAvailable: number;
  occupancyRate: number; // 0 - 100%
  sections: Record<SectionId, {
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  }>;
  seats: Record<string, boolean>; // seatId -> isOccupied
  latestAlert: UsherNotification | null;
  recentAlerts: UsherNotification[];
}
