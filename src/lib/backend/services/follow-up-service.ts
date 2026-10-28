/**
 * Follow-Up Service
 *
 * Business logic for pastoral care follow-up workflows:
 *   Identify → Assign → Contact → Record → Complete
 *
 * Enforces:
 * - Strict tenant isolation
 * - Role-based authorization & audit logging
 * - Duplicate prevention for open follow-ups
 * - Contact activity tracking & automatic status progression
 */

import { BaseService } from "./base-service";
import type {
  TenantContext,
  FollowUp,
  FollowUpActivity,
  FollowUpStats,
  FollowUpStatus,
  FollowUpPriority,
  FollowUpType,
  FollowUpContactType,
} from "../types";
import { NotFoundError, ConflictError, ValidationError } from "../errors";
import {
  followUpRepository,
  type ListFollowUpsFilter,
} from "../../db/repositories/follow-up-repository";
import {
  createFollowUpSchema,
  updateFollowUpSchema,
  createFollowUpActivitySchema,
  validate,
} from "../validation";

export interface CreateFollowUpRequest {
  memberId: string;
  assignedTo?: string;
  type?: FollowUpType;
  reason: string;
  notes?: string;
  priority?: FollowUpPriority;
  status?: FollowUpStatus;
  dueDate?: string;
  nextAction?: string;
  forceCreate?: boolean;
}

export interface UpdateFollowUpRequest {
  assignedTo?: string;
  reason?: string;
  notes?: string;
  priority?: FollowUpPriority;
  status?: FollowUpStatus;
  dueDate?: string;
  nextAction?: string;
  completedAt?: string;
}

export interface LogContactRequest {
  contactType: FollowUpContactType;
  notes: string;
  contactDate?: string;
}

export class FollowUpService extends BaseService {
  /**
   * List follow-ups for tenant with filtering, pagination, and KPI metrics.
   */
  async listFollowUps(
    ctx: TenantContext,
    filter: ListFollowUpsFilter = {}
  ): Promise<{ items: FollowUp[]; total: number; stats: FollowUpStats }> {
    const validCtx = this.ensureTenant(ctx);

    const [listResult, stats] = await Promise.all([
      followUpRepository.listForTenant(validCtx.tenantId, filter),
      followUpRepository.getStats(validCtx.tenantId),
    ]);

    return {
      items: listResult.items,
      total: listResult.total,
      stats,
    };
  }

  /**
   * Get a single follow-up by ID with full activity history.
   */
  async getFollowUp(ctx: TenantContext, id: string): Promise<FollowUp> {
    const validCtx = this.ensureTenant(ctx);
    const followUp = await followUpRepository.findForTenant(validCtx.tenantId, id);

    if (!followUp) {
      throw new NotFoundError(`Follow-up with ID ${id} not found`);
    }

    return followUp;
  }

  /**
   * Check if an active (open or in-progress) follow-up exists for a member and situation.
   */
  async checkDuplicate(
    ctx: TenantContext,
    memberId: string,
    reasonHint?: string
  ): Promise<{ hasDuplicate: boolean; existingFollowUp: FollowUp | null }> {
    const validCtx = this.ensureTenant(ctx);
    const existing = await followUpRepository.findOpenByMemberAndSituation(
      validCtx.tenantId,
      memberId,
      reasonHint
    );

    return {
      hasDuplicate: !!existing,
      existingFollowUp: existing,
    };
  }

