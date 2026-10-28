/**
 * Prayer Request Repository
 *
 * Tenant-scoped data access for prayer requests.
 */

import prisma from "../prisma";
import type { Prisma } from "@prisma/client";

export interface ListPrayersFilter {
  status?: string;
  memberId?: string;
  category?: string;
}

export interface CreatePrayerData {
  memberId: string;
  category: string;
  request: string;
  assignedShepherd?: string | null;
}

export interface UpdatePrayerData {
  category?: string;
  request?: string;
  status?: string;
  assignedShepherd?: string | null;
}

export const prayerRepository = {
  async listPrayers(tenantId: string, filter: ListPrayersFilter = {}) {
    const where: Prisma.PrayerRequestWhereInput = {
      tenantId,
    };

    if (filter.status && filter.status.toLowerCase() !== "all") {
      where.status = filter.status.toLowerCase();
    }

    if (filter.memberId) {
      where.memberId = filter.memberId;
    }

    if (filter.category && filter.category !== "All") {
      where.category = filter.category;
    }

    return prisma.prayerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        shepherd: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async findPrayerById(tenantId: string, id: string) {
    return prisma.prayerRequest.findFirst({
      where: { id, tenantId },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        shepherd: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async createPrayer(tenantId: string, data: CreatePrayerData) {
    return prisma.prayerRequest.create({
      data: {
        tenantId,
        memberId: data.memberId,
        category: data.category.trim(),
        request: data.request.trim(),
        assignedShepherd: data.assignedShepherd || null,
      },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        shepherd: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async updatePrayer(tenantId: string, id: string, data: UpdatePrayerData) {
    const updateData: Prisma.PrayerRequestUpdateInput = {};
    if (data.category !== undefined) updateData.category = data.category.trim();
    if (data.request !== undefined) updateData.request = data.request.trim();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assignedShepherd !== undefined) {
      updateData.shepherd = data.assignedShepherd
        ? { connect: { id: data.assignedShepherd } }
        : { disconnect: true };
    }

    return prisma.prayerRequest.update({
      where: { id, tenantId },
      data: updateData,
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        shepherd: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async deletePrayer(tenantId: string, id: string) {
    return prisma.prayerRequest.delete({
      where: { id, tenantId },
    });
  },
};
