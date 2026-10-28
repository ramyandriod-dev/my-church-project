// ─── Family Mock Data ──────────────────────────────────────────
//
// The People and Member 360 screens are client components backed by mock data
// (see ./people.ts), so families are mocked here the same way.
//
// IMPORTANT: this file only supplies DATA. The tree is assembled by the exact
// same pure builder the production API uses (`@/lib/family/family-tree`), so
// what the demo renders is what the backend would return. Relationship
// orientation, head-of-family handling and photo fallback are therefore not
// re-implemented for the mock.
//
// To demonstrate the required behaviours, this covers:
//   - a family with a real family photo        (Chen-Williams)
//   - a family with NO photo -> avatar fallback (Martinez, Anderson, Hall, Young)
//   - an incomplete household with no father   (Garcia)
//   - a head of family who is the mother       (Garcia), proving that being
//     a father never implies being the head
//   - a couple with NO children at all          (Young), so the "no children"
//     filter has something real to match
//   - an `other` household relationship         (Hall: Scott is linked to the
//     family as a godparent, which is neither father, mother nor child)
//
// Members are not reused between families, which mirrors the one-family-per-
// member rule the backend enforces.

import { members } from "./people";
import { buildFamilyTree } from "@/lib/family/family-tree";
import { summarizeHousehold } from "@/lib/family/family-household";
import type {
  Family,
  FamilyDirectoryEntry,
  FamilyMember,
  FamilyRelationship,
} from "@/lib/backend/types";

const MOCK_TENANT_ID = "tenant-demo";
const EPOCH = "2026-01-15T09:00:00.000Z";

function makeFamily(
  id: string,
  name: string,
  headMemberId: string | null,
  familyPhotoUrl: string | null,
): Family {
  return {
    id,
    tenantId: MOCK_TENANT_ID,
    name,
    familyPhotoUrl,
    headMemberId,
    notes: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  };
}

let relSeq = 0;
function rel(
  familyId: string,
  fromMemberId: string,
  toMemberId: string,
  type: FamilyRelationship["type"],
): FamilyRelationship {
  relSeq += 1;
  return {
    id: `fr-${relSeq}`,
    tenantId: MOCK_TENANT_ID,
    familyId,
    fromMemberId,
    toMemberId,
    type,
    createdAt: EPOCH,
  };
}

export const mockFamilies: Family[] = [
  // Has a real family photo. The head is the father, which happens to be
  // correct here but is stored explicitly rather than inferred.
  makeFamily(
    "fam-chen-williams",
    "Chen-Williams Family",
    "2",
    "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80",
  ),
  // No family photo, so the UI falls back to the head member's avatar.
  makeFamily("fam-martinez", "Martinez Family", "5", null),
  // Incomplete: a mother and a child, no father and no spouse recorded.
  // The head is the mother, which is the whole point.
  makeFamily("fam-garcia", "Garcia Household", "9", null),
  makeFamily("fam-anderson", "Anderson Household", "6", null),
  makeFamily("fam-hall", "Hall Family", "14", null),
  // A couple with no children recorded.
  makeFamily("fam-young", "Young-Allen Household", "16", null),
];

export const mockFamilyRelationships: FamilyRelationship[] = [
  // Chen-Williams: two parents, two children.
  rel("fam-chen-williams", "2", "1", "spouse"),
  rel("fam-chen-williams", "2", "3", "father"),
  rel("fam-chen-williams", "1", "3", "mother"),
  rel("fam-chen-williams", "2", "4", "father"),
  rel("fam-chen-williams", "1", "4", "mother"),

  // Martinez: two parents, one child, no family photo.
  rel("fam-martinez", "5", "8", "spouse"),
  rel("fam-martinez", "8", "7", "father"),
  rel("fam-martinez", "5", "7", "mother"),

  // Garcia: single mother and child only.
  rel("fam-garcia", "9", "10", "mother"),

  // Anderson: two parents, one child.
  rel("fam-anderson", "6", "11", "spouse"),
  rel("fam-anderson", "6", "12", "father"),
  rel("fam-anderson", "11", "12", "mother"),

  // Hall: a father with two children, plus a godparent connected as `other`.
  rel("fam-hall", "14", "18", "father"),
  rel("fam-hall", "14", "19", "father"),
  rel("fam-hall", "14", "21", "other"),

  // Young-Allen: a couple, no children recorded.
  rel("fam-young", "16", "15", "spouse"),
];

/** Project the mock member list onto the minimal shape the tree builder needs. */
function familyMembersById(): Map<string, FamilyMember> {
  return new Map(
    members.map((m) => [
      m.id,
      {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        avatarUrl: m.avatar,
        status: m.status,
      } satisfies FamilyMember,
    ]),
  );
}

/**
 * Resolve the family tree for a member from the mock data.
 *
 * Returns null when the member is not part of any family, which is what the
 * Member 360 section uses to show an empty state instead of an empty tree.
 */
