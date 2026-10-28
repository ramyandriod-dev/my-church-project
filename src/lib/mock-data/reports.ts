// ─── Reports Mock Data ────────────────────────────────────────

export interface ReportRow {
  [key: string]: string | number;
}

export interface ReportData {
  id: string;
  title: string;
  generatedDate: string;
  period: string;
  columns: { key: string; label: string }[];
  rows: ReportRow[];
  summary: { label: string; value: string | number }[];
}

export const reportData: Record<string, ReportData> = {
  membership: {
    id: "membership",
    title: "Membership Report",
    generatedDate: "Sep 16, 2026",
    period: "This Month",
    columns: [
      { key: "name", label: "Member Name" },
      { key: "status", label: "Status" },
      { key: "ministry", label: "Ministry" },
      { key: "joined", label: "Joined" },
      { key: "attendance", label: "Attendance %" },
    ],
    rows: [
      { name: "Sarah Johnson", status: "Active", ministry: "Worship", joined: "Mar 2024", attendance: 95 },
      { name: "Michael Chen", status: "Active", ministry: "Youth", joined: "Jan 2023", attendance: 92 },
      { name: "Emily Williams", status: "Active", ministry: "Children", joined: "Jun 2025", attendance: 88 },
      { name: "David Brown", status: "Active", ministry: "Outreach", joined: "Sep 2022", attendance: 90 },
      { name: "Lisa Martinez", status: "Active", ministry: "Worship", joined: "Feb 2024", attendance: 85 },
      { name: "James Anderson", status: "Inactive", ministry: "Admin", joined: "Nov 2021", attendance: 15 },
      { name: "Rachel Taylor", status: "Active", ministry: "Youth", joined: "Aug 2023", attendance: 88 },
      { name: "Kevin Thomas", status: "Active", ministry: "Outreach", joined: "Apr 2025", attendance: 78 },
      { name: "Amanda Garcia", status: "Active", ministry: "Worship", joined: "Jul 2024", attendance: 91 },
      { name: "Robert Lee", status: "Visitor", ministry: "—", joined: "Sep 2026", attendance: 100 },
    ],
    summary: [
      { label: "Total Members", value: 25 },
      { label: "Active", value: 20 },
      { label: "Inactive", value: 3 },
      { label: "Visitors", value: 2 },
      { label: "Avg Attendance", value: "82%" },
    ],
  },
  attendance: {
    id: "attendance",
    title: "Attendance Report",
    generatedDate: "Sep 16, 2026",
    period: "This Month",
    columns: [
      { key: "date", label: "Date" },
      { key: "service", label: "Service" },
      { key: "count", label: "Attendance" },
      { key: "visitors", label: "Visitors" },
      { key: "growth", label: "vs Last Week" },
    ],
    rows: [
      { date: "Sep 14, 2026", service: "Sunday AM", count: 187, visitors: 5, growth: "+3%" },
      { date: "Sep 14, 2026", service: "Sunday PM", count: 92, visitors: 2, growth: "+1%" },
      { date: "Sep 10, 2026", service: "Wednesday", count: 68, visitors: 0, growth: "-2%" },
      { date: "Sep 7, 2026", service: "Sunday AM", count: 181, visitors: 3, growth: "+5%" },
      { date: "Sep 7, 2026", service: "Sunday PM", count: 91, visitors: 1, growth: "+2%" },
      { date: "Sep 3, 2026", service: "Wednesday", count: 69, visitors: 0, growth: "0%" },
      { date: "Aug 31, 2026", service: "Sunday AM", count: 172, visitors: 4, growth: "-1%" },
      { date: "Aug 31, 2026", service: "Sunday PM", count: 89, visitors: 2, growth: "+1%" },
    ],
    summary: [
      { label: "Avg Sunday AM", value: 180 },
      { label: "Avg Sunday PM", value: 91 },
      { label: "Avg Wednesday", value: 69 },
      { label: "Total Visitors", value: 17 },
      { label: "Month Growth", value: "+4%" },
    ],
  },
  followups: {
    id: "followups",
    title: "Follow-Up Report",
    generatedDate: "Sep 16, 2026",
    period: "This Month",
    columns: [
      { key: "person", label: "Person" },
      { key: "reason", label: "Reason" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
      { key: "due", label: "Due Date" },
    ],
    rows: [
      { person: "Robert Lee", reason: "First-time visitor", priority: "High", status: "Pending", due: "Sep 16" },
      { person: "Brian Wright", reason: "Visitor connection", priority: "High", status: "Pending", due: "Sep 15" },
      { person: "James Anderson", reason: "Inactive check-in", priority: "Medium", status: "In Progress", due: "Sep 20" },
      { person: "Michelle Walker", reason: "Re-engagement", priority: "Medium", status: "Pending", due: "Sep 18" },
      { person: "Jason Green", reason: "Youth follow-up", priority: "Low", status: "Pending", due: "Sep 22" },
      { person: "Lisa Martinez", reason: "Prayer request", priority: "Medium", status: "Completed", due: "Sep 17" },
      { person: "David Brown", reason: "New member mentoring", priority: "Low", status: "In Progress", due: "Sep 25" },
    ],
    summary: [
      { label: "Total Follow-Ups", value: 10 },
      { label: "Pending", value: 6 },
      { label: "In Progress", value: 2 },
      { label: "Completed", value: 1 },
      { label: "Overdue", value: 1 },
    ],
  },
  ministry: {
    id: "ministry",
    title: "Ministry Report",
    generatedDate: "Sep 16, 2026",
    period: "This Month",
    columns: [
      { key: "ministry", label: "Ministry" },
      { key: "members", label: "Members" },
      { key: "attendance", label: "Avg Attendance" },
      { key: "events", label: "Events" },
      { key: "growth", label: "Growth" },
    ],
    rows: [
      { ministry: "Worship", members: 45, attendance: 38, events: 12, growth: "+5%" },
      { ministry: "Youth", members: 32, attendance: 28, events: 8, growth: "+12%" },
      { ministry: "Children", members: 28, attendance: 25, events: 10, growth: "+3%" },
      { ministry: "Outreach", members: 35, attendance: 22, events: 6, growth: "+8%" },
      { ministry: "Admin", members: 15, attendance: 12, events: 4, growth: "0%" },
    ],
    summary: [
      { label: "Total Ministries", value: 5 },
      { label: "Total Members", value: 155 },
      { label: "Avg Attendance", value: 25 },
      { label: "Total Events", value: 40 },
      { label: "Overall Growth", value: "+6%" },
    ],
  },
  groups: {
    id: "groups",
    title: "Groups Report",
    generatedDate: "Sep 16, 2026",
    period: "This Month",
    columns: [
      { key: "group", label: "Group Name" },
      { key: "leader", label: "Leader" },
      { key: "members", label: "Members" },
      { key: "capacity", label: "Capacity" },
      { key: "health", label: "Health" },
    ],
    rows: [
      { group: "Small Group A", leader: "Sarah Johnson", members: 12, capacity: "80%", health: "Healthy" },
      { group: "Small Group B", leader: "Michelle Walker", members: 10, capacity: "67%", health: "Healthy" },
      { group: "Youth Leadership", leader: "Michael Chen", members: 8, capacity: "67%", health: "Healthy" },
      { group: "Youth Mentors", leader: "Rachel Taylor", members: 6, capacity: "75%", health: "Healthy" },
      { group: "Youth Worship", leader: "Stephanie Allen", members: 14, capacity: "93%", health: "Full" },
      { group: "Children's Team", leader: "Emily Williams", members: 9, capacity: "75%", health: "Healthy" },
      { group: "Choir", leader: "Lisa Martinez", members: 18, capacity: "72%", health: "Healthy" },
    ],
    summary: [
      { label: "Total Groups", value: 15 },
      { label: "Active Groups", value: 13 },
      { label: "Total Participants", value: 141 },
      { label: "Avg Group Size", value: 9 },
      { label: "Avg Capacity", value: "74%" },
    ],
  },
  giving: {
    id: "giving",
    title: "Giving Report",
    generatedDate: "Sep 16, 2026",
    period: "This Month",
    columns: [
      { key: "date", label: "Date" },
      { key: "type", label: "Type" },
      { key: "amount", label: "Amount" },
      { key: "donors", label: "Donors" },
      { key: "avg", label: "Avg Gift" },
    ],
    rows: [
      { date: "Sep 14", type: "Sunday Tithes", amount: "$12,450", donors: 89, avg: "$140" },
      { date: "Sep 14", type: "Offering", amount: "$3,200", donors: 65, avg: "$49" },
      { date: "Sep 10", type: "Wednesday", amount: "$2,100", donors: 42, avg: "$50" },
      { date: "Sep 7", type: "Sunday Tithes", amount: "$11,890", donors: 85, avg: "$140" },
      { date: "Sep 7", type: "Offering", amount: "$2,850", donors: 58, avg: "$49" },
      { date: "Sep 3", type: "Wednesday", amount: "$1,950", donors: 38, avg: "$51" },
      { date: "Sep 1", type: "Missions Fund", amount: "$1,200", donors: 15, avg: "$80" },
    ],
    summary: [
      { label: "Total Giving", value: "$35,640" },
      { label: "Avg Weekly", value: "$8,910" },
      { label: "Total Donors", value: 125 },
      { label: "Avg Gift Size", value: "$95" },
      { label: "vs Last Month", value: "+7%" },
    ],
  },
};
