let cachedUnreadCount: number | null = null;
let lastFetchTime = 0;
let inflightFetch: Promise<number> | null = null;

/**
 * Shared, debounced and deduplicated unread message fetcher.
 * Prevents multiple components (TopNav, Sidebar, MobileShell) from
 * firing simultaneous duplicate /api/messages/unread requests.
 */
export async function getSharedUnreadCount(force = false): Promise<number> {
  const now = Date.now();
  if (!force && cachedUnreadCount !== null && now - lastFetchTime < 30000) {
    return cachedUnreadCount;
  }
  if (inflightFetch) {
    return inflightFetch;
  }

  const fetchPromise = (async (): Promise<number> => {
    try {
      const res = await fetch("/api/messages/unread");
      if (!res.ok) return cachedUnreadCount ?? 0;
      const json = await res.json().catch(() => null);
      if (json?.success && typeof json.data?.unread === "number") {
        cachedUnreadCount = json.data.unread;
        lastFetchTime = Date.now();
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cmp:unread-count-changed", {
              detail: { unread: cachedUnreadCount },
            })
          );
        }
        return json.data.unread;
      }
      return cachedUnreadCount ?? 0;
    } catch {
      return cachedUnreadCount ?? 0;
    } finally {
      inflightFetch = null;
    }
  })();

  inflightFetch = fetchPromise;
  return fetchPromise;
}
