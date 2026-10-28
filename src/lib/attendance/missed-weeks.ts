/**
 * How many services someone missed between their last visit and today.
 *
 * The church meets weekly, so the count is whole weeks apart, minus the one
 * they would normally have been back by:
 *   7 days since the last visit  -> 0 missed (they came last week)
 *   14 days -> 1, 21 days -> 2, 28 days -> 3 ...
 *
 * This is the same rule as `calculateMissedWeeksFromDate` in
 * welcome-back-helper.ts, here taking real dates. The golden "welcome back"
 * banner appears from 2 missed weeks (WELCOME_BACK_MIN_MISSED_WEEKS).
 */

const DAY_MS = 86_400_000;

export function missedWeeksSince(lastAttended: Date, arrival: Date): number {
  const days = Math.floor((arrival.getTime() - lastAttended.getTime()) / DAY_MS);
  if (days <= 0) return 0;
  return Math.max(0, Math.floor(days / 7) - 1);
}
