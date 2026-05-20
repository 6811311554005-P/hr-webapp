import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/client';

export async function GET() {
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

    if (employeesWithMissingBirthDate.length === 0) {
      const avg = await prisma.$queryRaw<Array<{ averageAge: number | null }>>`
        SELECT AVG(DATEDIFF(CURDATE(), birthDate) / 365.25) AS averageAge
        FROM Employee
        WHERE birthDate IS NOT NULL
      `;
      return NextResponse.json({
        message: "All employees already have a birthDate.",
        averageAge: Number(avg[0]?.averageAge ?? 0).toFixed(1)
      });
    }

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
    }

    const averageAgePromise = await prisma.$queryRaw<Array<{ averageAge: number | null }>>`
      SELECT AVG(DATEDIFF(CURDATE(), birthDate) / 365.25) AS averageAge
      FROM Employee
      WHERE birthDate IS NOT NULL
    `;
    const newAverageAge = Number(averageAgePromise[0]?.averageAge ?? 0).toFixed(1);

    return NextResponse.json({
      success: true,
      updatedCount,
      newAverageAge
    });

  } catch (error) {
    console.error("Clean birthdate error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
