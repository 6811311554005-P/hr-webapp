import { NextRequest, NextResponse } from "next/server";
import { AuditAction, Prisma } from "@prisma/client";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { logAuditEvent } from "@/src/lib/audit/logger";

const jsonResponse = (body: unknown, status: number) => {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
};

const parsePositiveInt = (
  value: string | null,
  fallback: number,
  max: number
): number => {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;

  return Math.min(parsed, max);
};

const parseAction = (value: string | null): AuditAction | undefined => {
  if (!value) return undefined;

  const actions = Object.values(AuditAction) as string[];
  return actions.includes(value) ? (value as AuditAction) : undefined;
};

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userRole = (session.user as { role?: string } | undefined)?.role;
  if (userRole !== "admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), 1, 100_000);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 20, 100);
    const action = parseAction(searchParams.get("action"));
    const entity = searchParams.get("entity")?.trim();
    const search = searchParams.get("search")?.trim();

    const where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.action = action;
    }

    if (entity) {
      where.entity = entity;
    }

    if (search) {
      where.OR = [
        { userEmail: { contains: search } },
        { entity: { contains: search } },
        { entityId: { contains: search } },
        { path: { contains: search } },
      ];
    }

    const [logs, total, entities] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          method: true,
          path: true,
          statusCode: true,
          userEmail: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        distinct: ["entity"],
        orderBy: { entity: "asc" },
        select: { entity: true },
      }),
    ]);

    await logAuditEvent({
      action: "READ",
      entity: "AuditLog",
      statusCode: 200,
      request: req,
      session,
      metadata: {
        total,
        page,
        pageSize,
        action,
        entity,
        search,
      },
    });

    return jsonResponse(
      {
        data: logs.map((log) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
        actions: Object.values(AuditAction),
        entities: entities.map((item) => item.entity),
      },
      200
    );
  } catch (error) {
    console.error("GET /api/admin/audit-logs error:", error);
    await logAuditEvent({
      action: "ERROR",
      entity: "AuditLog",
      statusCode: 500,
      request: req,
      session,
      metadata: {
        route: "GET /api/admin/audit-logs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return jsonResponse({ error: "Failed to fetch audit logs" }, 500);
  }
}
