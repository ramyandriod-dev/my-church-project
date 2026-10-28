import { describe, it, expect, vi, afterEach } from "vitest";
import { performCheckIn, fetchDemoMembers, signInAsMember } from "./api";
import { setDemoStateId } from "@/lib/demo/demo-clock-store";

/**
 * M5 demo API client tests: verify the demo always talks to the REAL M4
 * endpoints over HTTP with the minimum payload required — and never sends
 * a memberId (identity must stay server-derived).
 */

const member = {
  id: "m-1",
  firstName: "John",
  lastName: "Smith",
  email: "john.smith@example.com",
  avatarUrl: null,
  status: "active",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("performCheckIn", () => {
  it("POSTs the QR session token as the ONLY field to /api/attendance/check-in", async () => {
    const record = {
      id: "r-1",
      memberId: "m-1",
      serviceId: "svc-1",
      checkInTime: new Date().toISOString(),
      method: "qr",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { record, alreadyCheckedIn: false } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await performCheckIn("SOME-TOKEN");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/attendance/check-in");
    expect(init.method).toBe("POST");
    // Strict body: only sessionToken. No memberId, no identity fields.
    expect(JSON.parse(init.body)).toEqual({ sessionToken: "SOME-TOKEN" });
  });

  it("surfaces the server error message when a scan is rejected", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: { code: "FORBIDDEN", message: "Attendance window has closed" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(performCheckIn("T")).rejects.toThrow("Attendance window has closed");
  });

  it("attaches the shared Demo clock header when Demo Mode is active (dev-only)", async () => {
    setDemoStateId("1259");
    try {
      const record = {
        id: "r-1",
        memberId: "m-1",
        serviceId: "svc-1",
        checkInTime: new Date().toISOString(),
        method: "qr",
      };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { record, alreadyCheckedIn: false } }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await performCheckIn("TOKEN");

      const [, init] = fetchMock.mock.calls[0];
      const demoTime = new Date(init.headers["x-demo-now"]);
      expect(demoTime.getHours()).toBe(12);
      expect(demoTime.getMinutes()).toBe(59);
    } finally {
      setDemoStateId(null);
    }
  });

  it("sends no demo clock when Demo Mode is OFF", async () => {
    setDemoStateId(null);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { record: { id: "r", memberId: "m", serviceId: "s", checkInTime: new Date().toISOString(), method: "qr" }, alreadyCheckedIn: false },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await performCheckIn("T");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-demo-now"]).toBeUndefined();
  });
});

describe("fetchDemoMembers", () => {
  it("GETs /api/members for the current tenant", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { data: [member], pagination: { total: 1 } },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const members = await fetchDemoMembers();
    expect(members).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/members");
    expect(init?.method ?? "GET").toBe("GET");
  });
});

describe("signInAsMember", () => {
  it("signs in via the real /api/auth/login endpoint", async () => {
    const user = { id: "u-1", email: member.email, name: "John Smith", role: "member", tenantId: "t-1", tenantName: "grace-community" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { user } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await signInAsMember(member);
    expect(result.email).toBe(member.email);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(JSON.parse(init.body).email).toBe(member.email);
  });
});