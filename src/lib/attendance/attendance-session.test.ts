import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  encodeAttendanceSessionToken,
  decodeAttendanceSessionToken,
  ATTENDANCE_SESSION_TYPE,
} from "./attendance-session";

const futureFriday = () => new Date(2026, 9, 2, 11, 0, 0); // Friday 11:00

describe("Attendance Session Token (QR)", () => {
  const params = { serviceId: "svc-1", tenantId: "tenant-1" };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(futureFriday());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips a valid signed session token with no member data", async () => {
    const token = await encodeAttendanceSessionToken(params, futureFriday());
    const decoded = await decodeAttendanceSessionToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.serviceId).toBe("svc-1");
    expect(decoded?.tenantId).toBe("tenant-1");
    expect(decoded?.sessionType).toBe(ATTENDANCE_SESSION_TYPE);
    // No member identity is ever present in the QR payload.
    expect(JSON.stringify(decoded)).not.toContain("member");
  });

  it("expires exactly at the Friday window close (13:00)", async () => {
    const token = await encodeAttendanceSessionToken(params, futureFriday());
    const decoded = await decodeAttendanceSessionToken(token);

    const expectedExp = Math.floor(
      new Date(2026, 9, 2, 13, 0, 0).getTime() / 1000
    );
    expect(decoded?.exp).toBe(expectedExp);
  });

  it("rejects tampered tokens", async () => {
    const token = await encodeAttendanceSessionToken(params, futureFriday());
    const tampered = token.slice(0, -8) + "XXXX";
    expect(await decodeAttendanceSessionToken(tampered)).toBeNull();
  });

  it("rejects expired tokens (session closed)", async () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const token = await encodeAttendanceSessionToken(params, past);
    expect(await decodeAttendanceSessionToken(token)).toBeNull();
  });

  it("rejects garbage input", async () => {
    expect(await decodeAttendanceSessionToken("not-a-token")).toBeNull();
  });
});