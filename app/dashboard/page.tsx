import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { DashboardClient } from "@/src/components/dashboard";
import { calculateAge, isRecentHire } from "@/src/lib/utils/date-helpers";
import { TIME, FORMATS } from "@/src/lib/utils";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch total employees count
  const totalEmployees = await prisma.employee.count();

  // Fetch employees with dates for calculations
  const employees = await prisma.employee.findMany({
    select: { birthDate: true, startDate: true },
  });

  // Calculate average age
  const ages = employees
    .filter((emp) => emp.birthDate)
    .map((emp) => calculateAge(emp.birthDate!));

  const averageAge =
    ages.length > 0
      ? (ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(
          FORMATS.DECIMAL_PLACES.AVERAGE_AGE
        )
      : "N/A";

  // Calculate recent hires (last 30 days)
  const recentHires = employees.filter((emp) =>
    isRecentHire(emp.startDate, TIME.DAYS.RECENT_HIRE_WINDOW)
  ).length;

  // Fetch employees per department
  const departmentStats = await prisma.employee.groupBy({
    by: ["department"],
    _count: {
      _all: true,
    },
  });

  const stats = {
    totalEmployees,
    averageAge,
    departmentStats,
    recentHires,
  };

  return <DashboardClient session={session} stats={stats} />;
}
