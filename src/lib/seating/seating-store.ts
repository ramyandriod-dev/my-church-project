/**
 * Sanctuary Seating Store (600 Total Seats)
 *
 * Cinema/theater-style seat grid management with real-time browser-to-browser
 * broadcast and persistent state for Usher mobile PWA and Leadership Dashboard.
 */

import {
  SectionId,
  SanctuarySectionDef,
  SeatInfo,
  UsherNotification,
  SeatingSnapshot,
} from "./seating-types";

export const TOTAL_SANCTUARY_CAPACITY = 600;

export const SANCTUARY_SECTIONS: SanctuarySectionDef[] = [
  {
    id: "ground_left",
    nameEn: "Ground Floor — Left Wing",
    nameAr: "الدور الأرضي — الجناح الأيسر",
    totalSeats: 160,
    rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    seatsPerRow: 16,
  },
  {
    id: "ground_center",
    nameEn: "Ground Floor — Center Section",
    nameAr: "الدور الأرضي — المنتصف",
    totalSeats: 200,
    rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    seatsPerRow: 20,
  },
  {
    id: "ground_right",
    nameEn: "Ground Floor — Right Wing",
    nameAr: "الدور الأرضي — الجناح الأيمن",
    totalSeats: 160,
    rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    seatsPerRow: 16,
  },
  {
    id: "gallery",
    nameEn: "Upper Gallery / Balcony",
    nameAr: "البلكون — الصالة العلوية",
    totalSeats: 80,
    rows: ["K", "L", "M", "N"],
    seatsPerRow: 20,
  },
];

const STORAGE_KEY = "cmp:sanctuary:seating:v1";
const BROADCAST_CHANNEL = "cmp:sanctuary:seating:channel";

export function generateInitialSeats(): Record<string, boolean> {
  const seats: Record<string, boolean> = {};

  // Initialize all 600 seats
  // By default during Friday service, simulate front and center rows mostly occupied (~420 occupied, ~180 available)
  for (const section of SANCTUARY_SECTIONS) {
    for (let rIdx = 0; rIdx < section.rows.length; rIdx++) {
      const row = section.rows[rIdx];
      for (let num = 1; num <= section.seatsPerRow; num++) {
        const seatId = `${section.id}-${row}-${num}`;
        // Rows closer to front (A-F) in center and wings have higher initial occupancy
        const isFrontRow = rIdx < 6;
        const isCenter = section.id === "ground_center";
        const isGallery = section.id === "gallery";

        let occupied = false;
        if (isCenter && isFrontRow) {
          occupied = num <= section.seatsPerRow - (num % 5 === 0 ? 1 : 0);
        } else if (isFrontRow) {
          occupied = (num + rIdx) % 4 !== 0;
        } else if (isGallery) {
          occupied = rIdx < 2 && num <= 14;
        } else {
          occupied = (num * 3 + rIdx) % 5 === 0;
        }

        seats[seatId] = occupied;
      }
    }
  }

  return seats;
}

const initialAlerts: UsherNotification[] = [
  {
    id: "alert-1",
    timestamp: "10:48 AM",
    sectionId: "ground_left",
    row: "Row 1",
    availableSeats: 3,
    messageEn: "3 seats available in first row left wing",
    messageAr: "3 مقاعد متوفرة في الصف الأول بالجناح الأيسر",
    usherName: "Mina (مينا)",
  },
  {
    id: "alert-2",
    timestamp: "10:45 AM",
    sectionId: "ground_center",
    row: "Rows 1-5",
    availableSeats: 0,
    messageEn: "Center section front rows totally occupied",
    messageAr: "صفوف المنتصف الأمامية مكتملة بالكامل",
    usherName: "David (داود)",
  },
  {
    id: "alert-3",
    timestamp: "10:40 AM",
    sectionId: "gallery",
    row: "Row K & L",
    availableSeats: 26,
    messageEn: "Gallery has 26 seats available, guide arriving youth upstairs",
    messageAr: "البلكون به 26 مقعد متاح، وجّهوا القادمين للأعلى",
    usherName: "Kerolos (كيرلس)",
  },
];

