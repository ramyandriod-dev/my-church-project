/**
 * The people who are really here, for the dashboard's live section.
 *
 * Attendance rows can repeat a member (several services come back when no session
 * is scoped, or a second scan is recorded), so the live views count and list
 * people, one row each, newest arrival first. Nothing here is simulated.
 */

export interface RosterRow {
  id: string;
  memberId?: string;
  member?: { id?: string } | null;
  checkInTime: string | Date;
}

const RECENT_WINDOW_MS = 60_000;

export function distinctArrivals<T extends RosterRow>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  const newestFirst = [...rows].sort((a, b) => +new Date(b.checkInTime) - +new Date(a.checkInTime));
  for (const row of newestFirst) {
    const key = row.member?.id || row.memberId || row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function liveStats(rows: readonly RosterRow[], now: Date = new Date()) {
  const people = distinctArrivals(rows);
  const last = people[0] ? new Date(people[0].checkInTime) : null;
  const recent = people.filter((p) => now.getTime() - +new Date(p.checkInTime) <= RECENT_WINDOW_MS).length;
  return { count: people.length, recent, lastCheckInAt: last };
}