  /**
   * Create a new follow-up with duplicate detection and audit logging.
   */
  async createFollowUp(
    ctx: TenantContext,
    input: CreateFollowUpRequest
  ): Promise<{ followUp: FollowUp; wasDuplicateFound?: boolean }> {
    const validCtx = this.ensureTenant(ctx);
    const validated = validate(createFollowUpSchema, input);

    // Duplicate prevention: check for existing active follow-up
    if (!input.forceCreate) {
      const existing = await followUpRepository.findOpenByMemberAndSituation(
        validCtx.tenantId,
        validated.memberId,
        validated.reason
      );

      if (existing) {
        throw new ConflictError(
          `An open follow-up already exists for this member: "${existing.reason}" (Assigned to: ${existing.assignedToName || "Leader"}, Status: ${existing.status})`
        );
      }
    }

    // Default assignee to current user if none provided
    const assignedTo = validated.assignedTo || validCtx.userId;

    const followUp = await followUpRepository.create(validCtx.tenantId, {
      memberId: validated.memberId,
      assignedTo,
      type: validated.type,
      reason: validated.reason,
      notes: validated.notes,
      priority: validated.priority,
      status: validated.status as FollowUpStatus,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      nextAction: validated.nextAction,
    });

    await this.audit(
      validCtx,
      "followup.create",
      "follow_up",
      followUp.id,
      undefined,
      {
        memberId: followUp.memberId,
        assignedTo: followUp.assignedTo,
        reason: followUp.reason,
        priority: followUp.priority,
        status: followUp.status,
      }
    );

    return { followUp };
  }

  /**
   * Update follow-up status, owner, due date, notes, or next action.
   */
  async updateFollowUp(
    ctx: TenantContext,
    id: string,
    input: UpdateFollowUpRequest
  ): Promise<FollowUp> {
    const validCtx = this.ensureTenant(ctx);
    const validated = validate(updateFollowUpSchema, input);

    const existing = await followUpRepository.findForTenant(validCtx.tenantId, id);
    if (!existing) {
      throw new NotFoundError(`Follow-up with ID ${id} not found`);
    }

    const updated = await followUpRepository.update(validCtx.tenantId, id, {
      assignedTo: validated.assignedTo,
      reason: validated.reason,
      notes: validated.notes,
      priority: validated.priority,
      status: validated.status as FollowUpStatus | undefined,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
      nextAction: validated.nextAction,
      completedAt: validated.completedAt ? new Date(validated.completedAt) : undefined,
    });

    if (!updated) {
      throw new NotFoundError(`Follow-up with ID ${id} could not be updated`);
    }

    await this.audit(
      validCtx,
      "followup.update",
      "follow_up",
      id,
      {
        status: existing.status,
        assignedTo: existing.assignedTo,
        dueDate: existing.dueDate,
      },
      {
        status: updated.status,
        assignedTo: updated.assignedTo,
        dueDate: updated.dueDate,
      }
    );

    return updated;
  }

  /**
   * Record a contact activity (Phone, WhatsApp, Visit, In Person, Other).
   * Automatically updates lastContact and sets status to 'in_progress' if currently open.
   */
  async logActivity(
    ctx: TenantContext,
    followUpId: string,
    input: LogContactRequest
  ): Promise<{ activity: FollowUpActivity; followUp: FollowUp }> {
    const validCtx = this.ensureTenant(ctx);
    const validated = validate(createFollowUpActivitySchema, input);

    const existing = await followUpRepository.findForTenant(validCtx.tenantId, followUpId);
    if (!existing) {
      throw new NotFoundError(`Follow-up with ID ${followUpId} not found`);
    }

    const result = await followUpRepository.addActivity(validCtx.tenantId, followUpId, {
      contactType: validated.contactType,
      notes: validated.notes,
      contactDate: validated.contactDate ? new Date(validated.contactDate) : new Date(),
      createdById: validCtx.userId,
    });

    await this.audit(
      validCtx,
      "followup.activity_logged",
      "follow_up_activity",
      result.activity.id,
      undefined,
      {
        followUpId,
        contactType: result.activity.contactType,
        contactDate: result.activity.contactDate,
      }
    );

    return result;
  }

  /**
   * Get operational follow-up KPIs.
   */
  async getStats(ctx: TenantContext): Promise<FollowUpStats> {
    const validCtx = this.ensureTenant(ctx);
    return followUpRepository.getStats(validCtx.tenantId);
  }
}

export const followUpService = new FollowUpService();
