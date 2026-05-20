import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { logAuditEvent } from "@/src/lib/audit/logger";

export async function GET(req: NextRequest) {
  try {
    // Simple query to verify connection
    await prisma.$queryRaw`SELECT 1`;

    // Also grab table counts as a bonus check
    const [userCount, employeeCount] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
    ]);

    await logAuditEvent({
      action: "HEALTH_CHECK",
      entity: "System",
      statusCode: 200,
      request: req,
      metadata: {
        users: userCount,
        employees: employeeCount,
      },
    });

    return NextResponse.json({
      status: "ok",
      database: "connected",
      tables: {
        users: userCount,
        employees: employeeCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("DB health check failed:", error);
    await logAuditEvent({
      action: "ERROR",
      entity: "System",
      statusCode: 500,
      request: req,
      metadata: {
        route: "GET /api/health",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
