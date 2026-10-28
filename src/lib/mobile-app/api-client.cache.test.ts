import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mobileApiFetchCached,
  clearMobileCache,
  setMobileAuthToken,
  MobileApiError,
} from "./api-client";

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
  return store;
}

const ok = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), { status: 200 });

describe("mobileApiFetchCached", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = stubStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns fresh data and saves a copy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ a: 1 })));
    const res = await mobileApiFetchCached<{ a: number }>("/api/x");
    expect(res).toEqual({ data: { a: 1 }, fromCache: false, savedAt: null });
    expect([...store.keys()].some((k) => k.endsWith("/api/x"))).toBe(true);
  });

  it("serves the last saved copy when the network is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok({ a: 2 })));
    await mobileApiFetchCached("/api/x");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const res = await mobileApiFetchCached<{ a: number }>("/api/x");
    expect(res.fromCache).toBe(true);
    expect(res.data).toEqual({ a: 2 });
    expect(typeof res.savedAt).toBe("number");
  });

  it("rethrows when offline and nothing was saved", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(mobileApiFetchCached("/api/never-seen")).rejects.toThrow("Failed to fetch");
  });

  it("does not hide real client errors behind a saved copy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok({ a: 3 })));
    await mobileApiFetchCached("/api/x");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "gone" } }),
          { status: 404 }
        )
      )
    );
    await expect(mobileApiFetchCached("/api/x")).rejects.toBeInstanceOf(MobileApiError);
  });

  it("wipes saved copies on clear and on sign-out", async () => {
    // A fresh Response per call: a body can only be read once.
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(ok({ a: 4 }))));
    await mobileApiFetchCached("/api/x");
    expect(store.size).toBeGreaterThan(0);
    clearMobileCache();
    expect(store.size).toBe(0);

    await mobileApiFetchCached("/api/y");
    expect(store.size).toBeGreaterThan(0);
    vi.stubGlobal("window", {});
    setMobileAuthToken(null);
    expect(store.size).toBe(0);
  });
});
