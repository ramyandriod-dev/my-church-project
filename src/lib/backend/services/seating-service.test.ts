/**
 * Seating Service: a checked-in member holds seats in a row for 5 minutes, and
 * the hold frees itself.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { seatingService } from "./seating-service";
import { seatReservationRepository } from "../../db/repositories/seat-reservation-repository";
import { attendanceRepository } from "../../db/repositories/attendance-repository";
import { resolveOwnMember } from "./own-member";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import type { TenantContext } from "../types";

vi.mock("../../db/repositories/seat-reservation-repository", () => ({
  seatReservationRepository: {
    listLive: vi.fn(),
    findMine: vi.fn(),
    create: vi.fn(),
    setStatus: vi.fn(),
    releaseAllFor: vi.fn(),
    findById: vi.fn(),
    listLiveWithMembers: vi.fn(),
  },
}));
vi.mock("../../db/repositories/attendance-repository", () => ({
  attendanceRepository: { findActiveSession: vi.fn(), findCheckIn: vi.fn() },
}));
vi.mock("./own-member", () => ({ resolveOwnMember: vi.fn() }));

const seats = vi.mocked(seatReservationRepository);
const attendance = vi.mocked(attendanceRepository);
const ownMember = vi.mocked(resolveOwnMember);

const NOW = new Date("2026-10-30T09:00:00Z");
const service = { id: "svc-1", name: "Friday Main Service", status: "live" };
const member = (perms: string[]): TenantContext => ({ tenantId: "t-1", userId: "u-1", role: "member", permissions: perms });
const memberCtx = member(["seating.reserve"]);
const usherCtx = member(["seating.manage"]);

const row = (over: Record<string, unknown> = {}) => ({
  id: "r-1", serviceId: "svc-1", memberId: "m-me", sectionId: "ground_left", row: "A", seatCount: 2,
  status: "held", heldUntil: new Date(NOW.getTime() + 5 * 60_000), createdAt: NOW, ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.resetAllMocks();
  ownMember.mockResolvedValue({ id: "m-me" });
  attendance.findActiveSession.mockResolvedValue(service as never);
  attendance.findCheckIn.mockResolvedValue({ id: "c-1" } as never);
  seats.listLive.mockResolvedValue([]);
  seats.findMine.mockResolvedValue(null);
  seats.create.mockImplementation(async (_t, d) => row({ ...d, id: "new" }) as never);
});
afterEach(() => vi.useRealTimers());

describe("seatingService.reserve", () => {
  it("holds the seats for five minutes", async () => {
    const r = await seatingService.reserve(memberCtx, { sectionId: "ground_left", row: "A", count: 2 });
    expect(r.status).toBe("held");
    expect(r.heldUntil).toBe("2026-10-30T09:05:00.000Z");
    expect(seats.releaseAllFor).toHaveBeenCalledWith("t-1", "svc-1", "m-me");
  });

  it("needs a check-in for this service", async () => {
    attendance.findCheckIn.mockResolvedValue(null);
    await expect(seatingService.reserve(memberCtx, { sectionId: "ground_left", row: "A", count: 1 })).rejects.toBeInstanceOf(ForbiddenError);
    expect(seats.create).not.toHaveBeenCalled();
  });

  it("is closed when no service is happening", async () => {
    attendance.findActiveSession.mockResolvedValue({ ...service, status: "completed" } as never);
    await expect(seatingService.reserve(memberCtx, { sectionId: "ground_left", row: "A", count: 1 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("needs the seating.reserve permission", async () => {
    await expect(seatingService.reserve(member([]), { sectionId: "ground_left", row: "A", count: 1 })).rejects.toThrow();
  });

  it("rejects unknown rows and bad counts", async () => {
    await expect(seatingService.reserve(memberCtx, { sectionId: "gallery", row: "A", count: 1 })).rejects.toBeInstanceOf(ValidationError);
    await expect(seatingService.reserve(memberCtx, { sectionId: "ground_left", row: "A", count: 0 })).rejects.toBeInstanceOf(ValidationError);
    await expect(seatingService.reserve(memberCtx, { sectionId: "ground_left", row: "A", count: 7 })).rejects.toBeInstanceOf(ValidationError);
  });

  it("gives the seats back when the row filled up first", async () => {
    // 15 of 16 seats already held by someone who arrived earlier; I ask for 2.
    const earlier = row({ id: "r-earlier", memberId: "m-other", seatCount: 15, createdAt: new Date(NOW.getTime() - 1000) });
    seats.listLive.mockResolvedValue([earlier, row({ id: "new", seatCount: 2 })] as never);
    await expect(seatingService.reserve(memberCtx, { sectionId: "ground_left", row: "A", count: 2 })).rejects.toBeInstanceOf(ConflictError);
    expect(seats.setStatus).toHaveBeenCalledWith("t-1", "new", "released");
  });

  it("does not count an earlier hold that has already expired", async () => {
    const expired = row({ id: "r-old", memberId: "m-other", seatCount: 16, heldUntil: new Date(NOW.getTime() - 1000), createdAt: new Date(NOW.getTime() - 400_000) });
    seats.listLive.mockResolvedValue([expired, row({ id: "new", seatCount: 2 })] as never);
    await expect(seatingService.reserve(memberCtx, { sectionId: "ground_left", row: "A", count: 2 })).resolves.toMatchObject({ status: "held" });
  });
});

describe("seatingService.overview", () => {
  it("shows free seats, ignoring expired holds, and whether I am checked in", async () => {
    const live = [row({ seatCount: 4 }), row({ id: "r-x", seatCount: 10, heldUntil: new Date(NOW.getTime() - 1) })];
    seats.listLive.mockResolvedValue(live as never);
    const o = await seatingService.overview(memberCtx);
    expect(o.checkedIn).toBe(true);
    const a = o.sections.find((s) => s.id === "ground_left")!.rows[0];
    expect(a.available).toBe(12); // 16 - 4; the expired 10 are free again
  });

  it("hides my reservation once it has expired", async () => {
    seats.findMine.mockResolvedValue(row({ heldUntil: new Date(NOW.getTime() - 1) }) as never);
    expect((await seatingService.overview(memberCtx)).mine).toBeNull();
  });
});

describe("confirming and releasing", () => {
  it("I'm seated makes my hold permanent", async () => {
    seats.findMine.mockResolvedValue(row() as never);
    const r = await seatingService.confirmMine(memberCtx);
    expect(r.status).toBe("seated");
    expect(seats.setStatus).toHaveBeenCalledWith("t-1", "r-1", "seated");
  });

  it("cannot confirm a hold that already ran out", async () => {
    seats.findMine.mockResolvedValue(row({ heldUntil: new Date(NOW.getTime() - 1) }) as never);
    await expect(seatingService.confirmMine(memberCtx)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ushers", () => {
  it("only usher-level callers see reservations", async () => {
    await expect(seatingService.listForUsher(memberCtx)).rejects.toThrow();
  });

  it("lists live reservations with names and drops expired ones", async () => {
    seats.listLiveWithMembers.mockResolvedValue([
      { ...row(), member: { firstName: "Mina", lastName: "Samir" } },
      { ...row({ id: "r-old", heldUntil: new Date(NOW.getTime() - 1) }), member: { firstName: "Old", lastName: "Hold" } },
    ] as never);
    const list = await seatingService.listForUsher(usherCtx);
    expect(list.map((r) => r.memberName)).toEqual(["Mina Samir"]);
  });

  it("cannot confirm an expired hold", async () => {
    seats.findById.mockResolvedValue(row({ heldUntil: new Date(NOW.getTime() - 1) }) as never);
    await expect(seatingService.usherSetStatus(usherCtx, "r-1", "seated")).rejects.toBeInstanceOf(ConflictError);
  });
});
