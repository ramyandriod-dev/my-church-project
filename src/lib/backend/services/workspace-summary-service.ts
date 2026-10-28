/**
 * Workspace Summary Service
 *
 * What the top bar and the dashboard banner show on every page: the service
 * happening now (for the "Live" pill), and what is waiting for this person
 * (for the bell and the banner).
 *
 * Each count is included only when the caller holds the permission that would
 * let them act on it; otherwise it is null and the UI leaves it out. So a
 * leader without `members.read` never sees a new-members count, and nobody
 * learns a pending-prayer count they could not open.
 */

import { BaseService } from "./base-service";
import { workspaceSummaryRepository, type LiveServiceRow } from "../../db/repositories/workspace-summary-repository";
import { hasPermission } from "../authorization";
import type { TenantContext } from "../types";

export interface WorkspaceSummary {
  live: LiveServiceRow | null;
  waiting: {
    /** Prayer wall posts waiting for approval. */
    prayers: number | null;
    /** Open follow-ups due today or overdue. */
    followUps: number | null;
    /** Members added in the last 7 days. */
    newMembers: number | null;
    /** People asking to serve as usher, leader, pastor or admin. */
    roleRequests: number | null;
  };
}

const NEW_MEMBER_DAYS = 7;

export class WorkspaceSummaryService extends BaseService {
  async getSummary(ctx: TenantContext, now: Date = new Date()): Promise<WorkspaceSummary> {
    this.ensureTenant(ctx);
    const t = ctx.tenantId;
    const since = new Date(now.getTime() - NEW_MEMBER_DAYS * 86_400_000);

    const [live, prayers, followUps, newMembers, roleRequests] = await Promise.all([
      hasPermission(ctx, "attendance.read") ? workspaceSummaryRepository.findLiveService(t, now) : null,
      hasPermission(ctx, "prayer_wall.moderate") ? workspaceSummaryRepository.countPendingPrayers(t) : null,
      hasPermission(ctx, "followups.read") ? workspaceSummaryRepository.countFollowUpsDue(t, now) : null,
      hasPermission(ctx, "members.read") ? workspaceSummaryRepository.countNewMembers(t, since) : null,
      hasPermission(ctx, "roles.manage") ? workspaceSummaryRepository.countPendingRoleRequests(t) : null,
    ]);

    return { live, waiting: { prayers, followUps, newMembers, roleRequests } };
  }
}

export const workspaceSummaryService = new WorkspaceSummaryService();
