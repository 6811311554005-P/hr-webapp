import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma/client";
import type { DashboardData } from "@/src/types/dashboard";
import { logAuditEvent } from "@/src/lib/audit/logger";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const roundOneDecimal = (value: unknown): number => {
  const numericValue = Number(value);

  if (
    value === null ||
    value === undefined ||
    Number.isNaN(numericValue) ||
    !Number.isFinite(numericValue)
  ) {
    return 0;
  }

  return Math.max(Math.round(numericValue * 10) / 10, 0);
};

const safeCount = (value: number | null | undefined): number => {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return 0;
  }
  return Math.max(Math.trunc(value), 0);
};

const compactTopBreakdown = <T extends { count: number }>(
  items: T[],
  labelKey: keyof T,
  otherLabel: string,
  limit = 10
): T[] => {
  const sortedItems = items
    .map((item) => ({ ...item, count: safeCount(item.count) }))
    .sort((a, b) => b.count - a.count);

  if (sortedItems.length <= limit) {
    return sortedItems;
  }

  const visibleItems = sortedItems.slice(0, Math.max(limit - 1, 1));
  const otherCount = sortedItems
    .slice(visibleItems.length)
    .reduce((total, item) => total + item.count, 0);

  return [
    ...visibleItems,
    {
      [labelKey]: otherLabel,
      count: otherCount,
    } as T,
  ];
};

const jsonResponse = (body: unknown, status: number) => {
  return NextResponse.json(body, {
    status,
    headers: noStoreHeaders,
  });
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userRole = (session.user as { role?: string } | undefined)?.role;
    if (userRole !== "admin") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const startTime = Date.now();

    const totalEmployeesPromise = prisma.employee.count();
    const activeEmployeesPromise = prisma.employee.count({
      where: { status: "ACTIVE" },
    });
    const resignedEmployeesPromise = prisma.employee.count({
      where: { status: "RESIGNED" },
    });
    const countWithBirthDatePromise = prisma.employee.count({
      where: { NOT: { birthDate: null } },
    });
    const departmentBreakdownPromise = prisma.department.findMany({
      where: { employees: { some: {} } },
      select: {
        name: true,
        _count: { select: { employees: true } },
      },
      orderBy: { employees: { _count: "desc" } },
    });
    const positionBreakdownPromise = prisma.position.findMany({
      where: { employees: { some: {} } },
      select: {
        name: true,
        _count: { select: { employees: true } },
      },
      orderBy: { employees: { _count: "desc" } },
    });
    const averageAgePromise = prisma.$queryRaw<Array<{ averageAge: number | null }>>`
      SELECT AVG(DATEDIFF(CURDATE(), birthDate) / 365.25) AS averageAge
      FROM Employee
      WHERE birthDate IS NOT NULL
    `;
    const averageTenurePromise = prisma.$queryRaw<
      Array<{ averageTenure: number | null }>
    >`
      SELECT AVG(DATEDIFF(CURDATE(), hireDate) / 365.25) AS averageTenure
      FROM Employee
      WHERE hireDate IS NOT NULL
    `;
    const generationStatsPromise = prisma.$queryRaw<
      Array<{ generation: string; count: bigint }>
    >`
      SELECT 
        CASE 
          WHEN YEAR(birthDate) >= 1997 THEN 'Gen Z'
          WHEN YEAR(birthDate) BETWEEN 1981 AND 1996 THEN 'Gen Y'
          WHEN YEAR(birthDate) BETWEEN 1965 AND 1980 THEN 'Gen X'
          ELSE 'Baby Boomer'
        END AS generation,
        COUNT(*) as count
      FROM Employee
      WHERE birthDate IS NOT NULL
      GROUP BY generation
    `;
    const recentEmployeesPromise = prisma.employee.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        department: { select: { name: true } },
        position: { select: { name: true } },
        createdAt: true,
      },
    });

    const [
      totalEmployees,
      activeEmployees,
      departments,
      positions,
      averageAgeRows,
      averageTenureRows,
      recentEmployees,
      resignedEmployeesCount,
      countWithBirthDate,
      generationStatsRows,
    ] = await Promise.all([
      totalEmployeesPromise,
      activeEmployeesPromise,
      departmentBreakdownPromise,
      positionBreakdownPromise,
      averageAgePromise,
      averageTenurePromise,
      recentEmployeesPromise,
      resignedEmployeesPromise,
      countWithBirthDatePromise,
      generationStatsPromise,
    ]);

    const departmentBreakdown = compactTopBreakdown(
      departments.map((department) => ({
        department: department.name || "ไม่ระบุ",
        count: department._count.employees,
      })),
      "department",
      "อื่น ๆ"
    );

    const positionBreakdown = compactTopBreakdown(
      positions.map((position) => ({
        position: position.name || "ไม่ระบุ",
        count: position._count.employees,
      })),
      "position",
      "อื่น ๆ"
    );

    const averageAge = roundOneDecimal(averageAgeRows[0]?.averageAge ?? null);
    const averageTenure = roundOneDecimal(
      averageTenureRows[0]?.averageTenure ?? null
    );
    const sanitizedTotalEmployees = safeCount(totalEmployees);
    const sanitizedActiveEmployees = Math.min(
      safeCount(activeEmployees),
      sanitizedTotalEmployees
    );
    const inactiveEmployees = Math.max(
      sanitizedTotalEmployees - sanitizedActiveEmployees,
      0
    );

    const payload: DashboardData = {
      totalEmployees: sanitizedTotalEmployees,
      activeEmployees: sanitizedActiveEmployees,
      inactiveEmployees,
      resignedEmployees: safeCount(resignedEmployeesCount),
      countWithHireDate: sanitizedTotalEmployees,
      countWithBirthDate: safeCount(countWithBirthDate),
      averageAge,
      averageTenure,
      departmentBreakdown,
      positionBreakdown,
      generationStats: generationStatsRows.map(row => ({
        generation: row.generation,
        count: Number(row.count)
      })),
      recentEmployees: recentEmployees.map((employee) => ({
        id: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department?.name ?? "ไม่ระบุ",
        position: employee.position?.name ?? "ไม่ระบุ",
        createdAt: employee.createdAt.toISOString(),
      })),
    };

    const duration = Date.now() - startTime;
    console.log(`✅ Dashboard API loaded in ${duration}ms`);

    return jsonResponse(payload, 200);
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    await logAuditEvent({
      action: "ERROR",
      entity: "Dashboard",
      statusCode: 500,
      request: req,
      metadata: {
        route: "GET /api/dashboard",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return jsonResponse(
      { error: "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้" },
      500
    );
  }
}
