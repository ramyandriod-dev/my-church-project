import { describe, it, expect, vi, beforeEach } from "vitest";
import { familyService } from "./family-service";
import { familyRepository } from "../../db/repositories/family-repository";
import { followUpRepository } from "../../db/repositories/follow-up-repository";
import type { Family, FamilyRelationship, TenantContext } from "../types";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";

vi.mock("../../db/repositories/follow-up-repository", () => ({
  followUpRepository: {
    listForTenant: vi.fn(),
  },
}));

vi.mock("../../db/repositories/family-repository", () => ({
  familyRepository: {
    findForTenant: vi.fn(),
    listForTenant: vi.fn(),
    listDirectoryForTenant: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteForTenant: vi.fn(),
    memberExistsForTenant: vi.fn(),
    getMembersForTenant: vi.fn(),
    findFamilyIdForMember: vi.fn(),
    listRelationshipsForFamily: vi.fn(),
    findRelationshipForTenant: vi.fn(),
    findRelationshipByEndpoints: vi.fn(),
    wouldCreateAncestorCycle: vi.fn(),
    createRelationship: vi.fn(),
    updateRelationship: vi.fn(),
    deleteRelationshipForTenant: vi.fn(),
  },
}));

const TENANT = "t-1";

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    tenantId: TENANT,
    userId: "u-1",
    role: "admin",
    email: "admin@example.com",
    permissions: [
      "families.read",
      "families.create",
      "families.update",
      "families.delete",
    ],
    ...overrides,
  };
}

const readOnlyCtx = ctx({ permissions: ["families.read"] });

const mockFamily: Family = {
  id: "fam-1",
  tenantId: TENANT,
  name: "Miller Family",
  familyPhotoUrl: null,
  headMemberId: "m-father",
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  relationships: [],
};

