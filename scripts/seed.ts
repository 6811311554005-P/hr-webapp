/**
 * Database seed script for creating test users
 * Run with: npx ts-node scripts/seed.ts
 */

import { hash } from "bcryptjs";
import { prisma } from "@/src/lib/prisma";

// ─── Test User Data ────────────────────────────────────────────────────────
const TEST_USERS = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
  },
  {
    username: "user",
    password: "user123",
    role: "employee",
  },
] as const;

async function main() {
  try {
    console.log("🌱 Seeding test users...");

    for (const user of TEST_USERS) {
      const hashedPassword = await hash(user.password, 12);

      const createdUser = await prisma.user.upsert({
        where: { username: user.username },
        update: {},
        create: {
          username: user.username,
          password: hashedPassword,
          role: user.role,
        },
      });

      console.log(
        `✅ ${user.role.charAt(0).toUpperCase() + user.role.slice(1)} user created/updated:`,
        createdUser
      );
    }

    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

