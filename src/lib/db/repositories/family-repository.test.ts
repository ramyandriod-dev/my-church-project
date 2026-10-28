/**
 * Family Repository — ancestry cycle detection
 *
 * `wouldCreateAncestorCycle` is the guard that stops a family tree from
 * containing somebody who is their own ancestor. It is tested here against the
 * Prisma layer rather than through the service, because the service mocks this
 * method and so cannot prove the traversal itself is correct.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import prisma from "@/lib/db/prisma";
import { familyRepository } from "./family-repository";

const TENANT = "t-1";
const OTHER_TENANT = "t-2";
const FAMILY = "fam-1";

/** A stored parent-first row, e.g. type "father"/"mother"/"guardian". */
function parentRow(
  id: string,
  parentId: string,
  childId: string,
  type: "father" | "mother" | "guardian" = "father",
) {
  return { id, fromMemberId: parentId, toMemberId: childId, type };
}

/** A stored child-first row, e.g. type "child". */
function childRow(id: string, parentId: string, childId: string) {
  return { id, fromMemberId: childId, toMemberId: parentId, type: "child" as const };
}

type StoredRow = ReturnType<typeof parentRow> | ReturnType<typeof childRow>;

function mockStoredRelationships(rows: StoredRow[]) {
  // Honour the `id: { not }` filter so the excludeRelationshipId behaviour is
  // exercised for real rather than being bypassed by a blanket mock.
  vi.mocked(prisma.familyRelationship.findMany).mockImplementation((async (args: any) => {
    const excluded = args?.where?.id?.not;
    return excluded ? rows.filter((r) => r.id !== excluded) : rows;
  }) as never);
}

describe("familyRepository.wouldCreateAncestorCycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoredRelationships([]);
  });

  it("rejects a person being their own parent", async () => {
    await expect(
      familyRepository.wouldCreateAncestorCycle(TENANT, FAMILY, "m-a", "m-a"),
    ).resolves.toBe(true);
  });

  it("rejects a direct two-person loop", async () => {
    // A is already the father of B, so B cannot also be the father of A.
    mockStoredRelationships([parentRow("rel-1", "m-a", "m-b")]);

    await expect(
      familyRepository.wouldCreateAncestorCycle(TENANT, FAMILY, "m-b", "m-a"),
    ).resolves.toBe(true);
  });

  it("rejects a transitive three-generation loop", async () => {
    // A -> B -> C already exists. Making C the parent of A closes the loop,
    // which the previous "is this person a parent somewhere" check missed.
    mockStoredRelationships([
      parentRow("rel-1", "m-a", "m-b"),
      parentRow("rel-2", "m-b", "m-c"),
    ]);

    await expect(
      familyRepository.wouldCreateAncestorCycle(TENANT, FAMILY, "m-c", "m-a"),
    ).resolves.toBe(true);
  });

  it("rejects a loop that runs through a 'child' row", async () => {
    // B is recorded as the child of A, and C as the father of B. Declaring C
    // the parent of A must still be refused.
    mockStoredRelationships([
      childRow("rel-1", "m-a", "m-b"),
      parentRow("rel-2", "m-b", "m-c"),
    ]);

    await expect(
      familyRepository.wouldCreateAncestorCycle(TENANT, FAMILY, "m-c", "m-a"),
    ).resolves.toBe(true);
  });

  it("allows a second child of the same parent", async () => {
    mockStoredRelationships([parentRow("rel-1", "m-a", "m-b")]);

    await expect(
      familyRepository.wouldCreateAncestorCycle(TENANT, FAMILY, "m-a", "m-c"),
    ).resolves.toBe(false);
  });

  it("allows a parent who is also a child of their own parents", async () => {
    // Emily is Michael's daughter and Zoe's mother. Both facts are normal and
    // must coexist, so recording Emily as Michael's child is legitimate even
    // though Emily is herself a parent in this family.
    mockStoredRelationships([
      parentRow("rel-1", "m-michael", "m-emily"),
      parentRow("rel-2", "m-emily", "m-zoe", "mother"),
    ]);

    await expect(
      familyRepository.wouldCreateAncestorCycle(
        TENANT,
        FAMILY,
        "m-michael",
        "m-emily",
      ),
    ).resolves.toBe(false);
  });

  it("allows an unrelated new branch", async () => {
    mockStoredRelationships([
      parentRow("rel-1", "m-a", "m-b"),
      parentRow("rel-2", "m-x", "m-y"),
    ]);

    await expect(
      familyRepository.wouldCreateAncestorCycle(TENANT, FAMILY, "m-a", "m-y"),
    ).resolves.toBe(false);
  });

  it("terminates on data that already contains a cycle", async () => {
    // A -> B -> A is already stored. The traversal must not hang.
    mockStoredRelationships([
      parentRow("rel-1", "m-a", "m-b"),
      parentRow("rel-2", "m-b", "m-a"),
    ]);

    await expect(
      familyRepository.wouldCreateAncestorCycle(TENANT, FAMILY, "m-a", "m-z"),
    ).resolves.toBe(false);
  });

  it("ignores the relationship being edited", async () => {
    // rel-1 (A -> B) and rel-2 (B -> A) currently form a loop. Re-saving rel-1
    // with its own current value must be allowed, otherwise a relationship
    // could never be edited back to what it already says.
    mockStoredRelationships([
      parentRow("rel-1", "m-a", "m-b"),
      parentRow("rel-2", "m-b", "m-a"),
    ]);

    // Without the exclusion the existing rel-1 edge would close the loop.
    await expect(
      familyRepository.wouldCreateAncestorCycle(TENANT, FAMILY, "m-b", "m-a"),
    ).resolves.toBe(true);

    // Excluding rel-1 removes the only edge leaving A, so the edit is fine.
    await expect(
      familyRepository.wouldCreateAncestorCycle(TENANT, FAMILY, "m-b", "m-a", "rel-1"),
    ).resolves.toBe(false);

    const where = vi.mocked(prisma.familyRelationship.findMany).mock.calls[1][0]
      ?.where as { id?: { not?: string } };
    expect(where.id).toEqual({ not: "rel-1" });
  });

  it("always scopes the lookup to the tenant and the family", async () => {
    await familyRepository.wouldCreateAncestorCycle(TENANT, FAMILY, "m-a", "m-b");

    const where = vi.mocked(prisma.familyRelationship.findMany).mock.calls[0][0]
      ?.where as Record<string, unknown>;
    expect(where.tenantId).toBe(TENANT);
    expect(where.familyId).toBe(FAMILY);
    expect(where).not.toHaveProperty("id");
  });

  it("never reads another tenant's relationships", async () => {
    // The guard is tenant-scoped, so a caller cannot be blocked or satisfied by
    // ancestry that belongs to a different church.
    await familyRepository.wouldCreateAncestorCycle(
      OTHER_TENANT,
      FAMILY,
      "m-a",
      "m-b",
    );

    const where = vi.mocked(prisma.familyRelationship.findMany).mock.calls[0][0]
      ?.where as Record<string, unknown>;
    expect(where.tenantId).toBe(OTHER_TENANT);
  });
});
