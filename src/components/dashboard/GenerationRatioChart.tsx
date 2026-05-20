"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Users } from "lucide-react";

interface GenerationData {
  generation: string;
  count: number;
}

interface GenerationRatioChartProps {
  data: GenerationData[];
}

const GENERATION_CONFIG = [
  {
    id: "Gen Z",
    label: "Gen Z (2540+)",
    color: "#3b82f6", // blue-500
    bgClass: "bg-blue-50/50 dark:bg-blue-950/20",
    borderClass: "border-b-4 border-blue-500",
    textClass: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "Gen Y",
    label: "Gen Y (2524-2539)",
    color: "#10b981", // emerald-500
    bgClass: "bg-emerald-50/50 dark:bg-emerald-950/20",
    borderClass: "border-b-4 border-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "Gen X",
    label: "Gen X (2508-2523)",
    color: "#f59e0b", // amber-500
    bgClass: "bg-amber-50/50 dark:bg-amber-950/20",
    borderClass: "border-b-4 border-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "Baby Boomer",
    label: "Baby Boomer",
    color: "#ec4899", // pink-500
    bgClass: "bg-pink-50/50 dark:bg-pink-950/20",
    borderClass: "border-b-4 border-pink-500",
    textClass: "text-pink-600 dark:text-pink-400",
  },
];

export function GenerationRatioChart({ data }: GenerationRatioChartProps) {
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  // Map data to the config order
  const chartData = GENERATION_CONFIG.map((config) => {
    const item = data.find((d) => d.generation === config.id) || { count: 0 };
    return {
      name: config.id,
      label: config.label,
      value: item.count,
      color: config.color,
      bgClass: config.bgClass,
      borderClass: config.borderClass,
      textClass: config.textClass,
      percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0",
    };
  });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 w-full">
      <div className="mb-6 flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          สัดส่วน Generation ของพนักงาน
        </h3>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Pie Chart */}
        <div className="h-48 w-48 shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={total > 0 ? chartData : [{ value: 1, color: "#f4f4f5" }]}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={80}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                {(total > 0 ? chartData : [{ value: 1, color: "#f4f4f5" }]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {total > 0 && (
                <Tooltip
                  formatter={(value: any) => [`${value} คน`, "จำนวน"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 w-full">
          {chartData.map((stat) => (
            <div
              key={stat.name}
              className={`rounded-xl p-4 text-center ${stat.bgClass} ${stat.borderClass}`}
            >
              <p className={`text-xs font-medium mb-2 ${stat.textClass}`}>
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                {stat.value} <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">คน</span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {stat.percentage}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
