"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number | null;
  icon: LucideIcon;
  description?: string;
  trend?: number;
  color?: "blue" | "emerald" | "orange" | "purple" | "pink" | "indigo";
  isLoading?: boolean;
  children?: ReactNode;
}

const colorStyles = {
  card: "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
  label: "text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1",
  value: "text-3xl font-bold",
  description: "mt-2 text-sm text-zinc-500 dark:text-zinc-400",
  iconWrapper: "inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
};

const colorVariants: Record<
  NonNullable<StatCardProps["color"]>,
  { card: string; icon: string; value: string }
> = {
  blue: {
    card: "border-blue-200 dark:border-blue-800",
    icon: "bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300",
    value: "text-blue-600 dark:text-blue-400",
  },
  emerald: {
    card: "border-emerald-200 dark:border-emerald-800",
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300",
    value: "text-emerald-600 dark:text-emerald-400",
  },
  orange: {
    card: "border-orange-200 dark:border-orange-800",
    icon: "bg-orange-50 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300",
    value: "text-orange-600 dark:text-orange-400",
  },
  purple: {
    card: "border-purple-200 dark:border-purple-800",
    icon: "bg-purple-50 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300",
    value: "text-purple-600 dark:text-purple-400",
  },
  pink: {
    card: "border-pink-200 dark:border-pink-800",
    icon: "bg-pink-50 text-pink-600 dark:bg-pink-900/50 dark:text-pink-300",
    value: "text-pink-600 dark:text-pink-400",
  },
  indigo: {
    card: "border-indigo-200 dark:border-indigo-800",
    icon: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300",
    value: "text-indigo-600 dark:text-indigo-400",
  },
};

export function StatCard({
  title,
  label,
  value,
  icon: Icon,
  description,
  trend,
  color,
}: StatCardProps) {
  const heading = title ?? label ?? "";
  const variant = color ? colorVariants[color] : null;

  return (
    <div className={`${colorStyles.card} ${variant?.card ?? ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className={colorStyles.label}>{heading}</p>
          <p className={`${colorStyles.value} ${variant?.value ?? "text-zinc-900 dark:text-zinc-100"}`}>{value ?? "-"}</p>
        </div>
        <div className={`${colorStyles.iconWrapper} ${variant?.icon ?? ""}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>

      {description ? <p className={colorStyles.description}>{description}</p> : null}

      {trend !== undefined && (
        <p
          className={`mt-4 text-sm font-medium ${
            trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {trend >= 0 ? "+" : ""}
          {trend}% trend
        </p>
      )}
    </div>
  );
}
