/**
 * Prayer wall rules
 *
 * Pure functions shared by the service and its tests: the moderation workflow and
 * the projection that turns a stored prayer into what the wall may show.
 *
 * ─── Why the projection lives here ──────────────────────────
 *
 * "Anonymous unless you choose otherwise" is the promise members are given when
 * they share. The stored row carries the author (moderators need it, and the
 * author needs to find their own prayers), so the one place that decides what
 * leaves the server is this function, and it releases the name only when the
 * author set `showName`. It builds a new object field by field rather than deleting
 * keys from the row, so a column added later stays private until someone adds
 * it here on purpose.
 */

export const PRAYER_WALL_STATUSES = ["pending", "approved", "rejected", "archived"] as const;
export type PrayerWallStatus = (typeof PRAYER_WALL_STATUSES)[number];

/** A prayer request, or the story of a prayer God answered. */
export const PRAYER_WALL_KINDS = ["prayer", "answered"] as const;
export type PrayerWallKind = (typeof PRAYER_WALL_KINDS)[number];

/** A member may have this many prayers waiting for approval at once. */
export const MAX_PENDING_PER_MEMBER = 5;

/**
 * Moderator decisions. Nothing returns to pending: once a pastor has looked at a
 * prayer, it has been looked at. A rejected or archived prayer can be restored.
 */
export const PRAYER_WALL_TRANSITIONS: Record<PrayerWallStatus, readonly PrayerWallStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["archived"],
  rejected: ["approved"],
  archived: ["approved"],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = PRAYER_WALL_TRANSITIONS[from as PrayerWallStatus];
  return Boolean(allowed?.includes(to as PrayerWallStatus));
}

/** A stored prayer as the repository loads it. */
export interface PrayerWallRow {
  id: string;
  kind: string;
  body: string;
  status: string;
  authorMemberId: string;
  authorName: string;
  showName: boolean;
  createdAt: Date;
  reviewedAt: Date | null;
  prayedCount: number;
  prayedByViewer: boolean;
}

/** What the wall shows. The author's name only when they chose to show it. */
export interface PrayerWallItem {
  id: string;
  kind: string;
  body: string;
  /** The author's name, or null when they stayed anonymous. */
  displayName: string | null;
  prayedCount: number;
  prayedByMe: boolean;
  /** True when the viewer wrote it, so the app can say "your prayer". */
  mine: boolean;
  createdAt: string;
}

/** The author's own view of something they shared, including its status. */
export interface MyPrayerWallItem extends PrayerWallItem {
  status: PrayerWallStatus;
  showName: boolean;
}

export function toWallItem(row: PrayerWallRow, viewerMemberId: string | null): PrayerWallItem {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    displayName: row.showName ? row.authorName : null,
    prayedCount: row.prayedCount,
    prayedByMe: row.prayedByViewer,
    mine: viewerMemberId !== null && row.authorMemberId === viewerMemberId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toMyItem(row: PrayerWallRow): MyPrayerWallItem {
  return { ...toWallItem(row, row.authorMemberId), status: row.status as PrayerWallStatus, showName: row.showName };
}
