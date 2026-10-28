/**
 * Prayer Request Service
 *
 * Business logic and security boundary for Prayer Requests.
 */

import { BaseService } from "./base-service";
import type { TenantContext } from "../types";
import { NotFoundError, ForbiddenError } from "../errors";
import { requirePermission, hasPermission } from "../authorization";
import { prayerRepository, type ListPrayersFilter } from "../../db/repositories/prayer-repository";
import { resolveOwnMember } from "./own-member";
import type { CreatePrayerRequestInput, UpdatePrayerRequestInput } from "../validation";

export class PrayerService extends BaseService {
  /**
   * List prayer requests.
   * If caller has `prayers.read`, can read church-wide requests.
   * If regular member, automatically restricted to their own submitted prayer requests.
   */
  async listPrayers(ctx: TenantContext, filter: ListPrayersFilter = {}) {
    const tenant = this.ensureTenant(ctx);

    const canReadChurchPrayers = hasPermission(ctx, "prayers.read");
    let targetMemberId = filter.memberId;

    if (!canReadChurchPrayers) {
      const own = await resolveOwnMember(ctx);
      targetMemberId = own.id;
    }

    return prayerRepository.listPrayers(tenant.tenantId, {
      ...filter,
      memberId: targetMemberId,
    });
  }

  /**
   * Get single prayer request.
   */
  async getPrayerById(ctx: TenantContext, id: string) {
    const tenant = this.ensureTenant(ctx);
    const prayer = await prayerRepository.findPrayerById(tenant.tenantId, id);

    if (!prayer) {
      throw new NotFoundError("PrayerRequest", id);
    }

    const canReadChurchPrayers = hasPermission(ctx, "prayers.read");
    if (!canReadChurchPrayers) {
      const own = await resolveOwnMember(ctx);
      if (prayer.memberId !== own.id) {
        throw new ForbiddenError("You can only view your own prayer requests");
      }
    }

    return prayer;
  }

  /**
   * Create prayer request.
   * Requires `prayers.create`.
   * If memberId is omitted, resolves automatically from the caller's login.
   */
  async createPrayer(ctx: TenantContext, data: CreatePrayerRequestInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "prayers.create");

    let memberId = data.memberId;
    const canManagePrayers = hasPermission(ctx, "prayers.read");

    if (!memberId || !canManagePrayers) {
      const own = await resolveOwnMember(ctx);
      memberId = own.id;
    }

    const prayer = await prayerRepository.createPrayer(tenant.tenantId, {
      memberId,
      category: data.category,
      request: data.request,
      assignedShepherd: data.assignedShepherd,
    });

    await this.audit(ctx, "prayer.created", "prayer", prayer.id, undefined, {
      category: prayer.category,
      memberId: prayer.memberId,
    });

    return prayer;
  }

  /**
   * Update prayer request.
   * Requires `prayers.update`.
   */
  async updatePrayer(ctx: TenantContext, id: string, data: UpdatePrayerRequestInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "prayers.update");

    const existing = await prayerRepository.findPrayerById(tenant.tenantId, id);
    if (!existing) {
      throw new NotFoundError("PrayerRequest", id);
    }

    const updated = await prayerRepository.updatePrayer(tenant.tenantId, id, data);
    await this.audit(ctx, "prayer.updated", "prayer", id, existing, updated);

    return updated;
  }

  /**
   * Delete prayer request.
   * Requires `prayers.delete`.
   */
  async deletePrayer(ctx: TenantContext, id: string) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "prayers.delete");

    const existing = await prayerRepository.findPrayerById(tenant.tenantId, id);
    if (!existing) {
      throw new NotFoundError("PrayerRequest", id);
    }

    await prayerRepository.deletePrayer(tenant.tenantId, id);
    await this.audit(ctx, "prayer.deleted", "prayer", id, { category: existing.category });

    return { success: true };
  }
}

export const prayerService = new PrayerService();
