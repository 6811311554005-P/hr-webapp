import { prisma } from "@/src/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";

// GET /api/employees - List all employees
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Require authentication
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "10");
    const search = searchParams.get("search") || "";

    // Build filter
    const where = search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { position: { contains: search } },
            { department: { contains: search } },
          ],
        }
      : {};

    // Fetch employees with pagination
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { id: "asc" },
      }),
      prisma.employee.count({ where }),
    ]);

    return NextResponse.json(
      {
        data: employees,
        pagination: {
          total,
          skip,
          take,
          pages: Math.ceil(total / take),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/employees error:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Require authentication
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const { firstName, lastName, position, department, salary, startDate, birthDate } = body;

    if (!firstName || !lastName || !position || !department || !salary || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        position,
        department,
        salary: parseFloat(salary),
        startDate: new Date(startDate),
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
