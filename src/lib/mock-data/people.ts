import type { ChurchRole } from "@/lib/members/church-role";
// ─── People Mock Data ──────────────────────────────────────────

/** Which gathering this member primarily attends. */
export type ServiceAssignment = "friday" | "sunday" | "both";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "visitor" | "deletion_requested";
  ministry: string;
  group: string;
  lastAttendance: string;
  joinedDate: string;
  avatar: string;
  attendanceRate?: number;
  isCommitted?: boolean;
  committedReason?: string;
  /** Which service(s) this member is assigned to. */
  serviceAssignment: ServiceAssignment;
  /** Role inside the church (from the linked login). Missing means regular member. */
  churchRole?: ChurchRole;
}

export const members: Member[] = [
  { id: "1",  firstName: "Sarah",       lastName: "Johnson",  email: "sarah.j@email.com",          phone: "(555) 123-4567", status: "active",   ministry: "Worship",  group: "Small Group A",      lastAttendance: "Sep 14, 2026", joinedDate: "Mar 12, 2024", avatar: "https://i.pravatar.cc/150?img=47", attendanceRate: 92, isCommitted: true,  committedReason: "92% Attendance & Worship Ministry Leader",    serviceAssignment: "friday" },
  { id: "2",  firstName: "Michael",     lastName: "Chen",     email: "m.chen@email.com",           phone: "(555) 234-5678", status: "active",   ministry: "Youth",    group: "Youth Leadership",   lastAttendance: "Sep 14, 2026", joinedDate: "Jan 8, 2023",  avatar: "https://i.pravatar.cc/150?img=53", attendanceRate: 95, isCommitted: true,  committedReason: "95% Attendance & Youth Leader since 2023",     serviceAssignment: "sunday" },
  { id: "3",  firstName: "Emily",       lastName: "Williams", email: "emily.w@email.com",          phone: "(555) 345-6789", status: "active",   ministry: "Children", group: "Children's Team",    lastAttendance: "Aug 28, 2026", joinedDate: "Jun 15, 2025", avatar: "https://i.pravatar.cc/150?img=45", attendanceRate: 84, isCommitted: false,                                                          serviceAssignment: "sunday" },
  { id: "4",  firstName: "David",       lastName: "Brown",    email: "d.brown@email.com",          phone: "(555) 456-7890", status: "active",   ministry: "Outreach", group: "Community Service",  lastAttendance: "Sep 14, 2026", joinedDate: "Sep 3, 2022",  avatar: "https://i.pravatar.cc/150?img=59", attendanceRate: 91, isCommitted: true,  committedReason: "91% Attendance & Pillar Volunteer since 2022", serviceAssignment: "both" },
  { id: "5",  firstName: "Lisa",        lastName: "Martinez", email: "lisa.m@email.com",           phone: "(555) 567-8901", status: "active",   ministry: "Worship",  group: "Choir",              lastAttendance: "Sep 14, 2026", joinedDate: "Feb 20, 2024", avatar: "https://i.pravatar.cc/150?img=43", attendanceRate: 88, isCommitted: false,                                                          serviceAssignment: "sunday" },
  { id: "6",  firstName: "James",       lastName: "Anderson", email: "j.anderson@email.com",       phone: "(555) 678-9012", status: "inactive", ministry: "Admin",    group: "Finance Team",       lastAttendance: "Jul 28, 2026", joinedDate: "Nov 5, 2021",  avatar: "https://i.pravatar.cc/150?img=60", attendanceRate: 42, isCommitted: false,                                                          serviceAssignment: "friday" },
  { id: "7",  firstName: "Rachel",      lastName: "Taylor",   email: "r.taylor@email.com",         phone: "(555) 789-0123", status: "active",   ministry: "Youth",    group: "Youth Mentors",      lastAttendance: "Aug 21, 2026", joinedDate: "Aug 12, 2023", avatar: "https://i.pravatar.cc/150?img=49", attendanceRate: 86, isCommitted: false,                                                          serviceAssignment: "sunday" },
  { id: "8",  firstName: "Kevin",       lastName: "Thomas",   email: "k.thomas@email.com",         phone: "(555) 890-1234", status: "active",   ministry: "Outreach", group: "Mission Trip",       lastAttendance: "Sep 14, 2026", joinedDate: "Apr 1, 2025",  avatar: "https://i.pravatar.cc/150?img=55", attendanceRate: 94, isCommitted: true,  committedReason: "94% Attendance & Mission Lead",               serviceAssignment: "both" },
  { id: "9",  firstName: "Amanda",      lastName: "Garcia",   email: "a.garcia@email.com",         phone: "(555) 901-2345", status: "active",   ministry: "Worship",  group: "Worship Team",       lastAttendance: "Sep 14, 2026", joinedDate: "Jul 22, 2024", avatar: "https://i.pravatar.cc/150?img=44", attendanceRate: 82, isCommitted: false,                                                          serviceAssignment: "friday" },
  { id: "10", firstName: "Robert",      lastName: "Lee",      email: "r.lee@email.com",            phone: "(555) 012-3456", status: "visitor",  ministry: "—",        group: "—",                  lastAttendance: "Sep 14, 2026", joinedDate: "Sep 14, 2026", avatar: "https://i.pravatar.cc/150?img=51", attendanceRate: 100, isCommitted: false,                                                         serviceAssignment: "sunday" },
  { id: "11", firstName: "Jennifer",    lastName: "Clark",    email: "j.clark@email.com",          phone: "(555) 111-2222", status: "active",   ministry: "Children", group: "Nursery Team",       lastAttendance: "Sep 14, 2026", joinedDate: "May 30, 2023", avatar: "https://i.pravatar.cc/150?img=46", attendanceRate: 93, isCommitted: true,  committedReason: "93% Attendance & Children Ministry Pillar",   serviceAssignment: "sunday" },
  { id: "12", firstName: "Daniel",      lastName: "Lewis",    email: "d.lewis@email.com",          phone: "(555) 222-3333", status: "active",   ministry: "Admin",    group: "Tech Team",          lastAttendance: "Sep 14, 2026", joinedDate: "Oct 18, 2024", avatar: "https://i.pravatar.cc/150?img=57", attendanceRate: 89, isCommitted: false,                                                          serviceAssignment: "friday" },
  { id: "13", firstName: "Michelle",    lastName: "Walker",   email: "m.walker@email.com",         phone: "(555) 333-4444", status: "inactive", ministry: "Worship",  group: "Small Group B",      lastAttendance: "Jun 8, 2026",  joinedDate: "Dec 14, 2022", avatar: "https://i.pravatar.cc/150?img=48", attendanceRate: 35, isCommitted: false,                                                          serviceAssignment: "friday" },
  { id: "14", firstName: "Christopher", lastName: "Hall",     email: "c.hall@email.com",           phone: "(555) 444-5555", status: "active",   ministry: "Outreach", group: "Food Bank",          lastAttendance: "Sep 14, 2026", joinedDate: "Feb 2, 2025",  avatar: "https://i.pravatar.cc/150?img=56", attendanceRate: 85, isCommitted: false,                                                          serviceAssignment: "sunday" },
  { id: "15", firstName: "Stephanie",   lastName: "Allen",    email: "s.allen@email.com",          phone: "(555) 555-6666", status: "active",   ministry: "Youth",    group: "Youth Worship",      lastAttendance: "Sep 14, 2026", joinedDate: "Sep 9, 2023",  avatar: "https://i.pravatar.cc/150?img=44", attendanceRate: 90, isCommitted: true,  committedReason: "90% Attendance & Youth Worship Lead",         serviceAssignment: "sunday" },
  { id: "16", firstName: "Andrew",      lastName: "Young",    email: "a.young@email.com",          phone: "(555) 666-7777", status: "active",   ministry: "Children", group: "Sunday School",      lastAttendance: "Sep 14, 2026", joinedDate: "Jan 25, 2024", avatar: "https://i.pravatar.cc/150?img=51", attendanceRate: 87, isCommitted: false,                                                          serviceAssignment: "sunday" },
  { id: "17", firstName: "Nicole",      lastName: "King",     email: "n.king@email.com",           phone: "(555) 777-8888", status: "active",   ministry: "Worship",  group: "Small Group A",      lastAttendance: "Sep 14, 2026", joinedDate: "Nov 30, 2025", avatar: "https://i.pravatar.cc/150?img=41", attendanceRate: 78, isCommitted: false,                                                          serviceAssignment: "friday" },
  { id: "18", firstName: "Brian",       lastName: "Wright",   email: "b.wright@email.com",         phone: "(555) 888-9999", status: "visitor",  ministry: "—",        group: "—",                  lastAttendance: "Sep 7, 2026",  joinedDate: "Sep 7, 2026",  avatar: "https://i.pravatar.cc/150?img=52", attendanceRate: 50, isCommitted: false,                                                          serviceAssignment: "sunday" },
  { id: "19", firstName: "Lauren",      lastName: "Lopez",    email: "l.lopez@email.com",          phone: "(555) 999-0000", status: "active",   ministry: "Outreach", group: "Community Service",  lastAttendance: "Sep 14, 2026", joinedDate: "Aug 5, 2024",  avatar: "https://i.pravatar.cc/150?img=42", attendanceRate: 81, isCommitted: false,                                                          serviceAssignment: "friday" },
  { id: "20", firstName: "Tyler",       lastName: "Hill",     email: "t.hill@email.com",           phone: "(555) 101-2020", status: "active",   ministry: "Admin",    group: "Facilities",         lastAttendance: "Sep 14, 2026", joinedDate: "Mar 17, 2023", avatar: "https://i.pravatar.cc/150?img=61", attendanceRate: 96, isCommitted: true,  committedReason: "96% Attendance & Faithful Admin Volunteer",   serviceAssignment: "both" },
  { id: "21", firstName: "Samantha",    lastName: "Scott",    email: "s.scott@email.com",          phone: "(555) 202-3030", status: "active",   ministry: "Worship",  group: "Choir",              lastAttendance: "Sep 14, 2026", joinedDate: "Jul 11, 2025", avatar: "https://i.pravatar.cc/150?img=40", attendanceRate: 80, isCommitted: false,                                                          serviceAssignment: "both" },
  { id: "22", firstName: "Jason",       lastName: "Green",    email: "j.green@email.com",          phone: "(555) 303-4040", status: "inactive", ministry: "Youth",    group: "Youth Leadership",   lastAttendance: "May 22, 2026", joinedDate: "Apr 14, 2022", avatar: "https://i.pravatar.cc/150?img=53", attendanceRate: 20, isCommitted: false,                                                          serviceAssignment: "sunday" },
  { id: "23", firstName: "Megan",       lastName: "Adams",    email: "m.adams@email.com",          phone: "(555) 404-5050", status: "active",   ministry: "Children", group: "Children's Team",    lastAttendance: "Sep 14, 2026", joinedDate: "Dec 1, 2024",  avatar: "https://i.pravatar.cc/150?img=38", attendanceRate: 83, isCommitted: false,                                                          serviceAssignment: "sunday" },
  { id: "24", firstName: "Justin",      lastName: "Baker",    email: "j.baker@email.com",          phone: "(555) 505-6060", status: "active",   ministry: "Outreach", group: "Mission Trip",       lastAttendance: "Sep 14, 2026", joinedDate: "Jun 28, 2023", avatar: "https://i.pravatar.cc/150?img=54", attendanceRate: 92, isCommitted: true,  committedReason: "92% Attendance & Active Outreach Serving",    serviceAssignment: "friday" },
  { id: "25", firstName: "Ashley",      lastName: "Nelson",   email: "a.nelson@email.com",         phone: "(555) 606-7070", status: "active",   ministry: "Worship",  group: "Worship Team",       lastAttendance: "Sep 14, 2026", joinedDate: "Oct 5, 2025",  avatar: "https://i.pravatar.cc/150?img=39", attendanceRate: 75, isCommitted: false,                                                          serviceAssignment: "sunday" },
  { id: "mw", firstName: "Michael",     lastName: "Williams", email: "michael.williams@example.com", phone: "(555) 333-8899", status: "active", ministry: "Admin",   group: "Operations Team",    lastAttendance: "Aug 28, 2026", joinedDate: "Jan 15, 2024", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=MichaelWilliams", attendanceRate: 72, isCommitted: false,                                              serviceAssignment: "friday" },
  { id: "dd", firstName: "David",       lastName: "Davis",    email: "david.davis@example.com",    phone: "(555) 444-9900", status: "visitor",  ministry: "—",        group: "—",                  lastAttendance: "Aug 21, 2026", joinedDate: "May 10, 2025", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=DavidDavis",    attendanceRate: 50, isCommitted: false,                                              serviceAssignment: "sunday" },
  { id: "js", firstName: "John",        lastName: "Smith",    email: "john.smith@example.com",     phone: "(555) 111-7788", status: "active",   ministry: "Worship",  group: "Choir",              lastAttendance: "Sep 11, 2026", joinedDate: "Feb 1, 2023",  avatar: "https://api.dicebear.com/9.x/initials/svg?seed=JohnSmith",    attendanceRate: 94, isCommitted: true,  committedReason: "94% Attendance & Faithful Choir Member",      serviceAssignment: "both" },
  { id: "eb", firstName: "Emily",       lastName: "Brown",    email: "emily.brown@example.com",    phone: "(555) 222-6677", status: "active",   ministry: "Children", group: "Sunday School",      lastAttendance: "Sep 4, 2026",  joinedDate: "Aug 20, 2024", avatar: "https://api.dicebear.com/9.x/initials/svg?seed=EmilyBrown",   attendanceRate: 85, isCommitted: false,                                              serviceAssignment: "sunday" },
];

export function isMemberCommitted(m: Member): boolean {
  return Boolean(m.isCommitted ?? (m.attendanceRate !== undefined && m.attendanceRate >= 90 && m.status === "active"));
}

export function getMemberStats(list: Member[] = members) {
  const total = list.length;
  const active = list.filter(m => m.status === "active").length;
  const inactive = list.filter(m => m.status === "inactive").length;
  const visitors = list.filter(m => m.status === "visitor").length;
  const committed = list.filter(m => isMemberCommitted(m)).length;
  return { total, active, inactive, visitors, committed };
}

/**
 * Returns members that attend the given service.
 * "Both" members always appear in any service filter.
 */
export function getMembersByService(
  list: Member[],
  service: ServiceAssignment | "all"
): Member[] {
  if (service === "all") return list;
  return list.filter(
    (m) => m.serviceAssignment === service || m.serviceAssignment === "both"
  );
}

/** Human-readable label for a service assignment. */
export function serviceLabel(s: ServiceAssignment, short = false): string {
  if (short) {
    if (s === "friday") return "FRI";
    if (s === "sunday") return "SUN";
    return "BOTH";
  }
  if (s === "friday") return "Friday";
  if (s === "sunday") return "Sunday";
  return "Both";
}

/** Tailwind colour classes for the service badge. */
export function serviceBadgeClasses(s: ServiceAssignment): string {
  if (s === "friday") return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "sunday") return "bg-purple-100 text-purple-700 border-purple-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}
