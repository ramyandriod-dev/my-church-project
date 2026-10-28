/**
 * Talent Repository
 *
 * These tests cover the query construction, not the SQL Prisma emits. What
 * matters is the shape of the `where` clause handed to Prisma, because that
 * clause is the last thing standing between an opted-out member and the
 * directory.
 *
 * A repository test that asserted on mocked return values would prove nothing
 * about filtering. Asserting on the filter is the part that can actually
 * regress: someone tidying a `where` object can easily widen it by accident,
 * and a mocked-result test would keep passing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { talentRepository } from "./talent-repository";
import prisma from "../prisma";

const TENANT = "t-1";
const PAGE = { page: 1, limit: 20 };

/** The `where` clause of the most recent findMany call. */
function lastWhere(): Record<string, any> {
  return (vi.mocked(prisma.talentProfile.findMany).mock.calls.at(-1)?.[0]?.where ?? {}) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.talentProfile.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.talentProfile.count).mockResolvedValue(0 as never);
});

describe("directory filtering", () => {
  it("excludes opted-out members by default", async () => {
    await talentRepository.listDirectoryForTenant(TENANT, PAGE, true);
    // Absent is not good enough: the flag must be positively required, or a
    // default change in Prisma's behaviour would expose everyone.
    expect(lastWhere()).toMatchObject({ tenantId: TENANT, isDiscoverable: true });
  });

  it("includes opted-out members only when explicitly asked", async () => {
    await talentRepository.listDirectoryForTenant(
      TENANT,
      { ...PAGE, includeNotDiscoverable: true },
      true,
    );
    // The key must be absent entirely, not set to false.
    expect(lastWhere()).not.toHaveProperty("isDiscoverable");
  });

  it("always scopes to the tenant, with or without the opt-out", async () => {
    await talentRepository.listDirectoryForTenant(TENANT, PAGE, true);
    expect(lastWhere().tenantId).toBe(TENANT);

    await talentRepository.listDirectoryForTenant(
      TENANT,
      { ...PAGE, includeNotDiscoverable: true },
      true,
    );
    expect(lastWhere().tenantId).toBe(TENANT);
  });

  it("ignores an 'any' willingness filter rather than matching the literal", async () => {
    await talentRepository.listDirectoryForTenant(
      TENANT,
      { ...PAGE, willingness: "any" as never },
      true,
    );
    expect(lastWhere()).not.toHaveProperty("willingness");
  });

  it("applies a real willingness filter", async () => {
    await talentRepository.listDirectoryForTenant(
      TENANT,
      { ...PAGE, willingness: "yes" as never },
      true,
    );
    expect(lastWhere().willingness).toBe("yes");
  });

  it("keeps the discoverable filter while other filters are applied", async () => {
    await talentRepository.listDirectoryForTenant(
      TENANT,
      { ...PAGE, skill: "Guitar", ministry: "Youth", search: "ami" },
      true,
    );
    const where = lastWhere();
    // Filters are additive, so a search term must not quietly drop the opt-out.
    expect(where.isDiscoverable).toBe(true);
    expect(where.tenantId).toBe(TENANT);
  });

  it("defaults pagination rather than trusting the caller", async () => {
    await talentRepository.listDirectoryForTenant(
      TENANT,
      { page: 0, limit: -5 },
      true,
    );
    const args = vi.mocked(prisma.talentProfile.findMany).mock.calls.at(-1)?.[0];
    expect(args?.skip).toBe(0);
    expect(args?.take).toBe(20);
  });
});

