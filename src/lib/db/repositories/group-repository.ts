/**
 * Group Repository
 *
 * Tenant-scoped data access for the church groups domain.
 */

import prisma from "../prisma";
import type { Prisma } from "@prisma/client";

export interface ListGroupsFilter {
  ministryId?: string;
  status?: string;
  search?: string;
}

export interface CreateGroupData {
  name: string;
  description?: string | null;
  leaderId?: string | null;
  ministryId?: string | null;
  maxCapacity?: number | null;
  meetingSchedule?: string | null;
}

export interface UpdateGroupData {
  name?: string;
  description?: string | null;
  leaderId?: string | null;
  ministryId?: string | null;
  maxCapacity?: number | null;
  meetingSchedule?: string | null;
  status?: string;
}

export const groupRepository = {
  async listGroups(tenantId: string, filter: ListGroupsFilter = {}) {
    const where: Prisma.GroupWhereInput = {
      tenantId,
    };

    if (filter.status && filter.status.toLowerCase() !== "all") {
      where.status = filter.status.toLowerCase();
    }

    if (filter.ministryId) {
      where.ministryId = filter.ministryId;
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    return prisma.group.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        leader: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        ministry: {
          select: { id: true, name: true },
        },
        _count: {
          select: { members: true },
        },
      },
    });
  },

  async findGroupById(tenantId: string, id: string) {
    return prisma.group.findFirst({
      where: { id, tenantId },
      include: {
        leader: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        ministry: {
          select: { id: true, name: true },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            status: true,
            ministry: true,
          },
        },
      },
    });
  },

  async createGroup(tenantId: string, data: CreateGroupData) {
    return prisma.group.create({
      data: {
        tenantId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        leaderId: data.leaderId || null,
        ministryId: data.ministryId || null,
        maxCapacity: data.maxCapacity || null,
        meetingSchedule: data.meetingSchedule?.trim() || null,
      },
      include: {
        leader: {
          select: { id: true, name: true, email: true },
        },
        ministry: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async updateGroup(tenantId: string, id: string, data: UpdateGroupData) {
    const updateData: Prisma.GroupUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.leaderId !== undefined) {
      updateData.leader = data.leaderId ? { connect: { id: data.leaderId } } : { disconnect: true };
    }
    if (data.ministryId !== undefined) {
      updateData.ministry = data.ministryId ? { connect: { id: data.ministryId } } : { disconnect: true };
    }
    if (data.maxCapacity !== undefined) updateData.maxCapacity = data.maxCapacity;
    if (data.meetingSchedule !== undefined) updateData.meetingSchedule = data.meetingSchedule?.trim() || null;
    if (data.status !== undefined) updateData.status = data.status;

    return prisma.group.update({
      where: { id, tenantId },
      data: updateData,
      include: {
        leader: {
          select: { id: true, name: true, email: true },
        },
        ministry: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async deleteGroup(tenantId: string, id: string) {
    return prisma.group.delete({
      where: { id, tenantId },
    });
  },
};
