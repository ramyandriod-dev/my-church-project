/**
 * GET /api/attendance
 *
 * Get attendance records for a service.
 * Client-independent — web dashboard and mobile app share this.
 *
 * Security:
 * - Requires attendance.read permission
 * - Only returns records from the authenticated user's tenant
 */

import { withPermission, successResponse, paginatedResponse } from "@/lib/backend";
import { validate, paginationSchema } from "@/lib/backend/validation";
import prisma from "@/lib/db/prisma";

export const GET = withPermission("attendance.read", async (request, _context, ctx) => {
  const { searchParams } = new URL(request.url);
  const params = validate(paginationSchema, Object.fromEntries(searchParams));
  const serviceId = searchParams.get("serviceId");

  const skip = ((params.page ?? 1) - 1) * (params.limit ?? 20);
  const where: any = {
    tenantId: ctx.tenantId,
  };
  if (serviceId) {
    where.serviceId = serviceId;
  }

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      skip,
      take: params.limit ?? 20,
      orderBy: { checkInTime: "desc" },
    }),
    prisma.attendanceRecord.count({
      where,
    }),
  ]);

  return paginatedResponse(records, {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    total,
    totalPages: Math.ceil(total / (params.limit ?? 20)),
  });
});
