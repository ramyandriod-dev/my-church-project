import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { config } from "@/lib/backend/config";
import { readDemoClock, DEMO_CLOCK_HEADER } from "./demo-clock";

/**
 * M5 hotfix — backend Demo clock guard.
 *
 * The simulated attendance time must be honored ONLY outside production.
 * In production the header is always rejected so the real clock governs
 * attendance (Demo time can never become a trusted attendance timestamp).
 */

describe("readDemoClock", () => {
  it("returns null when the header is absent", () => {
    expect(readDemoClock(new NextRequest("http://localhost/api/attendance/check-in"))).toBeNull();
  });

  it("parses a valid demo time in dev/test environments", () => {
    const demoNow = new Date(2026, 8, 18, 12, 59, 0);
    const request = new NextRequest("http://localhost/api/attendance/session", {
      headers: { [DEMO_CLOCK_HEADER]: demoNow.toISOString() },
    });
    const got = readDemoClock(request);
    expect(got).not.toBeNull();
    expect(got!.getTime()).toBe(demoNow.getTime());
  });

  it("falls back to the real clock on malformed input", () => {
    const request = new NextRequest("http://localhost/api/attendance/session", {
      headers: { [DEMO_CLOCK_HEADER]: "definitely-not-a-date" },
    });
    expect(readDemoClock(request)).toBeNull();
  });

  it("NEVER accepts the demo clock in production", () => {
    const previous = (config as any).isProduction;
    (config as any).isProduction = true;
    try {
      const request = new NextRequest("http://localhost/api/attendance/check-in", {
        headers: { [DEMO_CLOCK_HEADER]: new Date().toISOString() },
      });
      expect(readDemoClock(request)).toBeNull();
    } finally {
      (config as any).isProduction = previous;
    }
  });

  it("treats an empty header as off (real clock)", () => {
    const request = new NextRequest("http://localhost/api/attendance/check-in", {
      headers: { [DEMO_CLOCK_HEADER]: "" },
    });
    expect(readDemoClock(request)).toBeNull();
  });

  it("keeps the demo clock active in development without any opt-in", () => {
    const previous = (config as any).isProduction;
    (config as any).isProduction = false;
    const previousEnv = process.env.ENABLE_DEMO_CLOCK;
    delete process.env.ENABLE_DEMO_CLOCK;
    try {
      const simulated = "2026-09-18T09:30:00.000Z";
      const request = new NextRequest("http://localhost/api/attendance/session", {
        headers: { [DEMO_CLOCK_HEADER]: simulated },
      });
      expect(readDemoClock(request)?.toISOString()).toBe(simulated);
    } finally {
      process.env.ENABLE_DEMO_CLOCK = previousEnv;
      (config as any).isProduction = previous;
    }
  });

});