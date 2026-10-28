/**
 * Family Repository
 *
 * Tenant-scoped data access for the family domain. The FamilyService calls
 * this repository; the repository calls Prisma. Route handlers never touch
 * Prisma directly.
 *
 * CRITICAL SECURITY RULE (tenant isolation):
 * Every query filters on tenantId. The tenantId used here is ALWAYS the
 * server-resolved tenant from TenantContext — never a client-supplied value.
 * A family, a relationship or a member belonging to another tenant is simply
 * not addressable, so cross-tenant links cannot be created or read.
 */

import prisma from "../prisma";
import { summarizeHousehold } from "../../family/family-household";
import type {
  Family,
  FamilyDirectoryEntry,
  FamilyMember,
  FamilyRelationship,
  FamilyRelationshipType,
} from "../../backend/types";

export interface ListFamiliesFilter {
  search?: string;
  headMemberId?: string;
  /** Only families that have (or do not have) a real stored family photo. */
  hasPhoto?: boolean;
  /** Only families that do (or do not) have at least one child relationship. */
  hasChildren?: boolean;
  /** Inclusive lower bound on the number of members in the household. */
  minSize?: number;
  /** Inclusive upper bound on the number of members in the household. */
  maxSize?: number;
  /** Only families recording at least one relationship of this type. */
  relationshipType?: FamilyRelationshipType;
  page?: number;
  limit?: number;
}

export interface CreateFamilyRecordInput {
  name: string;
  familyPhotoUrl?: string | null;
  headMemberId?: string | null;
  notes?: string | null;
}

export interface UpdateFamilyRecordInput {
  name?: string;
  familyPhotoUrl?: string | null;
  headMemberId?: string | null;
  notes?: string | null;
}

function mapFamily(raw: any): Family {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    name: raw.name,
    familyPhotoUrl: raw.familyPhotoUrl ?? null,
    headMemberId: raw.headMemberId ?? null,
    notes: raw.notes ?? null,
    createdAt: new Date(raw.createdAt).toISOString(),
    updatedAt: new Date(raw.updatedAt).toISOString(),
  };
}

function mapRelationship(raw: any): FamilyRelationship {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    familyId: raw.familyId,
    fromMemberId: raw.fromMemberId,
    toMemberId: raw.toMemberId,
    type: raw.type as FamilyRelationshipType,
    createdAt: new Date(raw.createdAt).toISOString(),
  };
}

function mapMember(raw: any): FamilyMember {
  return {
    id: raw.id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    status: raw.status ?? null,
  };
}

const familyInclude = {
  relationships: { orderBy: { createdAt: "asc" as const } },
  headMember: true,
};

/** Types that make the target of the row a child. */
const PARENT_ROLE_FILTER: FamilyRelationshipType[] = ["father", "mother", "guardian"];

/**
 * Translate the directory filters into a Prisma `where` clause.
 *
 * Shared by the paginated list and the directory query so both screens filter
 * identically. `tenantId` is always the server-resolved tenant, so it is the
 * one condition that can never be influenced by a request.
 */
