import { describe, it, expect, vi, beforeEach } from "vitest";
import { memberService } from "./member-service";
import { memberRepository } from "../../db/repositories/member-repository";
import type { TenantContext } from "../types";
import { ConflictError, NotFoundError, ForbiddenError, TenantError } from "../errors";

import { familyRepository } from "../../db/repositories/family-repository";
import { prisma } from "../../db/prisma";

vi.mock("../../db/repositories/member-repository", () => ({
  memberRepository: {
    listMembers: vi.fn(),
    findMemberById: vi.fn(),
    findMemberByUserId: vi.fn(),
    findMemberByEmail: vi.fn(),
    findMemberByPhone: vi.fn(),
    createMember: vi.fn(),
    updateMember: vi.fn(),
    deactivateMember: vi.fn(),
    deleteMember: vi.fn(),
    countMembers: vi.fn(),
    importMembersBatch: vi.fn(),
  },
}));

vi.mock("../../db/repositories/family-repository", () => ({
  familyRepository: {
    findFamilyIdForMember: vi.fn(),
    findForTenant: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    listRelationshipsForFamily: vi.fn(),
    createRelationship: vi.fn(),
    updateRelationship: vi.fn(),
    deleteRelationshipForTenant: vi.fn(),
  },
}));

const { mockPrisma } = vi.hoisted(() => {
  const p = {
    member: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
  return { mockPrisma: p };
});

vi.mock("../../db/prisma", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

const adminCtx: TenantContext = {
  tenantId: "tenant-1",
  userId: "user-1",
  role: "admin",
  email: "admin@grace.community",
  permissions: ["members.read", "members.create", "members.update", "members.delete"],
};

const memberWithoutWriteCtx: TenantContext = {
  tenantId: "tenant-1",
  userId: "user-2",
  role: "member",
  email: "member@grace.community",
  permissions: ["members.read"],
};

const mockMember = {
  id: "m-1",
  tenantId: "tenant-1",
  firstName: "Sarah",
  lastName: "Johnson",
  email: "sarah@grace.community",
  status: "active",
  ministry: "Worship",
};

describe("MemberService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listMembers", () => {
    it("calls memberRepository.listMembers with tenant scoping", async () => {
      (memberRepository.listMembers as any).mockResolvedValue({
        members: [mockMember],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      const res = await memberService.listMembers(adminCtx, { search: "Sarah" });
      expect(res.members).toHaveLength(1);
      expect(memberRepository.listMembers).toHaveBeenCalledWith(
        "tenant-1",
        expect.objectContaining({ search: "Sarah" })
      );
    });

    it("throws TenantError when tenant context is missing", async () => {
      await expect(
        memberService.listMembers({} as any)
      ).rejects.toThrow(TenantError);
    });
  });

  describe("getMemberById", () => {
    it("returns member if found in tenant", async () => {
      (memberRepository.findMemberById as any).mockResolvedValue(mockMember);

      const res = await memberService.getMemberById(adminCtx, "m-1");
      expect(res.id).toBe("m-1");
      expect(memberRepository.findMemberById).toHaveBeenCalledWith("tenant-1", "m-1");
    });

    it("throws NotFoundError when member does not exist in caller's tenant", async () => {
      (memberRepository.findMemberById as any).mockResolvedValue(null);

      await expect(
        memberService.getMemberById(adminCtx, "m-nonexistent")
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("createMember", () => {
    it("creates member and audits creation", async () => {
      (memberRepository.findMemberByEmail as any).mockResolvedValue(null);
      (memberRepository.createMember as any).mockResolvedValue(mockMember);

      const res = await memberService.createMember(adminCtx, {
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah@grace.community",
        status: "active",
      });

      expect(res.id).toBe("m-1");
      expect(memberRepository.createMember).toHaveBeenCalledWith(
        "tenant-1",
        expect.objectContaining({ email: "sarah@grace.community" })
      );
    });

    it("throws ConflictError if email already exists in tenant", async () => {
      (memberRepository.findMemberByEmail as any).mockResolvedValue(mockMember);

      await expect(
        memberService.createMember(adminCtx, {
          firstName: "Another",
          lastName: "Sarah",
          email: "sarah@grace.community",
        })
      ).rejects.toThrow(ConflictError);
    });

    it("throws ForbiddenError if caller lacks members.create", async () => {
      await expect(
        memberService.createMember(memberWithoutWriteCtx, {
          firstName: "New",
          lastName: "Member",
          email: "new@grace.community",
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws ConflictError if 1000 member capacity cap is reached", async () => {
      (memberRepository.countMembers as any).mockResolvedValue(1000);

      await expect(
        memberService.createMember(adminCtx, {
          firstName: "Extra",
          lastName: "Member",
          email: "extra@grace.community",
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("importMembers", () => {
    it("throws ConflictError if import would exceed 1000 member capacity cap", async () => {
      (memberRepository.countMembers as any).mockResolvedValue(950);

      await expect(
        memberService.importMembers(adminCtx, {
          members: Array(60).fill({
            firstName: "Test",
            lastName: "User",
            email: "test@grace.community",
          }),
          onDuplicate: "skip",
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("updateMember", () => {
    it("updates existing member", async () => {
      (memberRepository.findMemberById as any).mockResolvedValue(mockMember);
      (memberRepository.updateMember as any).mockResolvedValue({
        ...mockMember,
        firstName: "UpdatedSarah",
      });

      const res = await memberService.updateMember(adminCtx, "m-1", {
        firstName: "UpdatedSarah",
      });

      expect(res.firstName).toBe("UpdatedSarah");
      expect(memberRepository.updateMember).toHaveBeenCalledWith(
        "tenant-1",
        "m-1",
        expect.objectContaining({ firstName: "UpdatedSarah" })
      );
    });

    it("throws NotFoundError if updating a member not in tenant", async () => {
      (memberRepository.findMemberById as any).mockResolvedValue(null);

      await expect(
        memberService.updateMember(adminCtx, "m-other", { firstName: "Test" })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deactivateMember", () => {
    it("deactivates existing member", async () => {
      (memberRepository.findMemberById as any).mockResolvedValue(mockMember);
      (memberRepository.deactivateMember as any).mockResolvedValue({
        ...mockMember,
        status: "inactive",
      });

      const res = await memberService.deactivateMember(adminCtx, "m-1");
      expect(res.status).toBe("inactive");
      expect(memberRepository.deactivateMember).toHaveBeenCalledWith("tenant-1", "m-1");
    });

    it("throws ForbiddenError if caller lacks members.delete", async () => {
      await expect(
        memberService.deactivateMember(memberWithoutWriteCtx, "m-1")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("updateMyProfile - family tree linkage", () => {
    it("creates child relationship with child as fromMemberId and parent as toMemberId", async () => {
      (memberRepository.findMemberByUserId as any).mockResolvedValue({
        id: "parent-id",
        tenantId: "tenant-1",
        firstName: "Peter",
        lastName: "Habib",
        status: "active",
      });
      (memberRepository.updateMember as any).mockResolvedValue({
        id: "parent-id",
        tenantId: "tenant-1",
        firstName: "Peter",
        lastName: "Habib",
      });
      (familyRepository.findFamilyIdForMember as any).mockResolvedValue("family-123");
      (familyRepository.findForTenant as any).mockResolvedValue({
        id: "family-123",
        name: "Habib Family",
        headMemberId: "parent-id",
      });
      (memberRepository.findMemberByPhone as any).mockResolvedValue(null);
      (memberRepository.findMemberByEmail as any).mockResolvedValue(null);
      (prisma.member.findFirst as any).mockResolvedValue(null);
      (memberRepository.createMember as any).mockResolvedValue({
        id: "child-id",
        firstName: "Mark",
        lastName: "Habib",
      });
      (familyRepository.listRelationshipsForFamily as any).mockResolvedValue([]);

      await memberService.updateMyProfile(adminCtx, {
        firstName: "Peter",
        lastName: "Habib",
        newFamilyMembers: [
          {
            firstName: "Mark",
            lastName: "Habib",
            relationship: "son",
          },
        ],
      });

      // Child MUST be fromMemberId, Parent MUST be toMemberId, type MUST be child
      expect(familyRepository.createRelationship).toHaveBeenCalledWith(
        "tenant-1",
        expect.objectContaining({
          familyId: "family-123",
          fromMemberId: "child-id",
          toMemberId: "parent-id",
          type: "child",
        })
      );
    });

    it("updates child relationship with child as fromMemberId and parent as toMemberId", async () => {
      (memberRepository.findMemberByUserId as any).mockResolvedValue({
        id: "parent-id",
        tenantId: "tenant-1",
        firstName: "Peter",
        lastName: "Habib",
        status: "active",
      });
      (memberRepository.updateMember as any).mockResolvedValue({
        id: "parent-id",
        tenantId: "tenant-1",
        firstName: "Peter",
        lastName: "Habib",
      });
      (familyRepository.findFamilyIdForMember as any).mockResolvedValue("family-123");
      (familyRepository.findForTenant as any).mockResolvedValue({
        id: "family-123",
        name: "Habib Family",
        headMemberId: "parent-id",
      });
      (familyRepository.listRelationshipsForFamily as any).mockResolvedValue([
        {
          id: "rel-1",
          fromMemberId: "parent-id",
          toMemberId: "child-id",
          type: "child",
        },
      ]);

      await memberService.updateMyProfile(adminCtx, {
        firstName: "Peter",
        lastName: "Habib",
        updatedFamilyMembers: [
          {
            memberId: "child-id",
            relationship: "daughter",
          },
        ],
      });

      expect(familyRepository.updateRelationship).toHaveBeenCalledWith(
        "tenant-1",
        "rel-1",
        expect.objectContaining({
          fromMemberId: "child-id",
          toMemberId: "parent-id",
          type: "child",
        })
      );
    });
  });
});
