/**
 * Seed script for creating test users
 * Run with: npx ts-node scripts/seed.ts
 */

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  try {
    // Create test user (admin)
    const testUser = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        password: await hash("admin123", 12),
        role: "admin",
      },
    });

    console.log("✅ Test user created/updated:", testUser);

    // Create another test user (employee)
    const employeeUser = await prisma.user.upsert({
      where: { username: "user" },
      update: {},
      create: {
        username: "user",
        password: await hash("user123", 12),
        role: "employee",
      },
    });

    console.log("✅ Employee user created/updated:", employeeUser);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