interface SeatingState {
  seats: Record<string, boolean>;
  alerts: UsherNotification[];
}

let currentState: SeatingState = {
  seats: generateInitialSeats(),
  alerts: initialAlerts,
};

let initialized = false;
const listeners = new Set<() => void>();

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function postBroadcast(state: SeatingState) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel(BROADCAST_CHANNEL);
    ch.postMessage({ type: "SEATING_UPDATE", state });
    ch.close();
  } catch {}
}

function persistState(state: SeatingState) {
  const s = safeStorage();
  if (s) {
    try {
      s.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }
  postBroadcast(state);
  listeners.forEach((l) => l());
}

export function initSeatingStore() {
  if (initialized) return;
  initialized = true;

  const s = safeStorage();
  if (s) {
    try {
      const raw = s.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.seats) {
          currentState = parsed;
        }
      }
    } catch {}
  }

  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
    try {
      const ch = new BroadcastChannel(BROADCAST_CHANNEL);
      ch.addEventListener("message", (ev) => {
        if (ev.data && ev.data.type === "SEATING_UPDATE" && ev.data.state) {
          currentState = ev.data.state;
          listeners.forEach((l) => l());
        }
      });
    } catch {}
  }
}

const initialBaselineSeats = generateInitialSeats();
const initialBaselineState: SeatingState = {
  seats: initialBaselineSeats,
  alerts: initialAlerts,
};
const STABLE_SEATING_SERVER_SNAPSHOT: SeatingSnapshot = computeSnapshot(initialBaselineState);

let cachedSnapshot: SeatingSnapshot = STABLE_SEATING_SERVER_SNAPSHOT;
let lastStateRef: SeatingState = currentState;

function computeSnapshot(state: SeatingState): SeatingSnapshot {
  let totalOccupied = 0;
  const sectionCounts: Record<SectionId, { total: number; occupied: number; available: number; occupancyRate: number }> = {
    ground_left: { total: 160, occupied: 0, available: 160, occupancyRate: 0 },
    ground_center: { total: 200, occupied: 0, available: 200, occupancyRate: 0 },
    ground_right: { total: 160, occupied: 0, available: 160, occupancyRate: 0 },
    gallery: { total: 80, occupied: 0, available: 80, occupancyRate: 0 },
  };

  for (const [seatId, isOccupied] of Object.entries(state.seats)) {
    if (isOccupied) {
      totalOccupied++;
      const section = seatId.split("-")[0] as SectionId;
      if (sectionCounts[section]) {
        sectionCounts[section].occupied++;
      }
    }
  }

  for (const s of SANCTUARY_SECTIONS) {
    const sec = sectionCounts[s.id];
    sec.available = Math.max(0, sec.total - sec.occupied);
    sec.occupancyRate = Math.round((sec.occupied / sec.total) * 100);
  }

  const totalAvailable = Math.max(0, TOTAL_SANCTUARY_CAPACITY - totalOccupied);
  const occupancyRate = Math.round((totalOccupied / TOTAL_SANCTUARY_CAPACITY) * 100);

  return {
    totalCapacity: TOTAL_SANCTUARY_CAPACITY,
    totalOccupied,
    totalAvailable,
    occupancyRate,
    sections: sectionCounts,
    seats: state.seats,
    latestAlert: state.alerts[0] ?? null,
    recentAlerts: state.alerts,
  };
}

export function getSeatingSnapshot(): SeatingSnapshot {
  initSeatingStore();
  if (!cachedSnapshot || lastStateRef !== currentState) {
    lastStateRef = currentState;
    cachedSnapshot = computeSnapshot(currentState);
  }
  return cachedSnapshot;
}

