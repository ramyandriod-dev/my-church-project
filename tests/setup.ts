/**
 * Test Setup
 *
 * Mocks database and external dependencies for unit tests.
 */

import { vi } from "vitest";

// Mock Prisma client
vi.mock("@/lib/db/prisma", () => {
  const prismaMock = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
      delete: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 1 })),
      count: vi.fn(),
    },
    member: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
      delete: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 1 })),
      count: vi.fn(),
    },
    // Tenant count is reported by the development-only /api/debug-db
    // diagnostic. The model is otherwise reached through relation queries.
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    session: {
      // Defaults to a live, unrevoked session.
      //
      // Session verification now consults this row — that is what makes logout
      // and revocation real — so a test that signs a token without also
      // registering a session would be asserting against a token that could never
      // work in production. "A session that was just issued" is the right default
      // premise for a route test; tests covering revocation override this.
      findUnique: vi.fn(async () => ({
        id: "session-1",
        userId: "user-1",
        token: "token",
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        revokedAt: null,
        lastSeenAt: new Date(),
        kind: "web",
      })),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
      delete: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    // Failed-login throttling.
    authThrottle: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    attendanceRecord: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    attendanceException: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    service: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    followUp: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    followUpActivity: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    family: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    familyRelationship: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    // Community: talent discovery and the ideas bank.
    talentProfile: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    memberSkill: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    skill: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    idea: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    // Staff↔member conversations.
    message: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    group: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    ministry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    churchEvent: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    prayerRequest: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    // No church has customised its roles unless a test says so.
    rolePermission: {
      findMany: vi.fn(async () => []),
      upsert: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    roleRequest: {
      findFirst: vi.fn(),
      findMany: vi.fn(async () => []),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 0 })),
      count: vi.fn(async () => 0),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    // Called both as `prisma.$transaction([a, b])` and as
    // `prisma.$transaction(async (tx) => ...)`. The callback form must receive
    // the same mock object, otherwise a transaction body's queries are undefined
    // inside the callback.
    $transaction: vi.fn(async (arg: any) =>
      typeof arg === "function" ? arg(prismaMock) : Promise.all(arg),
    ),
  };
  // Exposed as both the default and the named `prisma` export, because services
  // in this codebase import it either way.
  return {
    default: prismaMock,
    prisma: prismaMock,
    // Runtime-shape mirror of src/lib/db/prisma.ts. Route handlers and
    // withErrorHandling wrap their work in `requestDatabaseContext.run({}, fn)`;
    // the mock just executes the callback and reports no active store so those
    // routes can be exercised without a real AsyncLocalStorage boundary.
    requestDatabaseContext: {
      run: vi.fn(async (_store: unknown, callback: () => unknown | Promise<unknown>) => callback()),
      getStore: vi.fn(() => undefined),
      disable: vi.fn(),
      enterWith: vi.fn(),
      exit: vi.fn(),
    },
  };
});

// Mock config
vi.mock("@/lib/backend/config", () => ({
  config: {
    databaseUrl: "postgresql://test:test@localhost:5432/test",
    jwtSecret: "test-jwt-secret-min-32-characters-long",
    sessionExpiry: 604800,
    // Deliberately far below the production default of 600,000. The cost is not
    // what the auth tests are exercising, and a suite that takes a second per
    // derivation is a suite nobody runs. Tests that care read this value back
    // rather than assuming it.
    passwordHashIterations: 1000,
    mobileAccessTokenExpiry: 3600,
    mobileRefreshTokenExpiry: 2592000,
    loginMaxFailures: 5,
    loginWindowSeconds: 900,
    loginBaseLockSeconds: 300,
    loginMaxLockSeconds: 3600,
    nodeEnv: "test",
    appUrl: "http://localhost:3000",
    isDevelopment: false,
    isProduction: false,
  },
}));
