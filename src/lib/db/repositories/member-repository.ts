/**
 * Member Repository
 *
 * Tenant-scoped data access for the member domain. The MemberService calls
 * this repository; the repository calls Prisma. Route handlers never touch
 * Prisma directly.
 *
 * CRITICAL SECURITY RULE (tenant isolation):
 * Every query filters on tenantId. The tenantId used here is ALWAYS the
 * server-resolved tenant from TenantContext — never a client-supplied value.
 */

import prisma from "../prisma";
import type { Prisma } from "@prisma/client";

export interface ListMembersFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  ministry?: string;
}

export interface CreateMemberData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string;
  ministry?: string | null;
  groupId?: string | null;
  joinedAt?: Date | null;
}

export interface UpdateMemberData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string;
  ministry?: string | null;
  groupId?: string | null;
  joinedAt?: Date | null;
}

export const memberRepository = {
  async listMembers(tenantId: string, filter: ListMembersFilter = {}) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.max(1, Math.min(100, filter.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.MemberWhereInput = {
      tenantId,
    };

    if (filter.status && filter.status.toLowerCase() !== "all") {
      where.status = filter.status.toLowerCase();
    }

    if (filter.ministry && filter.ministry !== "All") {
      where.ministry = filter.ministry;
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const members = await prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        group: {
          select: { id: true, name: true },
        },
        userAccount: { select: { role: true } },
      },
    });
    const total = await prisma.member.count({ where });

    return {
      members,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async countMembers(tenantId: string): Promise<number> {
    return prisma.member.count({
      where: { tenantId },
    });
  },

  async findMemberById(tenantId: string, id: string) {
    const byId = await prisma.member.findFirst({
      where: { id, tenantId },
      include: {
        group: {
          select: { id: true, name: true },
        },
        userAccount: { select: { role: true } },
      },
    });
    if (byId) return byId;

    if (id.includes("@")) {
      return prisma.member.findFirst({
        where: { email: id.trim().toLowerCase(), tenantId },
        include: {
          group: {
            select: { id: true, name: true },
          },
        },
      });
    }

    if (id.includes("-")) {
      const parts = id.split("-");
      if (parts.length >= 2) {
        return prisma.member.findFirst({
          where: {
            tenantId,
            firstName: { equals: parts[0], mode: "insensitive" },
            lastName: { equals: parts.slice(1).join(" "), mode: "insensitive" },
          },
          include: {
            group: {
              select: { id: true, name: true },
            },
          },
        });
      }
    }

    return null;
  },

  async findMemberByEmail(tenantId: string, email: string) {
    return prisma.member.findFirst({
      where: {
        tenantId,
        email: email.trim().toLowerCase(),
      },
    });
  },

  async findMemberByPhone(tenantId: string, phone: string, excludeMemberId?: string) {
    const raw = phone.trim();
    if (!raw) return null;
    const clean = raw.replace(/[\s\-\(\)\.]/g, "");

    // 1. Direct exact or trimmed match
    const exactMatch = await prisma.member.findFirst({
      where: {
        tenantId,
        phone: { equals: raw },
        ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
      },
    });
    if (exactMatch) return exactMatch;

    // 2. Normalized check across tenant members with phones to prevent duplicate formatting
    if (clean) {
      const candidates = await prisma.member.findMany({
        where: {
          tenantId,
          phone: { not: null },
          ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
        },
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          email: true,
        },
        take: 1000,
      });

      const found = candidates.find((c) => {
        if (!c.phone) return false;
        const cClean = c.phone.replace(/[\s\-\(\)\.]/g, "");
        return cClean === clean || (clean.length >= 8 && cClean.endsWith(clean.slice(-8))) || (cClean.length >= 8 && clean.endsWith(cClean.slice(-8)));
      });

      if (found) {
        return prisma.member.findFirst({
          where: { id: found.id, tenantId },
        });
      }
    }

    return null;
  },

  async findMemberByUserId(tenantId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        email: true,
        memberId: true,
      },
    });

    if (!user) return null;

    if (user.memberId) {
      const member = await prisma.member.findFirst({
        where: { id: user.memberId, tenantId },
        include: {
          group: { select: { id: true, name: true } },
        },
      });
      if (member) return member;
    }

    // Fallback: match by email within the tenant
    if (user.email) {
      const member = await prisma.member.findFirst({
        where: {
          tenantId,
          email: user.email.trim().toLowerCase(),
        },
        include: {
          group: { select: { id: true, name: true } },
        },
      });
      if (member) {
        await prisma.user
          .update({
            where: { id: user.id },
            data: { memberId: member.id },
          })
          .catch(() => {});
        return member;
      }
    }

    return null;
  },

  async createMember(tenantId: string, data: CreateMemberData) {
    return prisma.member.create({
      data: {
        tenantId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || null,
        avatarUrl: data.avatarUrl || null,
        status: data.status || "active",
        ministry: data.ministry || null,
        groupId: data.groupId || null,
        joinedAt: data.joinedAt || new Date(),
      },
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async updateMember(tenantId: string, id: string, data: UpdateMemberData) {
    const updateData: Prisma.MemberUpdateInput = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.ministry !== undefined) updateData.ministry = data.ministry || null;
    if (data.groupId !== undefined) {
      updateData.group = data.groupId ? { connect: { id: data.groupId } } : { disconnect: true };
    }
    if (data.joinedAt !== undefined) updateData.joinedAt = data.joinedAt || new Date();

    return prisma.member.update({
      where: { id, tenantId },
      data: updateData,
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async deactivateMember(tenantId: string, id: string) {
    return prisma.member.update({
      where: { id, tenantId },
      data: { status: "inactive" },
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async deleteMember(tenantId: string, id: string) {
    return prisma.member.delete({
      where: { id, tenantId },
    });
  },

  async listAllMembersForExport(
    tenantId: string,
    filter: { search?: string; status?: string; ministry?: string } = {}
  ) {
    const where: Prisma.MemberWhereInput = {
      tenantId,
    };

    if (filter.status && filter.status.toLowerCase() !== "all") {
      where.status = filter.status.toLowerCase();
    }

    if (filter.ministry && filter.ministry !== "All") {
      where.ministry = filter.ministry;
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    return prisma.member.findMany({
      where,
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
      ],
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async importMembersBatch(
    tenantId: string,
    rows: Array<{
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
      avatarUrl?: string | null;
      status?: "active" | "inactive" | "visitor" | "deletion_requested";
      ministry?: string | null;
      groupId?: string | null;
      groupName?: string | null;
      joinedAt?: string | null;
    }>,
    onDuplicate: "skip" | "update" = "skip"
  ) {
    // 1. Resolve group names to IDs
    const groupNames = Array.from(
      new Set(
        rows
          .filter((r) => !r.groupId && r.groupName && r.groupName.trim())
          .map((r) => r.groupName!.trim())
      )
    );
    const groupMap = new Map<string, string>();
    if (groupNames.length > 0) {
      const groups = await prisma.group.findMany({
        where: {
          tenantId,
          name: { in: groupNames, mode: "insensitive" },
        },
        select: { id: true, name: true },
      });
      for (const g of groups) {
        groupMap.set(g.name.toLowerCase(), g.id);
      }
    }

    // 2. Identify pre-existing members in the tenant
    const distinctEmails = Array.from(
      new Set(rows.map((r) => r.email.trim().toLowerCase()))
    );
    const existingMembers = await prisma.member.findMany({
      where: {
        tenantId,
        email: { in: distinctEmails },
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    const existingMap = new Map<string, { id: string; email: string; firstName: string; lastName: string }>();
    for (const em of existingMembers) {
      existingMap.set(em.email.toLowerCase(), em);
    }

    // 3. Process rows with intra-batch deduplication
    const seenEmails = new Set<string>();
    const created: Array<{ id: string; email: string; name: string }> = [];
    const updated: Array<{ id: string; email: string; name: string }> = [];
    const skipped: Array<{ email: string; name: string; reason: string }> = [];
    const errors: Array<{ email: string; name: string; error: string }> = [];

    for (const row of rows) {
      const email = row.email.trim().toLowerCase();
      const fullName = `${row.firstName.trim()} ${row.lastName.trim()}`;

      if (seenEmails.has(email)) {
        skipped.push({
          email,
          name: fullName,
          reason: "Duplicate email within import file",
        });
        continue;
      }
      seenEmails.add(email);

      let parsedJoinedAt = new Date();
      if (row.joinedAt && row.joinedAt.trim()) {
        const d = new Date(row.joinedAt.trim());
        if (!isNaN(d.getTime())) {
          parsedJoinedAt = d;
        }
      }

      let resolvedGroupId = row.groupId || null;
      if (!resolvedGroupId && row.groupName && row.groupName.trim()) {
        resolvedGroupId = groupMap.get(row.groupName.trim().toLowerCase()) || null;
      }

      const existing = existingMap.get(email);

      if (existing) {
        if (onDuplicate === "skip") {
          skipped.push({
            email,
            name: fullName,
            reason: "Member with this email already exists in church",
          });
          continue;
        } else {
          try {
            const updatedRecord = await prisma.member.update({
              where: { id: existing.id, tenantId },
              data: {
                firstName: row.firstName.trim(),
                lastName: row.lastName.trim(),
                phone: row.phone?.trim() || null,
                avatarUrl: row.avatarUrl?.trim() || null,
                status: row.status || "active",
                ministry: row.ministry?.trim() || null,
                ...(resolvedGroupId ? { groupId: resolvedGroupId } : {}),
                joinedAt: parsedJoinedAt,
              },
              select: { id: true, email: true, firstName: true, lastName: true },
            });
            updated.push({
              id: updatedRecord.id,
              email: updatedRecord.email,
              name: `${updatedRecord.firstName} ${updatedRecord.lastName}`,
            });
          } catch (err: any) {
            errors.push({
              email,
              name: fullName,
              error: err?.message || "Failed to update existing member",
            });
          }
        }
      } else {
        try {
          const createdRecord = await prisma.member.create({
            data: {
              tenantId,
              firstName: row.firstName.trim(),
              lastName: row.lastName.trim(),
              email,
              phone: row.phone?.trim() || null,
              avatarUrl: row.avatarUrl?.trim() || null,
              status: row.status || "active",
              ministry: row.ministry?.trim() || null,
              groupId: resolvedGroupId,
              joinedAt: parsedJoinedAt,
            },
            select: { id: true, email: true, firstName: true, lastName: true },
          });
          created.push({
            id: createdRecord.id,
            email: createdRecord.email,
            name: `${createdRecord.firstName} ${createdRecord.lastName}`,
          });
        } catch (err: any) {
          errors.push({
            email,
            name: fullName,
            error: err?.message || "Failed to create member",
          });
        }
      }
    }

    return {
      imported: created.length,
      updated: updated.length,
      skipped: skipped.length,
      errors: errors.length,
      details: {
        created,
        updated,
        skipped,
        errors,
      },
    };
  },
};
