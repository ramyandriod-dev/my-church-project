// ─── Groups Mock Data ──────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  leader: string;
  ministry: string;
  memberCount: number;
  maxCapacity: number;
  meetingDay: string;
  meetingTime: string;
  location: string;
  status: "active" | "inactive" | "full";
  description: string;
}

export const groups: Group[] = [
  { id: "1", name: "Small Group A", leader: "Sarah Johnson", ministry: "Worship", memberCount: 12, maxCapacity: 15, meetingDay: "Wednesday", meetingTime: "7:00 PM", location: "Fellowship Hall Room 2", status: "active", description: "Weekly Bible study and fellowship for adults" },
  { id: "2", name: "Small Group B", leader: "Michelle Walker", ministry: "Worship", memberCount: 10, maxCapacity: 15, meetingDay: "Thursday", meetingTime: "6:30 PM", location: "Fellowship Hall Room 3", status: "active", description: "Mid-week prayer and discussion group" },
  { id: "3", name: "Youth Leadership", leader: "Michael Chen", ministry: "Youth", memberCount: 8, maxCapacity: 12, meetingDay: "Friday", meetingTime: "6:00 PM", location: "Youth Center", status: "active", description: "Training and mentoring for youth leaders" },
  { id: "4", name: "Youth Mentors", leader: "Rachel Taylor", ministry: "Youth", memberCount: 6, maxCapacity: 8, meetingDay: "Sunday", meetingTime: "4:00 PM", location: "Youth Center", status: "active", description: "Adult mentors for youth ministry" },
  { id: "5", name: "Youth Worship", leader: "Stephanie Allen", ministry: "Youth", memberCount: 14, maxCapacity: 15, meetingDay: "Friday", meetingTime: "5:00 PM", location: "Youth Center", status: "full", description: "Youth worship team rehearsals" },
  { id: "6", name: "Children's Team", leader: "Emily Williams", ministry: "Children", memberCount: 9, maxCapacity: 12, meetingDay: "Sunday", meetingTime: "9:00 AM", location: "Children's Wing", status: "active", description: "Sunday school teachers and helpers" },
  { id: "7", name: "Nursery Team", leader: "Jennifer Clark", ministry: "Children", memberCount: 7, maxCapacity: 10, meetingDay: "Sunday", meetingTime: "9:00 AM", location: "Nursery", status: "active", description: "Care for infants and toddlers during services" },
  { id: "8", name: "Sunday School", leader: "Andrew Young", ministry: "Children", memberCount: 8, maxCapacity: 12, meetingDay: "Sunday", meetingTime: "9:30 AM", location: "Children's Wing Room 1", status: "active", description: "Bible lessons for elementary-age children" },
  { id: "9", name: "Community Service", leader: "David Brown", ministry: "Outreach", memberCount: 15, maxCapacity: 20, meetingDay: "Saturday", meetingTime: "9:00 AM", location: "Church Parking Lot", status: "active", description: "Local community service projects" },
  { id: "10", name: "Mission Trip", leader: "Kevin Thomas", ministry: "Outreach", memberCount: 11, maxCapacity: 15, meetingDay: "Tuesday", meetingTime: "7:00 PM", location: "Fellowship Hall", status: "active", description: "Planning and preparation for mission trips" },
  { id: "11", name: "Food Bank", leader: "Christopher Hall", ministry: "Outreach", memberCount: 13, maxCapacity: 15, meetingDay: "Thursday", meetingTime: "10:00 AM", location: "Food Bank Building", status: "active", description: "Weekly food distribution to the community" },
  { id: "12", name: "Finance Team", leader: "James Anderson", ministry: "Admin", memberCount: 4, maxCapacity: 6, meetingDay: "Monday", meetingTime: "6:00 PM", location: "Conference Room", status: "inactive", description: "Church financial oversight and planning" },
  { id: "13", name: "Tech Team", leader: "Daniel Lewis", ministry: "Admin", memberCount: 5, maxCapacity: 8, meetingDay: "Saturday", meetingTime: "2:00 PM", location: "Tech Booth", status: "active", description: "Sound, lighting, and live stream support" },
  { id: "14", name: "Facilities", leader: "Tyler Hill", ministry: "Admin", memberCount: 6, maxCapacity: 8, meetingDay: "Saturday", meetingTime: "8:00 AM", location: "Church Campus", status: "active", description: "Building and grounds maintenance" },
  { id: "15", name: "Choir", leader: "Lisa Martinez", ministry: "Worship", memberCount: 18, maxCapacity: 25, meetingDay: "Wednesday", meetingTime: "7:30 PM", location: "Sanctuary", status: "active", description: "Choir rehearsals and performances" },
];

export function getGroupStats() {
  const total = groups.length;
  const active = groups.filter(g => g.status === "active").length;
  const totalParticipants = groups.reduce((sum, g) => sum + g.memberCount, 0);
  const totalCapacity = groups.reduce((sum, g) => sum + g.maxCapacity, 0);
  return { total, active, totalParticipants, totalCapacity };
}
