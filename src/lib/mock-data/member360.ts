// ─── Member 360 Mock Data ──────────────────────────────────────
// Single source of truth for every member's 360 profile data.

import { members, type Member } from "./people";

// ─── Types ─────────────────────────────────────────────────────

export interface AttendanceRecord {
  date: string;
  service: string;
  present: boolean;
  absenteeismReason?: string;
  reportedVia?: "Mobile App" | "Pastoral Contact" | "Self Check-in";
  reportedDate?: string;
}

export interface MemberReward {
  id: string;
  title: string;
  category: "Recognition" | "Fellowship" | "Spiritual Growth" | "Leadership Retreat";
  description: string;
  dateAwarded: string;
  status: "Delivered" | "Ready for Pickup" | "Scheduled";
  awardedBy: string;
  badgeIcon: string;
}

export interface GiftOption {
  id: string;
  title: string;
  category: "Recognition" | "Fellowship" | "Spiritual Growth" | "Leadership Retreat";
  description: string;
  eligibility: string;
  icon: string;
}

export interface EngagementMonth {
  month: string;
  attendance: number;
  groupParticipation: number;
  serving: number;
  events: number;
}

export interface FollowUp {
  id: string;
  title: string;
  status: "open" | "in-progress" | "completed";
  date: string;
  assignedTo: string;
  note: string;
}

export interface ShepherdingInfo {
  assignedShepherd: string;
  lastPastoralContact: string;
  careStatus: "healthy" | "needs-attention" | "follow-up-required";
  openFollowUps: number;
  completedFollowUps: number;
  recentNotes: { date: string; author: string; note: string }[];
}

export interface PrayerRequest {
  id: string;
  title: string;
  status: "new" | "in-prayer" | "follow-up-needed" | "answered";
  dateSubmitted: string;
  lastPrayer: string;
  category: string;
}

