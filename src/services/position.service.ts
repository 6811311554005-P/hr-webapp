/**
 * Position service — Database layer
 * Handles all position-related database operations
 */

import { prisma } from "@/src/lib/prisma";
import type { Position } from "@prisma/client";

export interface CreatePositionInput {
  code: string;
  name: string;
  level?: string;
  departmentId: number;
}

/**
 * Position Service
 */
export const positionService = {
  /**
   * List all positions
   */
  async list(): Promise<Position[]> {
    return prisma.position.findMany({
      orderBy: { name: "asc" },
    });
  },

  /**
   * Get a single position by ID
   */
  async getById(id: number): Promise<Position | null> {
    return prisma.position.findUnique({
      where: { id },
    });
  },

  /**
   * Get position by name
   */
  async getByName(name: string): Promise<Position | null> {
    return prisma.position.findUnique({
      where: { name },
    });
  },

  /**
   * Create a new position
   */
  async create(data: CreatePositionInput): Promise<Position> {
    // Check if position already exists
    const existing = await this.getByName(data.name);
    if (existing) {
      throw new Error(`Position "${data.name}" already exists`);
    }

    return prisma.position.create({
      data: {
        code: data.code,
        name: data.name,
        level: data.level || "Entry",
        departmentId: data.departmentId,
      },
    });
  },

  /**
   * Update a position
   */
  async update(id: number, data: Partial<CreatePositionInput>): Promise<Position> {
    // Check position exists
    const position = await this.getById(id);
    if (!position) {
      throw new Error(`Position with ID ${id} not found`);
    }

    // Check if new name already exists (if updating name)
    if (data.name && data.name !== position.name) {
      const existing = await this.getByName(data.name);
      if (existing) {
        throw new Error(`Position "${data.name}" already exists`);
      }
    }

    return prisma.position.update({
      where: { id },
      data,
    });
  },

  /**
   * Delete a position
   */
  async delete(id: number): Promise<void> {
    // Check position exists
    const position = await this.getById(id);
    if (!position) {
      throw new Error(`Position with ID ${id} not found`);
    }

    await prisma.position.delete({ where: { id } });
  },

  /**
   * Get count of positions
   */
  async count(): Promise<number> {
    return prisma.position.count();
  },
};