export function getMockFamilyTreeForMember(memberId: string) {
  const relationships = mockFamilyRelationships.filter(
    (r) => r.fromMemberId === memberId || r.toMemberId === memberId,
  );

  // A family is reachable from any member through any relationship, exactly
  // like the tenant-scoped lookup the repository performs.
  const familyId = relationships[0]?.familyId;
  if (!familyId) return null;

  const family = mockFamilies.find((f) => f.id === familyId);
  if (!family) return null;

  const familyRels = mockFamilyRelationships.filter((r) => r.familyId === familyId);
  const memberIds = new Set<string>([memberId]);
  for (const r of familyRels) {
    memberIds.add(r.fromMemberId);
    memberIds.add(r.toMemberId);
  }
  if (family.headMemberId) memberIds.add(family.headMemberId);

  const allMembers = familyMembersById();
  const familyMembers = [...memberIds]
    .map((id) => allMembers.get(id))
    .filter((m): m is FamilyMember => m !== undefined);

  return buildFamilyTree({
    family,
    focalMemberId: memberId,
    members: familyMembers,
    relationships: familyRels,
  });
}

/**
 * Resolve the tree for a whole family, oriented on the head of family.
 *
 * Family 360 is a view OF the household, so the tree is built as seen from the
 * head: the head (and their spouse) sit on the top row with the children below.
 *
 * When no head has been designated the tree is oriented on the first recorded
 * father instead, and failing that on the first member, so the page always has
 * a sensible top row. Those fallbacks only affect where the diagram is rooted;
 * they never set `headMemberId`, so the "head of family" badge still appears
 * for nobody when nobody has been designated.
 *
 * `overrides` lets a screen that is editing relationships rebuild the diagram
 * from its own working copy, so adding or changing a relationship updates the
 * tree immediately instead of only after a refetch.
 */
export function getMockFamilyTreeForFamily(
  familyId: string,
  overrides?: {
    family?: Family;
    relationships?: FamilyRelationship[];
    members?: FamilyMember[] | Map<string, any>;
  },
) {
  const family =
    overrides?.family ?? mockFamilies.find((f) => f.id === familyId) ?? null;
  if (!family) return null;

  const allRels =
    overrides?.relationships ?? mockFamilyRelationships.filter((r) => r.familyId === familyId);
  const familyRels = allRels.filter((r) => r.familyId === familyId);

  let allMembers: Map<string, FamilyMember>;
  if (overrides?.members instanceof Map) {
    allMembers = overrides.members as Map<string, FamilyMember>;
  } else if (Array.isArray(overrides?.members)) {
    allMembers = new Map(overrides.members.map((m) => [m.id, m]));
  } else {
    allMembers = familyMembersById();
  }

  const memberIds = new Set<string>();
  for (const r of familyRels) {
    memberIds.add(r.fromMemberId);
    memberIds.add(r.toMemberId);
  }
  if (family.headMemberId) memberIds.add(family.headMemberId);

  const familyMembers = [...memberIds]
    .map((id) => allMembers.get(id))
    .filter((m): m is FamilyMember => m !== undefined);

  const firstFather = familyRels.find((r) => r.type === "father")?.fromMemberId;
  const focalMemberId =
    family.headMemberId ?? firstFather ?? familyMembers[0]?.id ?? "";

  return buildFamilyTree({
    family,
    focalMemberId,
    members: familyMembers,
    relationships: familyRels,
  });
}

/** Every family the given member belongs to, for the People page indicator. */
export function getMockFamilyForMember(memberId: string): Family | null {
  const rel = mockFamilyRelationships.find(
    (r) => r.fromMemberId === memberId || r.toMemberId === memberId,
  );
  if (!rel) return null;
  return mockFamilies.find((f) => f.id === rel.familyId) ?? null;
}

/**
 * The photo to show for a family: the family photo when one exists,
 * otherwise the designated head's avatar.
 */
export function getMockFamilyDisplayPhoto(family: Family): {
  url: string | null;
  isFallback: boolean;
} {
  if (family.familyPhotoUrl) return { url: family.familyPhotoUrl, isFallback: false };

  const head = family.headMemberId
    ? members.find((m) => m.id === family.headMemberId)
    : undefined;
  if (head) return { url: head.avatar, isFallback: true };

  return { url: null, isFallback: false };
}

/**
 * The Families directory, projected exactly the way the API projects it.
 *
 * The father / mother / children split and the household size come from the
 * shared `summarizeHousehold` helper the production repository also calls, so
 * the demo table cannot quietly disagree with the backend.
 */
export function getMockFamilyDirectory(): FamilyDirectoryEntry[] {
  const allMembers = familyMembersById();

  return mockFamilies
    .map((family) => {
      const relationships = mockFamilyRelationships.filter((r) => r.familyId === family.id);
      const summary = summarizeHousehold({ family, relationships, membersById: allMembers });
      return { family, ...summary };
    })
    .sort((a, b) => a.family.name.localeCompare(b.family.name));
}