export interface MinistryGroupInfo {
  currentMinistry: string;
  ministryRole: string;
  currentGroups: { name: string; role: string }[];
  servingFrequency: string;
  volunteerStatus: string;
  participationHistory: { period: string; role: string; ministry: string }[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: "attendance" | "prayer" | "follow-up" | "group" | "ministry" | "event" | "joined";
  title: string;
  detail: string;
}

export interface MemberNote {
  id?: string;
  date: string;
  author: string;
  note: string;
}

export interface MemberActivity {
  id: string;
  date: string;
  type: "attendance" | "prayer" | "follow-up" | "group" | "ministry" | "event" | "joined";
  title: string;
  detail: string;
}

export interface Member360 {
  id: string;
  // Overview KPIs
  attendanceRate: number;
  activeGroups: number;
  servingStatus: string;
  openFollowUps: number;
  activePrayerRequests: number;
  engagementLevel: "High" | "Moderate" | "Low" | "New";
  // Attendance
  attendance: {
    percentage: number;
    servicesAttended: number;
    servicesMissed: number;
    currentMonth: string;
    previousMonth: string;
    lastAttendance: string;
    records: AttendanceRecord[];
    trend: { month: string; rate: number }[];
  };
  // Engagement
  engagement: {
    months: EngagementMonth[];
    insights: { dimension: string; trend: "up" | "stable" | "down"; label: string }[];
    recentLevel: string;
  };
  // Care & Shepherding
  shepherding: ShepherdingInfo;
  // Prayer
  prayers: PrayerRequest[];
  // Ministry & Groups
  ministryGroups: MinistryGroupInfo;
  // Timeline
  timeline: TimelineEvent[];
  // Notes
  notes: MemberNote[];
  // Recent Activity
  recentActivity: MemberActivity[];
  // Rewards & Recognition
  rewardTier?: "Gold Pillar (90%+)" | "Silver Faithful" | "Bronze Dedicated";
  rewards?: MemberReward[];
}

// ─── Helpers ───────────────────────────────────────────────────

function buildAvatar(id: string): string {
  const member = members.find(m => m.id === id);
  return member?.avatar ?? `https://i.pravatar.cc/150?img=${10 + parseInt(id)}`;
}

// ─── Deterministic Member 360 Data ─────────────────────────────

const member360Data: Record<string, Member360> = {
  "1": { // Sarah Johnson
    id: "1",
    attendanceRate: 92,
    activeGroups: 2,
    servingStatus: "Active",
    openFollowUps: 1,
    activePrayerRequests: 1,
    engagementLevel: "High",
    attendance: {
      percentage: 92,
      servicesAttended: 46,
      servicesMissed: 4,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: false },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 85 },
        { month: "May", rate: 88 },
        { month: "Jun", rate: 90 },
        { month: "Jul", rate: 87 },
        { month: "Aug", rate: 91 },
        { month: "Sep", rate: 92 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 85, groupParticipation: 70, serving: 80, events: 60 },
        { month: "May", attendance: 88, groupParticipation: 75, serving: 85, events: 65 },
        { month: "Jun", attendance: 90, groupParticipation: 80, serving: 90, events: 70 },
        { month: "Jul", attendance: 87, groupParticipation: 78, serving: 88, events: 68 },
        { month: "Aug", attendance: 91, groupParticipation: 82, serving: 92, events: 72 },
        { month: "Sep", attendance: 92, groupParticipation: 85, serving: 95, events: 75 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "High",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 10, 2026",
      careStatus: "healthy",
      openFollowUps: 1,
      completedFollowUps: 5,
      recentNotes: [
        { date: "Sep 10", author: "Pastor David", note: "Checked in about worship team transition. Sarah is thriving." },
        { date: "Aug 15", author: "Pastor David", note: "Monthly catch-up. Sarah leading new member integration." },
      ],
    },
    prayers: [
      { id: "p1", title: "Guidance for worship team", status: "in-prayer", dateSubmitted: "Sep 5, 2026", lastPrayer: "Sep 12, 2026", category: "Leadership" },
    ],
    ministryGroups: {
      currentMinistry: "Worship",
      ministryRole: "Worship Leader",
      currentGroups: [
        { name: "Small Group A", role: "Leader" },
        { name: "Worship Team", role: "Vocalist" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2024–Present", role: "Worship Leader", ministry: "Worship" },
        { period: "2024–Present", role: "Leader", ministry: "Small Group A" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 12", type: "follow-up", title: "Follow-up completed", detail: "Monthly check-in with Pastor David" },
      { id: "t3", date: "Sep 10", type: "follow-up", title: "Pastoral note added", detail: "Pastor David noted thriving in worship role" },
      { id: "t4", date: "Sep 5", type: "prayer", title: "Prayer request submitted", detail: "Guidance for worship team" },
      { id: "t5", date: "Sep 1", type: "group", title: "Small Group A meeting", detail: "Led weekly group session" },
      { id: "t6", date: "Aug 28", type: "event", title: "Served at Community Event", detail: "Worship team volunteer" },
      { id: "t7", date: "Aug 20", type: "ministry", title: "Worship team rehearsal", detail: "Prepared set for Sunday" },
      { id: "t8", date: "Mar 12", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { id: "n1", date: "Sep 10", author: "Pastor David", note: "Sarah is excelling in her worship leadership role. She has taken initiative in mentoring new vocalists." },
      { id: "n2", date: "Aug 15", author: "Pastor David", note: "Monthly pastoral check-in. Sarah expressed desire to expand small group outreach." },
      { id: "n3", date: "Jul 20", author: "Pastor David", note: "Sarah coordinated the summer worship night. Excellent execution." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 12", type: "follow-up", title: "Follow-up completed", detail: "Monthly check-in" },
      { id: "a3", date: "Sep 5", type: "prayer", title: "Prayer request submitted", detail: "Guidance for worship team" },
      { id: "a4", date: "Sep 1", type: "group", title: "Small Group A meeting", detail: "Led weekly session" },
      { id: "a5", date: "Aug 28", type: "event", title: "Community Event", detail: "Worship team volunteer" },
    ],
  },

  "2": { // Michael Chen
    id: "2",
    attendanceRate: 88,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "High",
    attendance: {
      percentage: 88,
      servicesAttended: 44,
      servicesMissed: 6,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: false },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: false },
      ],
      trend: [
        { month: "Apr", rate: 80 },
        { month: "May", rate: 82 },
        { month: "Jun", rate: 85 },
        { month: "Jul", rate: 84 },
        { month: "Aug", rate: 87 },
        { month: "Sep", rate: 88 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 80, groupParticipation: 75, serving: 70, events: 55 },
        { month: "May", attendance: 82, groupParticipation: 78, serving: 75, events: 60 },
        { month: "Jun", attendance: 85, groupParticipation: 82, serving: 80, events: 65 },
        { month: "Jul", attendance: 84, groupParticipation: 80, serving: 78, events: 62 },
        { month: "Aug", attendance: 87, groupParticipation: 85, serving: 82, events: 68 },
        { month: "Sep", attendance: 88, groupParticipation: 88, serving: 85, events: 70 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "High",
    },
    shepherding: {
      assignedShepherd: "Pastor Lisa Martinez",
      lastPastoralContact: "Sep 8, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 3,
      recentNotes: [
        { date: "Sep 8", author: "Pastor Lisa", note: "Michael is growing well in youth leadership. Great mentor to younger members." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Youth",
      ministryRole: "Youth Leader",
      currentGroups: [
        { name: "Youth Leadership", role: "Leader" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2023–Present", role: "Youth Leader", ministry: "Youth" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 8", type: "follow-up", title: "Follow-up completed", detail: "Youth ministry check-in" },
      { id: "t3", date: "Sep 1", type: "group", title: "Youth Leadership meeting", detail: "Led youth group planning" },
      { id: "t4", date: "Aug 25", type: "event", title: "Youth Summer Camp", detail: "Led small group activities" },
      { id: "t5", date: "Jan 8", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { id: "n1", date: "Sep 8", author: "Pastor Lisa", note: "Michael has shown remarkable growth in his leadership skills. He is mentoring three younger members." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 8", type: "follow-up", title: "Follow-up completed", detail: "Youth ministry check-in" },
      { id: "a3", date: "Sep 1", type: "group", title: "Youth Leadership meeting", detail: "Led planning session" },
      { id: "a4", date: "Aug 25", type: "event", title: "Youth Summer Camp", detail: "Small group leader" },
    ],
  },

  "3": { // Emily Williams
    id: "3",
    attendanceRate: 95,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "High",
    attendance: {
      percentage: 95,
      servicesAttended: 47,
      servicesMissed: 2,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Aug 28, 2026",
      records: [
        { date: "Sep 11", service: "Friday Main Service", present: false },
        { date: "Sep 4", service: "Friday Main Service", present: false },
        { date: "Aug 28", service: "Friday Main Service", present: true },
        { date: "Aug 21", service: "Friday Main Service", present: true },
        { date: "Aug 14", service: "Friday Main Service", present: false },
        { date: "Aug 7", service: "Friday Main Service", present: true },
      ],
      trend: [
        { month: "Apr", rate: 90 },
        { month: "May", rate: 92 },
        { month: "Jun", rate: 93 },
        { month: "Jul", rate: 91 },
        { month: "Aug", rate: 94 },
        { month: "Sep", rate: 95 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 90, groupParticipation: 65, serving: 75, events: 50 },
        { month: "May", attendance: 92, groupParticipation: 68, serving: 78, events: 55 },
        { month: "Jun", attendance: 93, groupParticipation: 72, serving: 80, events: 58 },
        { month: "Jul", attendance: 91, groupParticipation: 70, serving: 82, events: 56 },
        { month: "Aug", attendance: 94, groupParticipation: 75, serving: 85, events: 60 },
        { month: "Sep", attendance: 95, groupParticipation: 78, serving: 88, events: 62 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "High",
    },
    shepherding: {
      assignedShepherd: "Pastor Rachel Taylor",
      lastPastoralContact: "Sep 5, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 5", author: "Pastor Rachel", note: "Emily is doing wonderfully with the children's ministry. Very dedicated." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Children",
      ministryRole: "Children's Teacher",
      currentGroups: [
        { name: "Children's Team", role: "Teacher" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2025–Present", role: "Children's Teacher", ministry: "Children" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 5", type: "follow-up", title: "Follow-up completed", detail: "Children's ministry check-in" },
      { id: "t3", date: "Sep 1", type: "ministry", title: "Children's Sunday School", detail: "Taught age group 5-7" },
      { id: "t4", date: "Jun 15", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { id: "n1", date: "Sep 5", author: "Pastor Rachel", note: "Emily has a real gift for working with children. She prepares engaging lessons each week." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 5", type: "follow-up", title: "Follow-up completed", detail: "Ministry check-in" },
      { id: "a3", date: "Sep 1", type: "ministry", title: "Children's Sunday School", detail: "Taught lesson" },
    ],
  },

  "4": { // David Brown
    id: "4",
    attendanceRate: 82,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 1,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 82,
      servicesAttended: 41,
      servicesMissed: 9,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: false },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: false },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 78 },
        { month: "May", rate: 80 },
        { month: "Jun", rate: 79 },
        { month: "Jul", rate: 81 },
        { month: "Aug", rate: 80 },
        { month: "Sep", rate: 82 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 78, groupParticipation: 60, serving: 70, events: 45 },
        { month: "May", attendance: 80, groupParticipation: 62, serving: 72, events: 48 },
        { month: "Jun", attendance: 79, groupParticipation: 64, serving: 75, events: 50 },
        { month: "Jul", attendance: 81, groupParticipation: 65, serving: 78, events: 52 },
        { month: "Aug", attendance: 80, groupParticipation: 68, serving: 80, events: 55 },
        { month: "Sep", attendance: 82, groupParticipation: 70, serving: 82, events: 58 },
      ],
      insights: [
        { dimension: "Attendance", trend: "stable", label: "→" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 3, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 4,
      recentNotes: [
        { date: "Sep 3", author: "Pastor David", note: "David is consistent in outreach. Encouraged him to consider a leadership role." },
      ],
    },
    prayers: [
      { id: "p1", title: "Community outreach impact", status: "in-prayer", dateSubmitted: "Aug 20, 2026", lastPrayer: "Sep 3, 2026", category: "Community" },
    ],
    ministryGroups: {
      currentMinistry: "Outreach",
      ministryRole: "Team Member",
      currentGroups: [
        { name: "Community Service", role: "Member" },
      ],
      servingFrequency: "Bi-weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2022–Present", role: "Team Member", ministry: "Outreach" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 3", type: "follow-up", title: "Follow-up completed", detail: "Outreach ministry check-in" },
      { id: "t3", date: "Aug 20", type: "prayer", title: "Prayer request submitted", detail: "Community outreach impact" },
      { id: "t4", date: "Sep 3", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { id: "n1", date: "Sep 3", author: "Pastor David", note: "David is a reliable outreach volunteer. He has been serving since joining the church." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 3", type: "follow-up", title: "Follow-up completed", detail: "Outreach check-in" },
      { id: "a3", date: "Aug 20", type: "prayer", title: "Prayer request submitted", detail: "Community outreach" },
    ],
  },

  "5": { // Lisa Martinez
    id: "5",
    attendanceRate: 90,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "High",
    attendance: {
      percentage: 90,
      servicesAttended: 45,
      servicesMissed: 5,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: false },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 86 },
        { month: "May", rate: 88 },
        { month: "Jun", rate: 89 },
        { month: "Jul", rate: 87 },
        { month: "Aug", rate: 90 },
        { month: "Sep", rate: 90 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 86, groupParticipation: 72, serving: 78, events: 58 },
        { month: "May", attendance: 88, groupParticipation: 75, serving: 80, events: 60 },
        { month: "Jun", attendance: 89, groupParticipation: 78, serving: 82, events: 62 },
        { month: "Jul", attendance: 87, groupParticipation: 76, serving: 80, events: 60 },
        { month: "Aug", attendance: 90, groupParticipation: 80, serving: 85, events: 65 },
        { month: "Sep", attendance: 90, groupParticipation: 82, serving: 88, events: 68 },
      ],
      insights: [
        { dimension: "Attendance", trend: "stable", label: "→" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "High",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 7, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 3,
      recentNotes: [
        { date: "Sep 7", author: "Pastor David", note: "Lisa's choir performance was outstanding. She is a vital part of the worship team." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Worship",
      ministryRole: "Choir Member",
      currentGroups: [
        { name: "Choir", role: "Section Leader" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2024–Present", role: "Choir Section Leader", ministry: "Worship" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 7", type: "follow-up", title: "Follow-up completed", detail: "Worship team check-in" },
      { id: "t3", date: "Sep 1", type: "ministry", title: "Choir rehearsal", detail: "Prepared fall concert set" },
      { id: "t4", date: "Feb 20", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { id: "n1", date: "Sep 7", author: "Pastor David", note: "Lisa brings excellence to the choir. Her section leadership is effective." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 7", type: "follow-up", title: "Follow-up completed", detail: "Worship team check-in" },
      { id: "a3", date: "Sep 1", type: "ministry", title: "Choir rehearsal", detail: "Fall concert prep" },
    ],
  },

  "6": { // James Anderson — INACTIVE
    id: "6",
    attendanceRate: 35,
    activeGroups: 0,
    servingStatus: "Inactive",
    openFollowUps: 2,
    activePrayerRequests: 0,
    engagementLevel: "Low",
    attendance: {
      percentage: 35,
      servicesAttended: 17,
      servicesMissed: 33,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Jul 28, 2026",
      records: [
        { date: "Jul 28", service: "Morning Worship", present: true },
        { date: "Jul 21", service: "Morning Worship", present: false },
        { date: "Jul 14", service: "Morning Worship", present: false },
        { date: "Jul 7", service: "Morning Worship", present: true },
        { date: "Jun 30", service: "Morning Worship", present: false },
        { date: "Jun 23", service: "Morning Worship", present: false },
      ],
      trend: [
        { month: "Apr", rate: 55 },
        { month: "May", rate: 48 },
        { month: "Jun", rate: 42 },
        { month: "Jul", rate: 38 },
        { month: "Aug", rate: 35 },
        { month: "Sep", rate: 35 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 55, groupParticipation: 40, serving: 30, events: 20 },
        { month: "May", attendance: 48, groupParticipation: 35, serving: 25, events: 15 },
        { month: "Jun", attendance: 42, groupParticipation: 28, serving: 20, events: 10 },
        { month: "Jul", attendance: 38, groupParticipation: 20, serving: 15, events: 8 },
        { month: "Aug", attendance: 35, groupParticipation: 15, serving: 10, events: 5 },
        { month: "Sep", attendance: 35, groupParticipation: 10, serving: 5, events: 3 },
      ],
      insights: [
        { dimension: "Attendance", trend: "down", label: "↓" },
        { dimension: "Group participation", trend: "down", label: "↓" },
        { dimension: "Serving", trend: "down", label: "↓" },
      ],
      recentLevel: "Low",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Aug 10, 2026",
      careStatus: "follow-up-required",
      openFollowUps: 2,
      completedFollowUps: 1,
      recentNotes: [
        { date: "Aug 10", author: "Pastor David", note: "James has been absent for several weeks. Attempted contact but no response yet." },
        { date: "Jul 15", author: "Pastor David", note: "James mentioned work schedule changes affecting attendance." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Admin",
      ministryRole: "Former Finance Team",
      currentGroups: [],
      servingFrequency: "N/A",
      volunteerStatus: "Inactive",
      participationHistory: [
        { period: "2022–2026", role: "Finance Team Member", ministry: "Admin" },
      ],
    },
    timeline: [
      { id: "t1", date: "Jul 28", type: "attendance", title: "Attended Morning Worship", detail: "Last recorded attendance" },
      { id: "t2", date: "Jul 15", type: "follow-up", title: "Pastoral note added", detail: "James mentioned work schedule conflicts" },
      { id: "t3", date: "Jul 10", type: "follow-up", title: "Follow-up initiated", detail: "Outreach to inactive member" },
      { id: "t4", date: "Nov 5", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Aug 10", author: "Pastor David", note: "James has been absent since late July. Work schedule appears to be the primary factor. Need to find alternative ways to keep him connected." },
    ],
    recentActivity: [
      { id: "a1", date: "Jul 28", type: "attendance", title: "Attended Morning Worship", detail: "Last attendance" },
      { id: "a2", date: "Jul 15", type: "follow-up", title: "Pastoral note", detail: "Work schedule discussion" },
    ],
  },

  "7": { // Rachel Taylor
    id: "7",
    attendanceRate: 93,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "High",
    attendance: {
      percentage: 93,
      servicesAttended: 46,
      servicesMissed: 3,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Aug 21, 2026",
      records: [
        { date: "Sep 11", service: "Friday Main Service", present: false },
        { date: "Sep 4", service: "Friday Main Service", present: false },
        { date: "Aug 28", service: "Friday Main Service", present: false },
        { date: "Aug 21", service: "Friday Main Service", present: true },
        { date: "Aug 14", service: "Friday Main Service", present: true },
        { date: "Aug 7", service: "Friday Main Service", present: true },
      ],
      trend: [
        { month: "Apr", rate: 88 },
        { month: "May", rate: 90 },
        { month: "Jun", rate: 91 },
        { month: "Jul", rate: 89 },
        { month: "Aug", rate: 92 },
        { month: "Sep", rate: 93 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 88, groupParticipation: 80, serving: 82, events: 65 },
        { month: "May", attendance: 90, groupParticipation: 82, serving: 85, events: 68 },
        { month: "Jun", attendance: 91, groupParticipation: 85, serving: 88, events: 70 },
        { month: "Jul", attendance: 89, groupParticipation: 83, serving: 86, events: 68 },
        { month: "Aug", attendance: 92, groupParticipation: 88, serving: 90, events: 72 },
        { month: "Sep", attendance: 93, groupParticipation: 90, serving: 92, events: 75 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "High",
    },
    shepherding: {
      assignedShepherd: "Pastor Lisa Martinez",
      lastPastoralContact: "Sep 11, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 4,
      recentNotes: [
        { date: "Sep 11", author: "Pastor Lisa", note: "Rachel is an exceptional youth mentor. Her consistency is commendable." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Youth",
      ministryRole: "Youth Mentor",
      currentGroups: [
        { name: "Youth Mentors", role: "Mentor" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2023–Present", role: "Youth Mentor", ministry: "Youth" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 11", type: "follow-up", title: "Follow-up completed", detail: "Youth ministry check-in" },
      { id: "t3", date: "Sep 5", type: "group", title: "Youth Mentors meeting", detail: "Mentor coordination" },
      { id: "t4", date: "Aug 12", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 11", author: "Pastor Lisa", note: "Rachel's mentoring relationships are producing real fruit. Two of her mentees have taken on leadership roles." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 11", type: "follow-up", title: "Follow-up completed", detail: "Youth ministry check-in" },
      { id: "a3", date: "Sep 5", type: "group", title: "Youth Mentors meeting", detail: "Coordination" },
    ],
  },

  "8": { // Kevin Thomas
    id: "8",
    attendanceRate: 78,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 1,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 78,
      servicesAttended: 39,
      servicesMissed: 11,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: false },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: false },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: false },
      ],
      trend: [
        { month: "Apr", rate: 72 },
        { month: "May", rate: 74 },
        { month: "Jun", rate: 75 },
        { month: "Jul", rate: 76 },
        { month: "Aug", rate: 77 },
        { month: "Sep", rate: 78 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 72, groupParticipation: 55, serving: 60, events: 40 },
        { month: "May", attendance: 74, groupParticipation: 58, serving: 62, events: 42 },
        { month: "Jun", attendance: 75, groupParticipation: 60, serving: 65, events: 45 },
        { month: "Jul", attendance: 76, groupParticipation: 62, serving: 68, events: 48 },
        { month: "Aug", attendance: 77, groupParticipation: 65, serving: 70, events: 50 },
        { month: "Sep", attendance: 78, groupParticipation: 68, serving: 72, events: 52 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "stable", label: "→" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 6, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 6", author: "Pastor David", note: "Kevin is growing in his outreach involvement. Mission trip preparation is going well." },
      ],
    },
    prayers: [
      { id: "p1", title: "Mission trip preparation", status: "in-prayer", dateSubmitted: "Sep 1, 2026", lastPrayer: "Sep 8, 2026", category: "Missions" },
    ],
    ministryGroups: {
      currentMinistry: "Outreach",
      ministryRole: "Mission Trip Member",
      currentGroups: [
        { name: "Mission Trip", role: "Team Member" },
      ],
      servingFrequency: "Monthly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2025–Present", role: "Mission Trip Team", ministry: "Outreach" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 6", type: "follow-up", title: "Follow-up completed", detail: "Mission trip check-in" },
      { id: "t3", date: "Sep 1", type: "prayer", title: "Prayer request submitted", detail: "Mission trip preparation" },
      { id: "t4", date: "Apr 1", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 6", author: "Pastor David", note: "Kevin is passionate about missions. He is helping organize the upcoming trip." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 6", type: "follow-up", title: "Follow-up completed", detail: "Mission trip check-in" },
      { id: "a3", date: "Sep 1", type: "prayer", title: "Prayer request", detail: "Mission trip" },
    ],
  },

  "9": { // Amanda Garcia
    id: "9",
    attendanceRate: 85,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 85,
      servicesAttended: 42,
      servicesMissed: 8,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: false },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: false },
      ],
      trend: [
        { month: "Apr", rate: 80 },
        { month: "May", rate: 82 },
        { month: "Jun", rate: 83 },
        { month: "Jul", rate: 82 },
        { month: "Aug", rate: 84 },
        { month: "Sep", rate: 85 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 80, groupParticipation: 65, serving: 70, events: 50 },
        { month: "May", attendance: 82, groupParticipation: 68, serving: 72, events: 52 },
        { month: "Jun", attendance: 83, groupParticipation: 70, serving: 75, events: 55 },
        { month: "Jul", attendance: 82, groupParticipation: 68, serving: 73, events: 53 },
        { month: "Aug", attendance: 84, groupParticipation: 72, serving: 78, events: 58 },
        { month: "Sep", attendance: 85, groupParticipation: 75, serving: 80, events: 60 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor Lisa Martinez",
      lastPastoralContact: "Sep 9, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 9", author: "Pastor Lisa", note: "Amanda is settling in well with the worship team. Good vocal abilities." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Worship",
      ministryRole: "Worship Team Vocalist",
      currentGroups: [
        { name: "Worship Team", role: "Vocalist" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2024–Present", role: "Vocalist", ministry: "Worship" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 9", type: "follow-up", title: "Follow-up completed", detail: "Worship team check-in" },
      { id: "t3", date: "Sep 7", type: "ministry", title: "Worship rehearsal", detail: "Vocal practice" },
      { id: "t4", date: "Jul 22", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 9", author: "Pastor Lisa", note: "Amanda has a beautiful voice and a heart for worship. She is fitting in well." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 9", type: "follow-up", title: "Follow-up completed", detail: "Worship team check-in" },
      { id: "a3", date: "Sep 7", type: "ministry", title: "Worship rehearsal", detail: "Vocal practice" },
    ],
  },

  "10": { // Robert Lee — VISITOR
    id: "10",
    attendanceRate: 100,
    activeGroups: 0,
    servingStatus: "Visitor",
    openFollowUps: 1,
    activePrayerRequests: 0,
    engagementLevel: "New",
    attendance: {
      percentage: 100,
      servicesAttended: 1,
      servicesMissed: 0,
      currentMonth: "Sep",
      previousMonth: "N/A",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Sep", rate: 100 },
      ],
    },
    engagement: {
      months: [
        { month: "Sep", attendance: 100, groupParticipation: 0, serving: 0, events: 0 },
      ],
      insights: [
        { dimension: "Attendance", trend: "stable", label: "→" },
        { dimension: "Group participation", trend: "stable", label: "→" },
        { dimension: "Serving", trend: "stable", label: "→" },
      ],
      recentLevel: "New",
    },
    shepherding: {
      assignedShepherd: "Unassigned",
      lastPastoralContact: "Sep 14, 2026",
      careStatus: "follow-up-required",
      openFollowUps: 1,
      completedFollowUps: 0,
      recentNotes: [
        { date: "Sep 14", author: "Welcome Team", note: "Robert visited for the first time. Greeted and given welcome packet." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "—",
      ministryRole: "—",
      currentGroups: [],
      servingFrequency: "N/A",
      volunteerStatus: "New Visitor",
      participationHistory: [],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "joined", title: "First visit", detail: "Attended Morning Worship" },
      { id: "t2", date: "Sep 14", type: "follow-up", title: "Welcome note added", detail: "Greeted by welcome team" },
    ],
    notes: [
      { date: "Sep 14", author: "Welcome Team", note: "Robert visited alone. He mentioned looking for a new church home. Gave him a welcome packet and invited him to small group." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "First visit", detail: "Attended Morning Worship" },
    ],
  },

  "11": { // Jennifer Clark
    id: "11",
    attendanceRate: 91,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "High",
    attendance: {
      percentage: 91,
      servicesAttended: 45,
      servicesMissed: 4,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: false },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 87 },
        { month: "May", rate: 88 },
        { month: "Jun", rate: 90 },
        { month: "Jul", rate: 89 },
        { month: "Aug", rate: 91 },
        { month: "Sep", rate: 91 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 87, groupParticipation: 70, serving: 75, events: 55 },
        { month: "May", attendance: 88, groupParticipation: 72, serving: 78, events: 58 },
        { month: "Jun", attendance: 90, groupParticipation: 75, serving: 80, events: 60 },
        { month: "Jul", attendance: 89, groupParticipation: 74, serving: 79, events: 59 },
        { month: "Aug", attendance: 91, groupParticipation: 78, serving: 82, events: 62 },
        { month: "Sep", attendance: 91, groupParticipation: 80, serving: 85, events: 65 },
      ],
      insights: [
        { dimension: "Attendance", trend: "stable", label: "→" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "High",
    },
    shepherding: {
      assignedShepherd: "Pastor Rachel Taylor",
      lastPastoralContact: "Sep 12, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 3,
      recentNotes: [
        { date: "Sep 12", author: "Pastor Rachel", note: "Jennifer is reliable and nurturing with the nursery children." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Children",
      ministryRole: "Nursery Team",
      currentGroups: [
        { name: "Nursery Team", role: "Caregiver" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2023–Present", role: "Nursery Caregiver", ministry: "Children" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 12", type: "follow-up", title: "Follow-up completed", detail: "Children's ministry check-in" },
      { id: "t3", date: "Sep 7", type: "ministry", title: "Nursery duty", detail: "Served in nursery" },
      { id: "t4", date: "May 30", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 12", author: "Pastor Rachel", note: "Jennifer is a blessing to the nursery team. Parents trust her with their little ones." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 12", type: "follow-up", title: "Follow-up completed", detail: "Nursery check-in" },
      { id: "a3", date: "Sep 7", type: "ministry", title: "Nursery duty", detail: "Served" },
    ],
  },

  "12": { // Daniel Lewis
    id: "12",
    attendanceRate: 87,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 87,
      servicesAttended: 43,
      servicesMissed: 7,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: false },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 82 },
        { month: "May", rate: 84 },
        { month: "Jun", rate: 85 },
        { month: "Jul", rate: 84 },
        { month: "Aug", rate: 86 },
        { month: "Sep", rate: 87 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 82, groupParticipation: 60, serving: 65, events: 45 },
        { month: "May", attendance: 84, groupParticipation: 62, serving: 68, events: 48 },
        { month: "Jun", attendance: 85, groupParticipation: 65, serving: 70, events: 50 },
        { month: "Jul", attendance: 84, groupParticipation: 64, serving: 69, events: 49 },
        { month: "Aug", attendance: 86, groupParticipation: 68, serving: 72, events: 52 },
        { month: "Sep", attendance: 87, groupParticipation: 70, serving: 75, events: 55 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 4, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 4", author: "Pastor David", note: "Daniel is handling the tech team responsibilities well. Good problem solver." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Admin",
      ministryRole: "Tech Team Lead",
      currentGroups: [
        { name: "Tech Team", role: "Lead" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2024–Present", role: "Tech Team Lead", ministry: "Admin" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 4", type: "follow-up", title: "Follow-up completed", detail: "Admin team check-in" },
      { id: "t3", date: "Sep 1", type: "ministry", title: "Tech setup", detail: "Sunday service AV" },
      { id: "t4", date: "Oct 18", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 4", author: "Pastor David", note: "Daniel has improved the Sunday AV experience significantly. The team respects his leadership." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 4", type: "follow-up", title: "Follow-up completed", detail: "Admin check-in" },
      { id: "a3", date: "Sep 1", type: "ministry", title: "Tech setup", detail: "AV preparation" },
    ],
  },

  "13": { // Michelle Walker — INACTIVE
    id: "13",
    attendanceRate: 28,
    activeGroups: 0,
    servingStatus: "Inactive",
    openFollowUps: 2,
    activePrayerRequests: 1,
    engagementLevel: "Low",
    attendance: {
      percentage: 28,
      servicesAttended: 14,
      servicesMissed: 36,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Jun 8, 2026",
      records: [
        { date: "Jun 8", service: "Morning Worship", present: true },
        { date: "Jun 1", service: "Morning Worship", present: false },
        { date: "May 25", service: "Morning Worship", present: false },
        { date: "May 18", service: "Morning Worship", present: true },
        { date: "May 11", service: "Morning Worship", present: false },
        { date: "May 4", service: "Morning Worship", present: false },
      ],
      trend: [
        { month: "Apr", rate: 45 },
        { month: "May", rate: 38 },
        { month: "Jun", rate: 32 },
        { month: "Jul", rate: 30 },
        { month: "Aug", rate: 28 },
        { month: "Sep", rate: 28 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 45, groupParticipation: 30, serving: 25, events: 15 },
        { month: "May", attendance: 38, groupParticipation: 22, serving: 18, events: 10 },
        { month: "Jun", attendance: 32, groupParticipation: 15, serving: 12, events: 5 },
        { month: "Jul", attendance: 30, groupParticipation: 10, serving: 8, events: 3 },
        { month: "Aug", attendance: 28, groupParticipation: 8, serving: 5, events: 2 },
        { month: "Sep", attendance: 28, groupParticipation: 5, serving: 3, events: 1 },
      ],
      insights: [
        { dimension: "Attendance", trend: "down", label: "↓" },
        { dimension: "Group participation", trend: "down", label: "↓" },
        { dimension: "Serving", trend: "down", label: "↓" },
      ],
      recentLevel: "Low",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Aug 5, 2026",
      careStatus: "needs-attention",
      openFollowUps: 2,
      completedFollowUps: 1,
      recentNotes: [
        { date: "Aug 5", author: "Pastor David", note: "Michelle has been unreachable for several weeks. Left voicemail." },
        { date: "Jul 10", author: "Pastor David", note: "Michelle mentioned feeling disconnected after small group ended." },
      ],
    },
    prayers: [
      { id: "p1", title: "Reconnection with church community", status: "follow-up-needed", dateSubmitted: "Jul 10, 2026", lastPrayer: "Aug 5, 2026", category: "Personal" },
    ],
    ministryGroups: {
      currentMinistry: "Worship",
      ministryRole: "Former Choir",
      currentGroups: [],
      servingFrequency: "N/A",
      volunteerStatus: "Inactive",
      participationHistory: [
        { period: "2023–2026", role: "Choir Member", ministry: "Worship" },
      ],
    },
    timeline: [
      { id: "t1", date: "Jun 8", type: "attendance", title: "Attended Morning Worship", detail: "Last recorded attendance" },
      { id: "t2", date: "Aug 5", type: "follow-up", title: "Follow-up attempt", detail: "Left voicemail" },
      { id: "t3", date: "Jul 10", type: "prayer", title: "Prayer request submitted", detail: "Reconnection with community" },
      { id: "t4", date: "Jul 10", type: "follow-up", title: "Pastoral note added", detail: "Michelle feeling disconnected" },
      { id: "t5", date: "Dec 14", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Aug 5", author: "Pastor David", note: "Michelle has been absent since June. She expressed feeling disconnected when her small group ended. Need to find a new group for her." },
    ],
    recentActivity: [
      { id: "a1", date: "Jun 8", type: "attendance", title: "Attended Morning Worship", detail: "Last attendance" },
      { id: "a2", date: "Aug 5", type: "follow-up", title: "Follow-up attempt", detail: "Voicemail left" },
    ],
  },

  "14": { // Christopher Hall
    id: "14",
    attendanceRate: 80,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 80,
      servicesAttended: 40,
      servicesMissed: 10,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: false },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: false },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 75 },
        { month: "May", rate: 76 },
        { month: "Jun", rate: 78 },
        { month: "Jul", rate: 77 },
        { month: "Aug", rate: 79 },
        { month: "Sep", rate: 80 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 75, groupParticipation: 55, serving: 60, events: 40 },
        { month: "May", attendance: 76, groupParticipation: 58, serving: 62, events: 42 },
        { month: "Jun", attendance: 78, groupParticipation: 60, serving: 65, events: 45 },
        { month: "Jul", attendance: 77, groupParticipation: 59, serving: 64, events: 44 },
        { month: "Aug", attendance: 79, groupParticipation: 62, serving: 68, events: 48 },
        { month: "Sep", attendance: 80, groupParticipation: 65, serving: 70, events: 50 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 2, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 2", author: "Pastor David", note: "Christopher is a steady food bank volunteer. Very compassionate." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Outreach",
      ministryRole: "Food Bank Volunteer",
      currentGroups: [
        { name: "Food Bank", role: "Volunteer" },
      ],
      servingFrequency: "Bi-weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2025–Present", role: "Food Bank Volunteer", ministry: "Outreach" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 2", type: "follow-up", title: "Follow-up completed", detail: "Outreach check-in" },
      { id: "t3", date: "Aug 28", type: "ministry", title: "Food bank shift", detail: "Served 4 hours" },
      { id: "t4", date: "Feb 2", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 2", author: "Pastor David", note: "Christopher serves at the food bank with genuine compassion. He is a quiet but impactful servant." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 2", type: "follow-up", title: "Follow-up completed", detail: "Outreach check-in" },
      { id: "a3", date: "Aug 28", type: "ministry", title: "Food bank shift", detail: "4 hours served" },
    ],
  },

  "15": { // Stephanie Allen
    id: "15",
    attendanceRate: 86,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 86,
      servicesAttended: 43,
      servicesMissed: 7,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: false },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 80 },
        { month: "May", rate: 82 },
        { month: "Jun", rate: 83 },
        { month: "Jul", rate: 82 },
        { month: "Aug", rate: 85 },
        { month: "Sep", rate: 86 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 80, groupParticipation: 62, serving: 65, events: 48 },
        { month: "May", attendance: 82, groupParticipation: 65, serving: 68, events: 50 },
        { month: "Jun", attendance: 83, groupParticipation: 68, serving: 70, events: 52 },
        { month: "Jul", attendance: 82, groupParticipation: 66, serving: 69, events: 51 },
        { month: "Aug", attendance: 85, groupParticipation: 70, serving: 72, events: 55 },
        { month: "Sep", attendance: 86, groupParticipation: 72, serving: 75, events: 58 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "stable", label: "→" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor Lisa Martinez",
      lastPastoralContact: "Sep 7, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 7", author: "Pastor Lisa", note: "Stephanie is growing in her youth worship role. Creative and enthusiastic." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Youth",
      ministryRole: "Youth Worship",
      currentGroups: [
        { name: "Youth Worship", role: "Member" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2023–Present", role: "Youth Worship", ministry: "Youth" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 7", type: "follow-up", title: "Follow-up completed", detail: "Youth ministry check-in" },
      { id: "t3", date: "Sep 3", type: "ministry", title: "Youth worship practice", detail: "Prepared set" },
      { id: "t4", date: "Sep 9", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 7", author: "Pastor Lisa", note: "Stephanie brings creative energy to the youth worship team. The students love her." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 7", type: "follow-up", title: "Follow-up completed", detail: "Youth check-in" },
      { id: "a3", date: "Sep 3", type: "ministry", title: "Youth worship practice", detail: "Prepared set" },
    ],
  },

  "16": { // Andrew Young
    id: "16",
    attendanceRate: 89,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 89,
      servicesAttended: 44,
      servicesMissed: 5,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: false },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 84 },
        { month: "May", rate: 85 },
        { month: "Jun", rate: 87 },
        { month: "Jul", rate: 86 },
        { month: "Aug", rate: 88 },
        { month: "Sep", rate: 89 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 84, groupParticipation: 68, serving: 70, events: 52 },
        { month: "May", attendance: 85, groupParticipation: 70, serving: 72, events: 54 },
        { month: "Jun", attendance: 87, groupParticipation: 72, serving: 75, events: 56 },
        { month: "Jul", attendance: 86, groupParticipation: 71, serving: 74, events: 55 },
        { month: "Aug", attendance: 88, groupParticipation: 74, serving: 78, events: 58 },
        { month: "Sep", attendance: 89, groupParticipation: 76, serving: 80, events: 60 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor Rachel Taylor",
      lastPastoralContact: "Sep 10, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 10", author: "Pastor Rachel", note: "Andrew is a dependable Sunday School teacher. The kids respond well to him." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Children",
      ministryRole: "Sunday School Teacher",
      currentGroups: [
        { name: "Sunday School", role: "Teacher" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2024–Present", role: "Sunday School Teacher", ministry: "Children" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 10", type: "follow-up", title: "Follow-up completed", detail: "Children's ministry check-in" },
      { id: "t3", date: "Sep 7", type: "ministry", title: "Sunday School", detail: "Taught class" },
      { id: "t4", date: "Jan 25", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 10", author: "Pastor Rachel", note: "Andrew prepares engaging lessons and truly cares about the children's spiritual growth." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 10", type: "follow-up", title: "Follow-up completed", detail: "Children's check-in" },
      { id: "a3", date: "Sep 7", type: "ministry", title: "Sunday School", detail: "Taught class" },
    ],
  },

  "17": { // Nicole King
    id: "17",
    attendanceRate: 94,
    activeGroups: 2,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "High",
    attendance: {
      percentage: 94,
      servicesAttended: 47,
      servicesMissed: 3,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: false },
      ],
      trend: [
        { month: "Apr", rate: 88 },
        { month: "May", rate: 90 },
        { month: "Jun", rate: 92 },
        { month: "Jul", rate: 91 },
        { month: "Aug", rate: 93 },
        { month: "Sep", rate: 94 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 88, groupParticipation: 78, serving: 80, events: 62 },
        { month: "May", attendance: 90, groupParticipation: 80, serving: 82, events: 65 },
        { month: "Jun", attendance: 92, groupParticipation: 82, serving: 85, events: 68 },
        { month: "Jul", attendance: 91, groupParticipation: 81, serving: 84, events: 67 },
        { month: "Aug", attendance: 93, groupParticipation: 84, serving: 88, events: 70 },
        { month: "Sep", attendance: 94, groupParticipation: 86, serving: 90, events: 72 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "High",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 13, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 3,
      recentNotes: [
        { date: "Sep 13", author: "Pastor David", note: "Nicole is one of our most engaged members. She connects well in small group." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Worship",
      ministryRole: "Small Group Member",
      currentGroups: [
        { name: "Small Group A", role: "Member" },
        { name: "Worship Team", role: "Vocalist" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2025–Present", role: "Vocalist", ministry: "Worship" },
        { period: "2025–Present", role: "Member", ministry: "Small Group A" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 13", type: "follow-up", title: "Follow-up completed", detail: "Small group check-in" },
      { id: "t3", date: "Sep 1", type: "group", title: "Small Group A meeting", detail: "Participated in discussion" },
      { id: "t4", date: "Nov 30", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 13", author: "Pastor David", note: "Nicole is deeply connected in the church community. She is a natural encourager." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 13", type: "follow-up", title: "Follow-up completed", detail: "Small group check-in" },
      { id: "a3", date: "Sep 1", type: "group", title: "Small Group A", detail: "Weekly meeting" },
    ],
  },

  "18": { // Brian Wright — VISITOR
    id: "18",
    attendanceRate: 50,
    activeGroups: 0,
    servingStatus: "Visitor",
    openFollowUps: 1,
    activePrayerRequests: 0,
    engagementLevel: "New",
    attendance: {
      percentage: 50,
      servicesAttended: 1,
      servicesMissed: 1,
      currentMonth: "Sep",
      previousMonth: "N/A",
      lastAttendance: "Sep 7, 2026",
      records: [
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Sep 14", service: "Morning Worship", present: false },
      ],
      trend: [
        { month: "Sep", rate: 50 },
      ],
    },
    engagement: {
      months: [
        { month: "Sep", attendance: 50, groupParticipation: 0, serving: 0, events: 0 },
      ],
      insights: [
        { dimension: "Attendance", trend: "stable", label: "→" },
        { dimension: "Group participation", trend: "stable", label: "→" },
        { dimension: "Serving", trend: "stable", label: "→" },
      ],
      recentLevel: "New",
    },
    shepherding: {
      assignedShepherd: "Unassigned",
      lastPastoralContact: "Sep 7, 2026",
      careStatus: "follow-up-required",
      openFollowUps: 1,
      completedFollowUps: 0,
      recentNotes: [
        { date: "Sep 7", author: "Welcome Team", note: "Brian visited once. Was greeted and given a welcome card." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "—",
      ministryRole: "—",
      currentGroups: [],
      servingFrequency: "N/A",
      volunteerStatus: "New Visitor",
      participationHistory: [],
    },
    timeline: [
      { id: "t1", date: "Sep 7", type: "joined", title: "First visit", detail: "Attended Morning Worship" },
    ],
    notes: [
      { date: "Sep 7", author: "Welcome Team", note: "Brian visited with a friend. Seemed interested but did not return the following week." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 7", type: "attendance", title: "First visit", detail: "Attended Morning Worship" },
    ],
  },

  "19": { // Lauren Lopez
    id: "19",
    attendanceRate: 84,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 84,
      servicesAttended: 42,
      servicesMissed: 8,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: false },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: false },
      ],
      trend: [
        { month: "Apr", rate: 78 },
        { month: "May", rate: 80 },
        { month: "Jun", rate: 82 },
        { month: "Jul", rate: 81 },
        { month: "Aug", rate: 83 },
        { month: "Sep", rate: 84 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 78, groupParticipation: 58, serving: 62, events: 42 },
        { month: "May", attendance: 80, groupParticipation: 60, serving: 65, events: 45 },
        { month: "Jun", attendance: 82, groupParticipation: 62, serving: 68, events: 48 },
        { month: "Jul", attendance: 81, groupParticipation: 61, serving: 67, events: 47 },
        { month: "Aug", attendance: 83, groupParticipation: 64, serving: 70, events: 50 },
        { month: "Sep", attendance: 84, groupParticipation: 66, serving: 72, events: 52 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 8, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 8", author: "Pastor David", note: "Lauren is enjoying the community service team. Good fit for her gifts." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Outreach",
      ministryRole: "Community Service",
      currentGroups: [
        { name: "Community Service", role: "Member" },
      ],
      servingFrequency: "Bi-weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2024–Present", role: "Community Service", ministry: "Outreach" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 8", type: "follow-up", title: "Follow-up completed", detail: "Outreach check-in" },
      { id: "t3", date: "Aug 5", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 8", author: "Pastor David", note: "Lauren has found her place in community service. She organizes food drives effectively." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 8", type: "follow-up", title: "Follow-up completed", detail: "Outreach check-in" },
    ],
  },

  "20": { // Tyler Hill
    id: "20",
    attendanceRate: 76,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 76,
      servicesAttended: 38,
      servicesMissed: 12,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: false },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: false },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: false },
      ],
      trend: [
        { month: "Apr", rate: 70 },
        { month: "May", rate: 72 },
        { month: "Jun", rate: 73 },
        { month: "Jul", rate: 74 },
        { month: "Aug", rate: 75 },
        { month: "Sep", rate: 76 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 70, groupParticipation: 50, serving: 55, events: 35 },
        { month: "May", attendance: 72, groupParticipation: 52, serving: 58, events: 38 },
        { month: "Jun", attendance: 73, groupParticipation: 54, serving: 60, events: 40 },
        { month: "Jul", attendance: 74, groupParticipation: 55, serving: 62, events: 42 },
        { month: "Aug", attendance: 75, groupParticipation: 58, serving: 65, events: 44 },
        { month: "Sep", attendance: 76, groupParticipation: 60, serving: 68, events: 46 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "stable", label: "→" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 3, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 3", author: "Pastor David", note: "Tyler handles facilities maintenance well. Quiet but reliable." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Admin",
      ministryRole: "Facilities",
      currentGroups: [
        { name: "Facilities", role: "Maintenance" },
      ],
      servingFrequency: "As needed",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2023–Present", role: "Facilities Maintenance", ministry: "Admin" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 3", type: "follow-up", title: "Follow-up completed", detail: "Admin team check-in" },
      { id: "t3", date: "Aug 30", type: "ministry", title: "Facilities maintenance", detail: "Building repair" },
      { id: "t4", date: "Mar 17", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 3", author: "Pastor David", note: "Tyler is the kind of member who quietly keeps things running. Very dependable." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 3", type: "follow-up", title: "Follow-up completed", detail: "Admin check-in" },
      { id: "a3", date: "Aug 30", type: "ministry", title: "Facilities maintenance", detail: "Building repair" },
    ],
  },

  "21": { // Samantha Scott
    id: "21",
    attendanceRate: 91,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "High",
    attendance: {
      percentage: 91,
      servicesAttended: 45,
      servicesMissed: 4,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: false },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 85 },
        { month: "May", rate: 87 },
        { month: "Jun", rate: 88 },
        { month: "Jul", rate: 87 },
        { month: "Aug", rate: 90 },
        { month: "Sep", rate: 91 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 85, groupParticipation: 72, serving: 75, events: 55 },
        { month: "May", attendance: 87, groupParticipation: 74, serving: 78, events: 58 },
        { month: "Jun", attendance: 88, groupParticipation: 76, serving: 80, events: 60 },
        { month: "Jul", attendance: 87, groupParticipation: 75, serving: 79, events: 59 },
        { month: "Aug", attendance: 90, groupParticipation: 78, serving: 82, events: 62 },
        { month: "Sep", attendance: 91, groupParticipation: 80, serving: 85, events: 65 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "High",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 11, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 11", author: "Pastor David", note: "Samantha is a newer member who has quickly become active in choir." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Worship",
      ministryRole: "Choir Member",
      currentGroups: [
        { name: "Choir", role: "Member" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2025–Present", role: "Choir Member", ministry: "Worship" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 11", type: "follow-up", title: "Follow-up completed", detail: "Choir check-in" },
      { id: "t3", date: "Sep 7", type: "ministry", title: "Choir rehearsal", detail: "Prepared music" },
      { id: "t4", date: "Jul 11", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 11", author: "Pastor David", note: "Samantha joined the choir just two months ago and has already become a key member." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 11", type: "follow-up", title: "Follow-up completed", detail: "Choir check-in" },
      { id: "a3", date: "Sep 7", type: "ministry", title: "Choir rehearsal", detail: "Music prep" },
    ],
  },

  "22": { // Jason Green — INACTIVE
    id: "22",
    attendanceRate: 22,
    activeGroups: 0,
    servingStatus: "Inactive",
    openFollowUps: 2,
    activePrayerRequests: 0,
    engagementLevel: "Low",
    attendance: {
      percentage: 22,
      servicesAttended: 11,
      servicesMissed: 39,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "May 22, 2026",
      records: [
        { date: "May 22", service: "Morning Worship", present: true },
        { date: "May 15", service: "Morning Worship", present: false },
        { date: "May 8", service: "Morning Worship", present: false },
        { date: "May 1", service: "Morning Worship", present: true },
        { date: "Apr 24", service: "Morning Worship", present: false },
        { date: "Apr 17", service: "Morning Worship", present: false },
      ],
      trend: [
        { month: "Apr", rate: 40 },
        { month: "May", rate: 30 },
        { month: "Jun", rate: 25 },
        { month: "Jul", rate: 23 },
        { month: "Aug", rate: 22 },
        { month: "Sep", rate: 22 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 40, groupParticipation: 25, serving: 20, events: 10 },
        { month: "May", attendance: 30, groupParticipation: 15, serving: 12, events: 5 },
        { month: "Jun", attendance: 25, groupParticipation: 10, serving: 8, events: 3 },
        { month: "Jul", attendance: 23, groupParticipation: 8, serving: 5, events: 2 },
        { month: "Aug", attendance: 22, groupParticipation: 5, serving: 3, events: 1 },
        { month: "Sep", attendance: 22, groupParticipation: 3, serving: 2, events: 0 },
      ],
      insights: [
        { dimension: "Attendance", trend: "down", label: "↓" },
        { dimension: "Group participation", trend: "down", label: "↓" },
        { dimension: "Serving", trend: "down", label: "↓" },
      ],
      recentLevel: "Low",
    },
    shepherding: {
      assignedShepherd: "Pastor Lisa Martinez",
      lastPastoralContact: "Jul 20, 2026",
      careStatus: "needs-attention",
      openFollowUps: 2,
      completedFollowUps: 1,
      recentNotes: [
        { date: "Jul 20", author: "Pastor Lisa", note: "Jason has not responded to outreach attempts. Moved to monthly follow-up." },
        { date: "Jun 10", author: "Pastor Lisa", note: "Jason mentioned work travel is affecting his ability to attend." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Youth",
      ministryRole: "Former Youth Leader",
      currentGroups: [],
      servingFrequency: "N/A",
      volunteerStatus: "Inactive",
      participationHistory: [
        { period: "2022–2026", role: "Youth Leader", ministry: "Youth" },
      ],
    },
    timeline: [
      { id: "t1", date: "May 22", type: "attendance", title: "Attended Morning Worship", detail: "Last recorded attendance" },
      { id: "t2", date: "Jul 20", type: "follow-up", title: "Follow-up attempt", detail: "No response" },
      { id: "t3", date: "Jun 10", type: "follow-up", title: "Pastoral note added", detail: "Work travel affecting attendance" },
      { id: "t4", date: "Apr 14", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Jul 20", author: "Pastor Lisa", note: "Jason was once an active youth leader but has become disengaged. Work travel appears to be the main factor." },
    ],
    recentActivity: [
      { id: "a1", date: "May 22", type: "attendance", title: "Attended Morning Worship", detail: "Last attendance" },
      { id: "a2", date: "Jul 20", type: "follow-up", title: "Follow-up attempt", detail: "No response" },
    ],
  },

  "23": { // Megan Adams
    id: "23",
    attendanceRate: 88,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 88,
      servicesAttended: 44,
      servicesMissed: 6,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: false },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 82 },
        { month: "May", rate: 84 },
        { month: "Jun", rate: 85 },
        { month: "Jul", rate: 84 },
        { month: "Aug", rate: 87 },
        { month: "Sep", rate: 88 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 82, groupParticipation: 60, serving: 65, events: 45 },
        { month: "May", attendance: 84, groupParticipation: 62, serving: 68, events: 48 },
        { month: "Jun", attendance: 85, groupParticipation: 64, serving: 70, events: 50 },
        { month: "Jul", attendance: 84, groupParticipation: 63, serving: 69, events: 49 },
        { month: "Aug", attendance: 87, groupParticipation: 66, serving: 72, events: 52 },
        { month: "Sep", attendance: 88, groupParticipation: 68, serving: 75, events: 55 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor Rachel Taylor",
      lastPastoralContact: "Sep 9, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 9", author: "Pastor Rachel", note: "Megan is a newer children's ministry volunteer. She is learning quickly." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Children",
      ministryRole: "Children's Team",
      currentGroups: [
        { name: "Children's Team", role: "Volunteer" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2024–Present", role: "Children's Team Volunteer", ministry: "Children" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 9", type: "follow-up", title: "Follow-up completed", detail: "Children's ministry check-in" },
      { id: "t3", date: "Sep 7", type: "ministry", title: "Children's ministry", detail: "Assisted with class" },
      { id: "t4", date: "Dec 1", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 9", author: "Pastor Rachel", note: "Megan has a natural ability to connect with children. Great addition to the team." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 9", type: "follow-up", title: "Follow-up completed", detail: "Children's check-in" },
      { id: "a3", date: "Sep 7", type: "ministry", title: "Children's ministry", detail: "Assisted" },
    ],
  },

  "24": { // Justin Baker
    id: "24",
    attendanceRate: 81,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 81,
      servicesAttended: 40,
      servicesMissed: 9,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: false },
        { date: "Aug 31", service: "Morning Worship", present: true },
        { date: "Aug 24", service: "Morning Worship", present: false },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 75 },
        { month: "May", rate: 77 },
        { month: "Jun", rate: 78 },
        { month: "Jul", rate: 77 },
        { month: "Aug", rate: 80 },
        { month: "Sep", rate: 81 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 75, groupParticipation: 55, serving: 58, events: 40 },
        { month: "May", attendance: 77, groupParticipation: 58, serving: 60, events: 42 },
        { month: "Jun", attendance: 78, groupParticipation: 60, serving: 62, events: 44 },
        { month: "Jul", attendance: 77, groupParticipation: 59, serving: 61, events: 43 },
        { month: "Aug", attendance: 80, groupParticipation: 62, serving: 65, events: 46 },
        { month: "Sep", attendance: 81, groupParticipation: 64, serving: 68, events: 48 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 5, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 5", author: "Pastor David", note: "Justin is growing in his mission trip involvement. Good team player." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Outreach",
      ministryRole: "Mission Trip Member",
      currentGroups: [
        { name: "Mission Trip", role: "Team Member" },
      ],
      servingFrequency: "Monthly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2023–Present", role: "Mission Trip Team", ministry: "Outreach" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 5", type: "follow-up", title: "Follow-up completed", detail: "Mission trip check-in" },
      { id: "t3", date: "Jun 28", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 5", author: "Pastor David", note: "Justin is a dependable mission trip participant. He handles logistics well." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 5", type: "follow-up", title: "Follow-up completed", detail: "Mission trip check-in" },
    ],
  },

  "25": { // Ashley Nelson
    id: "25",
    attendanceRate: 87,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 0,
    activePrayerRequests: 0,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 87,
      servicesAttended: 43,
      servicesMissed: 6,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Sep 14, 2026",
      records: [
        { date: "Sep 14", service: "Morning Worship", present: true },
        { date: "Sep 7", service: "Morning Worship", present: true },
        { date: "Aug 31", service: "Morning Worship", present: false },
        { date: "Aug 24", service: "Morning Worship", present: true },
        { date: "Aug 17", service: "Morning Worship", present: true },
        { date: "Aug 10", service: "Morning Worship", present: true },
      ],
      trend: [
        { month: "Apr", rate: 82 },
        { month: "May", rate: 83 },
        { month: "Jun", rate: 84 },
        { month: "Jul", rate: 83 },
        { month: "Aug", rate: 86 },
        { month: "Sep", rate: 87 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 82, groupParticipation: 62, serving: 65, events: 48 },
        { month: "May", attendance: 83, groupParticipation: 64, serving: 68, events: 50 },
        { month: "Jun", attendance: 84, groupParticipation: 66, serving: 70, events: 52 },
        { month: "Jul", attendance: 83, groupParticipation: 65, serving: 69, events: 51 },
        { month: "Aug", attendance: 86, groupParticipation: 68, serving: 72, events: 54 },
        { month: "Sep", attendance: 87, groupParticipation: 70, serving: 75, events: 56 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Group participation", trend: "up", label: "↑" },
        { dimension: "Serving", trend: "up", label: "↑" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Sep 10, 2026",
      careStatus: "healthy",
      openFollowUps: 0,
      completedFollowUps: 2,
      recentNotes: [
        { date: "Sep 10", author: "Pastor David", note: "Ashley is growing steadily in her worship team role." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "Worship",
      ministryRole: "Worship Team",
      currentGroups: [
        { name: "Worship Team", role: "Instrumentalist" },
      ],
      servingFrequency: "Weekly",
      volunteerStatus: "Active Volunteer",
      participationHistory: [
        { period: "2025–Present", role: "Instrumentalist", ministry: "Worship" },
      ],
    },
    timeline: [
      { id: "t1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "t2", date: "Sep 10", type: "follow-up", title: "Follow-up completed", detail: "Worship team check-in" },
      { id: "t3", date: "Sep 7", type: "ministry", title: "Worship rehearsal", detail: "Instrumental practice" },
      { id: "t4", date: "Oct 5", type: "joined", title: "Joined church", detail: "Became a member" },
    ],
    notes: [
      { date: "Sep 10", author: "Pastor David", note: "Ashley's instrumental skills have enhanced our worship experience. She is a gift to the team." },
    ],
    recentActivity: [
      { id: "a1", date: "Sep 14", type: "attendance", title: "Attended Morning Worship", detail: "Sunday service" },
      { id: "a2", date: "Sep 10", type: "follow-up", title: "Follow-up completed", detail: "Worship check-in" },
      { id: "a3", date: "Sep 7", type: "ministry", title: "Worship rehearsal", detail: "Instrumental practice" },
    ],
  },

  "mw": { // Michael Williams
    id: "mw",
    attendanceRate: 72,
    activeGroups: 1,
    servingStatus: "Active",
    openFollowUps: 1,
    activePrayerRequests: 1,
    engagementLevel: "Moderate",
    attendance: {
      percentage: 72,
      servicesAttended: 36,
      servicesMissed: 14,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Aug 21, 2026",
      records: [
        { date: "Sep 11", service: "Friday Main Service", present: false },
        { date: "Sep 4", service: "Friday Main Service", present: false },
        { date: "Aug 28", service: "Friday Main Service", present: false },
        { date: "Aug 21", service: "Friday Main Service", present: true },
        { date: "Aug 14", service: "Friday Main Service", present: true },
      ],
      trend: [
        { month: "Apr", rate: 85 },
        { month: "May", rate: 80 },
        { month: "Jun", rate: 78 },
        { month: "Jul", rate: 75 },
        { month: "Aug", rate: 70 },
        { month: "Sep", rate: 72 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 85, groupParticipation: 70, serving: 75, events: 60 },
        { month: "May", attendance: 80, groupParticipation: 65, serving: 70, events: 55 },
        { month: "Jun", attendance: 78, groupParticipation: 60, serving: 65, events: 50 },
        { month: "Jul", attendance: 75, groupParticipation: 55, serving: 60, events: 45 },
        { month: "Aug", attendance: 70, groupParticipation: 50, serving: 55, events: 40 },
        { month: "Sep", attendance: 72, groupParticipation: 55, serving: 60, events: 45 },
      ],
      insights: [
        { dimension: "Attendance", trend: "up", label: "↑" },
        { dimension: "Operations", trend: "stable", label: "→" },
      ],
      recentLevel: "Moderate",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Aug 25, 2026",
      careStatus: "healthy",
      openFollowUps: 1,
      completedFollowUps: 3,
      recentNotes: [
        { date: "Aug 25", author: "Pastor David", note: "Connected with Michael; he was traveling for work and returning soon." },
      ],
    },
    prayers: [
      { id: "p1", title: "Safe travels and family wellness", status: "in-prayer", dateSubmitted: "Aug 20, 2026", lastPrayer: "Sep 01, 2026", category: "Family" },
    ],
    ministryGroups: {
      currentMinistry: "Admin",
      ministryRole: "Operations Volunteer",
      currentGroups: [{ name: "Operations Team", role: "Volunteer" }],
      servingFrequency: "Bi-weekly",
      volunteerStatus: "Active",
      participationHistory: [{ period: "2024–Present", role: "Volunteer", ministry: "Admin" }],
    },
    timeline: [
      { id: "t1", date: "Aug 21", type: "attendance", title: "Attended Friday Main Service", detail: "Friday service" },
      { id: "t2", date: "Aug 25", type: "follow-up", title: "Pastoral call", detail: "Work travel check-in" },
    ],
    notes: [
      { date: "Aug 25", author: "Pastor David", note: "Looking forward to seeing Michael back in service." },
    ],
    recentActivity: [
      { id: "a1", date: "Aug 21", type: "attendance", title: "Attended Friday Main Service", detail: "Friday service" },
    ],
  },

  "dd": { // David Davis
    id: "dd",
    attendanceRate: 50,
    activeGroups: 0,
    servingStatus: "Inactive",
    openFollowUps: 1,
    activePrayerRequests: 0,
    engagementLevel: "Low",
    attendance: {
      percentage: 50,
      servicesAttended: 12,
      servicesMissed: 12,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: "Aug 14, 2026",
      records: [
        { date: "Sep 11", service: "Friday Main Service", present: false },
        { date: "Sep 4", service: "Friday Main Service", present: false },
        { date: "Aug 28", service: "Friday Main Service", present: false },
        { date: "Aug 21", service: "Friday Main Service", present: false },
        { date: "Aug 14", service: "Friday Main Service", present: true },
      ],
      trend: [
        { month: "Apr", rate: 60 },
        { month: "May", rate: 55 },
        { month: "Jun", rate: 50 },
        { month: "Jul", rate: 50 },
        { month: "Aug", rate: 45 },
        { month: "Sep", rate: 50 },
      ],
    },
    engagement: {
      months: [
        { month: "Apr", attendance: 60, groupParticipation: 30, serving: 0, events: 20 },
        { month: "May", attendance: 55, groupParticipation: 25, serving: 0, events: 20 },
        { month: "Jun", attendance: 50, groupParticipation: 20, serving: 0, events: 15 },
        { month: "Jul", attendance: 50, groupParticipation: 20, serving: 0, events: 15 },
        { month: "Aug", attendance: 45, groupParticipation: 15, serving: 0, events: 10 },
        { month: "Sep", attendance: 50, groupParticipation: 20, serving: 0, events: 15 },
      ],
      insights: [
        { dimension: "Attendance", trend: "stable", label: "→" },
      ],
      recentLevel: "Low",
    },
    shepherding: {
      assignedShepherd: "Pastor David Brown",
      lastPastoralContact: "Aug 18, 2026",
      careStatus: "healthy",
      openFollowUps: 1,
      completedFollowUps: 1,
      recentNotes: [
        { date: "Aug 18", author: "Pastor David", note: "Sent encouragement message to David." },
      ],
    },
    prayers: [],
    ministryGroups: {
      currentMinistry: "—",
      ministryRole: "Visitor",
      currentGroups: [],
      servingFrequency: "None",
      volunteerStatus: "None",
      participationHistory: [],
    },
    timeline: [
      { id: "t1", date: "Aug 14", type: "attendance", title: "Attended Friday Main Service", detail: "Friday service" },
    ],
    notes: [],
    recentActivity: [
      { id: "a1", date: "Aug 14", type: "attendance", title: "Attended Friday Main Service", detail: "Friday service" },
    ],
  },
};

// ─── Gift Catalog ──────────────────────────────────────────────

export const giftCatalog: GiftOption[] = [
  {
    id: "g1",
    title: "Crystal Faithful Servant Plaque",
    category: "Recognition",
    description: "Handcrafted crystal plaque engraved with the member's name and scripture, honoring steadfast commitment and attendance.",
    eligibility: "Attendance >= 90% & Active Serving",
    icon: "trophy"
  },
  {
    id: "g2",
    title: "Personalized Leather Study Bible",
    category: "Spiritual Growth",
    description: "Premium heirloom study Bible with custom gold-foil name embossing and pastoral blessing note.",
    eligibility: "Committed Pillar Member",
    icon: "book"
  },
  {
    id: "g3",
    title: "Kingdom Leadership Retreat VIP Pass",
    category: "Leadership Retreat",
    description: "Full registration and lodging pass for the upcoming annual Mountain Lake Leadership Retreat.",
    eligibility: "Ministry Leaders & Faithful Pillars",
    icon: "sparkles"
  },
  {
    id: "g4",
    title: "Christian Bookstore & Café $50 Voucher",
    category: "Fellowship",
    description: "Gift certificate valid for books, resources, or fellowship coffee at the church media café.",
    eligibility: "Attendance >= 85%",
    icon: "gift"
  },
  {
    id: "g5",
    title: "Pastoral Appreciation Dinner Invitation",
    category: "Recognition",
    description: "Special invitation to the executive leadership and pillars appreciation banquet.",
    eligibility: "Tenure > 1 Year & Committed Status",
    icon: "heart"
  }
];

// ─── Public API ────────────────────────────────────────────────

const sampleAbsenceReasons = [
  "Sick / Medical Recovery",
  "On Travel / Vacation",
  "Family Emergency",
  "Work Obligation",
];

export function generateDefaultMember360(memberId: string, member: Partial<Member>): Member360 {
  const name = `${member.firstName || "New"} ${member.lastName || "Member"}`.trim();
  const ministry = member.ministry && member.ministry !== "—" ? member.ministry : "Worship";
  const group = member.group || "Small Group A";
  const joinedDate = member.joinedDate || "Recent";
  const status = member.status || "active";
  const isVisitor = status === "visitor";
  const attendanceRate = isVisitor ? 65 : 88;

  return {
    id: memberId,
    attendanceRate,
    activeGroups: 1,
    servingStatus: isVisitor ? "Exploring" : "Active",
    openFollowUps: isVisitor ? 1 : 0,
    activePrayerRequests: 1,
    engagementLevel: isVisitor ? "New" : "High",
    attendance: {
      percentage: attendanceRate,
      servicesAttended: isVisitor ? 4 : 22,
      servicesMissed: isVisitor ? 2 : 3,
      currentMonth: "Sep",
      previousMonth: "Aug",
      lastAttendance: member.lastAttendance || "Sep 26, 2026",
      records: [
        { date: "Sep 26", service: "Friday Main Service", present: true },
        { date: "Sep 19", service: "Friday Main Service", present: true },
        { date: "Sep 12", service: "Friday Main Service", present: true },
        { date: "Sep 05", service: "Friday Main Service", present: !isVisitor },
      ],
      trend: [
        { month: "May", rate: attendanceRate - 4 },
        { month: "Jun", rate: attendanceRate },
        { month: "Jul", rate: attendanceRate - 2 },
        { month: "Aug", rate: attendanceRate + 2 },
        { month: "Sep", rate: attendanceRate },
      ],
    },
    engagement: {
      months: [
        { month: "Jun", attendance: 4, groupParticipation: 3, serving: 2, events: 1 },
        { month: "Jul", attendance: 3, groupParticipation: 4, serving: 2, events: 1 },
        { month: "Aug", attendance: 4, groupParticipation: 4, serving: 3, events: 2 },
        { month: "Sep", attendance: 4, groupParticipation: 4, serving: 3, events: 1 },
      ],
      insights: [
        { dimension: "Attendance Consistency", trend: "up", label: "Consistently attends weekly services" },
        { dimension: "Ministry Involvement", trend: "stable", label: `Active in ${ministry}` },
      ],
      recentLevel: isVisitor ? "Newcomer" : "Regular Member",
    },
    shepherding: {
      assignedShepherd: "Pastor David",
      lastPastoralContact: "Sep 15, 2026",
      careStatus: "healthy",
      openFollowUps: isVisitor ? 1 : 0,
      completedFollowUps: 1,
      recentNotes: [
        {
          date: "Sep 15, 2026",
          author: "Pastor David",
          note: `Welcomed ${name} to ${ministry} ministry and confirmed contact details.`,
        },
      ],
    },
    prayers: [
      {
        id: `pr-${memberId}-1`,
        title: "Thanksgiving for church family & spiritual growth",
        status: "in-prayer",
        dateSubmitted: "Sep 10, 2026",
        lastPrayer: "Sep 24, 2026",
        category: "Spiritual",
      },
    ],
    ministryGroups: {
      currentMinistry: ministry,
      ministryRole: "Member",
      currentGroups: [{ name: group, role: "Participant" }],
      servingFrequency: "Weekly",
      volunteerStatus: isVisitor ? "Pending" : "Active Volunteer",
      participationHistory: [
        { period: `2026 - Present`, role: "Participant", ministry },
      ],
    },
    timeline: [
      {
        id: `tl-${memberId}-1`,
        date: joinedDate,
        type: "joined",
        title: "Joined Grace Community Church",
        detail: `Registered as a member under ${ministry} ministry.`,
      },
      {
        id: `tl-${memberId}-2`,
        date: "Sep 15, 2026",
        type: "ministry",
        title: `Joined ${ministry}`,
        detail: `Assigned to ${group}.`,
      },
    ],
    notes: [
      {
        id: `nt-${memberId}-1`,
        date: "Sep 15, 2026",
        author: "Grace Admin",
        note: `Profile initialized in Church Management Platform.`,
      },
    ],
    recentActivity: [
      {
        id: `act-${memberId}-1`,
        date: "Last Friday",
        type: "attendance",
        title: "Attended Main Service",
        detail: "Confirmed via staff check-in.",
      },
    ],
    rewardTier: attendanceRate >= 90 ? "Gold Pillar (90%+)" : "Silver Faithful",
    rewards: [
      {
        id: `rew-${memberId}-1`,
        title: "Christian Bookstore & Café $50 Voucher",
        category: "Fellowship",
        description: "Appreciation gift voucher for regular attendance and ministry involvement.",
        dateAwarded: "Jul 10, 2026",
        status: "Delivered",
        awardedBy: "Ministry Board",
        badgeIcon: "gift",
      },
    ],
  };
}

export function getMember360(memberId: string): Member360 | null {
  const raw = member360Data[memberId];
  if (!raw) return null;

  // Clone so we don't mutate base records
  const data: Member360 = JSON.parse(JSON.stringify(raw));

  // Determine reward tier based on attendance
  data.rewardTier = data.attendanceRate >= 90 ? "Gold Pillar (90%+)" : data.attendanceRate >= 80 ? "Silver Faithful" : "Bronze Dedicated";

  // Enrich absent records with realistic mobile-reported reasons
  let reasonIdx = 0;
  data.attendance.records = data.attendance.records.map((rec) => {
    if (!rec.present && !rec.absenteeismReason) {
      const reason = sampleAbsenceReasons[reasonIdx % sampleAbsenceReasons.length];
      reasonIdx++;
      return {
        ...rec,
        absenteeismReason: reason,
        reportedVia: "Mobile App",
        reportedDate: `${rec.date}, 8:30 AM`,
      };
    }
    return rec;
  });

  // Default rewards for committed members
  if (!data.rewards || data.rewards.length === 0) {
    if (data.attendanceRate >= 90) {
      data.rewards = [
        {
          id: "rew-1",
          title: "Crystal Faithful Servant Plaque",
          category: "Recognition",
          description: "Honoring 90%+ attendance commitment and servant heart in ministry.",
          dateAwarded: "Aug 15, 2026",
          status: "Delivered",
          awardedBy: "Pastor David",
          badgeIcon: "trophy",
        },
        {
          id: "rew-2",
          title: "Personalized Leather Study Bible",
          category: "Spiritual Growth",
          description: "Custom inscribed ESV study Bible for committed scripture stewardship.",
          dateAwarded: "Sep 01, 2026",
          status: "Ready for Pickup",
          awardedBy: "Elders Board",
          badgeIcon: "book",
        },
      ];
    } else if (data.attendanceRate >= 80) {
      data.rewards = [
        {
          id: "rew-3",
          title: "Christian Bookstore & Café $50 Voucher",
          category: "Fellowship",
          description: "Appreciation gift voucher for regular attendance and ministry involvement.",
          dateAwarded: "Jul 10, 2026",
          status: "Delivered",
          awardedBy: "Ministry Board",
          badgeIcon: "gift",
        },
      ];
    } else {
      data.rewards = [];
    }
  }

  return data;
}

export function getAllMemberIds(): string[] {
  return Object.keys(member360Data);
}

