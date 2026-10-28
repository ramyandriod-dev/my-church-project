/**
 * Family Tree Builder Tests
 *
 * The tree builder is pure, so these tests exercise real production logic
 * with no mocks. They cover the behaviours the feature is specified around:
 * the same family from any member, correct orientation, head-of-family
 * handling, photo fallback, and partial/incomplete data.
 */

import { describe, it, expect } from "vitest";
import { buildFamilyTree } from "./family-tree";
import type { Family, FamilyMember, FamilyRelationship, FamilyTree } from "../backend/types";

const TENANT = "tenant-1";

function member(id: string, firstName: string, lastName: string): FamilyMember {
  return {
    id,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}@example.com`,
    avatarUrl: `https://example.com/${id}.jpg`,
    status: "active",
  };
}

function family(overrides: Partial<Family> = {}): Family {
  return {
    id: "fam-1",
    tenantId: TENANT,
    name: "Test Family",
    familyPhotoUrl: null,
    headMemberId: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

let relId = 0;
function rel(
  familyId: string,
  fromMemberId: string,
  toMemberId: string,
  type: FamilyRelationship["type"],
): FamilyRelationship {
  relId += 1;
  return {
    id: `rel-${relId}`,
    tenantId: TENANT,
    familyId,
    fromMemberId,
    toMemberId,
    type,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

/** Two parents with two children — the canonical demo shape. */
const nuclearMembers = [
  member("f", "Frank", "Miller"),
  member("m", "Fiona", "Miller"),
  member("c1", "Chris", "Miller"),
  member("c2", "Casey", "Miller"),
];

const nuclearRelationships = [
  rel("fam-1", "f", "m", "spouse"),
  rel("fam-1", "f", "c1", "father"),
  rel("fam-1", "m", "c1", "mother"),
  rel("fam-1", "f", "c2", "father"),
  rel("fam-1", "m", "c2", "mother"),
];

function byId(tree: ReturnType<typeof buildFamilyTree>, id: string) {
  return tree.members.find((n) => n.member.id === id);
}

describe("buildFamilyTree", () => {
  describe("the same family resolves from any member", () => {
    it("returns the same family when opened from the father", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f" }),
        focalMemberId: "f",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      expect(tree.family.id).toBe("fam-1");
      expect(tree.focalMemberId).toBe("f");
      expect(tree.members).toHaveLength(4);
      expect(byId(tree, "f")?.isFocal).toBe(true);
    });

    it("returns the same family when opened from the mother", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f" }),
        focalMemberId: "m",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      expect(tree.family.id).toBe("fam-1");
      expect(tree.members).toHaveLength(4);
      expect(byId(tree, "m")?.isFocal).toBe(true);
    });

    it("returns the same family when opened from a child", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f" }),
        focalMemberId: "c1",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      expect(tree.family.id).toBe("fam-1");
      expect(tree.members).toHaveLength(4);
      expect(byId(tree, "c1")?.isFocal).toBe(true);
    });

    it("produces an identical node set regardless of which member is focal", () => {
      const build = (focal: string) =>
        buildFamilyTree({
          family: family({ headMemberId: "f" }),
          focalMemberId: focal,
          members: nuclearMembers,
          relationships: nuclearRelationships,
        }).members.map((n) => n.member.id);

      const fromFather = build("f");
      expect(build("m")).toEqual(fromFather);
      expect(build("c1")).toEqual(fromFather);
      expect(build("c2")).toEqual(fromFather);
    });
  });

  describe("relationship labels are relative to the opened member", () => {
    it("labels the other parent correctly from a father", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f" }),
        focalMemberId: "f",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      expect(byId(tree, "m")?.relationshipToFocal).toBe("spouse");
      expect(byId(tree, "c1")?.relationshipToFocal).toBe("child");
      expect(byId(tree, "c2")?.relationshipToFocal).toBe("child");
    });

    it("labels the other parent correctly from a child", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f" }),
        focalMemberId: "c1",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      // The father relation is read off the stored role, not inferred.
      expect(byId(tree, "f")?.relationshipToFocal).toBe("father");
      expect(byId(tree, "m")?.relationshipToFocal).toBe("mother");
      expect(byId(tree, "c2")?.relationshipToFocal).toBe("sibling");
    });

    it("labels a guardian using the stored role", () => {
      const tree = buildFamilyTree({
        family: family(),
        focalMemberId: "c1",
        members: [member("g", "Gus", "Guardian"), member("c1", "Chris", "Miller")],
        relationships: [rel("fam-1", "g", "c1", "guardian")],
      });

      expect(byId(tree, "g")?.relationshipToFocal).toBe("guardian");
    });

    it("labels extended relatives as grandparents and grandchildren", () => {
      const members = [
        member("gf", "George", "Sr"),
        member("gm", "Grace", "Sr"),
        member("f", "Frank", "Miller"),
        member("c1", "Chris", "Miller"),
        member("gc", "Casey", "Junior"),
      ];
      const relationships = [
        rel("fam-1", "gf", "gm", "spouse"),
        rel("fam-1", "gf", "f", "father"),
        rel("fam-1", "gm", "f", "mother"),
        rel("fam-1", "f", "c1", "father"),
        rel("fam-1", "c1", "gc", "father"),
      ];

      const fromChild = buildFamilyTree({
        family: family(),
        focalMemberId: "c1",
        members,
        relationships,
      });
      expect(byId(fromChild, "gf")?.relationshipToFocal).toBe("grandparent");
      expect(byId(fromChild, "gm")?.relationshipToFocal).toBe("grandparent");
      expect(byId(fromChild, "gc")?.relationshipToFocal).toBe("child");

      const fromGrandparent = buildFamilyTree({
        family: family(),
        focalMemberId: "gf",
        members,
        relationships,
      });
      expect(byId(fromGrandparent, "c1")?.relationshipToFocal).toBe("grandchild");
    });
  });

  describe("structure", () => {
    it("places parents at the root and children beneath them", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f" }),
        focalMemberId: "c1",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      const rootIds = tree.roots.map((n) => n.member.id);
      expect(rootIds).not.toContain("c1");
      expect(rootIds).not.toContain("c2");

      // The couple is emitted as a single unit: one root, the partner reached
      // through the spouse link, never both as separate roots.
      expect(rootIds.filter((id) => id === "f" || id === "m")).toHaveLength(1);

      const parentRoot = tree.roots[0];
      expect(["f", "m"]).toContain(parentRoot.member.id);
      expect(parentRoot.spouse?.member.id).toBe(parentRoot.member.id === "f" ? "m" : "f");

      expect(parentRoot.children.map((n) => n.member.id).sort()).toEqual(["c1", "c2"]);
    });

    it("produces a tree that JSON.stringify can serialize, spouse link included", () => {
      // The couple's partner is reached through `spouse`, and each side used to
      // point back at the other using the very same cached objects — a cycle.
      // Every endpoint that serves this tree answers JSON, so a cycle is not a
      // styling quirk: it is a 500 on the wire and an empty family panel.
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f" }),
        focalMemberId: "c1",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      let serialized: string | undefined;
      expect(() => {
        serialized = JSON.stringify(tree);
      }).not.toThrow();

      const roundTripped = JSON.parse(serialized!) as FamilyTree;
      const root = roundTripped.roots[0];
      expect(root.spouse?.member.id).toBe(root.member.id === "f" ? "m" : "f");
      expect(roundTripped.roots[0].children.map((n) => n.member.id).sort()).toEqual(["c1", "c2"]);
    });

    it("renders multiple children of the same couple exactly once each", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f" }),
        focalMemberId: "f",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      const parentRoot = tree.roots[0];
      expect(parentRoot.children).toHaveLength(2);
      expect(tree.members.filter((n) => n.relationshipToFocal === "child")).toHaveLength(2);
    });

    it("does not duplicate a child when both parents are recorded but they are not spouses", () => {
      // The church never recorded a spouse row, but both are parents.
      const members = [
        member("f", "Frank", "Miller"),
        member("m", "Fiona", "Miller"),
        member("c1", "Chris", "Miller"),
      ];
      const relationships = [
        rel("fam-1", "f", "c1", "father"),
        rel("fam-1", "m", "c1", "mother"),
      ];

      const tree = buildFamilyTree({ family: family(), focalMemberId: "c1", members, relationships });

      expect(tree.members).toHaveLength(3);
      const father = tree.roots.find((n) => n.member.id === "f")!;
      expect(father.children.map((n) => n.member.id)).toEqual(["c1"]);
    });

    it("is deterministic across repeated builds", () => {
      const run = () =>
        buildFamilyTree({
          family: family({ headMemberId: "f" }),
          focalMemberId: "c1",
          members: nuclearMembers,
          relationships: nuclearRelationships,
        }).members.map((n) => `${n.member.id}:${n.relationshipToFocal}`);

      expect(run()).toEqual(run());
    });
  });

  describe("head of family", () => {
    it("marks only the explicitly designated head", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f" }),
        focalMemberId: "m",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      expect(tree.head?.member.id).toBe("f");
      expect(byId(tree, "f")?.isFamilyHead).toBe(true);
      expect(byId(tree, "m")?.isFamilyHead).toBe(false);
    });

    it("does not treat a father as head when a different member is designated", () => {
      // The father is a father, but the mother is the designated head.
      const tree = buildFamilyTree({
        family: family({ headMemberId: "m" }),
        focalMemberId: "f",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      expect(tree.head?.member.id).toBe("m");
      expect(byId(tree, "f")?.isFamilyHead).toBe(false);
    });

    it("designates nobody when no head is set", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: null }),
        focalMemberId: "f",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      expect(tree.head).toBeNull();
      expect(tree.members.every((n) => !n.isFamilyHead)).toBe(true);
    });
  });

  describe("family photo", () => {
    it("uses the family photo when one exists", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f", familyPhotoUrl: "https://example.com/family.jpg" }),
        focalMemberId: "c1",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      expect(tree.displayPhotoUrl).toBe("https://example.com/family.jpg");
      expect(tree.isPhotoFallback).toBe(false);
    });

    it("falls back to the head member's avatar when there is no family photo", () => {
      const tree = buildFamilyTree({
        family: family({ headMemberId: "f", familyPhotoUrl: null }),
        focalMemberId: "c1",
        members: nuclearMembers,
        relationships: nuclearRelationships,
      });

      expect(tree.displayPhotoUrl).toBe("https://example.com/f.jpg");
      expect(tree.isPhotoFallback).toBe(true);
    });

    it("has no photo at all when neither the family nor a head has one", () => {
      const members = [
        { ...member("solo", "Sam", "Solo"), avatarUrl: null },
      ];
      const tree = buildFamilyTree({
        family: family({ headMemberId: null, familyPhotoUrl: null }),
        focalMemberId: "solo",
        members,
        relationships: [],
      });

      expect(tree.displayPhotoUrl).toBeNull();
      expect(tree.isPhotoFallback).toBe(false);
    });
  });

  describe("incomplete and inconsistent data", () => {
    it("renders a single parent and child with no spouse recorded", () => {
      const members = [member("m", "Fiona", "Miller"), member("c1", "Chris", "Miller")];
      const tree = buildFamilyTree({
        family: family({ headMemberId: "m" }),
        focalMemberId: "c1",
        members,
        relationships: [rel("fam-1", "m", "c1", "mother")],
      });

      expect(tree.members).toHaveLength(2);
      expect(tree.roots.map((n) => n.member.id)).toEqual(["m"]);
      expect(byId(tree, "m")?.relationshipToFocal).toBe("mother");
    });

    it("renders a member with no relationships at all", () => {
      const members = [member("solo", "Sam", "Solo")];
      const tree = buildFamilyTree({
        family: family(),
        focalMemberId: "solo",
        members,
        relationships: [],
      });

      expect(tree.members).toHaveLength(1);
      expect(tree.roots).toHaveLength(1);
      expect(tree.roots[0].children).toHaveLength(0);
    });

    it("treats a `child` row as the inverse of a parent row", () => {
      // Recorded child-first, which must produce the same tree as parent-first.
      const childFirst = buildFamilyTree({
        family: family(),
        focalMemberId: "c1",
        members: [member("f", "Frank", "Miller"), member("c1", "Chris", "Miller")],
        relationships: [rel("fam-1", "c1", "f", "child")],
      });
      const parentFirst = buildFamilyTree({
        family: family(),
        focalMemberId: "c1",
        members: [member("f", "Frank", "Miller"), member("c1", "Chris", "Miller")],
        relationships: [rel("fam-1", "f", "c1", "father")],
      });

      expect(childFirst.roots.map((n) => n.member.id)).toEqual(parentFirst.roots.map((n) => n.member.id));
      expect(childFirst.roots[0].children.map((n) => n.member.id)).toEqual(
        parentFirst.roots[0].children.map((n) => n.member.id),
      );
    });

    it("ignores relationships belonging to a different family", () => {
      const tree = buildFamilyTree({
        family: family(),
        focalMemberId: "f",
        members: nuclearMembers,
        relationships: [
          ...nuclearRelationships,
          // Belongs to another family; must not leak into this tree.
          rel("fam-2", "f", "c1", "spouse"),
        ],
      });

      expect(tree.members).toHaveLength(4);
      // The stray fam-2 relationship must not create a second spouse link.
      expect(tree.roots).toHaveLength(1);
      expect(["f", "m"]).toContain(tree.roots[0].member.id);
      expect(tree.roots[0].spouse?.member.id).toBe(tree.roots[0].member.id === "f" ? "m" : "f");
      expect(byId(tree, "f")?.spouse?.member.id).toBe("m");
    });

    it("ignores relationships referencing members that are not in the family", () => {
      const tree = buildFamilyTree({
        family: family(),
        focalMemberId: "f",
        members: [member("f", "Frank", "Miller")],
        relationships: [rel("fam-1", "f", "ghost", "father")],
      });

      expect(tree.members).toHaveLength(1);
    });

    it("does not recurse forever on a cyclic parent chain", () => {
      const members = [member("a", "Ann", "Aye"), member("b", "Ben", "Bee")];
      const tree = buildFamilyTree({
        family: family(),
        focalMemberId: "a",
        members,
        relationships: [rel("fam-1", "a", "b", "father"), rel("fam-1", "b", "a", "father")],
      });

      // The point is that it returns at all.
      expect(tree.members.length).toBeGreaterThan(0);
    });

    it("returns a usable label for a member who is unreachable from the focal", () => {
      const tree = buildFamilyTree({
        family: family(),
        focalMemberId: "f",
        members: [member("f", "Frank", "Miller"), member("island", "Iris", "Island")],
        relationships: [],
      });

      expect(byId(tree, "island")?.relationshipToFocal).toBe("family member");
    });
  });
});
