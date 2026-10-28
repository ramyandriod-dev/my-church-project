/**
 * Prisma Client — hybrid sharing model
 *
 * Prevents multiple Prisma Client instances in development.
 * Uses @prisma/adapter-neon with Pool (WebSocket-capable) for Cloudflare Workers.
 * WebSocket is natively supported in Workers, unlike raw TCP.
 *
 * ── Why a hybrid? ─────────────────────────────────────────────────
 *
 * Cloudflare Workers forbid WebSocket I/O from outliving a single request
 * handler ("Cannot perform I/O on behalf of a different request"), which is
 * why this module used to create one Prisma client PER request. That made
 * every request pay the full one-time cost of booting the WASM query engine —
 * a big share of the per-request CPU budget that Cloudflare's free plan
 * measures, and a direct contributor to Worker "exceeded resource limits"
 * (Error 1102) under real usage.
 *
 * With `neonConfig.poolQueryViaFetch = true`, ordinary `Pool.query()` calls
 * route over plain HTTP fetch and the pool never opens a socket. Only
 * `$transaction` (via `Pool.connect()`) creates a WebSocket session.
 *
 * So the client splits into two tiers:
 *
 *   1. Shared, isolate-scoped client (default path). One instance per worker
 *      isolate, created lazily on first use, reused by every request. All
 *      non-transaction queries (model reads AND writes) run through it over
 *      HTTP fetch — zero sockets, nothing that can leak across requests, and
 *      the WASM engine boots once per isolate instead of once per request.
 *
 *   2. Request-scoped transaction client. `$transaction(...)` is the only
 *      path that opens a WebSocket. It is created lazily per request and
 *      cached in the request's AsyncLocalStorage store, so the session lives
 *      and dies with that request exactly as before.
 *
 * Engine selection: Cloudflare Workers use the WASM engine
 * (@prisma/client/wasm); local Node dev (next dev) uses the native engine
 * (@prisma/client) so the query engine can load on macOS.
 *
 * Concurrency: The Prisma WASM engine with driver adapters is concurrency-safe.
 * The engine compiles Prisma operations to SQL; the Neon adapter handles database
 * connections via stateless HTTP fetch (poolQueryViaFetch). No serialization lock
 * is needed — concurrent queries are dispatched in parallel to the HTTP adapter.
 *
 * Exports a lazy proxy that initializes the Prisma client on first use.
 * All existing code (prisma.user.findFirst(), prisma.session.create(), etc.)
 * works unchanged — the proxy intercepts model + method calls transparently.
 */

