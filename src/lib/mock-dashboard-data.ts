/**
 * Mock Dashboard Analytics Data
 *
 * This file contains realistic mock data for each dashboard period.
 * Designed to be easily replaceable with real API data later.
 *
 * Structure mirrors what a real API would return:
 * DashboardAnalytics {
 *   period
 *   kpis
 *   attendance
 *   ministryDistribution
 * }
 *
 * Activity feed and upcoming events are NOT period-sensitive
 * (per M11/M12 requirements) so they remain in their components.
 */

export interface KpiData {
  label: string;
  value: string;
  change: {
    value: number;
    trend: "up" | "down" | "neutral";
  };
  comparisonLabel: string;
}

export interface AttendanceDataPoint {
  label: string;
  value: number;
}

export interface MinistryDataPoint {
  name: string;
  count: number;
  percentage: number;
}

export interface DashboardAnalytics {
  kpis: {
    totalMembers: KpiData;
    attendance: KpiData;
    followUps: KpiData;
    activeGroups: KpiData;
  };
  attendanceChart: {
    title: string;
    subtitle: string;
    total: number;
    data: AttendanceDataPoint[];
  };
  ministryDistribution: {
    total: number;
    data: MinistryDataPoint[];
  };
}

// ─── Internal Coherent Mock Data ────────────────────────────────
// Base numbers represent "This Week" (current week Sep 8-14, 2026)

const baseData: DashboardAnalytics = {
  kpis: {
    totalMembers: {
      label: "Total Members",
      value: "1,247",
      change: { value: 12, trend: "up" },
      comparisonLabel: "vs last week",
    },
    attendance: {
      label: "Attendance",
      value: "1,068",
      change: { value: 8, trend: "up" },
      comparisonLabel: "vs last week",
    },
    followUps: {
      label: "Follow-Ups Pending",
      value: "12",
      change: { value: 3, trend: "down" },
      comparisonLabel: "vs last week",
    },
    activeGroups: {
      label: "Active Groups",
      value: "5",
      change: { value: 1, trend: "up" },
      comparisonLabel: "vs last week",
    },
  },
  attendanceChart: {
    title: "Weekly Attendance",
    subtitle: "Average 153 per service",
    total: 1068,
    data: [
      { label: "Mon", value: 142 },
      { label: "Tue", value: 98 },
      { label: "Wed", value: 167 },
      { label: "Thu", value: 89 },
      { label: "Fri", value: 124 },
      { label: "Sat", value: 203 },
      { label: "Sun", value: 245 },
    ],
  },
  ministryDistribution: {
    total: 135,
    data: [
      { name: "Worship", count: 42, percentage: 31 },
      { name: "Youth", count: 35, percentage: 26 },
      { name: "Children", count: 28, percentage: 21 },
      { name: "Outreach", count: 18, percentage: 13 },
      { name: "Admin", count: 12, percentage: 9 },
    ],
  },
};

// ─── Period Variations ──────────────────────────────────────────
// Ministry data represents active participants per period.
// Numbers vary dramatically to show clear animation on period change.