describe("contact details", () => {
  /**
   * The projection is the boundary, not the query.
   *
   * `profileInclude` is an `include`, so member scalars are fetched regardless of
   * the caller. That is not itself a leak — the server already has database
   * access — but it does mean the only thing standing between the data and the
   * response is `mapDirectoryEntry`. So the guarantee is asserted there.
   */
  const raw = {
    memberId: "m-1",
    isDiscoverable: true,
    professionCategory: "trades",
    profession: "Electrician",
    experience: "Certified.",
    yearsExperience: 15,
    willingness: "yes",
    willingAreas: "Emergency repairs.",
    updatedAt: new Date(0),
    createdAt: new Date(0),
    updatedByUserId: null,
    memberSkills: [],
    member: {
      firstName: "Michael",
      lastName: "Williams",
      avatarUrl: null,
      status: "active",
      ministry: "Facilities",
      email: "michael@example.com",
      phone: "+1 555 0101",
      group: { name: "Young Adults" },
    },
  };

  it("omits contact fields entirely for a caller who may not see them", async () => {
    const { mapDirectoryEntry } = await import("./talent-repository");
    const entry = mapDirectoryEntry(raw, false);
    // Absent, not blank: `"email" in entry` must be false so there is no empty
    // key for a caller to accidentally read as "contact withheld".
    expect("email" in entry).toBe(false);
    expect("phone" in entry).toBe(false);
    expect(entry.canContact).toBe(false);
  });

  it("includes contact fields for a caller who may see them", async () => {
    const { mapDirectoryEntry } = await import("./talent-repository");
    const entry = mapDirectoryEntry(raw, true);
    expect(entry.email).toBe("michael@example.com");
    expect(entry.phone).toBe("+1 555 0101");
    expect(entry.canContact).toBe(true);
  });

  it("keeps the non-contact fields in both cases", async () => {
    const { mapDirectoryEntry } = await import("./talent-repository");
    for (const canContact of [true, false]) {
      const entry = mapDirectoryEntry(raw, canContact);
      expect(entry.firstName).toBe("Michael");
      expect(entry.profession).toBe("Electrician");
      expect(entry.ministry).toBe("Facilities");
      expect(entry.groupName).toBe("Young Adults");
    }
  });
});

describe("multi-skill filtering", () => {
  const GUITAR = "11111111-1111-1111-1111-111111111111";
  const ARABIC = "22222222-2222-2222-2222-222222222222";
  const KEYBOARD = "33333333-3333-3333-3333-333333333333";

  it("selects no skill condition at all when none are chosen", async () => {
    await talentRepository.listDirectoryForTenant(TENANT, { ...PAGE, skills: [] }, true);
    expect(JSON.stringify(lastWhere())).not.toContain(GUITAR);
  });

  it("ORs the selected skills in the default 'any' mode", async () => {
    await talentRepository.listDirectoryForTenant(
      TENANT,
      { ...PAGE, skills: [GUITAR, ARABIC] },
      true,
    );
    // "any" is a single `some` over the id list: one condition, either skill.
    expect(lastWhere().AND).toEqual([
      { member: { skills: { some: { skillId: { in: [GUITAR, ARABIC] } } } } },
    ]);
  });

  it("requires one `some` per skill in 'all' mode", async () => {
    await talentRepository.listDirectoryForTenant(
      TENANT,
      { ...PAGE, skills: [GUITAR, ARABIC, KEYBOARD], skillMode: "all" },
      true,
    );
    // A single `some: { in: [...] }` here would be satisfied by ANY of the three
    // and would silently degrade "all" into "any". Each skill needs its own
    // condition so all of them are required.
    expect(lastWhere().AND).toEqual([
      { member: { skills: { some: { skillId: GUITAR } } } },
      { member: { skills: { some: { skillId: ARABIC } } } },
      { member: { skills: { some: { skillId: KEYBOARD } } } },
    ]);
  });

  it("treats a missing skillMode as 'any'", async () => {
    await talentRepository.listDirectoryForTenant(TENANT, { ...PAGE, skills: [GUITAR] }, true);
    expect(lastWhere().AND).toEqual([
      { member: { skills: { some: { skillId: { in: [GUITAR] } } } } },
    ]);
  });

  it("keeps the opt-out enforced alongside a skill filter", async () => {
    await talentRepository.listDirectoryForTenant(
      TENANT,
      { ...PAGE, skills: [GUITAR], skillMode: "all" },
      true,
    );
    // Narrowing by skill must never become a way around discoverability.
    expect(lastWhere()).toMatchObject({ tenantId: TENANT, isDiscoverable: true });
  });

  it("ANDs the skill filter with the other member filters", async () => {
    await talentRepository.listDirectoryForTenant(
      TENANT,
      { ...PAGE, skills: [GUITAR], ministry: "Worship" },
      true,
    );
    // All three must be present and separate: merging them would let one filter
    // quietly replace another.
    expect(lastWhere().AND).toHaveLength(2);
    expect(lastWhere().AND).toContainEqual({
      member: { ministry: { contains: "Worship", mode: "insensitive" } },
    });
  });
});

