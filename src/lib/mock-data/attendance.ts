// ─── Attendance Mock Data ──────────────────────────────────────

export interface AttendanceRecord {
  id: string;
  date: string;
  service: string;
  count: number;
  visitors: number;
  members: number;
}

export const attendanceRecords: AttendanceRecord[] = [
  { id: "1", date: "Sep 14, 2026", service: "Sunday 10:00 AM", count: 245, visitors: 8, members: 237 },
  { id: "2", date: "Sep 7, 2026", service: "Sunday 10:00 AM", count: 238, visitors: 5, members: 233 },
  { id: "3", date: "Aug 31, 2026", service: "Sunday 10:00 AM", count: 252, visitors: 12, members: 240 },
  { id: "4", date: "Aug 24, 2026", service: "Sunday 10:00 AM", count: 221, visitors: 4, members: 217 },
  { id: "5", date: "Aug 17, 2026", service: "Sunday 10:00 AM", count: 234, visitors: 6, members: 228 },
  { id: "6", date: "Aug 10, 2026", service: "Sunday 10:00 AM", count: 248, visitors: 9, members: 239 },
  { id: "7", date: "Aug 3, 2026", service: "Sunday 10:00 AM", count: 229, visitors: 3, members: 226 },
  { id: "8", date: "Jul 27, 2026", service: "Sunday 10:00 AM", count: 241, visitors: 7, members: 234 },
  { id: "9", date: "Jul 20, 2026", service: "Sunday 10:00 AM", count: 256, visitors: 11, members: 245 },
  { id: "10", date: "Jul 13, 2026", service: "Sunday 10:00 AM", count: 233, visitors: 5, members: 228 },
  { id: "11", date: "Jul 6, 2026", service: "Sunday 10:00 AM", count: 219, visitors: 2, members: 217 },
  { id: "12", date: "Jun 29, 2026", service: "Sunday 10:00 AM", count: 244, visitors: 8, members: 236 },
];

export const weeklyTrend = [
  { week: "Week 1", count: 219 },
  { week: "Week 2", count: 233 },
  { week: "Week 3", count: 256 },
  { week: "Week 4", count: 241 },
  { week: "Week 5", count: 229 },
  { week: "Week 6", count: 248 },
  { week: "Week 7", count: 234 },
  { week: "Week 8", count: 221 },
  { week: "Week 9", count: 252 },
  { week: "Week 10", count: 238 },
  { week: "Week 11", count: 245 },
];

export function getAttendanceStats() {
  const total = attendanceRecords.reduce((sum, r) => sum + r.count, 0);
  const average = Math.round(total / attendanceRecords.length);
  const highest = Math.max(...attendanceRecords.map(r => r.count));
  const lowest = Math.min(...attendanceRecords.map(r => r.count));
  const totalVisitors = attendanceRecords.reduce((sum, r) => sum + r.visitors, 0);
  return { total, average, highest, lowest, totalVisitors, weeks: attendanceRecords.length };
}
