/**
 * Database seed script for creating test employees
 * Run with: npx tsx scripts/seed-employees.ts
 * 
 * Note: This script requires departments and positions to exist first.
 * Run `npm run db:seed` first to set up the base data.
 */

import { prisma } from "@/src/lib/prisma";

// ─── Test Employee Data ────────────────────────────────────────────────────
const TEST_EMPLOYEES = [
  {
    firstName: "John",
    lastName: "Doe",
    employeeCode: "EMP-T001",
    salary: 95000,
    hireDate: new Date("2022-01-15"),
    birthDate: new Date("1985-05-10"),
  },
  {
    firstName: "Jane",
    lastName: "Smith",
    employeeCode: "EMP-T002",
    salary: 90000,
    hireDate: new Date("2022-06-01"),
    birthDate: new Date("1990-08-22"),
  },
  {
    firstName: "Mike",
    lastName: "Johnson",
    employeeCode: "EMP-T003",
    salary: 75000,
    hireDate: new Date("2023-03-10"),
    birthDate: new Date("1995-11-05"),
  },
  {
    firstName: "Sarah",
    lastName: "Williams",
    employeeCode: "EMP-T004",
    salary: 80000,
    hireDate: new Date("2022-11-20"),
    birthDate: new Date("1988-03-15"),
  },
  {
    firstName: "Tom",
    lastName: "Brown",
    employeeCode: "EMP-T005",
    salary: 100000,
    hireDate: new Date("2021-05-30"),
    birthDate: new Date("1982-12-01"),
  },
  {
    firstName: "Emily",
    lastName: "Davis",
    employeeCode: "EMP-T006",
    salary: 65000,
    hireDate: new Date("2023-09-01"),
    birthDate: new Date("1998-01-20"),
  },
  {
    firstName: "Alex",
    lastName: "Miller",
    employeeCode: "EMP-T007",
    salary: 85000,
    hireDate: new Date("2023-02-15"),
    birthDate: new Date("1993-06-30"),
  },
  {
    firstName: "Lisa",
    lastName: "Taylor",
    employeeCode: "EMP-T008",
    salary: 70000,
    hireDate: new Date("2022-08-10"),
    birthDate: new Date("1987-09-12"),
  },
];

async function main() {
  try {
    console.log("🌱 Seeding test employees...");

    // Get first department and position to assign
    const department = await prisma.department.findFirst();
    const position = await prisma.position.findFirst();

    if (!department || !position) {
      console.error("❌ No departments or positions found. Run `npm run db:seed` first.");
      process.exit(1);
    }

    console.log(`📁 Using department: ${department.name} (ID: ${department.id})`);
    console.log(`💼 Using position: ${position.name} (ID: ${position.id})`);

    // Create employees
    for (const employee of TEST_EMPLOYEES) {
      // Check if employee code already exists
      const existing = await prisma.employee.findUnique({
        where: { employeeCode: employee.employeeCode },
      });

      if (existing) {
        console.log(`⏩ Skipped: ${employee.firstName} ${employee.lastName} (already exists)`);
        continue;
      }

      const createdEmployee = await prisma.employee.create({
        data: {
          ...employee,
          departmentId: department.id,
          positionId: position.id,
          status: "ACTIVE",
        },
      });

      console.log(
        `✅ Created: ${createdEmployee.firstName} ${createdEmployee.lastName} [${createdEmployee.employeeCode}]`
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
