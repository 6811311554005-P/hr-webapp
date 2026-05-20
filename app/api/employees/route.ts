import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { auth } from "@/src/lib/auth";
import { logAuditEvent } from "@/src/lib/audit/logger";

// --- Helper Functions ---

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculate tenure in years from hire date (rounded to 1 decimal place)
 */
function calculateTenure(hireDate: Date | null): number | null {
  if (!hireDate) return null;
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - hireDate.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(diffYears * 10) / 10;
}

/**
 * GET: Fetch employees with search, filter, pagination, and relations
 */
export async function GET(req: NextRequest) {
  try {
    // --- 0. Authentication & Authorization ---
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in to access this resource." }, { status: 401 });
    }

    // Future scalability: Uncomment to enforce Admin-only read access
    /*
    if ((session.user as { role?: string } | undefined)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }
    */

    const { searchParams } = new URL(req.url);

    // 1. Pagination Parameters with Strict Validation
    const skipParam = searchParams.get("skip");
    let skip = 0;
    if (skipParam !== null && skipParam !== "") {
      skip = parseInt(skipParam, 10);
      if (Number.isNaN(skip) || skip < 0) {
        return NextResponse.json({ error: "Invalid 'skip' parameter. Must be a non-negative integer." }, { status: 400 });
      }
    }

    const takeParam = searchParams.get("take");
    let take = 10;
    if (takeParam !== null && takeParam !== "") {
      take = parseInt(takeParam, 10);
      if (Number.isNaN(take) || take <= 0) {
        return NextResponse.json({ error: "Invalid 'take' parameter. Must be a positive integer." }, { status: 400 });
      }
      // Performance: Cap max take to 1000 to prevent large dataset memory spikes
      take = Math.min(take, 1000); 
    }

    // 2. Search & Filter Parameters
    const search = searchParams.get("search");
    const departmentIdParam = searchParams.get("departmentId");
    const positionIdParam = searchParams.get("positionId");
    const statusParam = searchParams.get("status");

    // Construct the dynamic WHERE clause for Prisma
    const where: Prisma.EmployeeWhereInput = {};

    // Strict Search Validation: Handle empty strings and literal "null"
    if (search && search.trim().length > 0 && search !== "null") {
      const searchTerm = search.trim();
      where.OR = [
        { employeeCode: { contains: searchTerm } },
        { positionNumber: { contains: searchTerm } },
        { contractNumber: { contains: searchTerm } },
        { firstName: { contains: searchTerm } },
        { lastName: { contains: searchTerm } },
      ];
    }

    // Strict Filter Validation for departmentId
    if (departmentIdParam !== null && departmentIdParam !== "" && departmentIdParam !== "null") {
      const parsedDeptId = parseInt(departmentIdParam, 10);
      if (Number.isNaN(parsedDeptId) || parsedDeptId <= 0) {
        return NextResponse.json({ error: "Invalid 'departmentId' parameter." }, { status: 400 });
      }
      where.departmentId = parsedDeptId;
    }

    // Strict Filter Validation for positionId
    if (positionIdParam !== null && positionIdParam !== "" && positionIdParam !== "null") {
      const parsedPosId = parseInt(positionIdParam, 10);
      if (Number.isNaN(parsedPosId) || parsedPosId <= 0) {
        return NextResponse.json({ error: "Invalid 'positionId' parameter." }, { status: 400 });
      }
      where.positionId = parsedPosId;
    }

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as any;
    }

    // 3. Query Optimization: Run findMany and count concurrently
    // For extreme datasets (millions of rows), consider removing the `.count()` 
    // or switching to cursor-based pagination to avoid deep OFFSET scanning.
    const [rawData, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take,
        // Ensure ordering uses an indexed column for performance
        orderBy: {
          createdAt: "desc", 
        },
        select: {
          id: true,
          employeeCode: true,
          contractNumber: true,
          positionNumber: true,
          firstName: true,
          lastName: true,
          salary: true,
          birthDate: true,
          hireDate: true,
          resignationDate: true,
          resignationReason: true,
          status: true,
          department: {
            select: { name: true }
          },
          position: {
            select: { name: true }
          }
        },
      }),
      prisma.employee.count({
        where, 
      }),
    ]);

    // 4. Transform data: compute fields safely and cast Decimal to Number
    const data = rawData.map((emp) => ({
      id: emp.id,
      employeeCode: emp.employeeCode,
      contractNumber: emp.contractNumber,
      positionNumber: emp.positionNumber,
      firstName: emp.firstName,
      lastName: emp.lastName,
      salary: emp.salary ? Number(emp.salary) : 0,
      department: emp.department,
      position: emp.position,
      birthDate: emp.birthDate,
      hireDate: emp.hireDate,
      resignationDate: emp.resignationDate,
      resignationReason: emp.resignationReason,
      status: emp.status,
      age: calculateAge(emp.birthDate),
      tenure: calculateTenure(emp.hireDate)
    }));

    // 5. Return properly structured response
    return NextResponse.json({
      data,
      total,
      skip,
      take,
    });
  } catch (error) {
    console.error("GET /api/employees error:", error);
    await logAuditEvent({
      action: "ERROR",
      entity: "Employee",
      statusCode: 500,
      request: req,
      metadata: {
        route: "GET /api/employees",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { error: "Internal server error while fetching employees." },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new employee
 */
export async function POST(req: NextRequest) {
  try {
    // --- 0. Authentication & Authorization ---
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in to perform this action." }, { status: 401 });
    }

    // Enforce Admin-only access for creating records
    if ((session.user as { role?: string } | undefined)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden. Only administrators can create new employees." }, { status: 403 });
    }

    const body = await req.json();

    const {
      employeeCode,
      firstName,
      lastName,
      departmentId,
      positionId,
      hireDate,
      birthDate,
      contractNumber,
      positionNumber,
      salary,
      resignationDate,
      resignationReason,
      status,
    } = body;

    // 1. Validate required fields
    if (
      !employeeCode ||
      !firstName ||
      !lastName ||
      !departmentId ||
      !positionId ||
      !hireDate
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: employeeCode, firstName, lastName, departmentId, positionId, hireDate",
        },
        { status: 400 }
      );
    }

    // 2. Prevent duplicate employee codes
    const existingEmployee = await prisma.employee.findUnique({
      where: { employeeCode },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: `Employee code '${employeeCode}' already exists.` },
        { status: 409 }
      );
    }

    // 2.5 Strict validation for Dates and Numbers
    const parsedSalary = salary ? parseFloat(salary) : 0;
    if (Number.isNaN(parsedSalary) || parsedSalary < 0) {
      return NextResponse.json({ error: "Invalid salary format. Must be a positive number." }, { status: 400 });
    }

    const parsedHireDate = new Date(hireDate);
    if (Number.isNaN(parsedHireDate.getTime())) {
      return NextResponse.json({ error: "Invalid hireDate format." }, { status: 400 });
    }

    let parsedBirthDate: Date | undefined = undefined;
    if (birthDate) {
      parsedBirthDate = new Date(birthDate);
      if (Number.isNaN(parsedBirthDate.getTime())) {
        return NextResponse.json({ error: "Invalid birthDate format." }, { status: 400 });
      }
    }

    let parsedResignationDate: Date | undefined = undefined;
    if (resignationDate) {
      parsedResignationDate = new Date(resignationDate);
      if (Number.isNaN(parsedResignationDate.getTime())) {
        return NextResponse.json({ error: "Invalid resignationDate format." }, { status: 400 });
      }
    }

    // 3. Create the employee record
    const newEmployee = await prisma.employee.create({
      data: {
        employeeCode,
        firstName,
        lastName,
        departmentId: parseInt(departmentId, 10),
        positionId: parseInt(positionId, 10),
        hireDate: parsedHireDate,
        birthDate: parsedBirthDate,
        contractNumber: contractNumber || undefined,
        positionNumber: positionNumber || undefined,
        salary: parsedSalary,
        resignationDate: parsedResignationDate,
        resignationReason: resignationReason || undefined,
        status: status || "ACTIVE",
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        salary: true,
        birthDate: true,
        hireDate: true,
        resignationDate: true,
        resignationReason: true,
        department: {
          select: { name: true }
        },
        position: {
          select: { name: true }
        }
      },
    });

    // Consistent response formatting (matching GET)
    const formattedEmployee = {
      ...newEmployee,
      salary: newEmployee.salary ? Number(newEmployee.salary) : 0,
      age: calculateAge(newEmployee.birthDate),
      tenure: calculateTenure(newEmployee.hireDate)
    };

    await logAuditEvent({
      action: "CREATE",
      entity: "Employee",
      entityId: newEmployee.id,
      statusCode: 201,
      request: req,
      session,
      metadata: {
        employeeCode: newEmployee.employeeCode,
      },
    });

    // Return the newly created resource with 201 Created status
    return NextResponse.json(formattedEmployee, { status: 201 });
  } catch (error) {
    console.error("POST /api/employees error:", error);
    await logAuditEvent({
      action: "ERROR",
      entity: "Employee",
      statusCode: 500,
      request: req,
      metadata: {
        route: "POST /api/employees",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
