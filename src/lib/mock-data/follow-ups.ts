// ─── Follow-Ups Mock Data ──────────────────────────────────────

export interface FollowUpActivityMock {
  id: string;
  contactType: "phone" | "whatsapp" | "visit" | "in_person" | "other";
  notes: string;
  contactDate: string;
  createdBy: string;
}

export interface FollowUp {
  id: string;
  memberId?: string;
  person: string;
  avatar: string;
  reason: string;
  type?: "absenteeism" | "welcome_back" | "visitor" | "pastoral_care" | "general";
  priority: "high" | "medium" | "low";
  assignedTo: string;
  dueDate: string;
  status: "open" | "in_progress" | "completed" | "cancelled" | "overdue" | "pending" | "in-progress";
  lastContact?: string;
  nextAction?: string;
  notes: string;
  activities?: FollowUpActivityMock[];
  createdAt?: string;
}

export const followUps: FollowUp[] = [
  {
    id: "1",
    memberId: "mw",
    person: "Michael Williams",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    reason: "Missed Friday Meeting",
    type: "absenteeism",
    priority: "high",
    assignedTo: "Peter George",
    dueDate: "Sep 23, 2026",
    status: "in_progress",
    lastContact: "Sep 20, 2026",
    nextAction: "Follow up on phone call regarding small group",
    notes: "Absent for 3 consecutive weeks before returning. Check in on family and work commitments.",
    createdAt: "Sep 18, 2026",
    activities: [
      {
        id: "act-1",
        contactType: "phone",
        notes: "Called Michael to check in. He mentioned heavy travel for work, appreciated the care.",
        contactDate: "Sep 20, 2026, 11:30 AM",
        createdBy: "Peter George",
      },
    ],
  },
  {
    id: "2",
    memberId: "robert-lee",
    person: "Robert Lee",
    avatar: "https://i.pravatar.cc/150?img=51",
    reason: "First-time visitor follow-up",
    type: "visitor",
    priority: "high",
    assignedTo: "Pastor David Brown",
    dueDate: "Sep 16, 2026",
    status: "overdue",
    lastContact: "Sep 14, 2026",
    nextAction: "Send welcome message with small group options",
    notes: "Attended Sunday service for the first time. Visited from out of town.",
    createdAt: "Sep 13, 2026",
    activities: [
      {
        id: "act-2",
        contactType: "whatsapp",
        notes: "Sent introductory WhatsApp greeting with service schedule.",
        contactDate: "Sep 14, 2026, 04:15 PM",
        createdBy: "Pastor David Brown",
      },
    ],
  },
  {
    id: "3",
    memberId: "brian-wright",
    person: "Brian Wright",
    avatar: "https://i.pravatar.cc/150?img=52",
    reason: "Visitor connection",
    type: "visitor",
    priority: "high",
    assignedTo: "Sarah Johnson",
    dueDate: "Sep 22, 2026",
    status: "open",
    lastContact: "Sep 17, 2026",
    nextAction: "Invite to next Sunday fellowship",
    notes: "Came with friend. Interested in small groups.",
    createdAt: "Sep 15, 2026",
    activities: [],
  },
  {
    id: "4",
    memberId: "james-anderson",
    person: "James Anderson",
    avatar: "https://i.pravatar.cc/150?img=60",
    reason: "Inactive member check-in",
    type: "absenteeism",
    priority: "medium",
    assignedTo: "Pastor David Brown",
    dueDate: "Sep 24, 2026",
    status: "in-progress",
    lastContact: "Sep 19, 2026",
    nextAction: "Schedule home visit with deacon",
    notes: "Hasn't attended in 6 weeks. Called but no answer.",
    createdAt: "Sep 12, 2026",
    activities: [
      {
        id: "act-4",
        contactType: "phone",
        notes: "Attempted phone call, left voicemail offering prayer.",
        contactDate: "Sep 19, 2026, 02:00 PM",
        createdBy: "Pastor David Brown",
      },
    ],
  },
  {
    id: "5",
    memberId: "michelle-walker",
    person: "Michelle Walker",
    avatar: "https://i.pravatar.cc/150?img=48",
    reason: "Inactive member re-engagement",
    type: "pastoral_care",
    priority: "medium",
    assignedTo: "Rachel Taylor",
    dueDate: "Sep 21, 2026",
    status: "open",
    lastContact: "Sep 15, 2026",
    nextAction: "WhatsApp check-in",
    notes: "Last attended June 8. May need pastoral care support.",
    createdAt: "Sep 10, 2026",
    activities: [],
  },
  {
    id: "6",
    memberId: "jason-green",
    person: "Jason Green",
    avatar: "https://i.pravatar.cc/150?img=53",
    reason: "Inactive youth follow-up",
    type: "absenteeism",
    priority: "low",
    assignedTo: "Michael Chen",
    dueDate: "Sep 26, 2026",
    status: "open",
    nextAction: "Invite to youth revival night",
    notes: "Youth member who stopped attending after college graduation.",
    createdAt: "Sep 14, 2026",
    activities: [],
  },
  {
    id: "7",
    memberId: "lisa-martinez",
    person: "Lisa Martinez",
    avatar: "https://i.pravatar.cc/150?img=43",
    reason: "Prayer request follow-up",
    type: "pastoral_care",
    priority: "medium",
    assignedTo: "Pastor David Brown",
    dueDate: "Sep 17, 2026",
    status: "completed",
    lastContact: "Sep 17, 2026",
    nextAction: "No pending action",
    notes: "Requested prayer for family situation. Followed up and prayed together.",
    createdAt: "Sep 10, 2026",
    activities: [
      {
        id: "act-7a",
        contactType: "visit",
        notes: "Visited at home, prayed for the family situation.",
        contactDate: "Sep 17, 2026, 05:00 PM",
        createdBy: "Pastor David Brown",
      },
    ],
  },
  {
    id: "8",
    memberId: "sarah-johnson",
    person: "Sarah Johnson",
    avatar: "https://i.pravatar.cc/150?img=47",
    reason: "Worship team appreciation",
    type: "general",
    priority: "low",
    assignedTo: "Pastor David Brown",
    dueDate: "Oct 1, 2026",
    status: "open",
    nextAction: "Present appreciation card at rehearsal",
    notes: "Thank you note for leading worship during pastor's absence.",
    createdAt: "Sep 15, 2026",
    activities: [],
  },
];

export function getFollowUpStats() {
  const total = followUps.length;
  const open = followUps.filter(f => f.status === "open" || f.status === "pending").length;
  const inProgress = followUps.filter(f => f.status === "in_progress" || f.status === "in-progress").length;
  const overdue = followUps.filter(f => f.status === "overdue").length;
  const dueToday = followUps.filter(f => {
    const due = new Date(f.dueDate);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  }).length;
  const completed = followUps.filter(f => f.status === "completed").length;
  // Completed this week: mock count 18 as requested in M8.9
  const completedThisWeek = 18;

  return {
    total,
    open: open || 24,
    pending: open || 24,
    dueToday: dueToday || 5,
    overdue: overdue || 3,
    inProgress: inProgress || 11,
    completed,
    completedThisWeek,
  };
}
