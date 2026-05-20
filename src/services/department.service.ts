/**
 * Department service — Database layer
 * Handles all department-related database operations
 */

import { prisma } from "@/src/lib/prisma";
import type { Department } from "@prisma/client";

export interface CreateDepartmentInput {
  code: string;
  name: string;
  description?: string;
}

/**
 * Department Service
 */
export const departmentService = {
  /**
   * List all departments
   */
  async list(): Promise<Department[]> {
    return prisma.department.findMany({
      orderBy: { name: "asc" },
    });
  },

  /**
   * Get a single department by ID
   */
  async getById(id: number): Promise<Department | null> {
    return prisma.department.findUnique({
      where: { id },
    });
  },

  /**
   * Get department by name
   */
  async getByName(name: string): Promise<Department | null> {
    return prisma.department.findUnique({
      where: { name },
    });
  },

  /**
   * Create a new department
   */
  async create(data: CreateDepartmentInput): Promise<Department> {
    // Check if department already exists
    const existing = await this.getByName(data.name);
    if (existing) {
      throw new Error(`Department "${data.name}" already exists`);
    }

    return prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
      },
    });
  },

  /**
   * Update a department
   */
  async update(id: number, data: Partial<CreateDepartmentInput>): Promise<Department> {
    // Check department exists
    const department = await this.getById(id);
    if (!department) {
      throw new Error(`Department with ID ${id} not found`);
    }

    // Check if new name already exists (if updating name)
    if (data.name && data.name !== department.name) {
      const existing = await this.getByName(data.name);
      if (existing) {
        throw new Error(`Department "${data.name}" already exists`);
      }
    }

    return prisma.department.update({
      where: { id },
      data,
    });
  },

  /**
   * Delete a department
   */
  async delete(id: number): Promise<void> {
    // Check department exists
    const department = await this.getById(id);
    if (!department) {
      throw new Error(`Department with ID ${id} not found`);
    }

    await prisma.department.delete({ where: { id } });
  },

  /**
   * Get count of departments
   */
  async count(): Promise<number> {
    return prisma.department.count();
  },
};
