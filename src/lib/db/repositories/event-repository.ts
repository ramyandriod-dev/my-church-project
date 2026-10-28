/**
 * Event Repository
 *
 * Tenant-scoped data access for the church events domain.
 */

import prisma from "../prisma";
import type { Prisma } from "@prisma/client";

export interface ListEventsFilter {
  status?: string;
  category?: string;
  search?: string;
  upcomingOnly?: boolean;
}

export interface CreateEventData {
  title: string;
  description?: string | null;
  startTime: Date;
  endTime?: Date | null;
  location?: string | null;
  category?: string | null;
  maxAttendees?: number | null;
}

export interface UpdateEventData {
  title?: string;
  description?: string | null;
  startTime?: Date;
  endTime?: Date | null;
  location?: string | null;
  category?: string | null;
  maxAttendees?: number | null;
  status?: string;
}

export const eventRepository = {
  async listEvents(tenantId: string, filter: ListEventsFilter = {}) {
    const where: Prisma.ChurchEventWhereInput = {
      tenantId,
    };

    if (filter.status && filter.status.toLowerCase() !== "all") {
      where.status = filter.status.toLowerCase();
    }

    if (filter.category && filter.category !== "All") {
      where.category = filter.category;
    }

    if (filter.upcomingOnly) {
      where.startTime = { gte: new Date() };
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
      ];
    }

    return prisma.churchEvent.findMany({
      where,
      orderBy: { startTime: "asc" },
    });
  },

  async findEventById(tenantId: string, id: string) {
    return prisma.churchEvent.findFirst({
      where: { id, tenantId },
    });
  },

  async createEvent(tenantId: string, data: CreateEventData) {
    return prisma.churchEvent.create({
      data: {
        tenantId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        startTime: data.startTime,
        endTime: data.endTime || null,
        location: data.location?.trim() || null,
        category: data.category?.trim() || null,
        maxAttendees: data.maxAttendees || null,
      },
    });
  },

  async updateEvent(tenantId: string, id: string, data: UpdateEventData) {
    const updateData: Prisma.ChurchEventUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.location !== undefined) updateData.location = data.location?.trim() || null;
    if (data.category !== undefined) updateData.category = data.category?.trim() || null;
    if (data.maxAttendees !== undefined) updateData.maxAttendees = data.maxAttendees;
    if (data.status !== undefined) updateData.status = data.status;

    return prisma.churchEvent.update({
      where: { id, tenantId },
      data: updateData,
    });
  },

  async deleteEvent(tenantId: string, id: string) {
    return prisma.churchEvent.delete({
      where: { id, tenantId },
    });
  },
};
