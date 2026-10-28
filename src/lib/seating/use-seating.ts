"use client";

import { useSyncExternalStore, useMemo } from "react";
import {
  getSeatingSnapshot,
  getSeatingServerSnapshot,
  subscribeSeating,
  toggleSeatOccupied,
  toggleRowOccupied,
  broadcastUsherAlert,
  resetSanctuarySeats,
  SANCTUARY_SECTIONS,
  TOTAL_SANCTUARY_CAPACITY,
} from "./seating-store";
import type { SeatingSnapshot, SectionId } from "./seating-types";

export function useSanctuarySeating() {
  const snapshot: SeatingSnapshot = useSyncExternalStore(
    subscribeSeating,
    getSeatingSnapshot,
    getSeatingServerSnapshot
  );

  return useMemo(
    () => ({
      ...snapshot,
      totalCapacity: TOTAL_SANCTUARY_CAPACITY,
      sectionsList: SANCTUARY_SECTIONS,
      toggleSeat: toggleSeatOccupied,
      toggleRow: toggleRowOccupied,
      broadcastAlert: broadcastUsherAlert,
      resetSeats: resetSanctuarySeats,
    }),
    [snapshot]
  );
}