describe("skill facet counts", () => {
  const GUITAR = "11111111-1111-1111-1111-111111111111";
  const ARABIC = "22222222-2222-2222-2222-222222222222";

  function mockFacets(counts: { skillId: string; count: number }[], skills: any[]) {
    vi.mocked(prisma.memberSkill.groupBy).mockResolvedValue(
      counts.map((c) => ({ skillId: c.skillId, _count: { _all: c.count } })) as never,
    );
    vi.mocked(prisma.skill.findMany).mockResolvedValue(skills as never);
  }

  beforeEach(() => {
    vi.mocked(prisma.skill.findMany).mockResolvedValue([] as never);
  });

  it("enforces discoverability, because a count is itself a disclosure", async () => {
    mockFacets([], []);
    await talentRepository.getSkillFacets(TENANT, {});
    const where = (vi.mocked(prisma.memberSkill.groupBy).mock.calls.at(-1)?.[0] as any).where;
    // Without this, a facet count would reveal the existence and size of a group
    // of members who asked not to be surfaced.
    expect(where.member.talentProfile.is).toMatchObject({
      tenantId: TENANT,
      isDiscoverable: true,
    });
  });

  it("includes opted-out members in the counts only when asked", async () => {
    mockFacets([], []);
    await talentRepository.getSkillFacets(TENANT, { includeNotDiscoverable: true });
    const where = (vi.mocked(prisma.memberSkill.groupBy).mock.calls.at(-1)?.[0] as any).where;
    expect(where.member.talentProfile.is).not.toHaveProperty("isDiscoverable");
  });

  it("does NOT apply the skill selection, so unchecked skills keep their counts", async () => {
    mockFacets([{ skillId: GUITAR, count: 4 }], [
      { id: GUITAR, name: "Guitar", category: "Music" },
    ]);

    await talentRepository.getSkillFacets(TENANT, {
      skills: [GUITAR],
      skillMode: "all",
    });

    const where = (vi.mocked(prisma.memberSkill.groupBy).mock.calls.at(-1)?.[0] as any).where;
    // If the selection leaked in here, every unselected skill would drop to zero
    // the moment one was ticked, and the panel could neither widen the query nor
    // distinguish "nobody has this" from "outside my filter".
    expect(JSON.stringify(where)).not.toContain(GUITAR);
  });

  it("applies the other filters, so counts describe the visible list", async () => {
    mockFacets([], []);
    await talentRepository.getSkillFacets(TENANT, {
      search: "Amina",
      ministry: "Worship",
      group: "Youth",
      willingness: "yes",
      professionCategory: "music",
    });
    const where = (vi.mocked(prisma.memberSkill.groupBy).mock.calls.at(-1)?.[0] as any).where;
    expect(where.member.ministry).toEqual({ contains: "Worship", mode: "insensitive" });
    expect(where.member.group).toEqual({ name: { contains: "Youth", mode: "insensitive" } });
    expect(where.member.OR).toEqual([
      { firstName: { contains: "Amina", mode: "insensitive" } },
      { lastName: { contains: "Amina", mode: "insensitive" } },
    ]);
    expect(where.member.talentProfile.is).toMatchObject({
      willingness: "yes",
      professionCategory: "music",
    });
  });

  it("returns counts most-populous first, with the skill name attached", async () => {
    mockFacets(
      [
        { skillId: GUITAR, count: 2 },
        { skillId: ARABIC, count: 7 },
      ],
      [
        { id: GUITAR, name: "Guitar", category: "Music" },
        { id: ARABIC, name: "Arabic", category: "Language" },
      ],
    );

    const facets = await talentRepository.getSkillFacets(TENANT, {});

    expect(facets).toEqual([
      { skill: { id: ARABIC, name: "Arabic", category: "Language" }, count: 7 },
      { skill: { id: GUITAR, name: "Guitar", category: "Music" }, count: 2 },
    ]);
  });

  it("omits skills nobody holds rather than offering a zero", async () => {
    mockFacets([{ skillId: GUITAR, count: 0 }], [
      { id: GUITAR, name: "Guitar", category: "Music" },
    ]);
    // A checkbox that can only ever return nobody is noise in the panel.
    await expect(talentRepository.getSkillFacets(TENANT, {})).resolves.toEqual([]);
  });

  it("skips a count whose skill row has since been deleted", async () => {
    mockFacets([{ skillId: GUITAR, count: 3 }], []);
    // The count exists but the name does not. Rendering an empty label would be
    // worse than omitting it.
    await expect(talentRepository.getSkillFacets(TENANT, {})).resolves.toEqual([]);
  });
});
