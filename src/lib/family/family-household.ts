/**
 * Family Household Summary
 *
 * Turns one family's stored relationships into the father / mother / children
 * split the Families directory table renders.
 *
 * This lives outside the repository on purpose: the production repository and
 * the demo data both call it, so there is exactly one implementation of the
 * rule "who counts as a father in this household". Duplicating it in the mock
 * would let the demo drift away from what the API actually returns.
 *
 * The rule itself is deliberately literal — a person is a father because a
 * `father` relationship says so, never because the household happens to have a
 * surname, a photo, or a head. A family with no mother simply reports none.
 */

import type {
  Family,
  FamilyMember,
  FamilyRelationship,
  FamilyRelationshipType,
} from "../backend/types";

/** Types stored parent-first, where the target of the row is the child. */
const PARENT_FIRST_TYPES: ReadonlySet<FamilyRelationshipType> = new Set([
  "father",
  "mother",
  "guardian",
]);

export interface HouseholdSummary {
  /** Distinct members involved in any relationship, plus the designated head. */
  members: FamilyMember[];
  fathers: FamilyMember[];
  mothers: FamilyMember[];
  children: FamilyMember[];
  familySize: number;
  hasChildren: boolean;
  hasFamilyPhoto: boolean;
}

export interface SummarizeHouseholdInput {
  family: Family;
  relationships: FamilyRelationship[];
  /** Every member that may appear, keyed by id. Missing members are ignored. */
  membersById: Map<string, FamilyMember>;
}

/**
 * Normalise a stored row into its parent and child.
 *
 * `father`/`mother`/`guardian` rows are stored parent-first, while a `child`
 * row is stored child-first. Both conventions describe the same fact, so they
 * are flipped into one shape here.
 */
function toParentAndChild(rel: FamilyRelationship): { parentId: string; childId: string } | null {
  if (rel.type === "child") {
    return { parentId: rel.toMemberId, childId: rel.fromMemberId };
  }
  if (PARENT_FIRST_TYPES.has(rel.type)) {
    return { parentId: rel.fromMemberId, childId: rel.toMemberId };
  }
  return null;
}

export function summarizeHousehold(input: SummarizeHouseholdInput): HouseholdSummary {
  const { family, relationships, membersById } = input;

  const fatherIds = new Set<string>();
  const motherIds = new Set<string>();
  const childIds = new Set<string>();
  const memberIds = new Set<string>();

  for (const rel of relationships) {
    memberIds.add(rel.fromMemberId);
    memberIds.add(rel.toMemberId);

    const pair = toParentAndChild(rel);
    if (!pair) continue;
    childIds.add(pair.childId);

    // `guardian` is recorded alongside the father column because it is also a
    // parental role; it is never counted twice because the sets are id-based.
    if (rel.type === "father" || rel.type === "guardian") fatherIds.add(pair.parentId);
    if (rel.type === "mother") motherIds.add(pair.parentId);
  }

  if (family.headMemberId) memberIds.add(family.headMemberId);

  const resolve = (ids: Set<string>): FamilyMember[] =>
    [...ids]
      .map((id) => membersById.get(id))
      .filter((m): m is FamilyMember => m !== undefined)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const children = resolve(childIds);
  const fathers = resolve(fatherIds);
  const mothers = resolve(motherIds);
  const members = resolve(memberIds);

  return {
    members,
    fathers,
    mothers,
    children,
    familySize: members.length,
    hasChildren: children.length > 0,
    hasFamilyPhoto: Boolean(family.familyPhotoUrl),
  };
}