import type { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { AsyncLocalStorage } from "node:async_hooks";

// See header: poolQueryViaFetch routes Pool.query over HTTP fetch, eliminating
// persistent native WebSocket I/O objects while maintaining full query
// compatibility with Neon. The only socket-creating path that remains is
// Pool.connect(), used exclusively by $transaction.
neonConfig.poolQueryViaFetch = true;

function isWorkerd(): boolean {
  const edgeRuntime =
    (globalThis as Record<string, unknown>)["EdgeRuntime"];
  return (
    typeof edgeRuntime === "string" ||
    (typeof navigator !== "undefined" &&
      navigator.userAgent === "Cloudflare-Workers")
  );
}

const globalForPrisma = globalThis as unknown as {
  prismaClient: PrismaClient | undefined;
};

// Shared isolate-scoped client for Cloudflare Workers (all non-transaction
// queries). Module-level state persists for the lifetime of the isolate.
let sharedClientPromise: Promise<PrismaClient> | null = null;

// Test-only seam: injects a fake client factory (bypassing the Neon adapter +
// engine construction) so the lifecycle suite can exercise the proxy and
// AsyncLocalStorage logic without a database. Not used by application code.
let clientFactoryOverride: (() => Promise<PrismaClient>) | null = null;
export function __setPrismaClientFactoryForTests(
  factory: (() => Promise<PrismaClient>) | null
): void {
  clientFactoryOverride = factory;
}

async function createPrismaClientInstance(): Promise<PrismaClient> {
  if (clientFactoryOverride) {
    return clientFactoryOverride();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Cloudflare Workers → WASM engine; Node (local dev) → native engine.
  const { PrismaClient } = isWorkerd()
    ? ((await import("@prisma/client/wasm")) as typeof import("@prisma/client"))
    : ((await import("@prisma/client")) as typeof import("@prisma/client"));

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaNeon(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export interface RequestDatabaseContext {
  prismaPromise?: Promise<PrismaClient>;
}

export const requestDatabaseContext = new AsyncLocalStorage<RequestDatabaseContext>();

let clientPromise: Promise<PrismaClient> | null = null;

// Default client for every call. In Workers this is the single isolate-scoped
// client; poolQueryViaFetch keeps it socket-free and therefore safe to share
// across requests. In Node it is the global singleton (unchanged).
function getSharedClientPromise(): Promise<PrismaClient> {
  if (isWorkerd()) {
    if (!sharedClientPromise) {
      sharedClientPromise = createPrismaClientInstance();
    }
    return sharedClientPromise;
  }

  // Node (local dev): reuse global singleton
  if (globalForPrisma.prismaClient) {
    return Promise.resolve(globalForPrisma.prismaClient);
  }

  if (!clientPromise) {
    clientPromise = (async () => {
      const client = await createPrismaClientInstance();
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prismaClient = client;
      }
      return client;
    })();
  }

  return clientPromise;
}

// Client used for $transaction. In Workers, transactions open a WebSocket via
// Pool.connect(), which cannot outlive the request, so one client is kept per
// request in the AsyncLocalStorage store (same semantics as pre-Fix#3). On
// Node the shared singleton is reused, unchanged.
function getTransactionClientPromise(): Promise<PrismaClient> {
  if (isWorkerd()) {
    const store = requestDatabaseContext.getStore();
    if (store) {
      if (!store.prismaPromise) {
        store.prismaPromise = createPrismaClientInstance();
      }
      return store.prismaPromise;
    }
    return createPrismaClientInstance();
  }

  return getSharedClientPromise();
}

// Test-only seam: exported so the lifecycle suite can reset module state
// deterministically without re-import machinery. Not used by application code.
export function resetClientPromise(): void {
  const store = requestDatabaseContext.getStore();
  if (store) {
    store.prismaPromise = undefined;
  }
  sharedClientPromise = null;
  clientPromise = null;
  globalForPrisma.prismaClient = undefined;
}

function isConnectionError(error: unknown): boolean {
  if (!error) return false;
  const msg = ((error as any)?.message || String(error)).toLowerCase();
  const code = (error as any)?.code;
  return (
    msg.includes("connection") ||
    msg.includes("fetch failed") ||
    msg.includes("socket") ||
    msg.includes("terminated") ||
    msg.includes("closed") ||
    msg.includes("timeout") ||
    msg.includes("cannot perform i/o") ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "57P01"
  );
}

// Execute a prisma operation, transparently resetting the client and retrying
// once when the connection has dropped.
async function executeWithRetry(
  label: string,
  getClient: () => Promise<PrismaClient>,
  invoke: (client: any) => any
): Promise<any> {
  try {
    const client = await getClient();
    return await invoke(client);
  } catch (err) {
    if (isConnectionError(err)) {
      console.warn(
        `[Prisma] Connection drop detected on ${label}, reconnecting and retrying once...`,
        err
      );
      resetClientPromise();
      const client = await getClient();
      return await invoke(client);
    }
    throw err;
  }
}

/**
 * Lazy proxy that transparently handles:
 *   prisma.user.findFirst(...)
 *   prisma.session.create(...)
 *   prisma.$transaction(...)
 *   prisma.$queryRaw(...)
 *
 * Routing: `$transaction` is the only operation that opens a WebSocket
 * session, so it is directed to the per-request transaction client; every
 * other client-level method and every model call goes to the shared client.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (typeof prop === "symbol") return undefined;

    // Client-level methods: $transaction, $queryRaw, $disconnect, etc.
    if (prop.startsWith("$")) {
      const label = `prisma.${String(prop)}`;
      const isTransaction = prop === "$transaction";
      const getClient = isTransaction
        ? getTransactionClientPromise
        : getSharedClientPromise;
      return (...args: any[]) =>
        executeWithRetry(label, getClient, (client) =>
          (client as any)[prop].apply(client, args)
        );
    }

    // Model-level: prisma.user → return a proxy for method calls
    return new Proxy({} as any, {
      get(_, method) {
        if (typeof method === "symbol") return undefined;

        const label = `prisma.${String(prop)}.${String(method)}`;
        return (...args: any[]) =>
          executeWithRetry(label, getSharedClientPromise, (client) => {
            const model = (client as any)[prop];
            if (!model || typeof model[method] !== "function") {
              throw new Error(
                `prisma.${String(prop)}.${String(method)} is not a function`
              );
            }
            return model[method](...args);
          });
      },
    });
  },
});

export default prisma;