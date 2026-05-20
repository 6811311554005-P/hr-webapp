import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma/client";
import { auth } from "@/src/lib/auth";
import { logAuditEvent } from "@/src/lib/audit/logger";

/**
 * GET: Fetch all departments
 * Used for filter dropdowns in employee listing
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to access this resource." },
        { status: 401 }
      );
    }

    // Fetch only active departments, sorted by name
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: departments,
      total: departments.length,
    });
  } catch (error) {
    console.error("GET /api/departments error:", error);
    await logAuditEvent({
      action: "ERROR",
      entity: "Department",
      statusCode: 500,
      request: req,
      metadata: {
        route: "GET /api/departments",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { error: "Internal server error while fetching departments." },
      { status: 500 }
    );
  }
}
