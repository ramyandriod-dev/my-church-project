/**
 * Ministry Service
 *
 * Business logic and security boundary for the Church Ministries domain.
 */

import { BaseService } from "./base-service";
import type { TenantContext } from "../types";
import { NotFoundError } from "../errors";
import { requirePermission } from "../authorization";
import { ministryRepository, type ListMinistriesFilter } from "../../db/repositories/ministry-repository";
import type { CreateMinistryInput, UpdateMinistryInput } from "../validation";

export class MinistryService extends BaseService {
  /**
   * List church ministries.
   * Requires `ministries.read`.
   */
  async listMinistries(ctx: TenantContext, filter: ListMinistriesFilter = {}) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "ministries.read");

    return ministryRepository.listMinistries(tenant.tenantId, filter);
  }

  /**
   * Get ministry by ID with linked groups.
   * Requires `ministries.read`.
   */
  async getMinistryById(ctx: TenantContext, id: string) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "ministries.read");

    const ministry = await ministryRepository.findMinistryById(tenant.tenantId, id);
    if (!ministry) {
      throw new NotFoundError("Ministry", id);
    }

    return ministry;
  }

  /**
   * Create church ministry.
   * Requires `ministries.create`.
   */
  async createMinistry(ctx: TenantContext, data: CreateMinistryInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "ministries.create");

    const ministry = await ministryRepository.createMinistry(tenant.tenantId, data);
    await this.audit(ctx, "ministry.created", "ministry", ministry.id, undefined, {
      name: ministry.name,
    });

    return ministry;
  }

  /**
   * Update church ministry.
   * Requires `ministries.update`.
   */
  async updateMinistry(ctx: TenantContext, id: string, data: UpdateMinistryInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "ministries.update");

    const existing = await ministryRepository.findMinistryById(tenant.tenantId, id);
    if (!existing) {
      throw new NotFoundError("Ministry", id);
    }

    const updated = await ministryRepository.updateMinistry(tenant.tenantId, id, data);
    await this.audit(ctx, "ministry.updated", "ministry", id, existing, updated);

    return updated;
  }

  /**
   * Delete church ministry.
   * Requires `ministries.delete`.
   */
  async deleteMinistry(ctx: TenantContext, id: string) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "ministries.delete");

    const existing = await ministryRepository.findMinistryById(tenant.tenantId, id);
    if (!existing) {
      throw new NotFoundError("Ministry", id);
    }

    await ministryRepository.deleteMinistry(tenant.tenantId, id);
    await this.audit(ctx, "ministry.deleted", "ministry", id, { name: existing.name });

    return { success: true };
  }
}

export const ministryService = new MinistryService();
