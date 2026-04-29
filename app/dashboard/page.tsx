import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { DashboardClient } from "@/src/components/dashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch real data from Prisma
  const totalEmployees = await prisma.employee.count();
  
  const employees = await prisma.employee.findMany({
    select: { birthDate: true, startDate: true }
  });

  // Calculate Average Age
  const now = new Date();
  const ages = employees
    .filter(e => e.birthDate)
    .map(e => {
      const birthDate = e.birthDate!;
      let age = now.getFullYear() - birthDate.getFullYear();
      const m = now.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    });
  
  const averageAge = ages.length > 0 
    ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) 
    : "N/A";

  // Calculate Recent Hires (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentHires = employees.filter(e => new Date(e.startDate) >= thirtyDaysAgo).length;

  // Fetch Employees per Department
  const departmentStats = await prisma.employee.groupBy({
    by: ['department'],
    _count: {
      _all: true
    }
  });

  const stats = {
    totalEmployees,
    averageAge,
    departmentStats,
    recentHires
  };

  return <DashboardClient session={session} stats={stats} />;
}
