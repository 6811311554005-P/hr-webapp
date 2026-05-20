import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma/client";
import { auth } from "@/src/lib/auth";
import { logAuditEvent } from "@/src/lib/audit/logger";

/**
 * GET: Fetch all positions
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

    // Fetch only active positions, sorted by name
    const positions = await prisma.position.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: positions,
      total: positions.length,
    });
  } catch (error) {
    console.error("GET /api/positions error:", error);
    await logAuditEvent({
      action: "ERROR",
      entity: "Position",
      statusCode: 500,
      request: req,
      metadata: {
        route: "GET /api/positions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { error: "Internal server error while fetching positions." },
      { status: 500 }
    );
  }
}
