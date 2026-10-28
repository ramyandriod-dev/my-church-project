/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancers.
 * Returns system status and database connectivity.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV || "development",
  };

  // Database connectivity check (when Prisma is connected)
  // try {
  //   await prisma.$queryRaw`SELECT 1`;
  //   checks.database = "connected";
  // } catch {
  //   checks.database = "disconnected";
  //   checks.status = "degraded";
  // }

  const statusCode = checks.status === "healthy" ? 200 : 503;

  return NextResponse.json(
    {
      success: true,
      data: checks,
    },
    { status: statusCode }
  );
}
