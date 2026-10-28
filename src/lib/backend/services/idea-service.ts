/**
 * Idea Service
 *
 * Business logic and the security boundary for the Ideas Bank.
 *
 * Responsibilities:
 * - Tenant scoping derived from the server-resolved TenantContext
 * - Ownership: a member may submit and edit their own ideas, and nobody else's
 * - Workflow transitions validated against the idea's real current status
 * - Keeping staff-only internal notes out of member-visible reads
 * - Audit logging for every mutation
 *
 * ─── The workflow ──────────────────────────────────────────────
 *
 * new -> under_review -> planned -> implemented, with declined as the other
 * terminal state. Transitions are checked here against the status loaded from the
 * database, not against anything the client sent, so a hand-written request
 * cannot skip the review the workflow exists to require.
 *
 * ─── Who may see internal notes ────────────────────────────────
 *
 * `internalNotes` are the church's working notes on an idea. They are returned
 * only to a caller holding `ideas.manage`, and the repository does not even
 * select the column otherwise — so a member reading their own idea gets a
 * payload with no notes field in it at all.
 */

import { BaseService } from "./base-service";
import { ideaRepository } from "../../db/repositories/idea-repository";
import { resolveOwnMember } from "./own-member";
import { prisma } from "../../db/prisma";
import { interpretIdeaQuestion } from "../../community/query-interpreter";
import { hasPermission, requirePermission } from "../authorization";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import {
  IDEA_STATUS_TRANSITIONS,
  isValidIdeaTransition,
  type Idea,
  type IdeaSearchResponse,
  type IdeaStats,
  type IdeaStatus,
  type TenantContext,
} from "../types";
import type {
  CreateIdeaInput,
  IdeaQuery,
  IdeaSearchRequest,
  UpdateIdeaInput,
  UpdateIdeaWorkflowInput,
} from "../validation";

/** Whether the caller may read staff working notes on an idea. */
const canSeeInternalNotes = (ctx: TenantContext): boolean =>
  hasPermission(ctx, "ideas.manage");

export class IdeaService extends BaseService {
  // ─── Reads ──────────────────────────────────────────────────

