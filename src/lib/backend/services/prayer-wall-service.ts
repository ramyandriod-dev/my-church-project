/**
 * Prayer Wall Service
 *
 * Members share a prayer request, or the story of a prayer God answered; a
 * pastor or leader approves it, and then the whole church can see it and tap
 * "I prayed for this" (or "Praise God" on an answered prayer).
 *
 * ─── The two promises ─────────────────────────────────────────
 *
 * 1. Nothing reaches the wall without approval. Only `approved` prayers are
 *    listed, and only an approved prayer can be prayed for; any other id answers
 *    "not found", so a pending or rejected prayer cannot be probed for.
 *
 * 2. Anonymous unless the author chooses otherwise. Wall reads go through
 *    `toWallItem`, which releases the author's name only when they set
 *    `showName`. `prayer_wall.moderate` holders always see who wrote a prayer,
 *    on the moderation screen, so they can follow up pastorally.
 *
 * The author is always taken from the login, never from the request body.
 */

import { BaseService } from "./base-service";
import { resolveOwnMember } from "./own-member";
import { prayerWallRepository } from "../../db/repositories/prayer-wall-repository";
import { hasPermission, requirePermission } from "../authorization";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import {
  MAX_PENDING_PER_MEMBER,
  PRAYER_WALL_TRANSITIONS,
  canTransition,
  toMyItem,
  toWallItem,
  type MyPrayerWallItem,
  type PrayerWallItem,
  type PrayerWallKind,
  type PrayerWallStatus,
} from "@/lib/prayer-wall/rules";
import type { TenantContext } from "../types";
import type { ModeratePrayerWallInput, SharePrayerWallInput } from "../validation";

export interface ModerationItem extends PrayerWallItem {
  status: PrayerWallStatus;
  showName: boolean;
  authorName: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
}

/** The caller's member id, or null for a staff login with no member row. */
async function ownMemberIdOrNull(ctx: TenantContext): Promise<string | null> {
  try {
    return (await resolveOwnMember(ctx)).id;
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export class PrayerWallService extends BaseService {
  /** The wall: approved prayers of one kind, newest first, named only by choice. */
  async listWall(ctx: TenantContext, kind: PrayerWallKind = "prayer"): Promise<PrayerWallItem[]> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "prayer_wall.read");
    const [rows, memberId] = await Promise.all([
      prayerWallRepository.listApproved(ctx.tenantId, ctx.userId, kind),
      ownMemberIdOrNull(ctx),
    ]);
    return rows.map((r) => toWallItem(r, memberId));
  }

  /** What the caller has shared, with its status, so they can see it is waiting. */
  async listMine(ctx: TenantContext): Promise<MyPrayerWallItem[]> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "prayer_wall.post");
    const memberId = await ownMemberIdOrNull(ctx);
    if (!memberId) return [];
    const rows = await prayerWallRepository.listByAuthor(ctx.tenantId, memberId, ctx.userId);
    return rows.map(toMyItem);
  }

  async share(ctx: TenantContext, input: SharePrayerWallInput): Promise<MyPrayerWallItem> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "prayer_wall.post");
    const member = await resolveOwnMember(ctx);

    const pending = await prayerWallRepository.countPendingByAuthor(ctx.tenantId, member.id);
    if (pending >= MAX_PENDING_PER_MEMBER) {
      throw new ValidationError({
        body: [`You already have ${pending} prayers waiting for approval. Please wait until a pastor has seen them.`],
      });
    }

    const row = await prayerWallRepository.create(ctx.tenantId, {
      authorMemberId: member.id,
      kind: input.kind,
      body: input.body.trim(),
      showName: input.showName,
    });

    // The prayer text is not logged: it can be deeply personal, and the audit
    // trail is read by more people than the moderation queue.
    await this.audit(ctx, "prayer_wall.share", "prayer_wall_post", row.id, undefined, { kind: row.kind, showName: row.showName });
    return toMyItem(row);
  }

  /** "I prayed for this". Safe to call twice; returns the new count. */
  async pray(ctx: TenantContext, id: string): Promise<{ prayedCount: number; prayedByMe: true }> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "prayer_wall.read");
    await this.loadApproved(ctx, id);
    await prayerWallRepository.addPrayer(ctx.tenantId, id, ctx.userId);
    return { prayedCount: await prayerWallRepository.countPrayers(id), prayedByMe: true };
  }

  /** Undo a mistaken tap. */
  async unpray(ctx: TenantContext, id: string): Promise<{ prayedCount: number; prayedByMe: false }> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "prayer_wall.read");
    await this.loadApproved(ctx, id);
    await prayerWallRepository.removePrayer(ctx.tenantId, id, ctx.userId);
    return { prayedCount: await prayerWallRepository.countPrayers(id), prayedByMe: false };
  }

  /** The author withdraws their own prayer, or a moderator removes one. */
  async remove(ctx: TenantContext, id: string): Promise<{ id: string }> {
    this.ensureTenant(ctx);
    const row = await prayerWallRepository.getById(ctx.tenantId, id, ctx.userId);
    if (!row) throw new NotFoundError("Prayer");

    if (!hasPermission(ctx, "prayer_wall.moderate")) {
      requirePermission(ctx, "prayer_wall.post");
      const memberId = await ownMemberIdOrNull(ctx);
      // Same answer as a missing prayer, so ids cannot be probed.
      if (row.authorMemberId !== memberId) throw new NotFoundError("Prayer");
    }

    await prayerWallRepository.delete(ctx.tenantId, id);
    await this.audit(ctx, "prayer_wall.delete", "prayer_wall_post", id, { status: row.status });
    return { id };
  }

  // ─── Moderation ────────────────────────────────────────────

  async listForModeration(
    ctx: TenantContext,
    status: PrayerWallStatus,
  ): Promise<{ items: ModerationItem[]; counts: Record<string, number> }> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "prayer_wall.moderate");
    const [rows, counts] = await Promise.all([
      prayerWallRepository.listForModeration(ctx.tenantId, status, ctx.userId),
      prayerWallRepository.countByStatus(ctx.tenantId),
    ]);
    return {
      items: rows.map((r) => ({
        ...toWallItem(r, null),
        status: r.status as PrayerWallStatus,
        showName: r.showName,
        authorName: r.authorName,
        reviewedByName: r.reviewedByName,
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      })),
      counts,
    };
  }

  async moderate(ctx: TenantContext, id: string, input: ModeratePrayerWallInput): Promise<{ id: string; status: PrayerWallStatus }> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "prayer_wall.moderate");

    const row = await prayerWallRepository.getById(ctx.tenantId, id, ctx.userId);
    if (!row) throw new NotFoundError("Prayer");

    if (row.status !== input.status && !canTransition(row.status, input.status)) {
      const allowed = PRAYER_WALL_TRANSITIONS[row.status as PrayerWallStatus] ?? [];
      throw new ConflictError(
        `A prayer that is ${row.status} cannot be ${input.status}. Allowed: ${allowed.join(", ") || "none"}.`,
      );
    }

    if (row.status !== input.status) {
      await prayerWallRepository.setStatus(ctx.tenantId, id, input.status, ctx.userId);
      await this.audit(ctx, `prayer_wall.${input.status}`, "prayer_wall_post", id, { status: row.status }, { status: input.status });
    }
    return { id, status: input.status };
  }

  private async loadApproved(ctx: TenantContext, id: string) {
    const row = await prayerWallRepository.getById(ctx.tenantId, id, ctx.userId);
    if (!row || row.status !== "approved") throw new NotFoundError("Prayer");
    return row;
  }
}

export const prayerWallService = new PrayerWallService();
