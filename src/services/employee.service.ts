/**
 * Employee service — Database layer
 * Handles all employee-related database operations
 * Following clean architecture principles
 */

import { prisma } from "@/src/lib/prisma";
import type { Employee, Prisma } from "@prisma/client";

// Types
export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  positionId: number;
  departmentId: number;
  salary: number;
  hireDate: Date;
  birthDate?: Date;
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export interface ListEmployeesFilter {
  skip?: number;
  take?: number;
  search?: string;
}

export interface EmployeeListResponse {
  data: Employee[];
  pagination: {
    total: number;
    skip: number;
    take: number;
    pages: number;
  };
}

/**
 * Employee Service
 */
export const employeeService = {
  /**
   * List all employees with pagination and search
   */
  async list(filter: ListEmployeesFilter = {}): Promise<EmployeeListResponse> {
    const { skip = 0, take = 10, search = "" } = filter;

    // Build where clause for search
    const where: Prisma.EmployeeWhereInput = search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { employeeCode: { contains: search } },
            { department: { name: { contains: search } } },
            { position: { name: { contains: search } } },
          ],
        }
      : {};

    // Fetch employees and total count in parallel
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          department: true,
          position: true,
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return {
      data: employees,
      pagination: {
        total,
        skip,
        take,
        pages: Math.ceil(total / take),
      },
    };
  },

  /**
   * Get a single employee by ID
   */
  async getById(id: number): Promise<Employee | null> {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        position: true,
      },
    });
  },

  /**
   * Get employee by employee code
   */
  async getByCode(code: string): Promise<Employee | null> {
    return prisma.employee.findUnique({
      where: { employeeCode: code },
      include: {
        department: true,
        position: true,
      },
    });
  },

  /**
   * Create a new employee
   */
  async create(data: CreateEmployeeInput): Promise<Employee> {
    // Validate relations exist
    const [department, position] = await Promise.all([
      prisma.department.findUnique({ where: { id: data.departmentId } }),
      prisma.position.findUnique({ where: { id: data.positionId } }),
    ]);

    if (!department) {
      throw new Error(`Department with ID ${data.departmentId} not found`);
    }

    if (!position) {
      throw new Error(`Position with ID ${data.positionId} not found`);
    }

    // Generate unique employee code
    const employeeCode = await generateEmployeeCode();

    // Create employee
    return prisma.employee.create({
      data: {
        employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        positionId: data.positionId,
        departmentId: data.departmentId,
        salary: data.salary,
        hireDate: data.hireDate,
        birthDate: data.birthDate,
      },
      include: {
        department: true,
        position: true,
      },
    });
  },

  /**
   * Update an employee
   */
  async update(id: number, data: UpdateEmployeeInput): Promise<Employee> {
    // Check employee exists
    const employee = await this.getById(id);
    if (!employee) {
      throw new Error(`Employee with ID ${id} not found`);
    }

    // Validate relations if updating them
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!department) {
        throw new Error(`Department with ID ${data.departmentId} not found`);
      }
    }

    if (data.positionId) {
      const position = await prisma.position.findUnique({
        where: { id: data.positionId },
      });
      if (!position) {
        throw new Error(`Position with ID ${data.positionId} not found`);
      }
    }

    // Update employee
    return prisma.employee.update({
      where: { id },
      data,
      include: {
        department: true,
        position: true,
      },
    });
  },

  /**
   * Delete an employee
   */
  async delete(id: number): Promise<void> {
    // Check employee exists
    const employee = await this.getById(id);
    if (!employee) {
      throw new Error(`Employee with ID ${id} not found`);
    }

    await prisma.employee.delete({ where: { id } });
  },

  /**
   * Get employees by department
   */
  async getByDepartment(departmentId: number): Promise<Employee[]> {
    return prisma.employee.findMany({
      where: { departmentId },
      include: {
        department: true,
        position: true,
      },
      orderBy: { lastName: "asc" },
    });
  },

  /**
   * Get employees by position
   */
  async getByPosition(positionId: number): Promise<Employee[]> {
    return prisma.employee.findMany({
      where: { positionId },
      include: {
        department: true,
        position: true,
      },
      orderBy: { lastName: "asc" },
    });
  },

  /**
   * Get count of employees
   */
  async count(): Promise<number> {
    return prisma.employee.count();
  },

  /**
   * Get employees by department with count
   */
  async groupByDepartment(): Promise<
    Array<{ departmentId: number; _count: number; name: string }>
  > {
    const result = await prisma.employee.groupBy({
      by: ["departmentId"],
      _count: true,
    });

    // Get department names
    return Promise.all(
      result.map(async (group) => {
        const dept = await prisma.department.findUnique({
          where: { id: group.departmentId },
          select: { name: true },
        });
        return {
          departmentId: group.departmentId,
          _count: group._count,
          name: dept?.name || "Unknown",
        };
      })
    );
  },

};

/**
 * Generate unique employee code
 * Format: EMP-XXXX (e.g., EMP-0001)
 */
async function generateEmployeeCode(): Promise<string> {
  const lastEmployee = await prisma.employee.findFirst({
    orderBy: { id: "desc" },
    select: { employeeCode: true },
  });

  let number = 1;
  if (lastEmployee?.employeeCode) {
    const match = lastEmployee.employeeCode.match(/EMP-(\d+)/);
    if (match) {
      number = parseInt(match[1]) + 1;
    }
  }

  return `EMP-${String(number).padStart(4, "0")}`;
}
