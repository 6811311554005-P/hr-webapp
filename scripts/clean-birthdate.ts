import { PrismaClient } from "@prisma/client";

// เชื่อมต่อผ่าน PrismaClient ปกติ ซึ่งจะใช้ DATABASE_URL จาก .env (hr_app)
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Data Cleansing: Updating missing birthDate in database...");

  try {
    const employeesWithMissingBirthDate = await prisma.employee.findMany({
      where: {
        birthDate: null,
      },
      select: {
        id: true,
        hireDate: true,
        employeeCode: true,
      },
    });

    console.log(`Found ${employeesWithMissingBirthDate.length} employees with missing birthDate.`);

    if (employeesWithMissingBirthDate.length === 0) {
      console.log("✅ All employees already have a birthDate.");
    } else {
      let updatedCount = 0;
      for (const emp of employeesWithMissingBirthDate) {
        const hireYear = emp.hireDate ? new Date(emp.hireDate).getFullYear() : 2022;
        const startWorkAge = Math.floor(Math.random() * 11) + 25; // 25 to 35
        const birthYear = hireYear - startWorkAge;
        const birthMonth = Math.floor(Math.random() * 12); // 0 to 11
        const birthDay = Math.floor(Math.random() * 28) + 1; // 1 to 28
        const birthDate = new Date(birthYear, birthMonth, birthDay);

        await prisma.employee.update({
          where: { id: emp.id },
          data: { birthDate },
        });

        updatedCount++;
        if (updatedCount % 50 === 0) {
          console.log(`Updated ${updatedCount}/${employeesWithMissingBirthDate.length} employees...`);
        }
      }

      console.log(`✅ Successfully updated ${updatedCount} employees' birthDate!`);
    }

    // ตรวจสอบค่า Average Age หลังอัปเดต
    const averageAgePromise = await prisma.$queryRaw<Array<{ averageAge: number | null }>>`
      SELECT AVG(DATEDIFF(CURDATE(), birthDate) / 365.25) AS averageAge
      FROM Employee
      WHERE birthDate IS NOT NULL
    `;
    console.log("📊 New Average Age:", Number(averageAgePromise[0]?.averageAge ?? 0).toFixed(1), "years");

  } catch (error) {
    console.error("❌ Error during cleansing:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
