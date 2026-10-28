/**
 * Historical Attendance Records & Attendee Roster Domain
 *
 * Provides service lookup, attendee roster generation with Welcome Back flags,
 * triage status, and CSV export capabilities for any past or present service date.
 */

import { members, type Member } from "@/lib/mock-data/people";
import { getMember360 } from "@/lib/mock-data/member360";
import { calculateMissedWeeksFromDate } from "@/lib/attendance/welcome-back-helper";
import { getLiveWelcomeBackAttendees } from "@/lib/attendance/live-welcome-back-store";

export type AttendeeAttendanceStatus = "regular" | "welcome_back" | "visitor" | "excused";

export interface AttendeeRecord {
  id: string;
  memberId: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  ministry: string;
  group: string;
  isVisitor: boolean;
  checkInTime: string;
  method: "QR Mobile" | "Manual" | "Kiosk";
  status: AttendeeAttendanceStatus;
  missedWeeks?: number;
  notes?: string;
}

export interface ServiceOption {
  id: string;
  dateStr: string; // "YYYY-MM-DD"
  dateLabel: string; // e.g. "Friday, Sep 11, 2026"
  dayOfWeek: "friday" | "sunday";
  serviceName: string; // e.g. "Friday Main Service"
  serviceKey: "friday_morning" | "sunday_morning" | "sunday_evening";
  isRecent?: boolean;
}

export const PRESET_SERVICES: ServiceOption[] = [
  {
    id: "fri-2026-09-18",
    dateStr: "2026-09-18",
    dateLabel: "Friday, Sep 18, 2026",
    dayOfWeek: "friday",
    serviceName: "Friday Main Service",
    serviceKey: "friday_morning",
    isRecent: true,
  },
  {
    id: "fri-2026-09-11",
    dateStr: "2026-09-11",
    dateLabel: "Friday, Sep 11, 2026",
    dayOfWeek: "friday",
    serviceName: "Friday Main Service",
    serviceKey: "friday_morning",
    isRecent: true,
  },
  {
    id: "sun-2026-09-13-am",
    dateStr: "2026-09-13",
    dateLabel: "Sunday, Sep 13, 2026 (Morning)",
    dayOfWeek: "sunday",
    serviceName: "Sunday Morning Service",
    serviceKey: "sunday_morning",
    isRecent: true,
  },
  {
    id: "sun-2026-09-13-pm",
    dateStr: "2026-09-13",
    dateLabel: "Sunday, Sep 13, 2026 (Evening)",
    dayOfWeek: "sunday",
    serviceName: "Sunday Evening Service",
    serviceKey: "sunday_evening",
    isRecent: true,
  },
  {
    id: "fri-2026-09-04",
    dateStr: "2026-09-04",
    dateLabel: "Friday, Sep 4, 2026",
    dayOfWeek: "friday",
    serviceName: "Friday Main Service",
    serviceKey: "friday_morning",
  },
  {
    id: "sun-2026-09-06-am",
    dateStr: "2026-09-06",
    dateLabel: "Sunday, Sep 6, 2026 (Morning)",
    dayOfWeek: "sunday",
    serviceName: "Sunday Morning Service",
    serviceKey: "sunday_morning",
  },
  {
    id: "fri-2026-08-28",
    dateStr: "2026-08-28",
    dateLabel: "Friday, Aug 28, 2026",
    dayOfWeek: "friday",
    serviceName: "Friday Main Service",
    serviceKey: "friday_morning",
  },
];

/**
 * Returns the roster of attendees for the specified service and date.
 */
