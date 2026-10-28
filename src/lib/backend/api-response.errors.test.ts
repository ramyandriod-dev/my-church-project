/**
 * Unexpected errors must not leak their message to the client in production.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { errorResponse } from "./api-response";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("errorResponse for unexpected errors", () => {
  it("hides the message in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = errorResponse(new Error('relation "members" does not exist'));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("members");
  });

  it("still shows the message in development, for debugging", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const body = await errorResponse(new Error("boom")).json();
    expect(body.error.message).toBe("boom");
  });
});
