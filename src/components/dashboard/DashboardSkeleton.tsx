"use client";

export function DashboardSkeleton() {
  return (
    <div
      className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-6 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading dashboard data</span>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="h-10 w-64 max-w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-5 w-64 max-w-full rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse sm:w-96" />
          </div>
          <div className="h-12 w-32 max-w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-32 rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="h-[360px] rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-[360px] rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>

        <div className="h-[440px] rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
      </div>
    </div>
  );
}
