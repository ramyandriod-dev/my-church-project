/**
 * Family Service
 *
 * Business logic and the security boundary for the family domain.
 *
 * Responsibilities:
 * - Tenant scoping derived from the server-resolved TenantContext
 * - Authorization checks on every operation
 * - Integrity rules that keep the relationship graph physically sensible
 * - Audit logging for all mutations
 * - Delegation to the pure tree builder for read models
 *
 * The integrity rules here are deliberately conservative. They reject the
 * relationships that cannot exist in real life (a person related to
 * themselves, a person who is simultaneously their own grandparent, a
 * duplicate spouse record) and leave genuinely ambiguous situations alone.
 */

import { BaseService } from "./base-service";
import { familyRepository } from "../../db/repositories/family-repository";
import { followUpRepository } from "../../db/repositories/follow-up-repository";
import { buildFamilyTree } from "../../family/family-tree";
import { requirePermission } from "../authorization";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import {
  isSymmetricRelationship,
  type CreateFamilyInput,
  type Family,
  type FamilyDirectoryEntry,
  type FamilyMember,
  type FamilyRelationship,
  type FamilyRelationshipType,
  type FamilyTree,
  type TenantContext,
  type UpdateFamilyInput,
  type UpdateFamilyRelationshipInput,
} from "../types";
import type { ListFamiliesFilter as ListFamilyDirectoryFilter } from "../../db/repositories/family-repository";

export class FamilyService extends BaseService {
  // ─── Reads ────────────────────────────────────────────────

