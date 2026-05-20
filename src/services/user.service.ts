/**
 * User service — Database layer
 * Handles all user-related database operations
 */

import { prisma } from "@/src/lib/prisma";
import { hash } from "bcryptjs";
import type { Prisma, User } from "@prisma/client";

export interface CreateUserInput {
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  role?: string;
}

function omitPasswordHash(user: User): Omit<User, "passwordHash"> {
  const { passwordHash, ...userWithoutPassword } = user;
  void passwordHash;
  return userWithoutPassword;
}

/**
 * User Service
 */
export const userService = {
  /**
   * Get a user by email
   */
  async getByEmail(email: string): Promise<Omit<User, "passwordHash"> | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return omitPasswordHash(user);
  },

  /**
   * Get user by ID
   */
  async getById(id: number): Promise<Omit<User, "passwordHash"> | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return omitPasswordHash(user);
  },

  /**
   * List all users
   */
  async list(): Promise<Omit<User, "passwordHash">[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return users.map(omitPasswordHash);
  },

  /**
   * Create a new user
   */
  async create(data: CreateUserInput): Promise<Omit<User, "passwordHash">> {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new Error(`User with email "${data.email}" already exists`);
    }

    // Hash password
    const passwordHash = await hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role || "user",
      },
    });

    return omitPasswordHash(user);
  },

  /**
   * Update user
   */
  async update(
    id: number,
    data: UpdateUserInput
  ): Promise<Omit<User, "passwordHash">> {
    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    // Check if new email already exists (if updating email)
    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existing) {
        throw new Error(`User with email "${data.email}" already exists`);
      }
    }

    // Hash new password if provided
    const updateData: Prisma.UserUpdateInput = {};
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.password) {
      updateData.passwordHash = await hash(data.password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return omitPasswordHash(updatedUser);
  },

  /**
   * Delete a user
   */
  async delete(id: number): Promise<void> {
    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    await prisma.user.delete({ where: { id } });
  },

  /**
   * Get count of users
   */
  async count(): Promise<number> {
    return prisma.user.count();
  },

  /**
   * Verify user credentials (used for authentication)
   */
  async verifyCredentials(
    email: string
  ): Promise<{ id: number; email: string; role: string; passwordHash: string } | null> {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, passwordHash: true },
    });
  },
};
