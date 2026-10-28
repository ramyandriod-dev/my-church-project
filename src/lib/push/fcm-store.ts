/**
 * Device Push Token Storage & Registry
 *
 * Keeps track of registered FCM device push tokens for members and users,
 * enabling targeted alerts when church staff send messages or pastoral follow-ups.
 *
 * Backed by PostgreSQL (`device_push_tokens`) so tokens persist reliably across
 * stateless Cloudflare Worker isolates, with an isolate-local in-memory cache for speed.
 */

import { prisma } from "../db/prisma";

export interface DevicePushRegistration {
  userId: string;
  memberId?: string;
  token: string;
  platform: "android" | "ios" | "web";
  deviceModel?: string;
  updatedAt: string;
}

// In-memory registry cache across active sessions
const deviceRegistrations = new Map<string, DevicePushRegistration>();
const memberTokenIndex = new Map<string, Set<string>>();

/**
 * Register device token in memory and asynchronously persist to PostgreSQL.
 */
export function registerDeviceToken(reg: DevicePushRegistration): void {
  if (!reg.token || !reg.token.trim()) return;

  const cleanToken = reg.token.trim();
  const registration: DevicePushRegistration = {
    ...reg,
    token: cleanToken,
    updatedAt: new Date().toISOString(),
  };

  deviceRegistrations.set(cleanToken, registration);

  if (reg.memberId) {
    let memberSet = memberTokenIndex.get(reg.memberId);
    if (!memberSet) {
      memberSet = new Set<string>();
      memberTokenIndex.set(reg.memberId, memberSet);
    }
    memberSet.add(cleanToken);
  }

  // Persist to Neon PostgreSQL asynchronously without blocking caller
  void persistDeviceTokenToDb(registration).catch(() => {});
}

/**
 * Persist or update token in database.
 */
export async function registerDeviceTokenAsync(reg: DevicePushRegistration): Promise<void> {
  registerDeviceToken(reg);
  await persistDeviceTokenToDb(reg).catch(() => {});
}

async function persistDeviceTokenToDb(reg: DevicePushRegistration): Promise<void> {
  const cleanToken = reg.token.trim();
  if (!cleanToken) return;

  try {
    await prisma.devicePushToken.upsert({
      where: { token: cleanToken },
      create: {
        userId: reg.userId,
        memberId: reg.memberId || null,
        token: cleanToken,
        platform: reg.platform || "android",
        deviceModel: reg.deviceModel || null,
      },
      update: {
        userId: reg.userId,
        memberId: reg.memberId || null,
        platform: reg.platform || "android",
        deviceModel: reg.deviceModel || null,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    // Graceful degrade if database is temporarily unreachable
  }
}

/**
 * Synchronous in-memory lookup for tests and fast path.
 */
export function getTokensForMember(memberId: string): string[] {
  if (!memberId) return [];
  const set = memberTokenIndex.get(memberId);
  return set ? Array.from(set) : [];
}

/**
 * Synchronous in-memory lookup for bulk tests and fast path.
 */
export function getTokensForMembers(memberIds: string[]): string[] {
  const result = new Set<string>();
  for (const mid of memberIds) {
    const set = memberTokenIndex.get(mid);
    if (set) {
      for (const token of set) {
        result.add(token);
      }
    }
  }
  return Array.from(result);
}

/**
 * Asynchronous cross-isolate token lookup from PostgreSQL.
 * Queries persistent DB to ensure tokens registered on any worker isolate are found.
 */
export async function getTokensForMembersAsync(memberIds: string[]): Promise<string[]> {
  if (!memberIds || memberIds.length === 0) return [];

  const tokenSet = new Set<string>(getTokensForMembers(memberIds));

  try {
    const records = await prisma.devicePushToken.findMany({
      where: {
        memberId: { in: memberIds },
      },
      select: {
        token: true,
        memberId: true,
      },
    });

    for (const r of records) {
      if (r.token && r.token.trim()) {
        const clean = r.token.trim();
        tokenSet.add(clean);
        // Also hydrate in-memory cache for subsequent fast reads
        if (r.memberId) {
          let s = memberTokenIndex.get(r.memberId);
          if (!s) {
            s = new Set<string>();
            memberTokenIndex.set(r.memberId, s);
          }
          s.add(clean);
        }
      }
    }
  } catch {
    // If DB read fails, return whatever is in-memory
  }

  return Array.from(tokenSet);
}

export async function getTokensForMemberAsync(memberId: string): Promise<string[]> {
  return getTokensForMembersAsync([memberId]);
}

export function removeDeviceToken(token: string): void {
  const clean = token.trim();
  const reg = deviceRegistrations.get(clean);
  if (reg?.memberId) {
    const set = memberTokenIndex.get(reg.memberId);
    if (set) set.delete(clean);
  }
  deviceRegistrations.delete(clean);

  void removeDeviceTokenFromDb(clean).catch(() => {});
}

export async function removeDeviceTokenAsync(token: string): Promise<void> {
  removeDeviceToken(token);
  await removeDeviceTokenFromDb(token).catch(() => {});
}

async function removeDeviceTokenFromDb(token: string): Promise<void> {
  try {
    await prisma.devicePushToken.deleteMany({
      where: { token: token.trim() },
    });
  } catch {}
}

export function getAllDeviceRegistrations(): DevicePushRegistration[] {
  return Array.from(deviceRegistrations.values());
}
