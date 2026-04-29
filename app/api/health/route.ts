import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try {
    // Simple query to verify connection
    await prisma.$queryRaw`SELECT 1`;

    // Also grab table counts as a bonus check
    const [userCount, employeeCount] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
    ]);

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
