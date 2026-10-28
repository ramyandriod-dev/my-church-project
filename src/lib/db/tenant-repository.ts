/**
 * Multi-Tenant Repository Helper
 *
 * Ensures all database queries are scoped to the correct tenant.
 * This is the foundation of tenant isolation at the data layer.
 *
 * CRITICAL SECURITY RULE:
 * Every database query MUST include tenantId.
 * Never allow queries that could return data from another tenant.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { TenantError, NotFoundError } from "../backend/errors";

/**
 * Wraps a Prisma model with automatic tenant scoping.
 * Every query is filtered by tenantId.
 *
 * Usage:
 *   const memberRepo = createTenantRepository(prisma, prisma.member);
 *   const members = await memberRepo.listForTenant(tenantId);
 */
export function createTenantRepository<T extends { tenantId: string }>(
  prisma: PrismaClient,
  modelDelegate: any
) {
  return {
    /**
     * Find many records for a tenant with optional filters.
     */
    async findMany(
      tenantId: string,
      args?: Omit<Prisma.Args<typeof modelDelegate, "findMany">, "where"> & {
        where?: Omit<Prisma.Args<typeof modelDelegate, "findMany">["where"], "tenantId">;
      }
    ) {
      return modelDelegate.findMany({
        ...args,
        where: { ...args?.where, tenantId },
      });
    },

    /**
     * Find a unique record for a tenant.
     * Returns null if not found or belongs to different tenant.
     */
    async findUnique(
      tenantId: string,
      args: Omit<Prisma.Args<typeof modelDelegate, "findUnique">, "where"> & {
        where: Omit<Prisma.Args<typeof modelDelegate, "findUnique">["where"], "tenantId">;
      }
    ) {
      return modelDelegate.findUnique({
        ...args,
        where: { ...args.where, tenantId } as any,
      });
    },

    /**
     * Find the first record for a tenant.
     */
    async findFirst(
      tenantId: string,
      args?: Omit<Prisma.Args<typeof modelDelegate, "findFirst">, "where"> & {
        where?: Omit<Prisma.Args<typeof modelDelegate, "findFirst">["where"], "tenantId">;
      }
    ) {
      return modelDelegate.findFirst({
        ...args,
        where: { ...args?.where, tenantId },
      });
    },

    /**
     * Find a record by ID for a specific tenant.
     * Throws NotFoundError if not found.
     * This is the SAFE way to fetch a single record.
     */
    async findByIdForTenant(tenantId: string, id: string) {
      const record = await modelDelegate.findFirst({
        where: { id, tenantId },
      });
      if (!record) {
        throw new NotFoundError("Record not found");
      }
      return record;
    },

    /**
     * Create a record with automatic tenant scoping.
     * Always assigns tenantId from the server-side context.
     */
    async create(
      tenantId: string,
      data: Omit<Prisma.Args<typeof modelDelegate, "create">["data"], "tenantId">
    ) {
      return modelDelegate.create({
        data: { ...data, tenantId } as any,
      });
    },

    /**
     * Update a record for a tenant.
     * First verifies the record belongs to the tenant.
     */
    async update(
      tenantId: string,
      args: Omit<Prisma.Args<typeof modelDelegate, "update">, "where"> & {
        where: Omit<Prisma.Args<typeof modelDelegate, "update">["where"], "tenantId">;
      }
    ) {
      // Verify record exists and belongs to tenant before update
      const existing = await modelDelegate.findFirst({
        where: { ...args.where, tenantId } as any,
      });
      if (!existing) {
        throw new NotFoundError("Record not found");
      }

      return modelDelegate.update({
        ...args,
        where: { ...args.where, tenantId } as any,
      });
    },

    /**
     * Delete a record for a tenant.
     * First verifies the record belongs to the tenant.
     */
    async delete(
      tenantId: string,
      args: Omit<Prisma.Args<typeof modelDelegate, "delete">, "where"> & {
        where: Omit<Prisma.Args<typeof modelDelegate, "delete">["where"], "tenantId">;
      }
    ) {
      // Verify record exists and belongs to tenant before delete
      const existing = await modelDelegate.findFirst({
        where: { ...args.where, tenantId } as any,
      });
      if (!existing) {
        throw new NotFoundError("Record not found");
      }

      return modelDelegate.delete({
        ...args,
        where: { ...args.where, tenantId } as any,
      });
    },

    /**
     * Count records for a tenant.
     */
    async count(
      tenantId: string,
      args?: Omit<Prisma.Args<typeof modelDelegate, "count">, "where"> & {
        where?: Omit<Prisma.Args<typeof modelDelegate, "count">["where"], "tenantId">;
      }
    ) {
      return modelDelegate.count({
        ...args,
        where: { ...args?.where, tenantId },
      });
    },

    /**
     * Paginated find for a tenant.
     */
    async findPaginated(
      tenantId: string,
      page: number = 1,
      limit: number = 20,
      args?: Omit<Prisma.Args<typeof modelDelegate, "findMany">, "where" | "skip" | "take"> & {
        where?: Omit<Prisma.Args<typeof modelDelegate, "findMany">["where"], "tenantId">;
      }
    ) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        modelDelegate.findMany({
          ...args,
          where: { ...args?.where, tenantId },
          skip,
          take: limit,
        }),
        modelDelegate.count({
          where: { ...args?.where, tenantId },
        }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },

    /**
     * Verify a record belongs to the tenant.
     * Throws TenantError if the record belongs to a different tenant.
     */
    async verifyTenantOwnership(tenantId: string, recordId: string): Promise<void> {
      const record = await modelDelegate.findFirst({
        where: { id: recordId },
        select: { tenantId: true },
      });

      if (!record) {
        throw new NotFoundError("Record not found");
      }

      if (record.tenantId !== tenantId) {
        throw new TenantError("Access denied: record belongs to another tenant");
      }
    },
  };
}

/**
 * Create a simple tenant-scoped repository for models without complex operations.
 */
export function createSimpleTenantRepository(
  prisma: PrismaClient,
  modelName: string
) {
  const delegate = (prisma as any)[modelName];
  if (!delegate) {
    throw new Error(`Model ${modelName} not found in Prisma client`);
  }
  return createTenantRepository(prisma, delegate);
}