const periodData: Record<string, DashboardAnalytics> = {
  "today": {
    kpis: {
      totalMembers: {
        label: "Total Members",
        value: "1,247",
        change: { value: 2, trend: "up" },
        comparisonLabel: "vs yesterday",
      },
      attendance: {
        label: "Today's Attendance",
        value: "245",
        change: { value: 5, trend: "up" },
        comparisonLabel: "vs last Sunday",
      },
      followUps: {
        label: "Follow-Ups Pending",
        value: "12",
        change: { value: 1, trend: "down" },
        comparisonLabel: "vs yesterday",
      },
      activeGroups: {
        label: "Active Groups",
        value: "5",
        change: { value: 0, trend: "neutral" },
        comparisonLabel: "vs yesterday",
      },
    },
    attendanceChart: {
      title: "Today's Attendance",
      subtitle: "Sunday service",
      total: 245,
      data: [
        { label: "9:00 AM", value: 45 },
        { label: "9:30 AM", value: 89 },
        { label: "10:00 AM", value: 156 },
        { label: "10:30 AM", value: 212 },
        { label: "11:00 AM", value: 245 },
        { label: "11:30 AM", value: 198 },
        { label: "12:00 PM", value: 87 },
      ],
    },
    ministryDistribution: {
      total: 48,
      data: [
        { name: "Worship", count: 18, percentage: 38 },
        { name: "Youth", count: 12, percentage: 25 },
        { name: "Children", count: 8, percentage: 17 },
        { name: "Outreach", count: 6, percentage: 12 },
        { name: "Admin", count: 4, percentage: 8 },
      ],
    },
  },

  "this-week": baseData,

  "last-week": {
    kpis: {
      totalMembers: {
        label: "Total Members",
        value: "1,235",
        change: { value: 15, trend: "up" },
        comparisonLabel: "vs week before",
      },
      attendance: {
        label: "Attendance",
        value: "987",
        change: { value: 3, trend: "down" },
        comparisonLabel: "vs week before",
      },
      followUps: {
        label: "Follow-Ups Pending",
        value: "15",
        change: { value: 2, trend: "up" },
        comparisonLabel: "vs week before",
      },
      activeGroups: {
        label: "Active Groups",
        value: "4",
        change: { value: 0, trend: "neutral" },
        comparisonLabel: "vs week before",
      },
    },
    attendanceChart: {
      title: "Weekly Attendance",
      subtitle: "Average 141 per service",
      total: 987,
      data: [
        { label: "Mon", value: 130 },
        { label: "Tue", value: 85 },
        { label: "Wed", value: 155 },
        { label: "Thu", value: 78 },
        { label: "Fri", value: 112 },
        { label: "Sat", value: 189 },
        { label: "Sun", value: 238 },
      ],
    },
    ministryDistribution: {
      total: 98,
      data: [
        { name: "Worship", count: 28, percentage: 29 },
        { name: "Youth", count: 25, percentage: 26 },
        { name: "Children", count: 22, percentage: 22 },
        { name: "Outreach", count: 14, percentage: 14 },
        { name: "Admin", count: 9, percentage: 9 },
      ],
    },
  },

  "this-month": {
    kpis: {
      totalMembers: {
        label: "Total Members",
        value: "1,247",
        change: { value: 28, trend: "up" },
        comparisonLabel: "vs last month",
      },
      attendance: {
        label: "Attendance",
        value: "4,280",
        change: { value: 14, trend: "up" },
        comparisonLabel: "vs last month",
      },
      followUps: {
        label: "Follow-Ups Pending",
        value: "12",
        change: { value: 5, trend: "down" },
        comparisonLabel: "vs last month",
      },
      activeGroups: {
        label: "Active Groups",
        value: "5",
        change: { value: 1, trend: "up" },
        comparisonLabel: "vs last month",
      },
    },
    attendanceChart: {
      title: "Monthly Attendance",
      subtitle: "Week 2 of September",
      total: 4280,
      data: [
        { label: "Week 1", value: 1023 },
        { label: "Week 2", value: 1068 },
        { label: "Week 3", value: 1089 },
        { label: "Week 4", value: 1100 },
      ],
    },
    ministryDistribution: {
      total: 181,
      data: [
        { name: "Worship", count: 52, percentage: 29 },
        { name: "Youth", count: 45, percentage: 25 },
        { name: "Children", count: 38, percentage: 21 },
        { name: "Outreach", count: 28, percentage: 15 },
        { name: "Admin", count: 18, percentage: 10 },
      ],
    },
  },

  "last-month": {
    kpis: {
      totalMembers: {
        label: "Total Members",
        value: "1,219",
        change: { value: 22, trend: "up" },
        comparisonLabel: "vs month before",
      },
      attendance: {
        label: "Attendance",
        value: "3,752",
        change: { value: 6, trend: "up" },
        comparisonLabel: "vs month before",
      },
      followUps: {
        label: "Follow-Ups Pending",
        value: "17",
        change: { value: 4, trend: "up" },
        comparisonLabel: "vs month before",
      },
      activeGroups: {
        label: "Active Groups",
        value: "4",
        change: { value: 0, trend: "neutral" },
        comparisonLabel: "vs month before",
      },
    },
    attendanceChart: {
      title: "Monthly Attendance",
      subtitle: "August 2026",
      total: 3752,
      data: [
        { label: "Week 1", value: 892 },
        { label: "Week 2", value: 945 },
        { label: "Week 3", value: 968 },
        { label: "Week 4", value: 947 },
      ],
    },
    ministryDistribution: {
      total: 160,
      data: [
        { name: "Worship", count: 48, percentage: 30 },
        { name: "Youth", count: 40, percentage: 25 },
        { name: "Children", count: 35, percentage: 22 },
        { name: "Outreach", count: 22, percentage: 14 },
        { name: "Admin", count: 15, percentage: 9 },
      ],
    },
  },

  "this-quarter": {
    kpis: {
      totalMembers: {
        label: "Total Members",
        value: "1,247",
        change: { value: 89, trend: "up" },
        comparisonLabel: "vs last quarter",
      },
      attendance: {
        label: "Attendance",
        value: "12,845",
        change: { value: 18, trend: "up" },
        comparisonLabel: "vs last quarter",
      },
      followUps: {
        label: "Follow-Ups Pending",
        value: "12",
        change: { value: 8, trend: "down" },
        comparisonLabel: "vs last quarter",
      },
      activeGroups: {
        label: "Active Groups",
        value: "5",
        change: { value: 2, trend: "up" },
        comparisonLabel: "vs last quarter",
      },
    },
    attendanceChart: {
      title: "Quarterly Attendance",
      subtitle: "Jul – Sep 2026",
      total: 12845,
      data: [
        { label: "Jul", value: 3952 },
        { label: "Aug", value: 4280 },
        { label: "Sep", value: 4613 },
      ],
    },
    ministryDistribution: {
      total: 222,
      data: [
        { name: "Worship", count: 65, percentage: 29 },
        { name: "Youth", count: 52, percentage: 23 },
        { name: "Children", count: 45, percentage: 20 },
        { name: "Outreach", count: 35, percentage: 16 },
        { name: "Admin", count: 25, percentage: 11 },
      ],
    },
  },

  "this-year": {
    kpis: {
      totalMembers: {
        label: "Total Members",
        value: "1,247",
        change: { value: 247, trend: "up" },
        comparisonLabel: "vs last year",
      },
      attendance: {
        label: "Attendance",
        value: "51,380",
        change: { value: 22, trend: "up" },
        comparisonLabel: "vs last year",
      },
      followUps: {
        label: "Follow-Ups Pending",
        value: "12",
        change: { value: 10, trend: "down" },
        comparisonLabel: "vs last year",
      },
      activeGroups: {
        label: "Active Groups",
        value: "5",
        change: { value: 3, trend: "up" },
        comparisonLabel: "vs last year",
      },
    },
    attendanceChart: {
      title: "Yearly Attendance",
      subtitle: "January – September 2026",
      total: 51380,
      data: [
        { label: "Jan", value: 4820 },
        { label: "Feb", value: 5100 },
        { label: "Mar", value: 5340 },
        { label: "Apr", value: 5180 },
        { label: "May", value: 5520 },
        { label: "Jun", value: 5890 },
        { label: "Jul", value: 3952 },
        { label: "Aug", value: 4280 },
        { label: "Sep", value: 4613 },
      ],
    },
    ministryDistribution: {
      total: 280,
      data: [
        { name: "Worship", count: 85, percentage: 30 },
        { name: "Youth", count: 68, percentage: 24 },
        { name: "Children", count: 55, percentage: 20 },
        { name: "Outreach", count: 42, percentage: 15 },
        { name: "Admin", count: 30, percentage: 11 },
      ],
    },
  },

  "yesterday": {
    kpis: {
      totalMembers: {
        label: "Total Members",
        value: "1,245",
        change: { value: 3, trend: "up" },
        comparisonLabel: "vs day before",
      },
      attendance: {
        label: "Yesterday's Attendance",
        value: "203",
        change: { value: 12, trend: "up" },
        comparisonLabel: "vs last Saturday",
      },
      followUps: {
        label: "Follow-Ups Pending",
        value: "13",
        change: { value: 1, trend: "down" },
        comparisonLabel: "vs day before",
      },
      activeGroups: {
        label: "Active Groups",
        value: "5",
        change: { value: 0, trend: "neutral" },
        comparisonLabel: "vs day before",
      },
    },
    attendanceChart: {
      title: "Yesterday's Attendance",
      subtitle: "Saturday",
      total: 203,
      data: [
        { label: "8:00 AM", value: 12 },
        { label: "9:00 AM", value: 35 },
        { label: "10:00 AM", value: 67 },
        { label: "11:00 AM", value: 89 },
        { label: "12:00 PM", value: 78 },
        { label: "1:00 PM", value: 45 },
        { label: "2:00 PM", value: 23 },
      ],
    },
    ministryDistribution: {
      total: 102,
      data: [
        { name: "Worship", count: 32, percentage: 31 },
        { name: "Youth", count: 28, percentage: 27 },
        { name: "Children", count: 22, percentage: 22 },
        { name: "Outreach", count: 12, percentage: 12 },
        { name: "Admin", count: 8, percentage: 8 },
      ],
    },
  },

  "custom": {
    kpis: {
      totalMembers: {
        label: "Total Members",
        value: "1,247",
        change: { value: 0, trend: "neutral" },
        comparisonLabel: "vs previous period",
      },
      attendance: {
        label: "Attendance",
        value: "—",
        change: { value: 0, trend: "neutral" },
        comparisonLabel: "vs previous period",
      },
      followUps: {
        label: "Follow-Ups Pending",
        value: "12",
        change: { value: 0, trend: "neutral" },
        comparisonLabel: "vs previous period",
      },
      activeGroups: {
        label: "Active Groups",
        value: "5",
        change: { value: 0, trend: "neutral" },
        comparisonLabel: "vs previous period",
      },
    },
    attendanceChart: {
      title: "Attendance",
      subtitle: "Custom period",
      total: 0,
      data: [],
    },
    ministryDistribution: {
      total: 135,
      data: [
        { name: "Worship", count: 42, percentage: 31 },
        { name: "Youth", count: 35, percentage: 26 },
        { name: "Children", count: 28, percentage: 21 },
        { name: "Outreach", count: 18, percentage: 13 },
        { name: "Admin", count: 12, percentage: 9 },
      ],
    },
  },
};

/**
 * Get dashboard analytics for a given period preset.
 * Returns the mock data for that period.
 * For "custom" ranges, returns a neutral snapshot.
 */
export function getDashboardAnalytics(preset: string): DashboardAnalytics {
  return periodData[preset] || periodData["this-week"];
}
