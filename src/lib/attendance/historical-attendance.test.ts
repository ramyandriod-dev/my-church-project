import { describe, it, expect } from "vitest";
import {
  getServiceRoster,
  PRESET_SERVICES,
} from "./historical-attendance";

describe("Historical Attendance Records & Attendee Roster", () => {
  it("provides predefined canonical services for past Fridays and Sundays", () => {
    expect(PRESET_SERVICES.length).toBeGreaterThanOrEqual(4);
    const fridaySep11 = PRESET_SERVICES.find((s) => s.dateStr === "2026-09-11");
    expect(fridaySep11).toBeDefined();
    expect(fridaySep11?.dayOfWeek).toBe("friday");
  });

  it("generates attendee roster for a past Friday with Welcome Back attention flags", () => {
    const result = getServiceRoster("2026-09-11", "friday_morning");
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.welcomeBackCount).toBeGreaterThan(0);

    // Michael Williams should have Welcome Back flag
    const michael = result.attendees.find((a) => a.name.includes("Michael Williams"));
    expect(michael).toBeDefined();
    expect(michael?.status).toBe("welcome_back");
    expect(michael?.missedWeeks).toBe(3);
  });

  it("correctly distinguishes visitors from regular members", () => {
    const result = getServiceRoster("2026-09-13", "sunday_morning");
    expect(result.visitorsCount).toBeGreaterThan(0);
    const visitor = result.attendees.find((a) => a.isVisitor);
    expect(visitor).toBeDefined();
    expect(visitor?.status).toBe("visitor");
  });

  it("sorts Welcome Back attendees at the top of the roster", () => {
    const result = getServiceRoster("2026-09-11", "friday_morning");
    const firstAttendee = result.attendees[0];
    expect(firstAttendee.status).toBe("welcome_back");
  });

  it("updates service roster when a Welcome Back member appears live and keeps them for management", async () => {
    const { recordLiveWelcomeBackAttendee, clearLiveWelcomeBackAttendees } = await import(
      "./live-welcome-back-store"
    );

    clearLiveWelcomeBackAttendees("2026-09-18");

    // Record an arriving member who triggered Welcome Back live
    recordLiveWelcomeBackAttendee({
      memberId: "3",
      name: "Emily Williams",
      consecutiveMissedWeeks: 3,
      lastAttendanceDate: "Aug 28, 2026",
      checkInTime: "10:14 AM",
      serviceDateStr: "2026-09-18",
      serviceKey: "friday_morning",
      recordedAt: Date.now(),
    });

    const roster = getServiceRoster("2026-09-18", "friday_morning");
    const emily = roster.attendees.find((a) => a.memberId === "3");

    expect(emily).toBeDefined();
    expect(emily?.status).toBe("welcome_back");
    expect(emily?.missedWeeks).toBe(3);
    expect(emily?.checkInTime).toBe("10:14 AM");
    expect(roster.welcomeBackCount).toBeGreaterThanOrEqual(1);

    // Clean up
    clearLiveWelcomeBackAttendees("2026-09-18");
  });
});
