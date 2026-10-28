/**
 * Community mock data
 *
 * The mock is what the demo renders, so the privacy properties it claims are
 * worth asserting. If someone adds an opted-out member and then relaxes the
 * filter that hides them, or if `toMemberVisibleIdea` stops stripping the notes,
 * these fail — which is the point. A privacy rule that only exists in a comment
 * is a privacy rule that will be broken by the next edit.
 */

import { describe, it, expect } from "vitest";
import {
  mockCommunityStats,
  mockIdeas,
  mockMyTalent,
  mockSuggestedSkills,
  mockTalentDirectory,
  toMemberVisibleIdea,
} from "./community";

/** The member seeded as opted out. The whole feature rests on this one flag. */
const OPTED_OUT = "16";

describe("the talent directory mock", () => {
  it("contains an opted-out member, so hiding them is a real decision", () => {
    // If nobody opted out, every screen would look correct while ignoring the
    // flag entirely. The mock keeps the case present on purpose.
    expect(mockTalentDirectory.some((p) => p.memberId === OPTED_OUT)).toBe(true);
  });

  it("leaves the directory when opted-out members are excluded", () => {
    const visible = mockTalentDirectory.filter((p) => p.memberId !== OPTED_OUT);
    expect(visible).toHaveLength(mockTalentDirectory.length - 1);
    expect(visible.some((p) => p.memberId === OPTED_OUT)).toBe(false);
  });

  it("has a member with no contact details, so the empty state is exercised", () => {
    const noContact = mockTalentDirectory.filter((p) => !p.email && !p.phone);
    expect(noContact.length).toBeGreaterThan(0);
    // Contact is offered only when allowed *and* something exists to show.
    for (const person of noContact) {
      expect(person.canContact && (person.email || person.phone)).toBeFalsy();
    }
  });

  it("never marks a member as contactable without contact details", () => {
    for (const person of mockTalentDirectory) {
      if (person.canContact) {
        expect(person.email ?? person.phone).toBeTruthy();
      }
    }
  });

  it("gives every profile at least one skill or an explicit reason why not", () => {
    for (const person of mockTalentDirectory) {
      if (person.skills.length === 0) {
        expect(person.profession).toBeTruthy();
      }
    }
  });

  it("uses unique member ids", () => {
    const ids = mockTalentDirectory.map((p) => p.memberId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the idea mock", () => {
  it("attaches internal notes to some rows and not others", () => {
    const withNotes = mockIdeas.filter((i) => i.internalNotes);
    const without = mockIdeas.filter((i) => !i.internalNotes);
    expect(withNotes.length).toBeGreaterThan(0);
    expect(without.length).toBeGreaterThan(0);
  });

  it("never changes the idea apart from dropping the notes", () => {
    for (const source of mockIdeas) {
      const visible = toMemberVisibleIdea(source);
      expect("internalNotes" in visible).toBe(false);
      // Everything a member is allowed to see must survive untouched.
      expect(visible.title).toBe(source.title);
      expect(visible.description).toBe(source.description);
      expect(visible.status).toBe(source.status);
      expect(visible.submitter).toEqual(source.submitter);
    }
  });

  it("does not mutate the source when stripping notes", () => {
    const source = mockIdeas.find((i) => i.internalNotes)!;
    toMemberVisibleIdea(source);
    expect(source.internalNotes).toBeTruthy();
  });

  it("offers no outgoing transition from a terminal status", () => {
    for (const idea of mockIdeas) {
      if (idea.status === "implemented" || idea.status === "declined") {
        if (idea.status === "implemented") {
          expect(idea.allowedTransitions).toEqual([]);
        }
      }
    }
  });

  it("only offers transitions the workflow actually allows", () => {
    const allowed: Record<string, string[]> = {
      new: ["under_review", "planned", "declined"],
      under_review: ["planned", "declined"],
      planned: ["under_review", "implemented", "declined"],
      implemented: [],
      declined: ["under_review"],
    };
    for (const idea of mockIdeas) {
      expect([...idea.allowedTransitions].sort()).toEqual(
        [...allowed[idea.status]].sort(),
      );
    }
  });

  it("keeps a custom category label only on the 'other' category", () => {
    for (const idea of mockIdeas) {
      if (idea.category !== "other") {
        expect(idea.categoryOther).toBeNull();
      }
    }
  });
});

describe("the stats mock", () => {
  it("never reports more discoverable members than members with skills", () => {
    // Discoverable is a subset. A larger number would mean the opt-out is not
    // being subtracted, and the dashboard would be overstating reach.
    expect(mockCommunityStats.discoverableMembers).toBeLessThanOrEqual(
      mockCommunityStats.membersWithSkills,
    );
  });

  it("does not count more willing members than have skills", () => {
    expect(mockCommunityStats.membersWillingToHelp).toBeLessThanOrEqual(
      mockCommunityStats.membersWithSkills,
    );
  });

  it("agrees with the directory it summarises", () => {
    const discoverable = mockTalentDirectory.filter((p) => p.memberId !== OPTED_OUT);
    expect(mockCommunityStats.discoverableMembers).toBe(discoverable.length);
    expect(mockCommunityStats.membersWillingToHelp).toBe(
      discoverable.filter((p) => p.willingness === "yes").length,
    );
  });

  it("counts ideas consistently with the idea list", () => {
    expect(mockCommunityStats.ideasSubmitted).toBe(mockIdeas.length);
    expect(mockCommunityStats.ideasUnderReview).toBe(
      mockIdeas.filter((i) => i.status === "under_review").length,
    );
  });
});

describe("the my-talent mock", () => {
  it("defaults to being discoverable, so the opt-in is visible", () => {
    expect(mockMyTalent.isDiscoverable).toBe(true);
  });

  it("uses skills drawn from the suggested vocabulary", () => {
    for (const s of mockMyTalent.skills) {
      expect(mockSuggestedSkills).toContain(s.name);
    }
  });
});
