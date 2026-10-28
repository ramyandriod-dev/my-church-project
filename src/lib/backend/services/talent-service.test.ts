/**
 * Talent Service
 *
 * The tests here are mostly about refusals. The directory is built from what
 * members chose to submit, so the guarantees worth proving are the ones where
 * the code says no: no contact details for a caller without permission, no
 * non-discoverable member in the directory, no cross-tenant member, and no
 * ordinary member browsing the directory at all.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { talentService } from "./talent-service";
import { talentRepository } from "../../db/repositories/talent-repository";
import { ideaRepository } from "../../db/repositories/idea-repository";
import prisma from "../../db/prisma";
import { ForbiddenError, NotFoundError } from "../errors";
import type { TalentDirectoryEntry, TenantContext } from "../types";

vi.mock("../../db/repositories/talent-repository", () => ({
  talentRepository: {
    getProfileForMember: vi.fn(),
    upsertProfile: vi.fn(),
    listDirectoryForTenant: vi.fn(),
    getSkillFacets: vi.fn(() => []),
    getStats: vi.fn(),
    getTopSkills: vi.fn(),
    getMemberSummary: vi.fn(),
    listSkillsForTenant: vi.fn(),
    searchForTenant: vi.fn(),
  },
  mapDirectoryEntry: vi.fn(() => {
    throw new Error("mapDirectoryEntry should be stubbed per test");
  }),
}));

vi.mock("../../db/repositories/idea-repository", () => ({
  ideaRepository: { getStats: vi.fn() },
}));

/** Pagination fields are defaulted by the schema, so a parsed query always has them. */
const PAGE = { page: 1, limit: 20, sortOrder: "desc" as const, skillMode: "any" as const };

const TENANT = "t-1";
const OTHER_TENANT = "t-2";
const MEMBER = "m-1";

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    tenantId: TENANT,
    userId: "u-1",
    role: "admin",
    email: "admin@example.com",
    permissions: ["talent.read", "talent.update", "members.read", "ideas.read", "ai.use"],
    ...overrides,
  };
}

const staffCtx = ctx();

/** A caller with no member-directory permission, i.e. may not see contact details. */
const noContactCtx = ctx({ permissions: ["talent.read"] });

/** An ordinary member: no talent.read, no talent.update. */
const memberCtx = ctx({ role: "member", permissions: ["ideas.read", "ideas.create"] });

