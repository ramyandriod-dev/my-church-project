// ─── Shepherding Mock Data ─────────────────────────────────────

export interface ShepherdingRecord {
  id: string;
  person: string;
  avatar: string;
  status: "attention-needed" | "stable" | "thriving";
  lastContact: string;
  assignedTo: string;
  notes: string;
  priority: "high" | "medium" | "low";
}

export const shepherdingRecords: ShepherdingRecord[] = [
  { id: "1", person: "James Anderson", avatar: "https://i.pravatar.cc/150?img=60", status: "attention-needed", lastContact: "Aug 10, 2026", assignedTo: "Pastor David Brown", notes: "Has been absent for 6 weeks. Previous phone call went unanswered. May be going through a difficult time.", priority: "high" },
  { id: "2", person: "Michelle Walker", avatar: "https://i.pravatar.cc/150?img=48", status: "attention-needed", lastContact: "Jun 15, 2026", assignedTo: "Rachel Taylor", notes: "Last attended June 8. Was very active in worship ministry. Needs personal outreach.", priority: "high" },
  { id: "3", person: "Jason Green", avatar: "https://i.pravatar.cc/150?img=53", status: "attention-needed", lastContact: "May 25, 2026", assignedTo: "Michael Chen", notes: "Youth graduate who drifted away after high school. Common transition period.", priority: "medium" },
  { id: "4", person: "Robert Lee", avatar: "https://i.pravatar.cc/150?img=51", status: "stable", lastContact: "Sep 14, 2026", assignedTo: "Pastor David Brown", notes: "First-time visitor. Showed interest in joining a small group. Will follow up this week.", priority: "medium" },
  { id: "5", person: "Brian Wright", avatar: "https://i.pravatar.cc/150?img=52", status: "stable", lastContact: "Sep 7, 2026", assignedTo: "Sarah Johnson", notes: "Second-time visitor. Came with a friend. Interested in young adults group.", priority: "low" },
  { id: "6", person: "Sarah Johnson", avatar: "https://i.pravatar.cc/150?img=47", status: "thriving", lastContact: "Sep 14, 2026", assignedTo: "Pastor David Brown", notes: "Active worship leader. Growing in faith and leadership. Mentoring others.", priority: "low" },
  { id: "7", person: "Michael Chen", avatar: "https://i.pravatar.cc/150?img=53", status: "thriving", lastContact: "Sep 14, 2026", assignedTo: "Pastor David Brown", notes: "Youth leader doing excellent work. Planning fall youth calendar.", priority: "low" },
  { id: "8", person: "Emily Williams", avatar: "https://i.pravatar.cc/150?img=45", status: "thriving", lastContact: "Sep 14, 2026", assignedTo: "Pastor David Brown", notes: "Children's ministry leader. New curriculum launch went well.", priority: "low" },
  { id: "9", person: "David Brown", avatar: "https://i.pravatar.cc/150?img=59", status: "stable", lastContact: "Sep 14, 2026", assignedTo: "Pastor David Brown", notes: "Outreach leader. Food drive planning on track. Good volunteer engagement.", priority: "low" },
  { id: "10", person: "Lisa Martinez", avatar: "https://i.pravatar.cc/150?img=43", status: "stable", lastContact: "Sep 14, 2026", assignedTo: "Pastor David Brown", notes: "Choir director. Preparing for fall concert series. Ministry is healthy.", priority: "low" },
];

export function getShepherdingStats() {
  const attention = shepherdingRecords.filter(r => r.status === "attention-needed").length;
  const stable = shepherdingRecords.filter(r => r.status === "stable").length;
  const thriving = shepherdingRecords.filter(r => r.status === "thriving").length;
  return { attention, stable, thriving, total: shepherdingRecords.length };
}
