import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { Prisma } from "@prisma/client";
import { createChangedFields, logAuditEvent } from "@/src/lib/audit/logger";
import { prisma } from "@/src/lib/prisma/client";

type EmployeeUpdateBody = {
  firstName?: unknown;
  lastName?: unknown;
  positionId?: unknown;
  departmentId?: unknown;
  salary?: unknown;
  hireDate?: unknown;
  startDate?: unknown;
  birthDate?: unknown;
  status?: unknown;
  resignationDate?: unknown;
  resignationReason?: unknown;
  resignationHistories?: { id?: number; resignationDate: string; reason?: string }[];
};

const toPositiveInt = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const calculateAge = (birthDate: Date | null): number | null => {
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

const calculateTenure = (hireDate: Date | null): number | null => {
  if (!hireDate) return null;

  const today = new Date();
  const diffYears =
    Math.abs(today.getTime() - hireDate.getTime()) /
    (1000 * 60 * 60 * 24 * 365.25);

  return Math.round(diffYears * 10) / 10;
};

const formatEmployee = (
  employee: Prisma.EmployeeGetPayload<{
    include: { department: true; position: true };
  }>
) => ({
  ...employee,
  salary: Number(employee.salary),
  age: calculateAge(employee.birthDate),
  tenure: calculateTenure(employee.hireDate),
});

// GET /api/employees/:id - Fetch employee details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const employeeId = parseInt(id, 10);

    if (Number.isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        position: true,
        resignationHistories: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: formatEmployee(employee) }, { status: 200 });
  } catch (error) {
    console.error("GET /api/employees/[id] error:", error);
    await logAuditEvent({
      action: "ERROR",
      entity: "Employee",
      statusCode: 500,
      request,
      metadata: {
        route: "GET /api/employees/[id]",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// PUT /api/employees/:id - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    // Require authentication
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = (await request.json()) as EmployeeUpdateBody;

    // Validate ID
    const employeeId = parseInt(id);
    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Validate relations if provided
    const positionId = toPositiveInt(body.positionId);
    const departmentId = toPositiveInt(body.departmentId);

    if (positionId || departmentId) {
      const [positionExists, departmentExists] = await Promise.all([
        positionId ? prisma.position.findUnique({ where: { id: positionId } }) : Promise.resolve(true),
        departmentId ? prisma.department.findUnique({ where: { id: departmentId } }) : Promise.resolve(true),
      ]);

      if (!positionExists || !departmentExists) {
        return NextResponse.json(
          { error: "Invalid position or department" },
          { status: 400 }
        );
      }
    }

    // Update employee
    const updateData: Prisma.EmployeeUncheckedUpdateInput = {};
    const firstName = toOptionalString(body.firstName);
    const lastName = toOptionalString(body.lastName);

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (positionId) updateData.positionId = positionId;
    if (departmentId) updateData.departmentId = departmentId;
    if (body.salary !== undefined) updateData.salary = new Prisma.Decimal(String(body.salary));
    if (body.hireDate !== undefined || body.startDate !== undefined) {
      const hdValue = body.hireDate ?? body.startDate;
      updateData.hireDate = hdValue ? new Date(String(hdValue)) : null;
    }
    if (body.birthDate !== undefined) {
      updateData.birthDate = body.birthDate ? new Date(String(body.birthDate)) : null;
    }
    if (body.status !== undefined && typeof body.status === "string") {
      updateData.status = body.status as any;
    }
    if (body.resignationDate !== undefined) {
      updateData.resignationDate = body.resignationDate ? new Date(String(body.resignationDate)) : null;
    }
    if (body.resignationReason !== undefined) {
      updateData.resignationReason = body.resignationReason ? String(body.resignationReason) : null;
    }
    
    if (body.resignationHistories !== undefined && Array.isArray(body.resignationHistories)) {
      updateData.resignationHistories = {
        deleteMany: {},
        create: body.resignationHistories.map((h: any) => ({
          resignationDate: new Date(String(h.resignationDate)),
          reason: h.reason ? String(h.reason) : null,
        })),
      };
    }

    const changedFields = createChangedFields(existingEmployee, updateData);

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
      include: {
        department: true,
        position: true,
        resignationHistories: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    await logAuditEvent({
      action: "UPDATE",
      entity: "Employee",
      entityId: employeeId,
      statusCode: 200,
      request,
      session,
      metadata: {
        employeeCode: employee.employeeCode,
        changedFields,
      },
    });

    return NextResponse.json({ data: formatEmployee(employee) }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/employees/[id] error:", error);
    await logAuditEvent({
      action: "ERROR",
      entity: "Employee",
      statusCode: 500,
      request,
      metadata: {
        route: "PUT /api/employees/[id]",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/:id - Delete employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    // Require authentication
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Validate ID
    const employeeId = parseInt(id);
    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Delete employee
    await prisma.employee.delete({
      where: { id: employeeId },
    });

    await logAuditEvent({
      action: "DELETE",
      entity: "Employee",
      entityId: employeeId,
      statusCode: 200,
      request,
      session,
      metadata: {
        employeeCode: existingEmployee.employeeCode,
      },
    });

    return NextResponse.json(
      { message: "Employee deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/employees/[id] error:", error);
    await logAuditEvent({
      action: "ERROR",
      entity: "Employee",
      statusCode: 500,
      request,
      metadata: {
        route: "DELETE /api/employees/[id]",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
