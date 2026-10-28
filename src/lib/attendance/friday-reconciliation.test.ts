import { describe, it, expect } from "vitest";
import {
  getMissingToday,
  getMissingPersonById,
  getOpenFollowUpForName,
  computeReconciliation,
  getTriageStatus,
  matchesStatusFilter,
  filterMissingPeople,
  getMinistryOptions,
  getGroupOptions,
  type MissingTriageStatus,
} from "./friday-reconciliation";
import { getLiveOperations } from "@/lib/mock-data/live-operations";

const statuses = (entries: Record<string, MissingTriageStatus>) => entries;

describe("Friday reconciliation — Missing Today roster", () => {
  it("reconciles exactly with the M2 missing count (57)", () => {
    expect(getMissingToday()).toHaveLength(getLiveOperations().missing);
    expect(getMissingToday()).toHaveLength(57);
  });

  it("is deterministic across calls", () => {
    expect(getMissingToday()).toEqual(getMissingToday());
  });

  it("produces unique ids and fully-populated observable fields", () => {
    const roster = getMissingToday();
    const ids = new Set(roster.map((p) => p.id));
    expect(ids.size).toBe(roster.length);
    for (const person of roster) {
      expect(person.name.trim().length).toBeGreaterThan(0);
      expect(person.ministry.trim().length).toBeGreaterThan(0);
      expect(person.group.trim().length).toBeGreaterThan(0);
      expect(person.lastAttendance.trim().length).toBeGreaterThan(0);
      expect(person.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(person.attendanceRate).toBeLessThanOrEqual(100);
      expect(person.consecutiveAbsences).toBeGreaterThanOrEqual(1);
    }
  });

  it("links some missing people to the existing Member 360 records", () => {
    const linked = getMissingToday().filter((p) => p.memberId !== null);
    expect(linked.length).toBeGreaterThan(0);
    expect(getMissingPersonById(linked[0].id)?.memberId).toBe(linked[0].memberId);
  });

  it("exposes ministry and group filter options", () => {
    expect(getMinistryOptions(getMissingToday()).length).toBeGreaterThan(1);
    expect(getGroupOptions(getMissingToday()).length).toBeGreaterThan(1);
  });
});

describe("Friday reconciliation — summary", () => {
  it("matches the M1/M2 baseline when nothing is triaged", () => {
    const summary = computeReconciliation();
    expect(summary.present).toBe(363);
    expect(summary.expected).toBe(420);
    expect(summary.missing).toBe(57);
    expect(summary.attendanceRate).toBe(86.4);
    expect(summary.excused).toBe(0);
    expect(summary.notExpected).toBe(0);
    expect(summary.followUpNeeded).toBe(0);
  });

  it("keeps present + missing - excused - notExpected mathematically consistent", () => {
    const roster = getMissingToday();
    const summary = computeReconciliation({
      [roster[0].id]: "excused",
      [roster[1].id]: "not-expected",
      [roster[2].id]: "follow-up",
    });
    expect(summary.excused).toBe(1);
    expect(summary.notExpected).toBe(1);
    expect(summary.followUpNeeded).toBe(1);
    expect(summary.expected).toBe(419);
    expect(summary.missing).toBe(57 - 1 - 1);
  });

  it("removes excused people from the unresolved missing count", () => {
    const roster = getMissingToday();
    const summary = computeReconciliation({ [roster[0].id]: "excused" });
    expect(summary.missing).toBe(56);
    expect(summary.excused).toBe(1);
    expect(summary.expected).toBe(420);
  });

  it("keeps follow-up-needed people in the missing count", () => {
    const roster = getMissingToday();
    const summary = computeReconciliation({ [roster[0].id]: "follow-up" });
    expect(summary.missing).toBe(57);
    expect(summary.followUpNeeded).toBe(1);
  });
});

describe("Friday reconciliation — existing follow-up protection", () => {
  it("returns an existing open follow-up for a known person", () => {
    expect(getOpenFollowUpForName("Sarah Johnson")?.person).toBe("Sarah Johnson");
    expect(getOpenFollowUpForName("James Anderson")?.status).toBe("in-progress");
  });

  it("does not return completed follow-ups as open", () => {
    // Lisa Martinez has only a completed follow-up in the mock data.
    expect(getOpenFollowUpForName("Lisa Martinez")).toBeUndefined();
  });

  it("returns undefined for people without follow-ups", () => {
    expect(getOpenFollowUpForName("No Such Person")).toBeUndefined();
  });
});

describe("Friday reconciliation — filters", () => {
  it("maps the Missing filter to unresolved statuses", () => {
    expect(matchesStatusFilter("missing", "missing")).toBe(true);
    expect(matchesStatusFilter("follow-up", "missing")).toBe(true);
    expect(matchesStatusFilter("excused", "missing")).toBe(false);
  });

  it("filters by status, ministry, group and search", () => {
    const roster = getMissingToday();
    const first = roster[0];
    const excused = filterMissingPeople(roster, statuses({ [first.id]: "excused" }), {
      status: "excused",
      ministry: "all",
      group: "all",
      search: "",
    });
    expect(excused).toEqual([first]);

    const byMinistry = filterMissingPeople(roster, {}, {
      status: "all",
      ministry: first.ministry,
      group: "all",
      search: "",
    });
    expect(byMinistry.every((p) => p.ministry === first.ministry)).toBe(true);

    const bySearch = filterMissingPeople(roster, {}, {
      status: "all",
      ministry: "all",
      group: "all",
      search: first.name.split(" ")[0],
    });
    expect(bySearch.some((p) => p.id === first.id)).toBe(true);
  });

  it("defaults unknown people to the missing status", () => {
    expect(getTriageStatus({}, "nobody")).toBe("missing");
  });
});
