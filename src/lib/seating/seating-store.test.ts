import { describe, it, expect, beforeEach } from "vitest";
import {
  TOTAL_SANCTUARY_CAPACITY,
  SANCTUARY_SECTIONS,
  getSeatingSnapshot,
  toggleSeatOccupied,
  toggleRowOccupied,
  broadcastUsherAlert,
  resetSanctuarySeats,
} from "./seating-store";

describe("Sanctuary Seating Store (600 Seats)", () => {
  beforeEach(() => {
    resetSanctuarySeats();
  });

  it("has exactly 600 total sanctuary capacity across 4 sections", () => {
    expect(TOTAL_SANCTUARY_CAPACITY).toBe(600);
    const sum = SANCTUARY_SECTIONS.reduce((acc, sec) => acc + sec.totalSeats, 0);
    expect(sum).toBe(600);

    const snapshot = getSeatingSnapshot();
    expect(snapshot.totalCapacity).toBe(600);
    expect(snapshot.totalAvailable + snapshot.totalOccupied).toBe(600);
  });

  it("decreases available seats when a seat is marked occupied", () => {
    const before = getSeatingSnapshot();
    const testSeatId = "ground_left-A-1";
    const initiallyOccupied = !!before.seats[testSeatId];

    // Toggle seat
    toggleSeatOccupied(testSeatId);
    const after = getSeatingSnapshot();

    if (initiallyOccupied) {
      expect(after.totalAvailable).toBe(before.totalAvailable + 1);
      expect(after.totalOccupied).toBe(before.totalOccupied - 1);
    } else {
      expect(after.totalAvailable).toBe(before.totalAvailable - 1);
      expect(after.totalOccupied).toBe(before.totalOccupied + 1);
    }
  });

  it("toggles all seats in a row and generates an alert", () => {
    toggleRowOccupied("ground_center", "A", true, "Usher Mina");
    const snapshot = getSeatingSnapshot();

    // Row A in center has 20 seats, all should now be occupied
    for (let i = 1; i <= 20; i++) {
      expect(snapshot.seats[`ground_center-A-${i}`]).toBe(true);
    }

    expect(snapshot.latestAlert).not.toBeNull();
    expect(snapshot.latestAlert?.sectionId).toBe("ground_center");
    expect(snapshot.latestAlert?.availableSeats).toBe(0);
  });

  it("broadcasts custom usher availability alert", () => {
    broadcastUsherAlert({
      sectionId: "ground_left",
      row: "Row 1",
      availableSeats: 3,
      noteEn: "3 seats available in first row left wing",
      noteAr: "3 مقاعد متوفرة في الصف الأول بالجناح الأيسر",
      usherName: "Mark (مرقس)",
    });

    const snapshot = getSeatingSnapshot();
    expect(snapshot.latestAlert?.availableSeats).toBe(3);
    expect(snapshot.latestAlert?.messageEn).toBe("3 seats available in first row left wing");
    expect(snapshot.latestAlert?.usherName).toBe("Mark (مرقس)");
  });

  it("returns the exact same cached object reference on consecutive calls (useSyncExternalStore-safe)", () => {
    const s1 = getSeatingSnapshot();
    const s2 = getSeatingSnapshot();
    expect(s1).toBe(s2);
  });
});
