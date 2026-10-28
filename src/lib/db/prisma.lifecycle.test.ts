/**
 * Prisma client lifecycle — Fix #3 hybrid sharing model
 *
 * Exercises the REAL src/lib/db/prisma.ts (bypassing the global mock used by
 * the rest of the suite) with the Neon driver and Query Engine modules mocked
 * out, so the lifecycle invariants are proven against the actual proxy and
 * AsyncLocalStorage logic without touching a database:
 *
 *   1. In workerd, ALL non-transaction queries share ONE isolate-scoped client
 *      (engine boots once per isolate, not once per request).
 *   2. $transaction gets its OWN per-request WS-capable client, cached in the
 *      request's AsyncLocalStorage store.
 *   3. Concurrent requests reuse the same shared client while each keeps its
 *      own transaction client (no cross-request socket reuse).
 *   4. Node keeps the pre-existing global singleton for everything.
 *   5. Connection drop triggers exactly one reset + retry; other errors are
 *      not retried; unknown model methods fail loudly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// The global tests/setup.ts mock replaces @/lib/db/prisma; this file needs the
// real module, so it is un-mocked and imported directly (once).
vi.doUnmock("@/lib/db/prisma");

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

function modelMethods() {
  return {
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    findFirstOrThrow: vi.fn(async () => ({})),
    findUniqueOrThrow: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
    aggregate: vi.fn(async () => ({})),
    groupBy: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: "created" })),
    createMany: vi.fn(async () => ({ count: 1 })),
    update: vi.fn(async () => ({ id: "updated" })),
    updateMany: vi.fn(async () => ({ count: 1 })),
    upsert: vi.fn(async () => ({ id: "upserted" })),
    delete: vi.fn(async () => ({ id: "deleted" })),
    deleteMany: vi.fn(async () => ({ count: 1 })),
  };
}

function createFakeClient(): any {
  const target: Record<string, any> = {};
  const client = new Proxy(target, {
    get(t, p) {
      if (typeof p === "symbol") return undefined;
      if (p === "$transaction") return t.$transaction;
      if (p === "$queryRaw") return t.$queryRaw;
      if (p === "$executeRaw") return t.$executeRaw;
      if (p in t) return t[p];
      if (!t._models[p]) t._models[p] = modelMethods();
      return t._models[p];
    },
  });
  target._models = {};
  target.$transaction = vi.fn(async (arg: any) =>
    typeof arg === "function" ? arg(client) : Promise.all(arg),
  );
  target.$queryRaw = vi.fn(async () => []);
  target.$executeRaw = vi.fn(async () => 0);
  return client;
}

type PrismaModule = typeof import("@/lib/db/prisma");

let instances: any[] = [];
let db: PrismaModule;

async function freshModule() {
  delete (globalThis as any).EdgeRuntime;
  instances = [];
  if (!db) db = await import("@/lib/db/prisma");
  db.__setPrismaClientFactoryForTests(() => {
    const c = createFakeClient();
    instances.push(c);
    return Promise.resolve(c);
  });
  db.resetClientPromise();
}

function setWorkerd() {
  (globalThis as any).EdgeRuntime = "workers";
}

beforeEach(async () => {
  await freshModule();
});

describe("workerd: shared isolate-scoped client", () => {
  it("boots ONE client and reuses it for every non-transaction query", async () => {
    setWorkerd();
    await db.prisma.member.findMany();
    await db.prisma.tenant.count();
    (await (db.prisma as any).prayerRequest.create({ data: {} }));
    await db.prisma.$queryRaw`SELECT 1`;
    expect(instances).toHaveLength(1);
  });

  it("shares the single client across many concurrent queries", async () => {
    setWorkerd();
    await Promise.all(
      Array.from({ length: 24 }, () =>
        Promise.all([
          db.prisma.member.findMany(),
          db.prisma.tenant.count(),
          db.prisma.family.findUnique({ where: { id: "x" } }),
        ]),
      ),
    );
    expect(instances).toHaveLength(1);
  });

  it("routes model writes to the shared client too (they are not socket-bound)", async () => {
    setWorkerd();
    (await (db.prisma as any).prayerRequest.create({ data: {} }));
    await (db.prisma as any).prayerRequest.deleteMany({});
    expect(instances).toHaveLength(1);
    expect(instances[0]._models.prayerRequest.create).toHaveBeenCalled();
    expect(instances[0]._models.prayerRequest.deleteMany).toHaveBeenCalled();
  });
});

describe("workerd: transaction client is per-request", () => {
  it("creates a separate client for $transaction, cached in the request store", async () => {
    setWorkerd();
    await db.requestDatabaseContext.run({}, async () => {
      await db.prisma.member.findMany();
      await db.prisma.$transaction(async (tx) => {
        await tx.member.findFirst();
      });
    });
    expect(instances).toHaveLength(2);
    // The shared instance never served the transaction; the transaction
    // instance's $transaction method was invoked.
    expect(instances[0].$transaction).not.toHaveBeenCalled();
    expect(instances[1].$transaction).toHaveBeenCalledTimes(1);
    expect(instances[1]._models.member.findFirst).toHaveBeenCalled();
  });

  it("reuses the SAME transaction client within one request", async () => {
    setWorkerd();
    await db.requestDatabaseContext.run({}, async () => {
      await db.prisma.$transaction(async (tx) => tx.member.findFirst());
      await db.prisma.$transaction(async (tx) => tx.member.findMany());
    });
    expect(instances).toHaveLength(1);
  });

  it("gives CONCURRENT requests their own transaction client but one shared client", async () => {
    setWorkerd();
    const results = await Promise.all(
      [1, 2, 3].map((i) =>
        db.requestDatabaseContext.run({}, async () => {
          await db.prisma.member.findMany();
          const v = await db.prisma.$transaction(async (tx) => {
            await tx.member.count();
            return i;
          });
          return v;
        }),
      ),
    );
    expect(results).toEqual([1, 2, 3]);
    // 1 shared client + one transaction client per request.
    expect(instances).toHaveLength(4);
  });
});

describe("node: global singleton for everything", () => {
  it("reuses one singleton for regular queries and $transaction", async () => {
    await db.prisma.member.findMany();
    (await (db.prisma as any).prayerRequest.create({ data: {} }));
    await db.prisma.$transaction(async (tx) => tx.member.findFirst());
    expect(instances).toHaveLength(1);
    expect(instances[0].$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("reset + retry on connection drop", () => {
  it("retries a model query exactly once against a fresh client", async () => {
    setWorkerd();
    await db.prisma.member.findMany();
    const shared = instances[0];
    shared._models.member.findMany.mockReset().mockRejectedValueOnce(
      new Error("Cannot perform I/O on behalf of a different request"),
    );
    await expect(db.prisma.member.findMany()).resolves.toEqual([]);
    expect(instances).toHaveLength(2);
    expect(shared._models.member.findMany).toHaveBeenCalledTimes(1);
    expect(instances[1]._models.member.findMany).toHaveBeenCalledTimes(1);
  });

  it("retries a dropped $transaction once", async () => {
    setWorkerd();
    let ran = 0;
    const out = await db.requestDatabaseContext.run({}, async () =>
      db.prisma.$transaction(async (tx) => {
        ran += 1;
        if (ran === 1) {
          (tx.member.findFirst as any).mockRejectedValueOnce(
            new Error("terminated by remote host"),
          );
        }
        return tx.member.findFirst();
      }),
    );
    expect(ran).toBe(2);
    expect(out).toBeNull();
    expect(instances).toHaveLength(2);
  });

  it("does not reset on non-connection errors", async () => {
    setWorkerd();
    await db.prisma.member.findMany();
    const shared = instances[0];
    shared._models.member.findMany.mockReset().mockRejectedValueOnce(new Error("P2025: not found"));
    await expect(db.prisma.member.findMany()).rejects.toThrow("P2025: not found");
    expect(instances).toHaveLength(1);
  });
});

describe("proxy contract", () => {
  it("routes unknown model/method to a loud error", async () => {
    setWorkerd();
    await expect((db.prisma as any).doesNotExist.whatever()).rejects.toThrow(
      "prisma.doesNotExist.whatever is not a function",
    );
  });

  it("returns undefined for symbol access", async () => {
    setWorkerd();
    expect((db.prisma as any)[Symbol.iterator]).toBeUndefined();
  });
});