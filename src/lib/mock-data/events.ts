// ─── Events Mock Data ──────────────────────────────────────────

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  expectedAttendance: number;
  status: "upcoming" | "in-progress" | "completed" | "cancelled";
  category: string;
  description: string;
  organizer: string;
}

export const events: Event[] = [
  { id: "1", title: "Sunday Worship Service", date: "Sep 14, 2026", time: "10:00 AM", endTime: "11:30 AM", location: "Main Sanctuary", expectedAttendance: 245, status: "completed", category: "Worship", description: "Weekly Sunday worship service with sermon and communion", organizer: "Pastor David Brown" },
  { id: "2", title: "Youth Night", date: "Sep 20, 2026", time: "7:00 PM", endTime: "9:00 PM", location: "Youth Center", expectedAttendance: 45, status: "upcoming", category: "Youth", description: "Friday night youth gathering with games, worship, and teaching", organizer: "Michael Chen" },
  { id: "3", title: "Bible Study", date: "Sep 18, 2026", time: "6:30 PM", endTime: "8:00 PM", location: "Fellowship Hall", expectedAttendance: 32, status: "upcoming", category: "Education", description: "Mid-week Bible study through the book of Romans", organizer: "Pastor David Brown" },
  { id: "4", title: "Worship Team Rehearsal", date: "Sep 17, 2026", time: "7:00 PM", endTime: "9:00 PM", location: "Sanctuary", expectedAttendance: 18, status: "upcoming", category: "Worship", description: "Weekly rehearsal for Sunday worship team", organizer: "Lisa Martinez" },
  { id: "5", title: "Community Food Drive", date: "Sep 27, 2026", time: "9:00 AM", endTime: "2:00 PM", location: "Church Parking Lot", expectedAttendance: 60, status: "upcoming", category: "Outreach", description: "Monthly community food drive and distribution", organizer: "Christopher Hall" },
  { id: "6", title: "Leadership Meeting", date: "Sep 22, 2026", time: "6:00 PM", endTime: "8:00 PM", location: "Conference Room", expectedAttendance: 12, status: "upcoming", category: "Admin", description: "Monthly church leadership team meeting", organizer: "Pastor David Brown" },
  { id: "7", title: "Choir Practice", date: "Sep 17, 2026", time: "7:30 PM", endTime: "9:00 PM", location: "Sanctuary", expectedAttendance: 18, status: "upcoming", category: "Worship", description: "Weekly choir rehearsal for Sunday service", organizer: "Lisa Martinez" },
  { id: "8", title: "New Member Class", date: "Oct 4, 2026", time: "9:00 AM", endTime: "12:00 PM", location: "Fellowship Hall Room 2", expectedAttendance: 20, status: "upcoming", category: "Education", description: "Class for new members to learn about church membership", organizer: "Pastor David Brown" },
  { id: "9", title: "Fall Festival", date: "Oct 31, 2026", time: "4:00 PM", endTime: "7:00 PM", location: "Church Campus", expectedAttendance: 300, status: "upcoming", category: "Community", description: "Annual fall festival with games, food, and trunk-or-treat", organizer: "Outreach Team" },
  { id: "10", title: "Prayer Meeting", date: "Sep 16, 2026", time: "6:00 AM", endTime: "7:00 AM", location: "Chapel", expectedAttendance: 15, status: "upcoming", category: "Worship", description: "Weekly early morning prayer meeting", organizer: "Pastor David Brown" },
  { id: "11", title: "Mission Trip Planning", date: "Sep 23, 2026", time: "7:00 PM", endTime: "8:30 PM", location: "Fellowship Hall", expectedAttendance: 11, status: "upcoming", category: "Outreach", description: "Planning meeting for upcoming mission trip to Guatemala", organizer: "Kevin Thomas" },
  { id: "12", title: "Women's Retreat", date: "Nov 14, 2026", time: "9:00 AM", endTime: "5:00 PM", location: "Lake Retreat Center", expectedAttendance: 35, status: "upcoming", category: "Community", description: "Annual women's ministry retreat", organizer: "Women's Ministry Team" },
];

export function getEventStats() {
  const total = events.length;
  const upcoming = events.filter(e => e.status === "upcoming").length;
  const thisWeek = events.filter(e => {
    const eventDate = new Date(e.date);
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return eventDate >= now && eventDate <= weekEnd;
  }).length;
  const totalExpected = events.reduce((sum, e) => sum + e.expectedAttendance, 0);
  return { total, upcoming, thisWeek, totalExpected };
}
