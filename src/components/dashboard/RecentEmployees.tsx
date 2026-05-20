"use client";

import Link from "next/link";
import { CalendarDays, ExternalLink, Users } from "lucide-react";
import type { DashboardRecentEmployee } from "@/src/types/dashboard";

interface RecentEmployeesProps {
  data: DashboardRecentEmployee[];
  isLoading?: boolean;
}

const formatDate = (value: string) => {
  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "-";
  }
};

export function RecentEmployees({
  data,
  isLoading = false,
}: RecentEmployeesProps) {
  const employees = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">กำลังโหลดรายชื่อพนักงานล่าสุด</span>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              พนักงานล่าสุด
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              รายการพนักงานที่ถูกเพิ่มล่าสุด
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 rounded-3xl bg-zinc-100 px-4 py-4 dark:bg-zinc-900/60 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <Users className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          ยังไม่มีข้อมูลพนักงานล่าสุด
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          เมื่อมีข้อมูลพนักงาน ระบบจะแสดงรายการล่าสุดที่นี่
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            พนักงานล่าสุด
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            รายการพนักงานล่าสุดเรียงตามวันที่เพิ่มข้อมูล
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          ล่าสุด 5 รายการ
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                พนักงาน
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                สถานที่ปฏิบัติงาน
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                ตำแหน่ง
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                วันที่เพิ่มข้อมูล
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {employees.map((employee) => (
              <tr
                key={employee.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {employee.employeeCode}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                  {employee.department}
                </td>
                <td className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                  {employee.position}
                </td>
                <td className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                  {formatDate(employee.createdAt)}
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/employees/${employee.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    aria-label={`ดูข้อมูล ${employee.firstName} ${employee.lastName}`}
                  >
                    ดูข้อมูล
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
