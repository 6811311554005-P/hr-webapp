import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// PUT /api/employees/:id - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Require authentication
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

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

    // Update employee
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(body.firstName && { firstName: body.firstName }),
        ...(body.lastName && { lastName: body.lastName }),
        ...(body.position && { position: body.position }),
        ...(body.department && { department: body.department }),
        ...(body.salary && { salary: parseFloat(body.salary) }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.birthDate !== undefined && { birthDate: body.birthDate ? new Date(body.birthDate) : null }),
      },
    });

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    console.error("PUT /api/employees/[id] error:", error);
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
    const session = await getServerSession(authOptions);

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

    return NextResponse.json(
      { message: "Employee deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/employees/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
