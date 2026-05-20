"use client";

import { Clock3, Users, UserMinus } from "lucide-react";
import { useDashboard } from "@/src/hooks/useDashboard";
import { StatCard } from "./StatCard";
import { DepartmentChart } from "./DepartmentChart";
import { GenerationRatioChart } from "./GenerationRatioChart";
import { RecentEmployees } from "./RecentEmployees";
import { DashboardSkeleton } from "./DashboardSkeleton";

const safeNumber = (value: unknown): number => {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(value, 0)
    : 0;
};

export function DashboardClient() {
  const { data, loading, error, refetch } = useDashboard();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-800 dark:bg-red-950/40">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-700 dark:text-red-300">
              เกิดข้อผิดพลาด
            </p>
            <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              ไม่สามารถโหลดแดชบอร์ดได้
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
            <button
              type="button"
              onClick={refetch}
              aria-label="ลองโหลดแดชบอร์ดอีกครั้ง"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            แดชบอร์ดยังไม่พร้อมใช้งาน
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            กรุณารีเฟรชหน้าหรือลองใหม่อีกครั้ง
          </p>
          <button
            type="button"
            onClick={refetch}
            aria-label="รีเฟรชแดชบอร์ด"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950"
          >
            Refresh
          </button>
        </div>
      </main>
    );
  }

  const totalEmployees = safeNumber(data.totalEmployees);
  const activeEmployees = Math.min(safeNumber(data.activeEmployees), totalEmployees);
  const inactiveEmployees = Math.max(
    safeNumber(data.inactiveEmployees),
    totalEmployees - activeEmployees
  );
  const averageAge = safeNumber(data.averageAge);
  const averageTenure = safeNumber(data.averageTenure);
  const departmentBreakdown = Array.isArray(data.departmentBreakdown)
    ? data.departmentBreakdown
    : [];
  const positionBreakdown = Array.isArray(data.positionBreakdown)
    ? data.positionBreakdown
    : [];
  const recentEmployees = Array.isArray(data.recentEmployees)
    ? data.recentEmployees
    : [];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="จำนวนพนักงานทั้งหมด"
            value={activeEmployees}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="อายุงานเฉลี่ย"
            value={`${Math.floor(averageTenure)} ปี ${Math.round((averageTenure % 1) * 12)} เดือน`}
            icon={Clock3}
            description={`จากพนักงาน ${data.countWithHireDate || 0} คน`}
            color="emerald"
          />
          <StatCard
            title="อายุเฉลี่ยพนักงาน"
            value={`${Math.round(averageAge)} ปี`}
            icon={Users}
            description={`จากพนักงาน ${data.countWithBirthDate || 0} คน`}
            color="purple"
          />
          <StatCard
            title="พนักงานที่ลาออก"
            value={`${data.resignedEmployees || 0} คน`}
            icon={UserMinus}
            description={`คิดเป็น ${totalEmployees > 0 ? (((data.resignedEmployees || 0) / totalEmployees) * 100).toFixed(1) : 0.0}% ของทั้งหมด`}
            color="orange"
          />
        </div>

        <div className="flex flex-col gap-6">
          <DepartmentChart data={departmentBreakdown} />
          <GenerationRatioChart data={data.generationStats || []} />
        </div>

        <RecentEmployees data={recentEmployees} />
      </div>
    </main>
  );
}
