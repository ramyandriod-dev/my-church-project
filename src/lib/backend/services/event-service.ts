/**
 * Event Service
 *
 * Business logic and security boundary for the Church Events domain.
 */

import { BaseService } from "./base-service";
import type { TenantContext } from "../types";
import { NotFoundError } from "../errors";
import { requirePermission } from "../authorization";
import { eventRepository, type ListEventsFilter } from "../../db/repositories/event-repository";
import type { CreateEventInput, UpdateEventInput } from "../validation";

export class EventService extends BaseService {
  /**
   * List church events for the tenant.
   * Requires `events.read`.
   */
  async listEvents(ctx: TenantContext, filter: ListEventsFilter = {}) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "events.read");

    return eventRepository.listEvents(tenant.tenantId, filter);
  }

  /**
   * Get event by ID.
   * Requires `events.read`.
   */
  async getEventById(ctx: TenantContext, id: string) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "events.read");

    const event = await eventRepository.findEventById(tenant.tenantId, id);
    if (!event) {
      throw new NotFoundError("ChurchEvent", id);
    }

    return event;
  }

  /**
   * Create church event.
   * Requires `events.create`.
   */
  async createEvent(ctx: TenantContext, data: CreateEventInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "events.create");

    const event = await eventRepository.createEvent(tenant.tenantId, {
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : null,
      location: data.location,
      category: data.category,
      maxAttendees: data.maxAttendees,
    });

    await this.audit(ctx, "event.created", "event", event.id, undefined, {
      title: event.title,
      startTime: event.startTime,
    });

    return event;
  }

  /**
   * Update church event.
   * Requires `events.update`.
   */
  async updateEvent(ctx: TenantContext, id: string, data: UpdateEventInput) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "events.update");

    const existing = await eventRepository.findEventById(tenant.tenantId, id);
    if (!existing) {
      throw new NotFoundError("ChurchEvent", id);
    }

    const updated = await eventRepository.updateEvent(tenant.tenantId, id, {
      title: data.title,
      description: data.description,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      location: data.location,
      category: data.category,
      maxAttendees: data.maxAttendees,
    });

    await this.audit(ctx, "event.updated", "event", id, existing, updated);

    return updated;
  }

  /**
   * Delete church event.
   * Requires `events.delete`.
   */
  async deleteEvent(ctx: TenantContext, id: string) {
    const tenant = this.ensureTenant(ctx);
    requirePermission(ctx, "events.delete");

    const existing = await eventRepository.findEventById(tenant.tenantId, id);
    if (!existing) {
      throw new NotFoundError("ChurchEvent", id);
    }

    await eventRepository.deleteEvent(tenant.tenantId, id);
    await this.audit(ctx, "event.deleted", "event", id, { title: existing.title });

    return { success: true };
  }
}

export const eventService = new EventService();
