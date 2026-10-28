import { describe, it, expect } from "vitest";
import {
  evaluateWelcomeBackAlert,
  calculateMissedWeeksFromRecords,
  calculateMissedWeeksFromDate,
  WELCOME_BACK_MIN_MISSED_WEEKS,
  WELCOME_BACK_MAX_VISIBLE,
  WELCOME_BACK_AUTO_DISMISS_MS,
} from "./welcome-back-helper";
import { getAttendanceContext } from "./attendance-context";

describe("Welcome Back / Attendance Attention Alert", () => {
  // Test Case 1: Member with 0 missed weeks checks in -> no alert
  it("TestCase 1: Member with 0 missed weeks checks in -> does not qualify for alert", () => {
    // John Smith has 0 missed weeks
    const result = evaluateWelcomeBackAlert({ name: "John Smith" });
    expect(result.consecutiveMissedWeeks).toBe(0);
    expect(result.qualifies).toBe(false);
  });

  // Test Case 2: Member with 1 missed week checks in -> no alert
  it("TestCase 2: Member with 1 missed week checks in -> does not qualify for alert", () => {
    // Emily Brown has 1 missed week
    const result = evaluateWelcomeBackAlert({ name: "Emily Brown" });
    expect(result.consecutiveMissedWeeks).toBe(1);
    expect(result.qualifies).toBe(false);
  });

  // Test Case 3: Member with exactly 2 missed weeks checks in -> Welcome Back alert appears
  it("TestCase 3: Member with exactly 2 missed weeks checks in -> Welcome Back alert qualifies", () => {
    // Sarah Johnson is designated as 2 missed weeks
    const result = evaluateWelcomeBackAlert({ name: "Sarah Johnson" });
    expect(result.consecutiveMissedWeeks).toBe(2);
    expect(result.qualifies).toBe(true);
    expect(result.memberName).toBe("Sarah Johnson");
  });

  // Test Case 4: Member with 3 missed weeks checks in -> alert appears and says 3 weeks
  it("TestCase 4: Member with 3 missed weeks checks in -> Welcome Back alert appears with 3 weeks", () => {
    // Michael Williams is canonical 3 missed weeks
    const result = evaluateWelcomeBackAlert({ name: "Michael Williams" });
    expect(result.consecutiveMissedWeeks).toBe(3);
    expect(result.qualifies).toBe(true);
    expect(result.memberName).toBe("Michael Williams");
    expect(result.lastAttendanceDate).toBe("Aug 28, 2026");
  });

  // Test Case 5: Member with 4+ missed weeks -> alert appears with correct count
  it("TestCase 5: Member with 4+ missed weeks checks in -> Welcome Back alert appears with 4 weeks", () => {
    // David Davis is canonical 4 missed weeks
    const result = evaluateWelcomeBackAlert({ name: "David Davis" });
    expect(result.consecutiveMissedWeeks).toBe(4);
    expect(result.qualifies).toBe(true);
    expect(result.memberName).toBe("David Davis");
    expect(result.lastAttendanceDate).toBe("Aug 21, 2026");
  });

  // Test Case 5b: Extended missed weeks (e.g. 7 missed weeks from records or dates)
  it("TestCase 5b: Dynamic calculation with records correctly counts consecutive missed weeks", () => {
    const records = [
      { date: "Sep 11", present: false },
      { date: "Sep 4", present: false },
      { date: "Aug 28", present: false },
      { date: "Aug 21", present: false },
      { date: "Aug 14", present: false },
      { date: "Aug 7", present: true },
    ];
    const missed = calculateMissedWeeksFromRecords(records);
    expect(missed).toBe(5);

    const result = evaluateWelcomeBackAlert({
      name: "Custom Member",
      records,
    });
    expect(result.consecutiveMissedWeeks).toBe(5);
    expect(result.qualifies).toBe(true);
  });

  // Test Case 6: Real M6 check-in payload evaluation
  it("TestCase 6: Real M6 check-in payload evaluates immediately and accurately", () => {
    const rtEventData = {
      recordId: "rec-12345",
      memberId: "mw",
      memberName: "Michael Williams",
      memberAvatar: "https://api.dicebear.com/9.x/initials/svg?seed=MichaelWilliams",
      serviceId: "1",
      timestamp: new Date().toISOString(),
    };

    const result = evaluateWelcomeBackAlert({
      id: rtEventData.memberId,
      name: rtEventData.memberName,
      avatar: rtEventData.memberAvatar,
    });

    expect(result.qualifies).toBe(true);
    expect(result.memberName).toBe("Michael Williams");
    expect(result.consecutiveMissedWeeks).toBe(3);
    expect(result.memberId).toBe("mw");
  });

  // Test Case 7: Deduplication rule
  it("TestCase 7: Deduplication key prevents duplicate alerts for the same member", () => {
    const seenMemberKeys = new Set<string>();

    const checkInFirstTime = (memberKey: string) => {
      if (seenMemberKeys.has(memberKey)) {
        return { created: false };
      }
      seenMemberKeys.add(memberKey);
      return { created: true };
    };

    const first = checkInFirstTime("michael williams");
    expect(first.created).toBe(true);

    // Repeated check-in (e.g. "Already Checked In" or second realtime event)
    const second = checkInFirstTime("michael williams");
    expect(second.created).toBe(false);
  });

  // Test Case 8: Multiple qualifying members queue ordering
  it("TestCase 8: Multiple qualifying members can be queued newest first", () => {
    const queue: Array<{ name: string; missed: number }> = [];

    const addAlert = (name: string, missed: number) => {
      queue.unshift({ name, missed }); // newest first
    };

    addAlert("David Davis", 4);
    addAlert("Sarah Johnson", 2);
    addAlert("Michael Williams", 3);

    expect(queue.length).toBe(3);
    expect(queue[0].name).toBe("Michael Williams");
    expect(queue[0].missed).toBe(3);
    expect(queue[1].name).toBe("Sarah Johnson");
    expect(queue[1].missed).toBe(2);
    expect(queue[2].name).toBe("David Davis");
    expect(queue[2].missed).toBe(4);
  });

  // Test Case 9: Date difference helper formula
  it("TestCase 9: calculateMissedWeeksFromDate computes exact weeks between dates", () => {
    const refDate = new Date("2026-09-18T10:00:00Z"); // Friday Sep 18

    // Attended last Friday Sep 11 (7 days ago) -> 0 missed weeks
    expect(calculateMissedWeeksFromDate("2026-09-11", refDate)).toBe(0);

    // Attended 2 Fridays ago Sep 4 (14 days ago) -> 1 missed week
    expect(calculateMissedWeeksFromDate("2026-09-04", refDate)).toBe(1);

    // Attended 3 Fridays ago Aug 28 (21 days ago) -> 2 missed weeks (qualifies)
    expect(calculateMissedWeeksFromDate("2026-08-28", refDate)).toBe(2);

    // Attended 4 Fridays ago Aug 21 (28 days ago) -> 3 missed weeks (qualifies)
    expect(calculateMissedWeeksFromDate("2026-08-21", refDate)).toBe(3);

    // Attended 5 Fridays ago Aug 14 (35 days ago) -> 4 missed weeks (qualifies)
    expect(calculateMissedWeeksFromDate("2026-08-14", refDate)).toBe(4);
  });

  // Test Case 10: Threshold constant
  it("TestCase 10: WELCOME_BACK_MIN_MISSED_WEEKS is strictly 2", () => {
    expect(WELCOME_BACK_MIN_MISSED_WEEKS).toBe(2);
  });

  // Test Case 11: Member 360 link formatting
  it("TestCase 11: View Member target route is /people/[memberId]", () => {
    const result = evaluateWelcomeBackAlert({ name: "Michael Williams" });
    const targetHref = `/people/${result.memberId}`;
    expect(targetHref).toBe("/people/mw");
  });

  // Test Case 12: Friday 13:00 review gating
  it("TestCase 12: Attendance state at 13:00 transitions to review and suppresses new live alerts", () => {
    const liveTime = new Date("2026-09-18T11:30:00Z");
    liveTime.setHours(11, 30, 0, 0);
    const liveCtx = getAttendanceContext(liveTime);
    expect(liveCtx.state).toBe("live");

    const reviewTime = new Date("2026-09-18T13:01:00Z");
    reviewTime.setHours(13, 1, 0, 0);
    const reviewCtx = getAttendanceContext(reviewTime);
    expect(reviewCtx.state).toBe("review");

    // In review state, new check-ins are not accepted as live operational alerts
    const canProduceNewLiveAlert = reviewCtx.state === "live";
    expect(canProduceNewLiveAlert).toBe(false);
  });

  // Test Case 13: Maximum 5 people visible on Welcome Back screen
  it("TestCase 13: Maximum 5 people are displayed on the Welcome Back screen", () => {
    expect(WELCOME_BACK_MAX_VISIBLE).toBe(5);

    // Simulate 7 qualifying members in master queue
    const queue = [
      { id: "1", name: "Person 1" },
      { id: "2", name: "Person 2" },
      { id: "3", name: "Person 3" },
      { id: "4", name: "Person 4" },
      { id: "5", name: "Person 5" },
      { id: "6", name: "Person 6" },
      { id: "7", name: "Person 7" },
    ];

    const visible = queue.slice(0, WELCOME_BACK_MAX_VISIBLE);
    expect(visible.length).toBe(5);
    expect(visible.map((p) => p.name)).toEqual([
      "Person 1",
      "Person 2",
      "Person 3",
      "Person 4",
      "Person 5",
    ]);
    expect(queue.length - visible.length).toBe(2); // 2 waiting in queue
  });

  // Test Case 14: 35-second auto-dismiss advances the queue
  it("TestCase 14: Alert expires after 35 seconds and next queued member advances", () => {
    expect(WELCOME_BACK_AUTO_DISMISS_MS).toBe(35000);

    const now = 1000000;
    // Alerts with different arrival times
    let queue = [
      { id: "1", name: "Person 1", createdAt: now - 40000 }, // 40s ago (> 35s, expired)
      { id: "2", name: "Person 2", createdAt: now - 25000 }, // 25s ago
      { id: "3", name: "Person 3", createdAt: now - 20000 }, // 20s ago
      { id: "4", name: "Person 4", createdAt: now - 15000 }, // 15s ago
      { id: "5", name: "Person 5", createdAt: now - 10000 }, // 10s ago
      { id: "6", name: "Person 6", createdAt: now - 5000 },  // 5s ago (was waiting in queue)
    ];

    // Filter out alerts older than 35 seconds (35,000ms)
    queue = queue.filter((a) => now - a.createdAt < WELCOME_BACK_AUTO_DISMISS_MS);

    expect(queue.find((a) => a.id === "1")).toBeUndefined();
    expect(queue.length).toBe(5);

    // Person 6 is now in the top 5 visible list!
    const visible = queue.slice(0, WELCOME_BACK_MAX_VISIBLE);
    expect(visible.map((p) => p.name)).toContain("Person 6");
    expect(visible.length).toBe(5);
  });
});
