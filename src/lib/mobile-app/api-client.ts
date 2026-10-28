/**
 * Mobile API Client
 *
 * Dedicated client for mobile web interactions with Church Management Platform API.
 * - Standardizes headers and request credentials (supports both Bearer tokens and cookies).
 * - Enforces the unified API response envelope { success: true, data: T } | { success: false, error: ... }.
 * - Handles 401 unauthenticated states cleanly.
 * - Adheres strictly to server-side tenant isolation and PostgreSQL database backend.
 */

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class MobileApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(message: string, code: string = "API_ERROR", status: number = 500, details?: unknown) {
    super(message);
    this.name = "MobileApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

let inMemoryToken: string | null = null;
const TOKEN_KEY = "church_mobile_bearer_token";
const CACHE_PREFIX = "cmp:cache:v1:";

export function getMobileAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== "undefined") {
    try {
      inMemoryToken = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    } catch {
      // Ignore storage access errors in restricted browser contexts
    }
  }
  return inMemoryToken;
}

export function setMobileAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Ignore storage access errors
    }
    // Signing out (or a 401) must never leave one person's cached data on the
    // phone for the next person who signs in.
    if (!token) clearMobileCache();
  }
}

type UnauthorizedHandler = () => void;
const unauthorizedListeners: Set<UnauthorizedHandler> = new Set();

export function onUnauthorized(callback: UnauthorizedHandler): () => void {
  unauthorizedListeners.add(callback);
  return () => {
    unauthorizedListeners.delete(callback);
  };
}

function notifyUnauthorized(): void {
  setMobileAuthToken(null);
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error("[MobileApiClient] Error in unauthorized listener", err);
    }
  });
}

/**
 * Standard fetch wrapper for Church Management API
 */
export async function mobileApiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const token = getMobileAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Attach demo clock header only when demo mode is explicitly active
  try {
    const { getDemoClockInfo } = await import("@/lib/demo/demo-clock");
    const demoClock = getDemoClockInfo();
    if (demoClock.demoMode) {
      headers["x-demo-now"] = demoClock.effectiveNow.toISOString();
    }
  } catch {
    // Ignore if unavailable
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: "include", // Forward cookies for browser-hosted sessions
  });

  // Transient edge 500 / cold start wake-up: auto-retry with backoff
  if (response.status >= 500 && retryCount < 2) {
    await new Promise((resolve) => setTimeout(resolve, 600 * (retryCount + 1)));
    return mobileApiFetch<T>(endpoint, options, retryCount + 1);
  }

  if (response.status === 401) {
    notifyUnauthorized();
    let errorMessage = "Authentication required";
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorMessage = errJson.error.message;
      }
    } catch {
      // Use fallback error message
    }
    throw new MobileApiError(errorMessage, "UNAUTHORIZED", 401);
  }

  let jsonResult: any;
  try {
    jsonResult = await response.json();
  } catch {
    // If response was not valid JSON and still 5xx after retries
    if (response.status >= 500) {
      throw new MobileApiError(
        "Service temporarily unavailable. Please try again.",
        "SERVICE_UNAVAILABLE",
        response.status
      );
    }
    throw new MobileApiError(
      `Failed to parse response from ${endpoint}`,
      "INVALID_RESPONSE",
      response.status
    );
  }

  // Handle unified backend API response envelope { success, data, error }
  if (jsonResult && typeof jsonResult === "object") {
    if (jsonResult.success === false) {
      const err = jsonResult.error || {};
      throw new MobileApiError(
        err.message || "An unexpected error occurred",
        err.code || "REQUEST_FAILED",
        response.status,
        err.details
      );
    }

    if (jsonResult.success === true) {
      return jsonResult.data as T;
    }
  }

  // If not standard envelope but status is 2xx, return as-is
  if (response.ok) {
    return jsonResult as T;
  }

  throw new MobileApiError(
    jsonResult?.message || `Request failed with status ${response.status}`,
    "HTTP_ERROR",
    response.status
  );
}

// ─── Offline cache ───────────────────────────────────────────────────
//
// A small "last good answer" store for read-only GET requests, so a member who
// loses signal still sees what they saw a minute ago instead of an empty
// screen. Stored per endpoint in localStorage and wiped on sign-out.

export interface CachedResult<T> {
  data: T;
  /** True when the network was unreachable and this is the last saved copy. */
  fromCache: boolean;
  /** When the saved copy was stored (ms since epoch); null for fresh data. */
  savedAt: number | null;
}

export function clearMobileCache(): void {
  try {
    if (typeof localStorage === "undefined") return;
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) doomed.push(key);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Storage unavailable: nothing was cached.
  }
}

function readMobileCache<T>(endpoint: string): { data: T; savedAt: number } | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CACHE_PREFIX + endpoint);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.savedAt === "number" && "data" in parsed) return parsed;
  } catch {
    // Corrupt or blocked: behave as if nothing is cached.
  }
  return null;
}

function writeMobileCache(endpoint: string, data: unknown): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CACHE_PREFIX + endpoint, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Quota or blocked storage: caching is best-effort.
  }
}

/**
 * GET with an offline fallback.
 *
 * Fresh data is returned and saved. If the network is unreachable (fetch
 * throws) or the server is down (5xx), the last saved copy is returned with
 * `fromCache: true`. Auth failures and normal 4xx errors are never masked.
 */
export async function mobileApiFetchCached<T>(endpoint: string): Promise<CachedResult<T>> {
  try {
    const data = await mobileApiFetch<T>(endpoint);
    writeMobileCache(endpoint, data);
    return { data, fromCache: false, savedAt: null };
  } catch (err) {
    const unreachable = !(err instanceof MobileApiError) || err.status >= 500;
    if (unreachable) {
      const cached = readMobileCache<T>(endpoint);
      if (cached) return { data: cached.data, fromCache: true, savedAt: cached.savedAt };
    }
    throw err;
  }
}
