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
} from "recharts";
import type { DashboardPositionBreakdown } from "@/src/types/dashboard";

interface PositionChartProps {
  data: DashboardPositionBreakdown[];
}

const COLORS = [
  "#3b82f6",
  "#0ea5e9",
  "#f97316",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#6366f1",
];

const MAX_LABEL_LENGTH = 16;

const trimLabel = (value: string): string => {
  return value.length > MAX_LABEL_LENGTH
    ? `${value.slice(0, MAX_LABEL_LENGTH - 1)}...`
    : value;
};

export function PositionChart({ data }: PositionChartProps) {
  const chartData = Array.isArray(data) ? data.slice(0, 10) : [];

  if (chartData.length === 0) {
    return (
      <div
        className="h-full w-full rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-label="กราฟจำนวนพนักงานตามตำแหน่ง"
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          ยังไม่มีข้อมูลตำแหน่ง
        </p>
      </div>
    );
  }

  return (
    <section
      className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      aria-label="กราฟจำนวนพนักงานแยกตามตำแหน่ง"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          พนักงานตามตำแหน่ง
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          แสดง 10 ตำแหน่งที่มีจำนวนพนักงานมากที่สุด
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 72 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
          <XAxis
            dataKey="position"
            tick={{ fill: "rgba(100, 116, 139, 0.9)", fontSize: 12 }}
            interval="preserveStartEnd"
            tickFormatter={(value) => trimLabel(String(value))}
            angle={-35}
            textAnchor="end"
            height={82}
          />
          <YAxis
            tick={{ fill: "rgba(100, 116, 139, 0.9)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(17, 24, 39, 0.95)",
              borderRadius: 12,
              border: "1px solid rgba(148, 163, 184, 0.12)",
              color: "#fff",
            }}
          />
          <Bar dataKey="count" radius={[10, 10, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`bar-${entry.position}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
