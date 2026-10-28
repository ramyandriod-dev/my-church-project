/**
 * The dashboard's "Reset check-ins" must tell the truth. It used to clear the
 * screen first and ask the server afterwards, so a refused request left the CRM
 * looking reset while members were still checked in.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetAttendanceState } from "./use-demo-clock";

const alertSpy = vi.fn();
const storage = new Map<string, string>();

beforeEach(() => {
  vi.clearAllMocks();
  storage.clear();
  vi.stubGlobal("window", { alert: alertSpy, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

const answer = (status: number, body: unknown = {}) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

describe("resetAttendanceState", () => {
  it("clears the screen only after the server confirms", async () => {
    answer(200, { success: true });
    expect(await resetAttendanceState()).toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(storage.has("cmp:attendance-reset-trigger")).toBe(true);
  });

  it("says so, and leaves the screen alone, when the server refuses", async () => {
    answer(403, { error: { message: "Missing required permission: attendance.checkin" } });
    expect(await resetAttendanceState()).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("NOT reset"));
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Missing required permission"));
    expect(storage.has("cmp:attendance-reset-trigger")).toBe(false);
  });

  it("says so when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await resetAttendanceState()).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("could not be reached"));
    expect(storage.has("cmp:attendance-reset-trigger")).toBe(false);
  });
});
