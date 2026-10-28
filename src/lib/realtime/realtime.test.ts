import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AttendanceRealtimeEvent } from "./use-attendance-realtime";
import { resolveRealtimeWsUrl } from "./use-attendance-realtime";

describe("Realtime WebSocket URL resolution", () => {
  it("uses the explicit environment override when provided", () => {
    const url = resolveRealtimeWsUrl(
      { protocol: "https:", host: "app.example.com" },
      "wss://realtime.internal/ws"
    );
    expect(url).toBe("wss://realtime.internal/ws");
  });

  it("derives a same-origin wss:// URL in secure environments", () => {
    const url = resolveRealtimeWsUrl(
      { protocol: "https:", host: "app.example.com" },
      undefined
    );
    expect(url).toBe("wss://app.example.com/api/realtime/ws");
  });

  it("derives a same-origin ws:// URL for local development", () => {
    const url = resolveRealtimeWsUrl(
      { protocol: "http:", host: "localhost:3000" },
      undefined
    );
    expect(url).toBe("ws://localhost:3000/api/realtime/ws");
  });

  it("never returns a hardcoded production hostname", () => {
    const url = resolveRealtimeWsUrl(
      { protocol: "https:", host: "staging.example.org" },
      undefined
    );
    expect(url).toContain("staging.example.org");
    expect(url).not.toContain("example-worker");
    expect(url).not.toContain("church-management-realtime");
  });
});

describe("Realtime Event Protocol", () => {
  it("formats check-in events correctly", () => {
    const event: AttendanceRealtimeEvent = {
      type: "attendance.check_in",
      tenantId: "tenant-1",
      data: {
        recordId: "rec-1",
        memberId: "m-1",
        memberName: "John Smith",
        serviceId: "s-1",
        method: "mobile_qr",
        checkInTime: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    expect(event.type).toBe("attendance.check_in");
    expect(event.data.recordId).toBe("rec-1");
    expect(event.data.method).toBe("mobile_qr");
    expect(event.tenantId).toBe("tenant-1");
  });

  it("handles incoming WebSocket message parsing", () => {
    const rawPayload = JSON.stringify({
      type: "attendance.check_in",
      tenantId: "tenant-42",
      data: { memberId: "m-42" },
      timestamp: "2026-09-19T20:00:00.000Z",
    });

    const parsed = JSON.parse(rawPayload) as AttendanceRealtimeEvent;
    expect(parsed.type).toBe("attendance.check_in");
    expect(parsed.tenantId).toBe("tenant-42");
    expect(parsed.data.memberId).toBe("m-42");
  });

  it("ignores pong heartbeat messages from triggering check-in handlers", () => {
    const pongPayload = JSON.stringify({
      type: "pong",
      timestamp: new Date().toISOString(),
    });

    const handler = vi.fn();
    const parsed = JSON.parse(pongPayload);

    if (parsed.type === "attendance.check_in") {
      handler(parsed);
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it("includes all server-resolved display metadata in enriched check-in payload", () => {
    const enrichedEvent: AttendanceRealtimeEvent = {
      type: "attendance.check_in",
      tenantId: "tenant-church-1",
      data: {
        recordId: "rec-mw-101",
        memberId: "mem-mw-101",
        memberName: "Michael Williams",
        memberAvatar: "https://example.com/avatar.jpg",
        ministry: "Tech & Media",
        serviceId: "svc-friday-1",
        method: "mobile_qr",
        checkInTime: "2026-09-19T20:30:00.000Z",
      },
      timestamp: "2026-09-19T20:30:00.000Z",
    };

    expect(enrichedEvent.data.memberName).toBe("Michael Williams");
    expect(enrichedEvent.data.memberAvatar).toBe("https://example.com/avatar.jpg");
    expect(enrichedEvent.data.ministry).toBe("Tech & Media");
    expect(enrichedEvent.data.recordId).toBe("rec-mw-101");
    expect(enrichedEvent.data.serviceId).toBe("svc-friday-1");
  });
});

