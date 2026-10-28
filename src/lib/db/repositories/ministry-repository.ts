/**
 * Ministry Repository
 *
 * Tenant-scoped data access for the church ministries domain.
 */

import prisma from "../prisma";
import type { Prisma } from "@prisma/client";

export interface ListMinistriesFilter {
  status?: string;
  search?: string;
}

export interface CreateMinistryData {
  name: string;
  description?: string | null;
  leaderId?: string | null;
  icon?: string | null;
  color?: string | null;
  meetingSchedule?: string | null;
}

export interface UpdateMinistryData {
  name?: string;
  description?: string | null;
  leaderId?: string | null;
  icon?: string | null;
  color?: string | null;
  meetingSchedule?: string | null;
  status?: string;
}

export const ministryRepository = {
  async listMinistries(tenantId: string, filter: ListMinistriesFilter = {}) {
    const where: Prisma.MinistryWhereInput = {
      tenantId,
    };

    if (filter.status && filter.status.toLowerCase() !== "all") {
      where.status = filter.status.toLowerCase();
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    return prisma.ministry.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        leader: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        groups: {
          select: { id: true, name: true, memberCount: true },
        },
      },
    });
  },

  async findMinistryById(tenantId: string, id: string) {
    return prisma.ministry.findFirst({
      where: { id, tenantId },
      include: {
        leader: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        groups: {
          select: { id: true, name: true, memberCount: true, status: true },
        },
      },
    });
  },

  async createMinistry(tenantId: string, data: CreateMinistryData) {
    return prisma.ministry.create({
      data: {
        tenantId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        leaderId: data.leaderId || null,
        icon: data.icon?.trim() || null,
        color: data.color?.trim() || null,
        meetingSchedule: data.meetingSchedule?.trim() || null,
      },
      include: {
        leader: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async updateMinistry(tenantId: string, id: string, data: UpdateMinistryData) {
    const updateData: Prisma.MinistryUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.leaderId !== undefined) {
      updateData.leader = data.leaderId ? { connect: { id: data.leaderId } } : { disconnect: true };
    }
    if (data.icon !== undefined) updateData.icon = data.icon?.trim() || null;
    if (data.color !== undefined) updateData.color = data.color?.trim() || null;
    if (data.meetingSchedule !== undefined) updateData.meetingSchedule = data.meetingSchedule?.trim() || null;
    if (data.status !== undefined) updateData.status = data.status;

    return prisma.ministry.update({
      where: { id, tenantId },
      data: updateData,
      include: {
        leader: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async deleteMinistry(tenantId: string, id: string) {
    return prisma.ministry.delete({
      where: { id, tenantId },
    });
  },
};
