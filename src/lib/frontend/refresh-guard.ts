/**
 * Refresh guard for client pages.
 *
 * Member 360 reloads member, family-tree and talent data on several triggers:
 * initial mount, realtime events, edits, and cross-tab broadcasts. Each trigger
 * previously spawned its own multi-request chain, so a rapid series of family
 * edits (or several open tabs) stacked overlapping chains into the same second
 * — the request fan-out that has repeatedly pushed a busy isolate past
 * Cloudflare resource limits (Error 1102).
 *
 * The guard collapses concurrent triggers: while one operation is running any
 * further trigger is deferred, and concurrent deferred triggers collapse into a
 * single trailing run.
 */

export interface RefreshGuard {
  isRunning(): boolean;
  run(operation: () => Promise<void>): void;
}

export function createRefreshGuard(): RefreshGuard {
  let running = false;
  let queued = false;

  const guard: RefreshGuard = {
    isRunning() {
      return running;
    },
    run(operation) {
      if (running) {
        queued = true;
        return;
      }
      running = true;
      void (async () => {
        try {
          await operation();
        } finally {
          running = false;
          if (queued) {
            queued = false;
            guard.run(operation);
          }
        }
      })().catch(() => {
        // Operation-level failures are handled by the caller; the guard only
        // resets its state and collapses the trailing refresh.
      });
    },
  };
  return guard;
}

/**
 * Fetch a member's family tree from the Member 360 endpoint used by the
 * family section. This is the single-request family-only refresh (A2); the
 * companion full reload additionally fetches the member and talent data.
 */
export async function fetchMemberFamilyTree(
  memberId: string,
  fetcher: (url: string) => Promise<{ ok: boolean; json(): Promise<any> }> = fetch,
): Promise<any> {
  const res = await fetcher(`/api/members/${encodeURIComponent(memberId)}/family`);
  if (!res.ok) return null;
  const json = await res.json();
  if (json?.data || json?.members) return json.data || json;
  return null;
}