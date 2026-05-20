"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { Building2 } from "lucide-react";
import type { DashboardDepartmentBreakdown } from "@/src/types/dashboard";

interface DepartmentChartProps {
  data: DashboardDepartmentBreakdown[];
}

const GREEN_COLOR = "#10b981";

export function DepartmentChart({ data }: DepartmentChartProps) {
  const chartData = Array.isArray(data) ? data.slice(0, 10) : [];

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 w-full">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          ยังไม่มีข้อมูลสถานที่ปฏิบัติงาน
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 w-full">
      <div className="mb-6 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          จำนวนพนักงานแต่ละสถานที่ปฏิบัติงาน
        </h2>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(148, 163, 184, 0.18)"
            horizontal={false}
          />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="department"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(100, 116, 139, 0.95)", fontSize: 12, fontWeight: 500 }}
            width={60}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.05)" }}
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              borderRadius: 12,
              border: "1px solid rgba(148, 163, 184, 0.15)",
              color: "#fff",
            }}
            formatter={(value: any) => [value, "พนักงาน"]}
          />
          <Bar dataKey="count" fill={GREEN_COLOR} radius={[0, 4, 4, 0]} barSize={20}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={GREEN_COLOR} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              formatter={(value: any) => `${value} คน`}
              style={{ fill: "#334155", fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
