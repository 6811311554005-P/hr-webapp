import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function main() {
  try {
    console.log("Testing dashboard queries...");
    
    console.log("1. Total Employees");
    const totalEmployees = await prisma.employee.count();
    console.log("Total:", totalEmployees);

    console.log("2. Active Employees");
    const activeEmployees = await prisma.employee.count({
      where: { status: "ACTIVE" },
    });
    console.log("Active:", activeEmployees);

    console.log("3. Average Age");
    const averageAgePromise = await prisma.$queryRaw`
      SELECT AVG(DATEDIFF(CURDATE(), birthDate) / 365.25) AS averageAge
      FROM Employee
      WHERE birthDate IS NOT NULL
    `;
    console.log("Average Age:", averageAgePromise);

    console.log("4. Average Tenure");
    const averageTenurePromise = await prisma.$queryRaw`
      SELECT AVG(DATEDIFF(CURDATE(), hireDate) / 365.25) AS averageTenure
      FROM Employee
      WHERE hireDate IS NOT NULL
    `;
    console.log("Average Tenure:", averageTenurePromise);

    console.log("All queries successful.");
  } catch (e) {
    console.error("Query Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
