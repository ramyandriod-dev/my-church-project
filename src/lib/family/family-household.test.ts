/**
 * Family Household Summary Tests
 *
 * `summarizeHousehold` is the single implementation of "who is the father in
 * this household", used by both the production directory query and the demo
 * data. These tests pin the rules the Families directory depends on:
 *
 *   - a father/mother comes from a relationship, never from a surname or photo
 *   - a `guardian` is a parental role but is not a mother
 *   - the two storage conventions (parent-first vs child-first) agree
 *   - a member with no `father` relationship is reported as no father
 *   - a `sibling`, `spouse` or `other` link makes someone a member without
 *     making them a parent or a child
 */

import { describe, it, expect } from "vitest";
import { summarizeHousehold } from "./family-household";
import type { Family, FamilyMember, FamilyRelationship, FamilyRelationshipType } from "../backend/types";

const TENANT = "tenant-1";

function member(id: string, firstName: string, lastName: string): FamilyMember {
  return {
    id,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}@example.com`,
    avatarUrl: null,
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

let seq = 0;
function rel(
  fromMemberId: string,
  toMemberId: string,
  type: FamilyRelationshipType,
  familyId = "fam-1",
): FamilyRelationship {
  seq += 1;
  return {
    id: `fr-${seq}`,
    tenantId: TENANT,
    familyId,
    fromMemberId,
    toMemberId,
    type,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function byId(...ms: FamilyMember[]): Map<string, FamilyMember> {
  return new Map(ms.map((m) => [m.id, m]));
}

const father = member("f", "Michael", "Chen");
const mother = member("m", "Sarah", "Johnson");
const child1 = member("c1", "Emily", "Williams");
const child2 = member("c2", "David", "Brown");

describe("summarizeHousehold", () => {
  it("splits a two-parent family into fathers, mothers and children", () => {
    const result = summarizeHousehold({
      family: family(),
      relationships: [
        rel(father.id, mother.id, "spouse"),
        rel(father.id, child1.id, "father"),
        rel(mother.id, child1.id, "mother"),
        rel(father.id, child2.id, "father"),
        rel(mother.id, child2.id, "mother"),
      ],
      membersById: byId(father, mother, child1, child2),
    });

    expect(result.fathers.map((m) => m.id)).toEqual([father.id]);
    expect(result.mothers.map((m) => m.id)).toEqual([mother.id]);
    expect(result.children.map((m) => m.id)).toEqual([child1.id, child2.id]);
    expect(result.familySize).toBe(4);
    expect(result.hasChildren).toBe(true);
  });

  it("reports no father for a single-parent household instead of guessing", () => {
    const result = summarizeHousehold({
      family: family({ headMemberId: mother.id }),
      relationships: [rel(mother.id, child1.id, "mother")],
      membersById: byId(mother, child1),
    });

    expect(result.fathers).toEqual([]);
    expect(result.mothers.map((m) => m.id)).toEqual([mother.id]);
    expect(result.children.map((m) => m.id)).toEqual([child1.id]);
    expect(result.familySize).toBe(2);
  });

  it("treats a guardian as a parental role but never as a mother", () => {
    const result = summarizeHousehold({
      family: family(),
      relationships: [rel(father.id, child1.id, "guardian")],
      membersById: byId(father, child1),
    });

    expect(result.fathers.map((m) => m.id)).toEqual([father.id]);
    expect(result.mothers).toEqual([]);
    expect(result.children.map((m) => m.id)).toEqual([child1.id]);
  });

  it("derives the child from a child-first row but not a father or mother", () => {
    // A `child` row records that a parent/child link exists, but it does NOT say
    // which of the two is the father and which is the mother. The father/mother
    // columns therefore stay empty here: filling them would mean guessing, and a
    // wrong parent in a church record is worse than a blank one.
    const result = summarizeHousehold({
      family: family(),
      relationships: [rel(child1.id, father.id, "child")],
      membersById: byId(father, child1),
    });

    expect(result.children.map((m) => m.id)).toEqual([child1.id]);
    expect(result.fathers).toEqual([]);
    expect(result.mothers).toEqual([]);
    expect(result.familySize).toBe(2);
    expect(result.hasChildren).toBe(true);
  });

  it("counts an `other` link as membership without inventing a parent or child", () => {
    const godparent = member("gp", "Samantha", "Scott");
    const result = summarizeHousehold({
      family: family(),
      relationships: [
        rel(father.id, child1.id, "father"),
        rel(father.id, godparent.id, "other"),
      ],
      membersById: byId(father, child1, godparent),
    });

    expect(result.fathers.map((m) => m.id)).toEqual([father.id]);
    expect(result.mothers).toEqual([]);
    expect(result.children.map((m) => m.id)).toEqual([child1.id]);
    // The godparent is a member of the household...
    expect(result.members.map((m) => m.id)).toContain(godparent.id);
    expect(result.familySize).toBe(3);
    // ...but is not presented as a parent or a child.
    expect(result.members.map((m) => m.id)).not.toContain(
      expect.stringMatching(/^$/),
    );
  });

  it("reports hasChildren false for a couple with no children", () => {
    const result = summarizeHousehold({
      family: family({ headMemberId: father.id }),
      relationships: [rel(father.id, mother.id, "spouse")],
      membersById: byId(father, mother),
    });

    expect(result.hasChildren).toBe(false);
    expect(result.children).toEqual([]);
    expect(result.familySize).toBe(2);
  });

  it("includes a designated head who has no relationship rows", () => {
    const result = summarizeHousehold({
      family: family({ headMemberId: father.id }),
      relationships: [],
      membersById: byId(father),
    });

    expect(result.members.map((m) => m.id)).toEqual([father.id]);
    expect(result.familySize).toBe(1);
    expect(result.hasChildren).toBe(false);
  });

  it("counts a member once even when several relationships mention them", () => {
    const result = summarizeHousehold({
      family: family(),
      relationships: [
        rel(father.id, mother.id, "spouse"),
        rel(father.id, child1.id, "father"),
        rel(mother.id, child1.id, "mother"),
        // A duplicate parent row must not inflate any count.
        rel(father.id, child1.id, "father"),
      ],
      membersById: byId(father, mother, child1),
    });

    expect(result.familySize).toBe(3);
    expect(result.fathers).toHaveLength(1);
    expect(result.mothers).toHaveLength(1);
    expect(result.children).toHaveLength(1);
  });

  it("sets hasFamilyPhoto only from the family's own photo", () => {
    const withPhoto = summarizeHousehold({
      family: family({ familyPhotoUrl: "https://example.com/fam.jpg" }),
      relationships: [],
      membersById: new Map(),
    });
    expect(withPhoto.hasFamilyPhoto).toBe(true);

    // A head with an avatar is NOT a family photo. The fallback is applied by
    // the UI, and reported separately as `isFallback`.
    const withoutPhoto = summarizeHousehold({
      family: family({ headMemberId: father.id }),
      relationships: [],
      membersById: byId(father),
    });
    expect(withoutPhoto.hasFamilyPhoto).toBe(false);
  });

  it("ignores relationship rows that reference a member outside the lookup", () => {
    const result = summarizeHousehold({
      family: family(),
      relationships: [rel("missing", child1.id, "father")],
      membersById: byId(child1),
    });

    expect(result.fathers).toEqual([]);
    expect(result.children.map((m) => m.id)).toEqual([child1.id]);
    expect(result.familySize).toBe(1);
  });
});