export function getServiceRoster(
  dateStr: string,
  serviceKey: "friday_morning" | "sunday_morning" | "sunday_evening" = "friday_morning"
): {
  attendees: AttendeeRecord[];
  totalCount: number;
  welcomeBackCount: number;
  visitorsCount: number;
  regularCount: number;
} {
  const isFriday = serviceKey === "friday_morning";
  const serviceDate = new Date(dateStr + "T10:00:00Z");

  // Filter members eligible for this service day
  const candidateMembers = members.filter((m) => {
    if (isFriday) {
      return m.serviceAssignment === "friday" || m.serviceAssignment === "both";
    } else {
      return m.serviceAssignment === "sunday" || m.serviceAssignment === "both";
    }
  });

  const attendees: AttendeeRecord[] = [];

  candidateMembers.forEach((member, index) => {
    const isVisitor = member.status === "visitor";
    let status: AttendeeAttendanceStatus = isVisitor ? "visitor" : "regular";
    let missedWeeks: number | undefined = undefined;

    // Check Welcome Back condition:
    // If the member is known to have missed prior weeks or has designated presets
    if (!isVisitor) {
      if (member.id === "mw" || member.lastName === "Williams") {
        status = "welcome_back";
        missedWeeks = 3;
      } else if (member.id === "dd" || member.lastName === "Davis") {
        status = "welcome_back";
        missedWeeks = 4;
      } else if (member.id === "1" || (member.firstName === "Sarah" && member.lastName === "Johnson" && dateStr <= "2026-09-11")) {
        status = "welcome_back";
        missedWeeks = 2;
      } else if (member.lastAttendance) {
        const calculated = calculateMissedWeeksFromDate(member.lastAttendance, serviceDate);
        if (calculated >= 2) {
          status = "welcome_back";
          missedWeeks = calculated;
        }
      }
    }

    // Generate realistic check-in times (e.g. 08:45 AM - 10:15 AM)
    const baseHour = isFriday ? 9 : serviceKey === "sunday_evening" ? 17 : 9;
    const minuteOffset = (index * 7 + 12) % 55;
    const hour = baseHour + (minuteOffset > 40 ? 1 : 0);
    const minute = minuteOffset % 60;
    const displayHour = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? "PM" : "AM";
    const checkInTime = `${displayHour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")} ${ampm}`;

    const methods: Array<"QR Mobile" | "Manual" | "Kiosk"> = [
      "QR Mobile",
      "QR Mobile",
      "QR Mobile",
      "Manual",
      "Kiosk",
    ];
    const method = methods[index % methods.length];

    attendees.push({
      id: `att-${member.id}-${dateStr}`,
      memberId: member.id,
      name: `${member.firstName} ${member.lastName}`,
      avatar: member.avatar,
      email: member.email,
      phone: member.phone,
      ministry: member.ministry || "General",
      group: member.group || "—",
      isVisitor,
      checkInTime,
      method,
      status,
      missedWeeks,
    });
  });

  // Merge live-recorded Welcome Back attendees for this date & service
  const liveWbRecords = getLiveWelcomeBackAttendees(dateStr, serviceKey);
  for (const rec of liveWbRecords) {
    const existing = attendees.find(
      (a) =>
        a.memberId.toLowerCase() === rec.memberId.toLowerCase() ||
        a.name.toLowerCase() === rec.name.toLowerCase()
    );
    if (existing) {
      existing.status = "welcome_back";
      existing.missedWeeks = rec.consecutiveMissedWeeks;
      if (rec.checkInTime) existing.checkInTime = rec.checkInTime;
    } else {
      const mem = members.find(
        (m) =>
          m.id.toLowerCase() === rec.memberId.toLowerCase() ||
          `${m.firstName} ${m.lastName}`.toLowerCase() === rec.name.toLowerCase()
      );
      attendees.push({
        id: `att-wb-${rec.memberId}-${dateStr}`,
        memberId: rec.memberId,
        name: rec.name,
        avatar:
          rec.avatar ||
          mem?.avatar ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(rec.name)}`,
        email:
          rec.email ||
          mem?.email ||
          `${rec.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        phone: rec.phone || mem?.phone || "—",
        ministry: rec.ministry || mem?.ministry || "General",
        group: rec.group || mem?.group || "—",
        isVisitor: false,
        checkInTime: rec.checkInTime || "10:00 AM",
        method: "QR Mobile",
        status: "welcome_back",
        missedWeeks: rec.consecutiveMissedWeeks,
      });
    }
  }

  // Sort: Welcome Back first, then Visitors, then by check-in time
  attendees.sort((a, b) => {
    if (a.status === "welcome_back" && b.status !== "welcome_back") return -1;
    if (b.status === "welcome_back" && a.status !== "welcome_back") return 1;
    if (a.status === "visitor" && b.status !== "visitor") return -1;
    if (b.status === "visitor" && a.status !== "visitor") return 1;
    return a.name.localeCompare(b.name);
  });

  const welcomeBackCount = attendees.filter((a) => a.status === "welcome_back").length;
  const visitorsCount = attendees.filter((a) => a.status === "visitor").length;
  const regularCount = attendees.filter((a) => a.status === "regular").length;

  return {
    attendees,
    totalCount: attendees.length,
    welcomeBackCount,
    visitorsCount,
    regularCount,
  };
}

/**
 * Downloads a formatted CSV file of the roster to the user's browser.
 */
export function exportRosterToCSV(
  attendees: AttendeeRecord[],
  serviceName: string,
  dateStr: string
): void {
  if (typeof window === "undefined") return;

  const headers = [
    "Member ID",
    "Name",
    "Type",
    "Ministry",
    "Group",
    "Check-In Time",
    "Method",
    "Attendance Status",
    "Previous Missed Weeks",
    "Email",
    "Phone",
  ];

  const rows = attendees.map((a) => [
    `"${a.memberId}"`,
    `"${a.name}"`,
    `"${a.isVisitor ? "Visitor" : "Member"}"`,
    `"${a.ministry}"`,
    `"${a.group}"`,
    `"${a.checkInTime}"`,
    `"${a.method}"`,
    `"${a.status === "welcome_back" ? "Welcome Back (Attention)" : a.status === "visitor" ? "First-time Visitor" : "Regular"}"`,
    `"${a.missedWeeks ?? 0}"`,
    `"${a.email}"`,
    `"${a.phone}"`,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const cleanServiceName = serviceName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  link.setAttribute("download", `attendance-roster-${cleanServiceName}-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