  async listIdeas(
    ctx: TenantContext,
    query: IdeaQuery,
  ): Promise<{ items: Idea[]; total: number }> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "ideas.read");
    return ideaRepository.listForTenant(ctx.tenantId, query, canSeeInternalNotes(ctx));
  }

  /**
   * One idea.
   *
   * Every caller who can read the bank can read any single idea in it — the
   * idea bank is a shared resource by design, since the whole point is that
   * somebody else can pick up an idea. Internal notes remain the exception.
   */
  async getIdea(ctx: TenantContext, id: string): Promise<Idea> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "ideas.read");

    const idea = await ideaRepository.getById(ctx.tenantId, id, canSeeInternalNotes(ctx));
    if (!idea) throw new NotFoundError("Idea not found");
    return idea;
  }

  // ─── Member submissions ─────────────────────────────────────

  /**
   * Submit an idea.
   *
   * Takes the submitter from the login, never from the request body: a member can
   * only file an idea as themselves, so attribution cannot be forged by editing
   * a field.
   */
  async createIdea(ctx: TenantContext, input: CreateIdeaInput): Promise<Idea> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "ideas.create");
    const member = await resolveOwnMember(ctx);

    const idea = await ideaRepository.create(ctx.tenantId, {
      submittedByMemberId: member.id,
      title: input.title,
      description: input.description,
      category: input.category,
      categoryOther: input.categoryOther,
    });

    await this.audit(ctx, "idea.create", "idea", idea.id, undefined, {
      title: idea.title,
      category: idea.category,
    });
    return idea;
  }

  /**
   * Edit an idea's own content.
   *
   * The submitter may edit while the idea is still being heard — before it has
   * been planned. Once an idea is Planned or Implemented it belongs to the
   * church's plan rather than to its author, and only `ideas.manage` holders may
   * change it, which is also the only way to get it back to Planned.
   */
  async updateIdea(ctx: TenantContext, id: string, input: UpdateIdeaInput): Promise<Idea> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "ideas.read");

    const existing = await ideaRepository.getById(ctx.tenantId, id, canSeeInternalNotes(ctx));
    if (!existing) throw new NotFoundError("Idea not found");

    const canManage = canSeeInternalNotes(ctx);

    if (!canManage) {
      // Resolve the caller's own member only when ownership is actually the
      // thing being checked. A staff login is not required to have a linked
      // Member row in order to manage the bank, and asking for one here would
      // lock out any admin or leader whose login was created without one.
      const isSubmitter = existing.submittedByMemberId === (await resolveOwnMember(ctx)).id;

      if (!isSubmitter) {
        throw new ForbiddenError("You can only edit ideas you submitted");
      }
      if (existing.status === "planned" || existing.status === "implemented") {
        throw new ForbiddenError(
          "This idea has already been planned, so it can no longer be edited. Speak to a leader about changing it.",
        );
      }
    }

    const updated = await ideaRepository.update(ctx.tenantId, id, input);
    if (!updated) throw new NotFoundError("Idea not found");

    await this.audit(ctx, "idea.update", "idea", id, undefined, {
      title: updated.title,
      category: updated.category,
    });
    return updated;
  }

  // ─── Staff workflow ─────────────────────────────────────────

  /**
   * Move an idea through the workflow, or attach staff notes and an owner.
   *
   * The transition is checked against the status this call actually read, so the
   * decision and the write are made from one consistent state. A rejected
   * transition is a validation error naming both statuses, which is far more
   * useful than a silent no-op.
   */
  async updateWorkflow(
    ctx: TenantContext,
    id: string,
    input: UpdateIdeaWorkflowInput,
  ): Promise<Idea> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "ideas.manage");

    const existing = await ideaRepository.getById(ctx.tenantId, id, true);
    if (!existing) throw new NotFoundError("Idea not found");

    if (input.status && input.status !== existing.status) {
      if (!isValidIdeaTransition(existing.status, input.status)) {
        const allowed = IDEA_STATUS_TRANSITIONS[existing.status] ?? [];
        // A conflict, not a malformed request: the status sent is well formed,
        // it is simply not reachable from where the idea currently is.
        throw new ConflictError(
          allowed.length === 0
            ? `An idea that is ${existing.status.replace(/_/g, " ")} cannot change status again.`
            : `Cannot move an idea from ${existing.status.replace(/_/g, " ")} to ${input.status.replace(/_/g, " ")}. Allowed: ${allowed.join(", ").replace(/_/g, " ")}.`,
        );
      }
    }

    if (input.ownerId) {
      // The owner is a staff login, and a simple FK cannot enforce that it
      // belongs to this tenant, so it is checked here.
      const owner = await prisma.user.findFirst({
        where: { id: input.ownerId, tenantId: ctx.tenantId },
        select: { id: true },
      });
      if (!owner) {
        throw new ValidationError({ ownerId: ["That owner is not a login in this church"] });
      }
    }

    const updated = await ideaRepository.applyWorkflowChange(
      ctx.tenantId,
      id,
      input,
      ctx.userId,
    );
    if (!updated) throw new NotFoundError("Idea not found");

    await this.audit(
      ctx,
      input.status ? "idea.status_change" : "idea.workflow_update",
      "idea",
      id,
      input.status ? { status: existing.status } : undefined,
      input.status ? { status: updated.status } : { ownerId: updated.ownerId },
    );
    return updated;
  }

  // ─── Search & stats ─────────────────────────────────────────

  /**
   * Answer a question about the idea bank.
   *
   * Same shape as the talent search: AI is optional, `aiUsed` discloses which
   * path ran, and the deterministic parser handles the rest.
   */
  async search(ctx: TenantContext, request: IdeaSearchRequest): Promise<IdeaSearchResponse> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "ideas.read");

    const interpretation = await interpretIdeaQuestion(request.question, {
      allowAi: hasPermission(ctx, "ai.use"),
      context: { tenantId: ctx.tenantId, userId: ctx.userId, feature: "idea_search" },
    });

    const { items, total } = await ideaRepository.listForTenant(
      ctx.tenantId,
      {
        search: interpretation.criteria.text,
        category: interpretation.criteria.category,
        status: interpretation.criteria.status,
        submittedByMemberId: interpretation.criteria.submittedByMemberId,
        limit: request.limit,
      },
      canSeeInternalNotes(ctx),
    );

    return { interpretation, results: items, total };
  }

  async getStats(ctx: TenantContext): Promise<IdeaStats> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "ideas.read");
    return ideaRepository.getStats(ctx.tenantId);
  }

  /** The caller's own ideas, for the mobile "My Ideas" list. */
  async listMyIdeas(ctx: TenantContext): Promise<Idea[]> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "ideas.read");
    const member = await resolveOwnMember(ctx);
    const { items } = await ideaRepository.listForTenant(
      ctx.tenantId,
      { submittedByMemberId: member.id, limit: 50 },
      false,
    );
    return items;
  }

  /** Statuses a caller could legally move an idea to, for rendering the buttons. */
  static allowedTransitions(status: IdeaStatus): IdeaStatus[] {
    return [...(IDEA_STATUS_TRANSITIONS[status] ?? [])];
  }
}

export const ideaService = new IdeaService();
