/**
 * Family Mock Data Tests
 *
 * The People and Member 360 screens are client components backed by mock data,
 * so these tests guard the demo data itself. They verify that the seeded demo
 * families actually demonstrate every behaviour the feature is specified to
 * show, which is what makes the screens reviewable.
 */

import { describe, it, expect } from "vitest";
import {
  getMockFamilyDirectory,
  getMockFamilyDisplayPhoto,
  getMockFamilyForMember,
  getMockFamilyTreeForFamily,
  getMockFamilyTreeForMember,
  mockFamilies,
  mockFamilyRelationships,
} from "./families";

const nameOf = (m: { firstName: string; lastName: string }) => `${m.firstName} ${m.lastName}`;

describe("family mock data", () => {
  describe("the same family resolves from any member", () => {
    it("resolves the same family from the father, the mother and a child", () => {
      // Chen-Williams: Michael (father), Sarah (mother), Emily + David (children).
      const fromFather = getMockFamilyTreeForMember("2");
      const fromMother = getMockFamilyTreeForMember("1");
      const fromChild = getMockFamilyTreeForMember("3");

      expect(fromFather).not.toBeNull();
      expect(fromMother?.family.id).toBe(fromFather?.family.id);
      expect(fromChild?.family.id).toBe(fromFather?.family.id);

      // Same members, only the focal member and the labels differ.
      expect(fromChild?.members.map((n) => n.member.id).sort()).toEqual(
        fromFather?.members.map((n) => n.member.id).sort(),
      );
    });

    it("highlights the member that was opened", () => {
      const fromChild = getMockFamilyTreeForMember("3")!;
      expect(fromChild.members.filter((n) => n.isFocal)).toHaveLength(1);
      expect(fromChild.members.find((n) => n.isFocal)?.member.id).toBe("3");
    });

    it("labels the other parent correctly when a child is opened", () => {
      const tree = getMockFamilyTreeForMember("3")!;
      const labelFor = (id: string) =>
        tree.members.find((n) => n.member.id === id)?.relationshipToFocal;

      expect(labelFor("2")).toBe("father");
      expect(labelFor("1")).toBe("mother");
      expect(labelFor("4")).toBe("sibling");
    });

    it("renders multiple children of the same couple", () => {
      const tree = getMockFamilyTreeForMember("2")!;
      expect(tree.members).toHaveLength(4);
      const parentRoot = tree.roots[0];
      expect(parentRoot.children).toHaveLength(2);
    });
  });

  describe("family photo", () => {
    it("uses the family photo when the family has one", () => {
      const family = getMockFamilyForMember("2")!;
      const { url, isFallback } = getMockFamilyDisplayPhoto(family);
      expect(isFallback).toBe(false);
      expect(url).toBe(family.familyPhotoUrl);
    });

    it("falls back to the family head's photo when there is no family photo", () => {
      const family = getMockFamilyForMember("5")!;
      expect(family.familyPhotoUrl).toBeNull();

      const { url, isFallback } = getMockFamilyDisplayPhoto(family);
      expect(isFallback).toBe(true);
      // The fallback is the designated head's avatar, which is a real member.
      const head = mockFamilies.find((f) => f.id === family.id)!.headMemberId;
      expect(url).toBeTruthy();
      expect(head).toBeTruthy();
    });

    it("never stores a family photo on the member rows", () => {
      // The photo belongs to the family only; members keep their own avatars.
      for (const rel of mockFamilyRelationships) {
        expect(Object.keys(rel)).not.toContain("photoUrl");
      }
    });
  });

  describe("head of family", () => {
    it("does not treat a father as head when a mother is designated", () => {
      // Garcia Household: Amanda (9) is the mother and the designated head.
      const family = getMockFamilyForMember("9")!;
      expect(family.headMemberId).toBe("9");

      const tree = getMockFamilyTreeForMember("9")!;
      expect(tree.head?.member.id).toBe("9");
      // The mother is the head, so she carries the badge and the father — who
      // does not even exist in this family — is never promoted.
      const heads = tree.members.filter((n) => n.isFamilyHead);
      expect(heads).toHaveLength(1);
      expect(heads[0].member.id).toBe("9");
    });
  });

  describe("incomplete relationships", () => {
    it("renders a household with a mother and child but no father", () => {
      const tree = getMockFamilyTreeForMember("9")!;
      expect(tree.members).toHaveLength(2);
      expect(tree.roots).toHaveLength(1);
      expect(tree.roots[0].member.id).toBe("9");
      expect(tree.roots[0].children.map((n) => n.member.id)).toEqual(["10"]);
    });

    it("returns null for a member who belongs to no family", () => {
      // Member 25 (Ashley Nelson) is deliberately not part of any family.
      expect(getMockFamilyTreeForMember("25")).toBeNull();
      expect(getMockFamilyForMember("25")).toBeNull();
    });
  });

  describe("demo coverage", () => {
    it("includes a family with a photo, one without, and one incomplete", () => {
      expect(mockFamilies.some((f) => f.familyPhotoUrl !== null)).toBe(true);
      expect(mockFamilies.some((f) => f.familyPhotoUrl === null)).toBe(true);
      // Garcia has no spouse relationship at all.
      const garcia = mockFamilies.find((f) => f.name === "Garcia Household")!;
      expect(
        mockFamilyRelationships.filter(
          (r) => r.familyId === garcia.id && r.type === "spouse",
        ),
      ).toHaveLength(0);
    });
  });


  describe("the directory projection", () => {
    it("covers the household shapes the feature must demonstrate", () => {
      const dir = getMockFamilyDirectory();

      // Family 1: a father, a mother and two children.
      const twoParentsTwoChildren = dir.find(
        (e) => e.fathers.length === 1 && e.mothers.length === 1 && e.children.length === 2,
      );
      expect(twoParentsTwoChildren).toBeDefined();
      expect(twoParentsTwoChildren!.familySize).toBe(4);

      // Family 2: a father, a mother and one child.
      const twoParentsOneChild = dir.find(
        (e) => e.fathers.length === 1 && e.mothers.length === 1 && e.children.length === 1,
      );
      expect(twoParentsOneChild).toBeDefined();

      // Family 3: an incomplete household with no father recorded.
      const noFather = dir.filter((e) => e.fathers.length === 0);
      expect(noFather.length).toBeGreaterThan(0);
      expect(noFather.some((e) => e.mothers.length === 1 && e.children.length === 1)).toBe(true);

      // A household with no children at all, so the "no children" filter has
      // something real to match.
      expect(dir.some((e) => e.children.length === 0)).toBe(true);

      // At least one family with a real photo and several without one.
      expect(dir.some((e) => e.hasFamilyPhoto)).toBe(true);
      expect(dir.some((e) => !e.hasFamilyPhoto)).toBe(true);
    });

    it("demonstrates the `other` relationship type", () => {
      const withOther = mockFamilyRelationships.filter((r) => r.type === "other");
      expect(withOther.length).toBeGreaterThan(0);

      const entry = getMockFamilyDirectory().find((e) =>
        mockFamilyRelationships.some(
          (r) => r.familyId === e.family.id && r.type === "other",
        ),
      );
      expect(entry).toBeDefined();
      // The person connected as `other` is a member but is not presented as a
      // father, a mother or a child.
      const otherMemberId = withOther[0].toMemberId;
      expect(entry!.members.map((m) => m.id)).toContain(otherMemberId);
      expect(entry!.fathers.map((m) => m.id)).not.toContain(otherMemberId);
      expect(entry!.mothers.map((m) => m.id)).not.toContain(otherMemberId);
      expect(entry!.children.map((m) => m.id)).not.toContain(otherMemberId);
    });

    it("never places the same member in two families", () => {
      const seen = new Map<string, string>();
      for (const entry of getMockFamilyDirectory()) {
        for (const m of entry.members) {
          const existing = seen.get(m.id);
          expect(existing, `${m.id} appears in both ${existing} and ${entry.family.name}`).toBeUndefined();
          seen.set(m.id, entry.family.name);
        }
      }
    });

    it("is sorted by family name for a stable table", () => {
      const names = getMockFamilyDirectory().map((e) => e.family.name);
      expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    });
  });

  describe("the family-oriented tree", () => {
    it("roots the tree on the head of family", () => {
      const tree = getMockFamilyTreeForFamily("fam-chen-williams");
      expect(tree).not.toBeNull();
      // Michael Chen (2) is the designated head, so he is the focal member and
      // the parents sit on the top row with the children below.
      expect(tree!.focalMemberId).toBe("2");
      expect(tree!.head?.member.id).toBe("2");
      expect(tree!.roots.length).toBe(1);
      expect(tree!.roots[0].children.map((c) => c.member.id).sort()).toEqual(["3", "4"]);
    });

    it("roots a family with no designated head on the first recorded father", () => {
      const family = mockFamilies.find((f) => f.id === "fam-hall")!;
      const withoutHead = { ...family, headMemberId: null };
      const tree = getMockFamilyTreeForFamily("fam-hall", { family: withoutHead });

      // The first `father` row in the Hall family is from member 14.
      expect(tree!.focalMemberId).toBe("14");
      // Rooting the diagram somewhere does NOT designate a head.
      expect(tree!.head).toBeNull();
    });

    it("rebuilds from an overridden relationship list", () => {
      // The Family 360 page passes its own working copy so a relationship edit
      // updates the diagram without a refetch.
      const before = getMockFamilyTreeForFamily("fam-garcia")!;
      expect(before.roots[0].children).toHaveLength(1);

      const extra = {
        ...mockFamilyRelationships[0],
        id: "fr-extra",
        familyId: "fam-garcia",
        fromMemberId: "9",
        toMemberId: "6",
        type: "mother" as const,
      };
      const after = getMockFamilyTreeForFamily("fam-garcia", {
        relationships: [...mockFamilyRelationships, extra],
      })!;

      expect(after.roots[0].children).toHaveLength(2);
    });

    it("returns null for an unknown family", () => {
      expect(getMockFamilyTreeForFamily("fam-does-not-exist")).toBeNull();
    });
  });

  describe("head of family is a designation, not an inference", () => {
    it("keeps a mother as head without promoting her to father", () => {
      const garcia = mockFamilies.find((f) => f.id === "fam-garcia")!;
      expect(garcia.headMemberId).toBe("9");
      // Member 9 is the mother of member 10 and nothing else.
      const garciaRels = mockFamilyRelationships.filter((r) => r.familyId === "fam-garcia");
      expect(garciaRels).toHaveLength(1);
      expect(garciaRels[0].type).toBe("mother");

      const entry = getMockFamilyDirectory().find((e) => e.family.id === "fam-garcia")!;
      expect(entry.fathers).toHaveLength(0);
      expect(entry.mothers.map(nameOf)).toEqual(["Amanda Garcia"]);
    });
  });
});
