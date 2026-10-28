/**
 * Group Service
 *
 * Business logic and security boundary for the Church Groups domain.
 */

import { BaseService } from "./base-service";
import type { TenantContext } from "../types";
import { NotFoundError } from "../errors";
import { requirePermission } from "../authorization";
import { groupRepository, type ListGroupsFilter } from "../../db/repositories/group-repository";
import type { CreateGroupInput, UpdateGroupInput } from "../validation";

export class GroupService extends BaseService {
  /**
   * List church groups.
   * Requires `groups.read`.
   */
  async listGroups(ctx: TenantContext, filter: ListGroupsFilter = {}) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "groups.read");

    return groupRepository.listGroups(tenant.tenantId, filter);
  }

  /**
   * Get group by ID with member roster.
   * Requires `groups.read`.
   */
  async getGroupById(ctx: TenantContext, id: string) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "groups.read");

    const group = await groupRepository.findGroupById(tenant.tenantId, id);
    if (!group) {
      throw new NotFoundError("Group", id);
    }

    return group;
  }

  /**
   * Create church group.
   * Requires `groups.create`.
   */
  async createGroup(ctx: TenantContext, data: CreateGroupInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "groups.create");

    const group = await groupRepository.createGroup(tenant.tenantId, data);
    await this.audit(ctx, "group.created", "group", group.id, undefined, {
      name: group.name,
    });

    return group;
  }

  /**
   * Update church group.
   * Requires `groups.update`.
   */
  async updateGroup(ctx: TenantContext, id: string, data: UpdateGroupInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "groups.update");

    const existing = await groupRepository.findGroupById(tenant.tenantId, id);
    if (!existing) {
      throw new NotFoundError("Group", id);
    }

    const updated = await groupRepository.updateGroup(tenant.tenantId, id, data);
    await this.audit(ctx, "group.updated", "group", id, existing, updated);

    return updated;
  }

  /**
   * Delete church group.
   * Requires `groups.delete`.
   */
  async deleteGroup(ctx: TenantContext, id: string) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "groups.delete");

    const existing = await groupRepository.findGroupById(tenant.tenantId, id);
    if (!existing) {
      throw new NotFoundError("Group", id);
    }

    await groupRepository.deleteGroup(tenant.tenantId, id);
    await this.audit(ctx, "group.deleted", "group", id, { name: existing.name });

    return { success: true };
  }
}

export const groupService = new GroupService();
