/**
 * Seed script for creating test employees
 * Run with: npx ts-node scripts/seed-employees.ts
 */

import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

async function main() {
  try {
    // Clear existing employees (optional)
    await prisma.employee.deleteMany({});

    const employees = [
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
    ];

    // Create employees
    for (const emp of employees) {
      const existing = await prisma.employee.findFirst({
        where: {
          firstName: emp.firstName,
          lastName: emp.lastName,
        },
      });

      if (!existing) {
        const created = await prisma.employee.create({
          data: emp,
        });
        console.log(`✅ Created: ${created.firstName} ${created.lastName}`);
      } else {
        console.log(`⏭️  Skipped: ${emp.firstName} ${emp.lastName} (already exists)`);
      }
    }

    console.log("\n✅ Employee seeding complete!");
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