function mockRelationship(
  overrides: Partial<FamilyRelationship> = {},
): FamilyRelationship {
  return {
    id: "rel-1",
    tenantId: TENANT,
    familyId: "fam-1",
    fromMemberId: "m-father",
    toMemberId: "m-child",
    type: "father",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("FamilyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(familyRepository.findForTenant).mockResolvedValue(mockFamily);
    // By default both members belong to the tenant and nothing conflicts.
    vi.mocked(familyRepository.memberExistsForTenant).mockResolvedValue(true);
    vi.mocked(familyRepository.findRelationshipByEndpoints).mockResolvedValue(null);
    vi.mocked(familyRepository.wouldCreateAncestorCycle).mockResolvedValue(false);
    vi.mocked(familyRepository.createRelationship).mockImplementation(
      async (_t, input) => mockRelationship(input),
    );
  });

  describe("authorization", () => {
    it("rejects a read when the caller lacks families.read", async () => {
      const noAccess = ctx({ permissions: [] });
      await expect(familyService.getFamily(noAccess, "fam-1")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("rejects creating a family without families.create", async () => {
      await expect(
        familyService.createFamily(readOnlyCtx, { name: "New Family" }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("rejects updating a family without families.update", async () => {
      await expect(
        familyService.updateFamily(readOnlyCtx, "fam-1", { name: "Renamed" }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("rejects deleting a family without families.delete", async () => {
      await expect(familyService.deleteFamily(readOnlyCtx, "fam-1")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("rejects adding a relationship without families.update", async () => {
      await expect(
        familyService.addRelationship(readOnlyCtx, "fam-1", {
          fromMemberId: "m-father",
          toMemberId: "m-child",
          type: "father",
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("rejects reading a member's family tree without families.read", async () => {
      await expect(
        familyService.getFamilyTreeForMember(ctx({ permissions: [] }), "m-father"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe("tenant isolation", () => {
    it("scopes every family lookup to the caller's tenant", async () => {
      await familyService.getFamily(ctx(), "fam-1");
      expect(familyRepository.findForTenant).toHaveBeenCalledWith(TENANT, "fam-1");
    });

    it("uses the authenticated tenant, never a client-supplied one", async () => {
      // A context whose tenantId differs from the family being fetched must
      // simply miss rather than return another tenant's data.
      const otherTenant = ctx({ tenantId: "t-2" });
      vi.mocked(familyRepository.findForTenant).mockResolvedValue(null);

      await expect(familyService.getFamily(otherTenant, "fam-1")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("returns 404 for a family that does not exist in this tenant", async () => {
      vi.mocked(familyRepository.findForTenant).mockResolvedValue(null);
      await expect(familyService.getFamily(ctx(), "missing")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("resolves a member's family within the tenant only", async () => {
      vi.mocked(familyRepository.findFamilyIdForMember).mockResolvedValue("fam-1");
      vi.mocked(familyRepository.getMembersForTenant).mockResolvedValue([]);

      await familyService.getFamilyTreeForMember(ctx(), "m-father");

      expect(familyRepository.findFamilyIdForMember).toHaveBeenCalledWith(TENANT, "m-father");
      expect(familyRepository.getMembersForTenant).toHaveBeenCalledWith(TENANT, expect.any(Array));
    });

    it("returns 404 for a member belonging to another tenant", async () => {
      vi.mocked(familyRepository.memberExistsForTenant).mockResolvedValue(false);
      await expect(
        familyService.getFamilyTreeForMember(ctx(), "foreign-member"),
      ).rejects.toBeInstanceOf(NotFoundError);
      // Must not even attempt a family lookup for an unknown member.
      expect(familyRepository.findFamilyIdForMember).not.toHaveBeenCalled();
    });
  });

  describe("createFamily", () => {
    it("creates a family for the authenticated tenant", async () => {
      vi.mocked(familyRepository.create).mockImplementation(async (tenantId, input) => ({
        ...mockFamily,
        tenantId,
        name: input.name,
        headMemberId: input.headMemberId ?? null,
        familyPhotoUrl: input.familyPhotoUrl ?? null,
      }));

      const result = await familyService.createFamily(ctx(), { name: "Miller Family" });

      expect(result.name).toBe("Miller Family");
      expect(familyRepository.create).toHaveBeenCalledWith(
        TENANT,
        expect.objectContaining({ name: "Miller Family" }),
      );
    });

    it("rejects a head member that does not belong to the tenant", async () => {
      vi.mocked(familyRepository.memberExistsForTenant).mockResolvedValue(false);

      await expect(
        familyService.createFamily(ctx(), { name: "X", headMemberId: "foreign-member" }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(familyRepository.create).not.toHaveBeenCalled();
    });

    it("accepts a family with no photo and no designated head", async () => {
      vi.mocked(familyRepository.create).mockImplementation(async (tenantId, input) => ({
        ...mockFamily,
        tenantId,
        name: input.name,
        familyPhotoUrl: null,
        headMemberId: null,
      }));

      const result = await familyService.createFamily(ctx(), { name: "No Photo" });
      expect(result.familyPhotoUrl).toBeNull();
      expect(result.headMemberId).toBeNull();
    });
  });

  describe("addRelationship integrity rules", () => {
    it("rejects a self relationship", async () => {
      await expect(
        familyService.addRelationship(ctx(), "fam-1", {
          fromMemberId: "m-same",
          toMemberId: "m-same",
          type: "spouse",
        }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(familyRepository.createRelationship).not.toHaveBeenCalled();
    });

    it("rejects a relationship when either member is not in the tenant", async () => {
      vi.mocked(familyRepository.memberExistsForTenant).mockImplementation(
        async (_tenantId, memberId) => memberId === "m-father",
      );

      await expect(
        familyService.addRelationship(ctx(), "fam-1", {
          fromMemberId: "m-father",
          toMemberId: "foreign-member",
          type: "father",
        }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(familyRepository.createRelationship).not.toHaveBeenCalled();
    });

    it("rejects a duplicate relationship", async () => {
      vi.mocked(familyRepository.findRelationshipByEndpoints).mockResolvedValue(
        mockRelationship(),
      );

      await expect(
        familyService.addRelationship(ctx(), "fam-1", {
          fromMemberId: "m-father",
          toMemberId: "m-child",
          type: "father",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects a second spouse record for the same pair", async () => {
      // The reverse-direction row already exists; the pair is the same fact.
      vi.mocked(familyRepository.findRelationshipByEndpoints).mockResolvedValue(
        mockRelationship({ type: "spouse" }),
      );

      await expect(
        familyService.addRelationship(ctx(), "fam-1", {
          fromMemberId: "m-child",
          toMemberId: "m-father",
          type: "spouse",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(familyRepository.createRelationship).not.toHaveBeenCalled();
    });

    it("rejects a relationship that would make someone their own ancestor", async () => {
      vi.mocked(familyRepository.wouldCreateAncestorCycle).mockResolvedValue(true);

      await expect(
        familyService.addRelationship(ctx(), "fam-1", {
          fromMemberId: "m-child",
          toMemberId: "m-father",
          type: "father",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("normalises a spouse pair so it can only be stored once", async () => {
      // "b" sorts before "a", so the pair must be stored in canonical order.
      await familyService.addRelationship(ctx(), "fam-1", {
        fromMemberId: "m-b",
        toMemberId: "m-a",
        type: "spouse",
      });

      expect(familyRepository.createRelationship).toHaveBeenCalledWith(
        TENANT,
        expect.objectContaining({ fromMemberId: "m-a", toMemberId: "m-b", type: "spouse" }),
      );
    });

    it("keeps directional relationships in the order they were given", async () => {
      await familyService.addRelationship(ctx(), "fam-1", {
        fromMemberId: "m-b",
        toMemberId: "m-a",
        type: "father",
      });

      expect(familyRepository.createRelationship).toHaveBeenCalledWith(
        TENANT,
        expect.objectContaining({ fromMemberId: "m-b", toMemberId: "m-a", type: "father" }),
      );
    });

    it("returns 404 when the family does not exist", async () => {
      vi.mocked(familyRepository.findForTenant).mockResolvedValue(null);
      await expect(
        familyService.addRelationship(ctx(), "missing", {
          fromMemberId: "m-father",
          toMemberId: "m-child",
          type: "father",
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("updateRelationship", () => {
    it("rejects turning a relationship into a self relationship", async () => {
      vi.mocked(familyRepository.findRelationshipForTenant).mockResolvedValue(mockRelationship());

      await expect(
        familyService.updateRelationship(ctx(), "fam-1", "rel-1", { toMemberId: "m-father" }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects moving a relationship to another tenant's member", async () => {
      vi.mocked(familyRepository.findRelationshipForTenant).mockResolvedValue(mockRelationship());
      vi.mocked(familyRepository.memberExistsForTenant).mockImplementation(
        async (_tenantId, memberId) => memberId !== "foreign-member",
      );

      await expect(
        familyService.updateRelationship(ctx(), "fam-1", "rel-1", { toMemberId: "foreign-member" }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("ignores the relationship itself when checking for duplicates", async () => {
      vi.mocked(familyRepository.findRelationshipForTenant).mockResolvedValue(mockRelationship());
      vi.mocked(familyRepository.findRelationshipByEndpoints).mockResolvedValue(mockRelationship());
      vi.mocked(familyRepository.updateRelationship).mockImplementation(
        async (_t, id) => mockRelationship({ id }),
      );

      // Re-saving the same endpoints and type is not a duplicate of itself.
      await expect(
        familyService.updateRelationship(ctx(), "fam-1", "rel-1", { type: "father" }),
      ).resolves.toBeTruthy();
    });

    it("rejects when a different relationship already holds the new endpoints", async () => {
      vi.mocked(familyRepository.findRelationshipForTenant).mockResolvedValue(mockRelationship());
      vi.mocked(familyRepository.findRelationshipByEndpoints).mockResolvedValue(
        mockRelationship({ id: "rel-other", type: "mother" }),
      );

      await expect(
        familyService.updateRelationship(ctx(), "fam-1", "rel-1", { type: "mother" }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("returns 404 for a relationship in another tenant", async () => {
      vi.mocked(familyRepository.findRelationshipForTenant).mockResolvedValue(null);
      await expect(
        familyService.updateRelationship(ctx(), "fam-1", "rel-foreign", { type: "father" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("deleteFamily", () => {
    it("returns 404 rather than deleting a family from another tenant", async () => {
      vi.mocked(familyRepository.findForTenant).mockResolvedValue(null);
      await expect(familyService.deleteFamily(ctx(), "fam-foreign")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(familyRepository.deleteForTenant).not.toHaveBeenCalled();
    });
  });

  describe("getFamilyTreeForMember", () => {
    it("returns 404 when the member belongs to no family", async () => {
      vi.mocked(familyRepository.findFamilyIdForMember).mockResolvedValue(null);
      await expect(
        familyService.getFamilyTreeForMember(ctx(), "m-lonely"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("resolves the family from any side of a relationship", async () => {
      // The child is reached through the `to` side of a father relationship,
      // yet must resolve to the same family as the father.
      vi.mocked(familyRepository.findForTenant).mockResolvedValue({
        ...mockFamily,
        relationships: [mockRelationship()],
      });
      vi.mocked(familyRepository.findFamilyIdForMember).mockResolvedValue("fam-1");
      vi.mocked(familyRepository.getMembersForTenant).mockResolvedValue([]);

      const tree = await familyService.getFamilyTreeForMember(ctx(), "m-child");

      expect(tree.family.id).toBe("fam-1");
      expect(tree.focalMemberId).toBe("m-child");
      expect(familyRepository.findFamilyIdForMember).toHaveBeenCalledWith(TENANT, "m-child");
    });
  });


  describe("`other` relationship type", () => {
    it("accepts `other` as a valid relationship type", async () => {
      vi.mocked(familyRepository.findForTenant).mockResolvedValue(mockFamily);
      vi.mocked(familyRepository.memberExistsForTenant).mockResolvedValue(true);
      vi.mocked(familyRepository.findRelationshipByEndpoints).mockResolvedValue(null);
      vi.mocked(familyRepository.createRelationship).mockResolvedValue(
        mockRelationship({ type: "other" }),
      );

      const created = await familyService.addRelationship(ctx(), "fam-1", {
        fromMemberId: "m-godparent",
        toMemberId: "m-child",
        type: "other",
      });

      expect(created.type).toBe("other");
    });

    it("treats `other` as symmetric, so a reversed duplicate is rejected", async () => {
      // `other` carries no direction marker, so A->B and B->A are the same link.
      vi.mocked(familyRepository.findForTenant).mockResolvedValue(mockFamily);
      vi.mocked(familyRepository.memberExistsForTenant).mockResolvedValue(true);
      // The repository is asked about the normalised pair.
      vi.mocked(familyRepository.findRelationshipByEndpoints).mockResolvedValue(
        mockRelationship({ fromMemberId: "m-child", toMemberId: "m-godparent", type: "other" }),
      );

      await expect(
        familyService.addRelationship(ctx(), "fam-1", {
          fromMemberId: "m-godparent",
          toMemberId: "m-child",
          type: "other",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(familyRepository.createRelationship).not.toHaveBeenCalled();
    });
  });

  describe("listFamilyDirectory", () => {
    it("requires the families.read permission", async () => {
      await expect(
        familyService.listFamilyDirectory(ctx({ permissions: [] })),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(familyRepository.listDirectoryForTenant).not.toHaveBeenCalled();
    });

    it("scopes the query to the context tenant, never a client-supplied one", async () => {
      vi.mocked(familyRepository.listDirectoryForTenant).mockResolvedValue([]);

      await familyService.listFamilyDirectory(ctx(), { hasChildren: true, minSize: 2 });

      expect(familyRepository.listDirectoryForTenant).toHaveBeenCalledWith(TENANT, {
        hasChildren: true,
        minSize: 2,
      });
    });

    it("returns the household projection from the repository", async () => {
      const entry = {
        family: mockFamily,
        members: [],
        fathers: [],
        mothers: [],
        children: [],
        familySize: 0,
        hasChildren: false,
        hasFamilyPhoto: false,
      };
      vi.mocked(familyRepository.listDirectoryForTenant).mockResolvedValue([entry]);

      const result = await familyService.listFamilyDirectory(ctx());

      expect(result).toEqual([entry]);
    });
  });

  describe("listOpenFollowUpsForFamily", () => {
    it("404s for a family outside the tenant", async () => {
      vi.mocked(familyRepository.findForTenant).mockResolvedValue(null);

      await expect(
        familyService.listOpenFollowUpsForFamily(ctx(), "fam-other"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(followUpRepository.listForTenant).not.toHaveBeenCalled();
    });

    it("reuses the existing follow-up query scoped to the household", async () => {
      vi.mocked(familyRepository.findForTenant).mockResolvedValue({
        ...mockFamily,
        relationships: [mockRelationship()],
      });
      vi.mocked(followUpRepository.listForTenant).mockResolvedValue({
        items: [],
        total: 0,
      });

      await familyService.listOpenFollowUpsForFamily(ctx(), "fam-1");

      expect(followUpRepository.listForTenant).toHaveBeenCalledWith(TENANT, {
        memberIds: expect.arrayContaining(["m-father", "m-child"]),
        status: "open",
        limit: 50,
      });
    });

    it("does not query follow-ups for a family with no members", async () => {
      vi.mocked(familyRepository.findForTenant).mockResolvedValue({
        ...mockFamily,
        headMemberId: null,
        relationships: [],
      });

      const result = await familyService.listOpenFollowUpsForFamily(ctx(), "fam-1");

      expect(result).toEqual([]);
      expect(followUpRepository.listForTenant).not.toHaveBeenCalled();
    });
  });
});