  /**
   * List families for the tenant.
   */
  async listFamilies(
    ctx: TenantContext,
    filter: { search?: string; headMemberId?: string; page?: number; limit?: number } = {},
  ): Promise<{ items: Family[]; total: number }> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.read");
    return familyRepository.listForTenant(ctx.tenantId, filter);
  }

  /**
   * The Families directory.
   *
   * Returns each family with its household already split into fathers, mothers
   * and children so the administrative table never has to infer a structure.
   * A family missing any of those simply reports an empty list for it.
   */
  async listFamilyDirectory(
    ctx: TenantContext,
    filter: ListFamilyDirectoryFilter = {},
  ): Promise<FamilyDirectoryEntry[]> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.read");
    return familyRepository.listDirectoryForTenant(ctx.tenantId, filter);
  }

  /**
   * Get one family with its relationships.
   */
  async getFamily(ctx: TenantContext, familyId: string): Promise<Family> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.read");

    const family = await familyRepository.findForTenant(ctx.tenantId, familyId);
    if (!family) {
      // Deliberately indistinguishable from a family that does not exist,
      // so this endpoint cannot be used to probe other tenants.
      throw new NotFoundError("Family not found");
    }
    return family;
  }

  /**
   * Resolve and return the full family tree for a member.
   *
   * This is the entry point used by Member 360. It resolves the family from
   * whichever side of whichever relationship the member happens to be on, so
   * opening the father, the mother or a child all return the same family.
   */
  async getFamilyTreeForMember(ctx: TenantContext, memberId: string): Promise<FamilyTree> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.read");

    // Tenant-scoped: a member from another tenant resolves to nothing.
    const memberExists = await familyRepository.memberExistsForTenant(ctx.tenantId, memberId);
    if (!memberExists) {
      throw new NotFoundError("Member not found");
    }

    const familyId = await familyRepository.findFamilyIdForMember(ctx.tenantId, memberId);
    if (!familyId) {
      throw new NotFoundError("This member is not part of a family yet");
    }

    return this.getTreeForFamily(ctx, familyId, memberId);
  }

  /**
   * Build the tree for a family, oriented around a focal member.
   */
  async getTreeForFamily(
    ctx: TenantContext,
    familyId: string,
    focalMemberId: string,
  ): Promise<FamilyTree> {
    const family = await familyRepository.findForTenant(ctx.tenantId, familyId);
    if (!family) throw new NotFoundError("Family not found");

    const relationships = family.relationships ?? [];
    const memberIds = new Set<string>();
    for (const rel of relationships) {
      memberIds.add(rel.fromMemberId);
      memberIds.add(rel.toMemberId);
    }
    // A designated head with no relationships yet still deserves to render.
    if (family.headMemberId) memberIds.add(family.headMemberId);
    memberIds.add(focalMemberId);

    const members: FamilyMember[] = await familyRepository.getMembersForTenant(
      ctx.tenantId,
      [...memberIds],
    );

    return buildFamilyTree({
      family,
      focalMemberId,
      members,
      relationships,
    });
  }

  /**
   * Open follow-ups belonging to the members of a family.
   *
   * This is a read of the EXISTING follow-up workflow, scoped to the household
   * and to the caller's tenant. It creates nothing and computes no new score:
   * a family simply surfaces the follow-ups that already exist for its members,
   * so the user can jump into the normal follow-up screen.
   */
  async listOpenFollowUpsForFamily(ctx: TenantContext, familyId: string) {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.read");

    const family = await familyRepository.findForTenant(ctx.tenantId, familyId);
    if (!family) throw new NotFoundError("Family not found");

    const memberIds = new Set<string>();
    for (const rel of family.relationships ?? []) {
      memberIds.add(rel.fromMemberId);
      memberIds.add(rel.toMemberId);
    }
    if (family.headMemberId) memberIds.add(family.headMemberId);
    if (memberIds.size === 0) return [];

    const result = await followUpRepository.listForTenant(ctx.tenantId, {
      memberIds: [...memberIds],
      status: "open",
      limit: 50,
    });

    return result.items;
  }

  // ─── Family mutations ─────────────────────────────────────

  async createFamily(
    ctx: TenantContext,
    input: CreateFamilyInput,
    request?: Request,
  ): Promise<Family> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.create");

    if (input.headMemberId) {
      // The head must be a member of THIS tenant, otherwise a foreign member
      // could be attached to a family record.
      const ok = await familyRepository.memberExistsForTenant(ctx.tenantId, input.headMemberId);
      if (!ok) {
        throw new ValidationError({
          headMemberId: ["Head member must belong to this church"],
        });
      }
    }

    const family = await familyRepository.create(ctx.tenantId, {
      name: input.name,
      familyPhotoUrl: input.familyPhotoUrl ?? null,
      headMemberId: input.headMemberId ?? null,
      notes: input.notes ?? null,
    });

    await this.audit(
      ctx,
      "family.create",
      "family",
      family.id,
      undefined,
      { name: family.name, headMemberId: family.headMemberId },
      this.getRequestMetadata(request),
    );

    return family;
  }

  async updateFamily(
    ctx: TenantContext,
    familyId: string,
    input: UpdateFamilyInput,
    request?: Request,
  ): Promise<Family> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.update");

    const existing = await familyRepository.findForTenant(ctx.tenantId, familyId);
    if (!existing) throw new NotFoundError("Family not found");

    if (input.headMemberId) {
      const ok = await familyRepository.memberExistsForTenant(ctx.tenantId, input.headMemberId);
      if (!ok) {
        throw new ValidationError({
          headMemberId: ["Head member must belong to this church"],
        });
      }
    }

    const updated = await familyRepository.update(ctx.tenantId, familyId, input);
    if (!updated) throw new NotFoundError("Family not found");

    await this.audit(
      ctx,
      "family.update",
      "family",
      familyId,
      { name: existing.name, headMemberId: existing.headMemberId },
      { name: updated.name, headMemberId: updated.headMemberId },
      this.getRequestMetadata(request),
    );

    return updated;
  }

  async deleteFamily(
    ctx: TenantContext,
    familyId: string,
    request?: Request,
  ): Promise<void> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.delete");

    const existing = await familyRepository.findForTenant(ctx.tenantId, familyId);
    if (!existing) throw new NotFoundError("Family not found");

    await familyRepository.deleteForTenant(ctx.tenantId, familyId);

    await this.audit(
      ctx,
      "family.delete",
      "family",
      familyId,
      { name: existing.name },
      undefined,
      this.getRequestMetadata(request),
    );
  }

  // ─── Relationships ────────────────────────────────────────

  async listRelationships(ctx: TenantContext, familyId: string): Promise<FamilyRelationship[]> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.read");

    const family = await familyRepository.findForTenant(ctx.tenantId, familyId);
    if (!family) throw new NotFoundError("Family not found");

    return family.relationships ?? [];
  }

  async addRelationship(
    ctx: TenantContext,
    familyId: string,
    input: { fromMemberId: string; toMemberId: string; type: FamilyRelationshipType },
    request?: Request,
  ): Promise<FamilyRelationship> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.update");

    const family = await familyRepository.findForTenant(ctx.tenantId, familyId);
    if (!family) throw new NotFoundError("Family not found");

    const fromMemberId = input.fromMemberId;
    const toMemberId = input.toMemberId;

    // Rule: a member can never be related to themselves, in any direction.
    if (fromMemberId === toMemberId) {
      throw new ValidationError({
        toMemberId: ["A member cannot be related to themselves"],
      });
    }

    // Both members must belong to this tenant. This is what makes a
    // cross-tenant link impossible to create.
    const [fromExists, toExists] = await Promise.all([
      familyRepository.memberExistsForTenant(ctx.tenantId, fromMemberId),
      familyRepository.memberExistsForTenant(ctx.tenantId, toMemberId),
    ]);
    if (!fromExists || !toExists) {
      throw new ValidationError({
        fromMemberId: ["Both members must belong to this church"],
        toMemberId: ["Both members must belong to this church"],
      });
    }

    // Rule: no duplicate links. For symmetric types the pair is checked in
    // both directions, because "A is spouse of B" and "B is spouse of A" are
    // the same fact and must never both be stored.
    const existing = await familyRepository.findRelationshipByEndpoints(
      ctx.tenantId,
      fromMemberId,
      toMemberId,
      input.type,
    );
    if (existing) {
      throw new ConflictError(
        isSymmetricRelationship(input.type)
          ? `These members already have a ${input.type} relationship`
          : `This ${input.type} relationship already exists`,
      );
    }

    // Rule: the new link must not make anybody their own ancestor. The whole
    // existing ancestry is walked, so multi-generation loops are caught too.
    const directional = this.directionalPair(input.type, fromMemberId, toMemberId);
    if (directional) {
      const cyclic = await familyRepository.wouldCreateAncestorCycle(
        ctx.tenantId,
        familyId,
        directional.parentId,
        directional.childId,
      );
      if (cyclic) {
        throw new ConflictError(
          "That would place someone in an impossible position in the family tree",
        );
      }
    }

    // Symmetric types are normalised so a pair can only ever be stored once,
    // even before the database unique index sees it.
    const [from, to] = isSymmetricRelationship(input.type)
      ? fromMemberId < toMemberId
        ? [fromMemberId, toMemberId]
        : [toMemberId, fromMemberId]
      : [fromMemberId, toMemberId];

    const created = await familyRepository.createRelationship(ctx.tenantId, {
      familyId,
      fromMemberId: from,
      toMemberId: to,
      type: input.type,
    });

    await this.audit(
      ctx,
      "family.relationship.create",
      "family_relationship",
      created.id,
      undefined,
      { familyId, fromMemberId: from, toMemberId: to, type: input.type },
      this.getRequestMetadata(request),
    );

    return created;
  }

  async updateRelationship(
    ctx: TenantContext,
    familyId: string,
    relationshipId: string,
    input: UpdateFamilyRelationshipInput,
    request?: Request,
  ): Promise<FamilyRelationship> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.update");

    const existing = await familyRepository.findRelationshipForTenant(
      ctx.tenantId,
      relationshipId,
    );
    // The relationship is addressed through a family in the URL, so it must
    // actually belong to that family. Reporting this as "not found" avoids
    // revealing that the id exists under a different family.
    if (!existing || existing.familyId !== familyId) {
      throw new NotFoundError("Relationship not found");
    }

    const fromMemberId = input.fromMemberId ?? existing.fromMemberId;
    const toMemberId = input.toMemberId ?? existing.toMemberId;
    const type = input.type ?? existing.type;

    if (fromMemberId === toMemberId) {
      throw new ValidationError({
        toMemberId: ["A member cannot be related to themselves"],
      });
    }

    const [fromExists, toExists] = await Promise.all([
      familyRepository.memberExistsForTenant(ctx.tenantId, fromMemberId),
      familyRepository.memberExistsForTenant(ctx.tenantId, toMemberId),
    ]);
    if (!fromExists || !toExists) {
      throw new ValidationError({
        fromMemberId: ["Both members must belong to this church"],
        toMemberId: ["Both members must belong to this church"],
      });
    }

    const duplicate = await familyRepository.findRelationshipByEndpoints(
      ctx.tenantId,
      fromMemberId,
      toMemberId,
      type,
    );
    if (duplicate && duplicate.id !== relationshipId) {
      throw new ConflictError(`This ${type} relationship already exists`);
    }

    const directional = this.directionalPair(type, fromMemberId, toMemberId);
    if (directional) {
      // The relationship being edited is excluded from the ancestry walk, so
      // correcting an existing link is not blocked by that same link.
      const cyclic = await familyRepository.wouldCreateAncestorCycle(
        ctx.tenantId,
        existing.familyId,
        directional.parentId,
        directional.childId,
        relationshipId,
      );
      if (cyclic) {
        throw new ConflictError(
          "That would place someone in an impossible position in the family tree",
        );
      }
    }

    const [from, to] = isSymmetricRelationship(type)
      ? fromMemberId < toMemberId
        ? [fromMemberId, toMemberId]
        : [toMemberId, fromMemberId]
      : [fromMemberId, toMemberId];

    const updated = await familyRepository.updateRelationship(ctx.tenantId, relationshipId, {
      fromMemberId: from,
      toMemberId: to,
      type,
    });
    if (!updated) throw new NotFoundError("Relationship not found");

    await this.audit(
      ctx,
      "family.relationship.update",
      "family_relationship",
      relationshipId,
      { fromMemberId: existing.fromMemberId, toMemberId: existing.toMemberId, type: existing.type },
      { fromMemberId: updated.fromMemberId, toMemberId: updated.toMemberId, type: updated.type },
      this.getRequestMetadata(request),
    );

    return updated;
  }

  async deleteRelationship(
    ctx: TenantContext,
    familyId: string,
    relationshipId: string,
    request?: Request,
  ): Promise<void> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "families.update");

    const existing = await familyRepository.findRelationshipForTenant(
      ctx.tenantId,
      relationshipId,
    );
    // Same nested-resource rule as update: the relationship must belong to the
    // family named in the path.
    if (!existing || existing.familyId !== familyId) {
      throw new NotFoundError("Relationship not found");
    }

    await familyRepository.deleteRelationshipForTenant(ctx.tenantId, relationshipId);

    await this.audit(
      ctx,
      "family.relationship.delete",
      "family_relationship",
      relationshipId,
      {
        familyId: existing.familyId,
        fromMemberId: existing.fromMemberId,
        toMemberId: existing.toMemberId,
        type: existing.type,
      },
      undefined,
      this.getRequestMetadata(request),
    );
  }

  // ─── Internals ────────────────────────────────────────────

  /**
   * Map a relationship type onto a (parent, child) pair, or null when the
   * type carries no parent-child meaning.
   */
  private directionalPair(
    type: FamilyRelationshipType,
    fromMemberId?: string,
    toMemberId?: string,
  ): { parentId: string; childId: string } | null {
    if (type === "father" || type === "mother" || type === "guardian") {
      return { parentId: fromMemberId!, childId: toMemberId! };
    }
    if (type === "child") {
      return { parentId: toMemberId!, childId: fromMemberId! };
    }
    return null;
  }
}

export const familyService = new FamilyService();