function directoryEntry(overrides: Partial<TalentDirectoryEntry> = {}): TalentDirectoryEntry {
  return {
    memberId: MEMBER,
    firstName: "Amina",
    lastName: "Haddad",
    avatarUrl: null,
    status: "active",
    professionCategory: "technology",
    profession: "Software Engineer",
    experience: null,
    yearsExperience: null,
    willingness: "yes",
    willingAreas: null,
    skills: [],
    ministry: "Youth Ministry",
    groupName: "Young Adults",
    canContact: true,
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

/** A stored profile, complete enough for the audit call to read its skills. */
function savedProfile() {
  return {
    id: "tp-1",
    tenantId: TENANT,
    memberId: MEMBER,
    professionCategory: null,
    profession: null,
    experience: null,
    yearsExperience: null,
    willingness: "maybe",
    willingAreas: null,
    isDiscoverable: true,
    updatedByUserId: "u-1",
    skills: [{ id: "s-1", name: "Guitar", category: null }],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  } as any;
}

/** The login's linked member, as `resolveOwnMember` reads it. */
function mockLinkedMember(userId = "u-1", memberId: string | null = MEMBER) {
  vi.mocked(prisma.user.findFirst).mockResolvedValue({ memberId } as never);
  vi.mocked(prisma.member.findFirst).mockResolvedValue(
    memberId ? ({ id: memberId } as never) : (null as never),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveOwnMember", () => {
  it("returns the linked member", async () => {
    mockLinkedMember();
    await talentService.getMyProfile(memberCtx);
    expect(prisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: MEMBER, tenantId: TENANT } }),
    );
  });

  it("refuses when the login has no linked member", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ memberId: null } as never);
    await expect(talentService.getMyProfile(memberCtx)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses a member link pointing at another tenant", async () => {
    // The User -> Member link is a simple FK and the database cannot prevent a
    // cross-tenant pair, so this re-check is the only thing standing between a
    // crafted link and reading another church's member.
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ memberId: MEMBER } as never);
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null as never);
    await expect(talentService.getMyProfile(memberCtx)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("self-service profile", () => {
  it("lets a member save their own profile without talent.update", async () => {
    mockLinkedMember();
    vi.mocked(talentRepository.upsertProfile).mockResolvedValue(savedProfile());

    // memberCtx has no talent.update at all; this must still work, because a
    // member editing their own profile is an ownership rule, not a permission.
    await talentService.saveMyProfile(memberCtx, { skills: ["Guitar"] });

    expect(talentRepository.upsertProfile).toHaveBeenCalledWith(
      TENANT,
      MEMBER,
      { skills: ["Guitar"] },
      ["Guitar"],
      "u-1",
    );
  });

  it("writes the member the login owns, never one from the body", async () => {
    mockLinkedMember();
    vi.mocked(talentRepository.upsertProfile).mockResolvedValue(savedProfile());
    await talentService.saveMyProfile(memberCtx, { skills: [] });
    expect(talentRepository.upsertProfile).toHaveBeenCalledWith(
      TENANT,
      MEMBER,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("returns null rather than throwing when no profile exists yet", async () => {
    mockLinkedMember();
    vi.mocked(talentRepository.getProfileForMember).mockResolvedValue(null);
    await expect(talentService.getMyProfile(memberCtx)).resolves.toBeNull();
  });
});

describe("directory authorization", () => {
  it("refuses an ordinary member", async () => {
    await expect(talentService.listDirectory(memberCtx, PAGE)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(talentRepository.listDirectoryForTenant).not.toHaveBeenCalled();
  });

  it("passes canContact=false to a caller without member-directory rights", async () => {
    vi.mocked(talentRepository.listDirectoryForTenant).mockResolvedValue({
      items: [],
      total: 0,
    });
    await talentService.listDirectory(noContactCtx, PAGE);
    // The repository omits email and phone entirely for this caller, so the
    // values are never fetched and then hidden by the UI.
    expect(talentRepository.listDirectoryForTenant).toHaveBeenCalledWith(
      TENANT,
      PAGE,
      false,
    );
  });

  it("passes canContact=true to a caller who may see the member directory", async () => {
    vi.mocked(talentRepository.listDirectoryForTenant).mockResolvedValue({
      items: [],
      total: 0,
    });
    await talentService.listDirectory(staffCtx, PAGE);
    expect(talentRepository.listDirectoryForTenant).toHaveBeenCalledWith(TENANT, PAGE, true);
  });

  it("silently drops includeNotDiscoverable from a leader", async () => {
    // A leader holds talent.read, so they can list the directory, but they do
    // not hold talent.update and so cannot correct a profile. Letting the flag
    // through would let any leader enumerate members who opted out, which is
    // the one thing the opt-out promises nobody can do.
    const leaderCtx = ctx({ role: "leader", permissions: ["talent.read", "members.read"] });
    vi.mocked(talentRepository.listDirectoryForTenant).mockResolvedValue({
      items: [],
      total: 0,
    });

    await talentService.listDirectory(leaderCtx, { ...PAGE, includeNotDiscoverable: true });

    const forwarded = vi.mocked(talentRepository.listDirectoryForTenant).mock.calls[0][1];
    expect(forwarded.includeNotDiscoverable).toBe(false);
  });

  it("keeps includeNotDiscoverable for an admin, who can correct a profile", async () => {
    vi.mocked(talentRepository.listDirectoryForTenant).mockResolvedValue({
      items: [],
      total: 0,
    });

    await talentService.listDirectory(staffCtx, { ...PAGE, includeNotDiscoverable: true });

    const forwarded = vi.mocked(talentRepository.listDirectoryForTenant).mock.calls[0][1];
    expect(forwarded.includeNotDiscoverable).toBe(true);
  });

  it("hides a non-discoverable member from a leader", async () => {
    // A leader can read the whole directory but is not a supervisor, so the
    // opt-out still applies to them.
    const leaderCtx = ctx({ role: "leader", permissions: ["talent.read", "members.read"] });
    vi.mocked(prisma.talentProfile.findFirst).mockResolvedValue({
      isDiscoverable: false,
      memberId: MEMBER,
    } as never);

    await expect(talentService.getDirectoryEntry(leaderCtx, MEMBER)).resolves.toBeNull();
  });

  it("shows a non-discoverable member to an admin, who supervises the opt-out", async () => {
    const { mapDirectoryEntry } = await import("../../db/repositories/talent-repository");
    vi.mocked(mapDirectoryEntry as any).mockReturnValue(directoryEntry());
    vi.mocked(prisma.talentProfile.findFirst).mockResolvedValue({
      isDiscoverable: false,
      memberId: MEMBER,
    } as never);

    const entry = await talentService.getDirectoryEntry(staffCtx, MEMBER);
    expect(entry).not.toBeNull();
  });
});

describe("staff corrections", () => {
  it("requires talent.update, which a leader does not hold", async () => {
    const leaderCtx = ctx({ role: "leader", permissions: ["talent.read"] });
    await expect(
      talentService.saveProfileForMember(leaderCtx, MEMBER, { skills: [] }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses a member id from another tenant", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null as never);
    await expect(
      talentService.saveProfileForMember(staffCtx, OTHER_TENANT, { skills: [] }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(talentRepository.upsertProfile).not.toHaveBeenCalled();
  });
});

describe("search", () => {
  beforeEach(() => {
    vi.mocked(talentRepository.searchForTenant).mockResolvedValue({
      results: [],
      total: 0,
    });
    // The interpreter is handed the tenant's vocabulary, read here. It is never
    // sent to an AI provider, which is why these mocks matter here rather than
    // in the interpreter's own tests.
    vi.mocked(prisma.skill.findMany).mockResolvedValue([
      { name: "Electrician" },
      { name: "Plumbing" },
    ] as never);
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      { ministry: "Youth Ministry" },
      { ministry: null },
    ] as never);
    vi.mocked(prisma.group.findMany).mockResolvedValue([{ name: "Young Adults" }] as never);
  });

  it("refuses an ordinary member", async () => {
    await expect(
      talentService.search(memberCtx, { question: "who can help", limit: 20 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("always asks the repository for discoverable profiles only", async () => {
    await talentService.search(staffCtx, { question: "who can help", limit: 20 });

    const criteria = vi.mocked(talentRepository.searchForTenant).mock.calls[0][1];
    // Not merely true by default: asserted here because it is the invariant the
    // whole directory rests on.
    expect(criteria.discoverableOnly).toBe(true);
  });

  it("passes the caller's contact rights through to the repository", async () => {
    await talentService.search(noContactCtx, { question: "who can help", limit: 20 });
    expect(vi.mocked(talentRepository.searchForTenant).mock.calls[0][2]).toBe(false);
  });
});

describe("community stats", () => {
  it("needs both halves of the picture", async () => {
    // A caller who can see the directory but not the idea bank should not get a
    // card that quietly reports only the half they may see.
    const talentOnly = ctx({ permissions: ["talent.read"] });
    await expect(talentService.getCommunityStats(talentOnly)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
