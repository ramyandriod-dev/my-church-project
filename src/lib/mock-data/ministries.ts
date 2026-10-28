// ─── Ministries Mock Data ──────────────────────────────────────

export interface Ministry {
  id: string;
  name: string;
  leader: string;
  memberCount: number;
  description: string;
  meetingSchedule: string;
  status: "active" | "inactive";
  recentActivity: string;
  icon: string;
  color: string;
}

export const ministries: Ministry[] = [
  { id: "1", name: "Worship", leader: "Lisa Martinez", memberCount: 45, description: "Leading the congregation in praise and worship through music, media, and creative arts.", meetingSchedule: "Wednesdays at 7:30 PM", status: "active", recentActivity: "Choir performed at Sunday service", icon: "music", color: "purple" },
  { id: "2", name: "Youth", leader: "Michael Chen", memberCount: 38, description: "Equipping the next generation through discipleship, fellowship, and fun activities.", meetingSchedule: "Fridays at 6:00 PM", status: "active", recentActivity: "Youth Night planning for Sep 20", icon: "smile", color: "blue" },
  { id: "3", name: "Children", leader: "Emily Williams", memberCount: 32, description: "Providing age-appropriate Bible teaching and care for children ages 0-12.", meetingSchedule: "Sundays at 9:00 AM", status: "active", recentActivity: "New curriculum launched for fall", icon: "users", color: "mint" },
  { id: "4", name: "Outreach", leader: "David Brown", memberCount: 25, description: "Serving the local community and beyond through missions, food bank, and social programs.", meetingSchedule: "Saturdays at 9:00 AM", status: "active", recentActivity: "Food drive scheduled for Sep 27", icon: "globe", color: "gold" },
  { id: "5", name: "Administration", leader: "James Anderson", memberCount: 20, description: "Managing church operations, finances, facilities, and technology systems.", meetingSchedule: "Mondays at 6:00 PM", status: "active", recentActivity: "Budget review completed", icon: "settings", color: "coral" },
];

export function getMinistryStats() {
  const total = ministries.length;
  const active = ministries.filter(m => m.status === "active").length;
  const totalMembers = ministries.reduce((sum, m) => sum + m.memberCount, 0);
  return { total, active, totalMembers };
}
