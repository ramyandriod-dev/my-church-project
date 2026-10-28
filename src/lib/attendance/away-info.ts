/**
 * How long a member has been away, for the golden "welcome back" banner.
 *
 * Used wherever a check-in is announced to the dashboard: the check-in itself, and
 * the polling route that the live site uses (Cloudflare serves no WebSocket, so
 * polling is how the dashboard hears about arrivals).
 *
 * Returns nothing when they have no earlier visit on record (a first visit is not
 * "away") or when the lookup fails: this only decorates the event, so it must never
 * get in the way of a check-in or a poll.
 */

import { attendanceRepository } from "../db/repositories/attendance-repository";
import { missedWeeksSince } from "./missed-weeks";

export interface AwayInfo {
  lastAttendanceDate?: string;
  consecutiveMissedWeeks?: number;
}

export async function awayInfoFor(
  tenantId: string,
  memberId: string,
  serviceId: string,
  arrival: Date,
): Promise<AwayInfo> {
  try {
    const last = await attendanceRepository.findLastCheckInBefore(tenantId, memberId, serviceId, arrival);
    if (!last) return {};
    return {
      lastAttendanceDate: last.checkInTime.toISOString(),
      consecutiveMissedWeeks: missedWeeksSince(last.checkInTime, arrival),
    };
  } catch {
    return {};
  }
}