function buildDirectoryWhere(tenantId: string, filter: ListFamiliesFilter): any {
  const where: any = { tenantId };

  if (filter.headMemberId) {
    where.headMemberId = filter.headMemberId;
  }

  if (filter.hasPhoto !== undefined) {
    where.familyPhotoUrl = filter.hasPhoto ? { not: null } : null;
  }

  // A child is the target of a parent row, or the source of a `child` row. Both
  // storage conventions are honoured, matching how the tree builder normalises
  // them, so a family is never wrongly reported as childless.
  const relationshipFilters: any[] = [];
  if (filter.hasChildren !== undefined) {
    const hasChildRelationship = {
      OR: [
        { toMember: { familyRelationsTo: { some: { type: { in: PARENT_ROLE_FILTER } } } } },
        { fromMember: { familyRelationsFrom: { some: { type: "child" } } } },
      ],
    };
    relationshipFilters.push(
      filter.hasChildren ? { some: hasChildRelationship } : { none: hasChildRelationship },
    );
  }
  if (filter.relationshipType) {
    relationshipFilters.push({ some: { type: filter.relationshipType } });
  }
  if (relationshipFilters.length === 1) {
    where.relationships = relationshipFilters[0];
  } else if (relationshipFilters.length > 1) {
    where.AND = relationshipFilters.map((f) => ({ relationships: f }));
  }

  if (filter.search?.trim()) {
    const q = filter.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      {
        relationships: {
          some: {
            OR: [
              { fromMember: { firstName: { contains: q, mode: "insensitive" } } },
              { fromMember: { lastName: { contains: q, mode: "insensitive" } } },
              { toMember: { firstName: { contains: q, mode: "insensitive" } } },
              { toMember: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          },
        },
      },
    ];
  }

  return where;
}

export const familyRepository = {
  // ─── Families ─────────────────────────────────────────────

  async findForTenant(tenantId: string, id: string): Promise<Family | null> {
    const raw = await prisma.family.findFirst({ where: { id, tenantId }, include: familyInclude });
    if (!raw) return null;
    return {
      ...mapFamily(raw),
      relationships: (raw.relationships ?? []).map(mapRelationship),
    };
  },

  async listForTenant(
    tenantId: string,
    filter: ListFamiliesFilter = {},
  ): Promise<{ items: Family[]; total: number }> {
    const where = buildDirectoryWhere(tenantId, filter);

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 50;
    const skip = (page - 1) * limit;

    const items = await prisma.family.findMany({
      where,
      include: familyInclude,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    });
    const total = await prisma.family.count({ where });

    return { items: items.map(mapFamily), total };
  },

  /**
   * The Families directory: each family with its household split into fathers,
   * mothers and children, plus the counts the administrative table renders.
   *
   * Membership is derived entirely from stored relationships, so a family with
   * no father simply reports an empty `fathers` list instead of being hidden
   * or having a parent invented for it.
   */
  async listDirectoryForTenant(
    tenantId: string,
    filter: ListFamiliesFilter = {},
  ): Promise<FamilyDirectoryEntry[]> {
    // Size bounds cannot be expressed in the Prisma `where` clause because a
    // household size is the count of distinct members across relationship rows.
    // Those filters are therefore applied after the rows are loaded, and the
    // remaining filters still go to the database.
    const { minSize, maxSize, ...dbFilter } = filter;

    const rows = await prisma.family.findMany({
      where: buildDirectoryWhere(tenantId, dbFilter),
      include: {
        ...familyInclude,
        relationships: {
          orderBy: { createdAt: "asc" as const },
          include: { fromMember: true, toMember: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const entries: FamilyDirectoryEntry[] = rows.map((raw) => {
      const relationships = (raw.relationships ?? []) as any[];

      // Build the member lookup once. `familyInclude` already pulls headMember,
      // but a head with no relationship row would otherwise be missing, so it
      // is merged in explicitly before the household is summarised.
      const membersById = new Map<string, FamilyMember>();
      for (const rel of relationships) {
        for (const member of [rel.fromMember, rel.toMember]) {
          if (member) membersById.set(member.id, mapMember(member));
        }
      }
      if (raw.headMember?.id && !membersById.has(raw.headMember.id)) {
        membersById.set(raw.headMember.id, mapMember(raw.headMember));
      }

      const summary = summarizeHousehold({
        family: mapFamily(raw),
        relationships: relationships.map(mapRelationship),
        membersById,
      });

      return { family: mapFamily(raw), ...summary };
    });

    return entries.filter((entry) => {
      if (minSize !== undefined && entry.familySize < minSize) return false;
      if (maxSize !== undefined && entry.familySize > maxSize) return false;
      return true;
    });
  },

  async create(tenantId: string, input: CreateFamilyRecordInput): Promise<Family> {
    const trimmedName = input.name.trim();
    const existing = await prisma.family.findFirst({
      where: {
        tenantId,
        name: { equals: trimmedName, mode: "insensitive" },
      },
      include: familyInclude,
    });

    if (existing) {
      if (input.headMemberId && !existing.headMemberId) {
        const updated = await prisma.family.update({
          where: { id: existing.id },
          data: { headMemberId: input.headMemberId },
          include: familyInclude,
        });
        return {
          ...mapFamily(updated),
          relationships: (updated.relationships ?? []).map(mapRelationship),
        };
      }
      return {
        ...mapFamily(existing),
        relationships: (existing.relationships ?? []).map(mapRelationship),
      };
    }

    const created = await prisma.family.create({
      data: {
        tenantId,
        name: trimmedName,
        familyPhotoUrl: input.familyPhotoUrl ?? null,
        headMemberId: input.headMemberId ?? null,
        notes: input.notes ?? null,
      },
      include: familyInclude,
    });
    return {
      ...mapFamily(created),
      relationships: (created.relationships ?? []).map(mapRelationship),
    };
  },

  async update(
    tenantId: string,
    id: string,
    input: UpdateFamilyRecordInput,
  ): Promise<Family | null> {
    const existing = await prisma.family.findFirst({ where: { id, tenantId } });
    if (!existing) return null;

    const data: any = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.familyPhotoUrl !== undefined) data.familyPhotoUrl = input.familyPhotoUrl;
    if (input.headMemberId !== undefined) data.headMemberId = input.headMemberId;
    if (input.notes !== undefined) data.notes = input.notes;

    const updated = await prisma.family.update({
      where: { id },
      data,
      include: familyInclude,
    });
    return {
      ...mapFamily(updated),
      relationships: (updated.relationships ?? []).map(mapRelationship),
    };
  },

  async deleteForTenant(tenantId: string, id: string): Promise<boolean> {
    const existing = await prisma.family.findFirst({ where: { id, tenantId } });
    if (!existing) return false;
    await prisma.family.delete({ where: { id } });
    return true;
  },

  // ─── Members ──────────────────────────────────────────────

  /** Tenant-scoped member existence check. A foreign member id simply misses. */
  async memberExistsForTenant(tenantId: string, memberId: string): Promise<boolean> {
    const found = await prisma.member.findFirst({
      where: { id: memberId, tenantId },
      select: { id: true },
    });
    return found !== null;
  },

  async getMembersForTenant(tenantId: string, ids: string[]): Promise<FamilyMember[]> {
    if (ids.length === 0) return [];
    const rows = await prisma.member.findMany({
      where: { tenantId, id: { in: ids } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return rows.map(mapMember);
  },

  // ─── Relationships ────────────────────────────────────────

  /**
   * Find the family a member belongs to, from ANY side of any relationship.
   *
   * This is what makes the feature work: opening the father, the mother or a
   * child all resolve to the same family record without membership ever being
   * stored on the member.
   */
  async findFamilyIdForMember(tenantId: string, memberId: string): Promise<string | null> {
    const rel = await prisma.familyRelationship.findFirst({
      where: {
        tenantId,
        OR: [{ fromMemberId: memberId }, { toMemberId: memberId }],
      },
      orderBy: { createdAt: "asc" },
      select: { familyId: true },
    });
    return rel?.familyId ?? null;
  },

  async listRelationshipsForFamily(
    tenantId: string,
    familyId: string,
  ): Promise<FamilyRelationship[]> {
    const rows = await prisma.familyRelationship.findMany({
      where: { tenantId, familyId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapRelationship);
  },

  async findRelationshipForTenant(
    tenantId: string,
    relationshipId: string,
  ): Promise<FamilyRelationship | null> {
    const raw = await prisma.familyRelationship.findFirst({
      where: { id: relationshipId, tenantId },
    });
    return raw ? mapRelationship(raw) : null;
  },

  /**
   * Look for an existing relationship row matching the exact same endpoints
   * and type, in ANY family. Used to reject duplicates.
   *
   * `variant` lets symmetric types (spouse, sibling) be checked in both
   * directions, because a church may record "A is spouse of B" either way.
   */
  async findRelationshipByEndpoints(
    tenantId: string,
    fromMemberId: string,
    toMemberId: string,
    type: FamilyRelationshipType,
    familyId?: string,
  ): Promise<FamilyRelationship | null> {
    const where: any = {
      tenantId,
      type,
      OR: [
        { fromMemberId, toMemberId },
        { fromMemberId: toMemberId, toMemberId: fromMemberId },
      ],
    };
    if (familyId) where.familyId = familyId;

    const raw = await prisma.familyRelationship.findFirst({
      where,
      orderBy: { createdAt: "asc" },
    });
    return raw ? mapRelationship(raw) : null;
  },

  /**
   * Detect whether adding `parentId -> childId` would make somebody their own
   * ancestor.
   *
   * A new parent/child edge closes a cycle exactly when the proposed child is
   * already an ancestor of the proposed parent, i.e. when a path of existing
   * parent -> child edges already leads from the child down to the parent. The
   * whole ancestor chain is walked, so a three-generation loop such as
   * A -> B -> C -> A is rejected, not just a direct two-person loop.
   *
   * The check is scoped to the proposed pair rather than to "is this person a
   * parent somewhere", which is what previously made it reject legitimate
   * families: being a mother in her own right does not stop a woman from also
   * being recorded as a child of her own parents.
   */
  async wouldCreateAncestorCycle(
    tenantId: string,
    familyId: string,
    parentId: string,
    childId: string,
    excludeRelationshipId?: string,
  ): Promise<boolean> {
    // A person cannot be their own parent, whatever the stored data says.
    if (parentId === childId) return true;

    const rows = await prisma.familyRelationship.findMany({
      where: {
        tenantId,
        familyId,
        type: { in: ["father", "mother", "guardian", "child"] },
        ...(excludeRelationshipId ? { id: { not: excludeRelationshipId } } : {}),
      },
      select: { fromMemberId: true, toMemberId: true, type: true },
    });

    // Normalise both storage conventions into a single parent -> child edge.
    // `father`/`mother`/`guardian` rows are stored parent-first, while a
    // `child` row is stored child-first, so the two are flipped here.
    const childrenOf = new Map<string, string[]>();
    for (const row of rows) {
      const parentFirst = row.type !== "child";
      const parent = parentFirst ? row.fromMemberId : row.toMemberId;
      const child = parentFirst ? row.toMemberId : row.fromMemberId;
      const existing = childrenOf.get(parent);
      if (existing) existing.push(child);
      else childrenOf.set(parent, [child]);
    }

    // Depth-first walk down the existing ancestry from the proposed child.
    const seen = new Set<string>([childId]);
    const stack = [childId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === parentId) return true;
      for (const child of childrenOf.get(current) ?? []) {
        if (seen.has(child)) continue;
        seen.add(child);
        stack.push(child);
      }
    }

    return false;
  },

  async createRelationship(
    tenantId: string,
    input: {
      familyId: string;
      fromMemberId: string;
      toMemberId: string;
      type: FamilyRelationshipType;
    },
  ): Promise<FamilyRelationship> {
    const created = await prisma.familyRelationship.create({
      data: {
        tenantId,
        familyId: input.familyId,
        fromMemberId: input.fromMemberId,
        toMemberId: input.toMemberId,
        type: input.type,
      },
    });
    return mapRelationship(created);
  },

  async updateRelationship(
    tenantId: string,
    relationshipId: string,
    input: {
      fromMemberId?: string;
      toMemberId?: string;
      type?: FamilyRelationshipType;
    },
  ): Promise<FamilyRelationship | null> {
    const existing = await prisma.familyRelationship.findFirst({
      where: { id: relationshipId, tenantId },
    });
    if (!existing) return null;

    const data: any = {};
    if (input.fromMemberId !== undefined) data.fromMemberId = input.fromMemberId;
    if (input.toMemberId !== undefined) data.toMemberId = input.toMemberId;
    if (input.type !== undefined) data.type = input.type;

    const updated = await prisma.familyRelationship.update({
      where: { id: relationshipId },
      data,
    });
    return mapRelationship(updated);
  },

  async deleteRelationshipForTenant(tenantId: string, relationshipId: string): Promise<boolean> {
    const existing = await prisma.familyRelationship.findFirst({
      where: { id: relationshipId, tenantId },
    });
    if (!existing) return false;
    await prisma.familyRelationship.delete({ where: { id: relationshipId } });
    return true;
  },
};