export function getSeatingServerSnapshot(): SeatingSnapshot {
  return STABLE_SEATING_SERVER_SNAPSHOT;
}

export function subscribeSeating(callback: () => void): () => void {
  initSeatingStore();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// ─── Usher Actions ──────────────────────────────────────────────────────────

/**
 * Toggle an individual seat between occupied and available.
 */
export function toggleSeatOccupied(seatId: string, usherName = "Usher"): boolean {
  initSeatingStore();
  const current = !!currentState.seats[seatId];
  const next = !current;

  const nextSeats = { ...currentState.seats, [seatId]: next };
  currentState = {
    ...currentState,
    seats: nextSeats,
  };

  persistState(currentState);
  return next;
}

/**
 * Toggle all seats in a specific row.
 */
export function toggleRowOccupied(sectionId: SectionId, row: string, setOccupied: boolean, usherName = "Usher") {
  initSeatingStore();
  const nextSeats = { ...currentState.seats };
  const section = SANCTUARY_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return;

  for (let num = 1; num <= section.seatsPerRow; num++) {
    const seatId = `${sectionId}-${row}-${num}`;
    nextSeats[seatId] = setOccupied;
  }

  // Create an automatic notification for ushers
  const secName = section.nameEn;
  const secNameAr = section.nameAr;
  const alert: UsherNotification = {
    id: `alert-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    sectionId,
    row: `Row ${row}`,
    availableSeats: setOccupied ? 0 : section.seatsPerRow,
    messageEn: setOccupied
      ? `${secName} Row ${row} marked totally full`
      : `${secName} Row ${row} marked available (${section.seatsPerRow} seats)`,
    messageAr: setOccupied
      ? `${secNameAr} الصف ${row} أصبح مكتملاً بالكامل`
      : `${secNameAr} الصف ${row} متوفر الآن (${section.seatsPerRow} مقاعد)`,
    usherName,
  };

  currentState = {
    seats: nextSeats,
    alerts: [alert, ...currentState.alerts.slice(0, 19)],
  };

  persistState(currentState);
}

/**
 * Broadcast a live usher message with section availability.
 */
export function broadcastUsherAlert(params: {
  sectionId: SectionId;
  row?: string;
  availableSeats: number;
  noteEn?: string;
  noteAr?: string;
  usherName?: string;
}) {
  initSeatingStore();
  const section = SANCTUARY_SECTIONS.find((s) => s.id === params.sectionId)!;
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const rowPrefix = params.row ? `${params.row} ` : "";
  const rowPrefixAr = params.row ? `الصف ${params.row} ` : "";

  let msgEn = params.noteEn;
  let msgAr = params.noteAr;

  if (!msgEn) {
    msgEn =
      params.availableSeats === 0
        ? `${section.nameEn} ${rowPrefix}is totally occupied`
        : `${params.availableSeats} seats available in ${section.nameEn} ${rowPrefix}`.trim();
  }
  if (!msgAr) {
    msgAr =
      params.availableSeats === 0
        ? `${section.nameAr} ${rowPrefixAr}مكتمل بالكامل`
        : `${params.availableSeats} مقاعد شاغرة في ${section.nameAr} ${rowPrefixAr}`.trim();
  }

  const alert: UsherNotification = {
    id: `alert-${Date.now()}`,
    timestamp: time,
    sectionId: params.sectionId,
    row: params.row,
    availableSeats: params.availableSeats,
    messageEn: msgEn,
    messageAr: msgAr,
    usherName: params.usherName || "Usher (فريق النظام)",
  };

  currentState = {
    ...currentState,
    alerts: [alert, ...currentState.alerts.slice(0, 19)],
  };

  persistState(currentState);
}

/**
 * Reset seats back to default simulation baseline.
 */
export function resetSanctuarySeats() {
  currentState = {
    seats: generateInitialSeats(),
    alerts: initialAlerts,
  };
  persistState(currentState);
}
