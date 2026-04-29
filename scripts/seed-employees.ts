/**
 * Database seed script for creating test employees
 * Run with: npx ts-node scripts/seed-employees.ts
 */

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";

// ─── Test Employee Data ────────────────────────────────────────────────────
const TEST_EMPLOYEES = [
  {
    firstName: "John",
    lastName: "Doe",
    position: "Senior Engineer",
    department: "IT",
    salary: new Prisma.Decimal("95000"),
    startDate: new Date("2022-01-15"),
    birthDate: new Date("1985-05-10"),
  },
  {
    firstName: "Jane",
    lastName: "Smith",
    position: "Product Manager",
    department: "Product",
    salary: new Prisma.Decimal("90000"),
    startDate: new Date("2022-06-01"),
    birthDate: new Date("1990-08-22"),
  },
  {
    firstName: "Mike",
    lastName: "Johnson",
    position: "UI Designer",
    department: "Design",
    salary: new Prisma.Decimal("75000"),
    startDate: new Date("2023-03-10"),
    birthDate: new Date("1995-11-05"),
  },
  {
    firstName: "Sarah",
    lastName: "Williams",
    position: "Marketing Manager",
    department: "Marketing",
    salary: new Prisma.Decimal("80000"),
    startDate: new Date("2022-11-20"),
    birthDate: new Date("1988-03-15"),
  },
  {
    firstName: "Tom",
    lastName: "Brown",
    position: "DevOps Engineer",
    department: "IT",
    salary: new Prisma.Decimal("100000"),
    startDate: new Date("2021-05-30"),
    birthDate: new Date("1982-12-01"),
  },
  {
    firstName: "Emily",
    lastName: "Davis",
    position: "QA Tester",
    department: "Quality Assurance",
    salary: new Prisma.Decimal("65000"),
    startDate: new Date("2023-09-01"),
    birthDate: new Date("1998-01-20"),
  },
  {
    firstName: "Alex",
    lastName: "Miller",
    position: "Frontend Engineer",
    department: "IT",
    salary: new Prisma.Decimal("85000"),
    startDate: new Date("2023-02-15"),
    birthDate: new Date("1993-06-30"),
  },
  {
    firstName: "Lisa",
    lastName: "Taylor",
    position: "HR Manager",
    department: "HR",
    salary: new Prisma.Decimal("70000"),
    startDate: new Date("2022-08-10"),
    birthDate: new Date("1987-09-12"),
  },
] as const;

async function main() {
  try {
    console.log("🌱 Seeding test employees...");

    // Clear existing employees
    const deletedCount = await prisma.employee.deleteMany({});
    console.log(`🗑️  Deleted ${deletedCount.count} existing employees`);

    // Create employees
    for (const employee of TEST_EMPLOYEES) {
      const createdEmployee = await prisma.employee.create({
        data: employee as Prisma.EmployeeCreateInput,
      });

      console.log(
        `✅ Created: ${createdEmployee.firstName} ${createdEmployee.lastName}`
      );
    }

    const totalCount = await prisma.employee.count();
    console.log(`\n✅ Seeding completed! Total employees: ${totalCount}`);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
