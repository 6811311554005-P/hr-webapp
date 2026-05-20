"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

type AuditLog = {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  method: string;
  path: string;
  statusCode: number;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
};

type AuditLogResponse = {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  actions: string[];
  entities: string[];
};

const actionStyles: Record<string, string> = {
  AUTH_LOGIN: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  AUTH_FAILED: "bg-red-50 text-red-700 ring-red-200",
  READ: "bg-sky-50 text-sky-700 ring-sky-200",
  CREATE: "bg-green-50 text-green-700 ring-green-200",
  UPDATE: "bg-amber-50 text-amber-700 ring-amber-200",
  DELETE: "bg-rose-50 text-rose-700 ring-rose-200",
  IMPORT: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  HEALTH_CHECK: "bg-zinc-50 text-zinc-700 ring-zinc-200",
  ERROR: "bg-red-50 text-red-700 ring-red-200",
};

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
};

const stringifyMetadata = (metadata: unknown) => {
  if (!metadata) return "-";

  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
};

export function AuditLogClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (search.trim()) params.set("search", search.trim());
    if (action) params.set("action", action);
    if (entity) params.set("entity", entity);

    return params.toString();
  }, [action, entity, page, pageSize, search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/audit-logs?${queryString}`);
      const payload = (await response.json()) as AuditLogResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Failed to fetch audit logs");
      }

      const data = payload as AuditLogResponse;
      setLogs(data.data);
      setTotal(data.total);
      setActions(data.actions);
      setEntities(data.entities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetToFirstPage = (callback: () => void) => {
    setPage(1);
    callback();
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Audit Logs
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Review authentication, data access, employee changes, imports, and system checks.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </section>

        <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(event) =>
                resetToFirstPage(() => setSearch(event.target.value))
              }
              placeholder="Search user, entity, ID, or path..."
              className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
            />
          </label>

          <select
            value={action}
            onChange={(event) =>
              resetToFirstPage(() => setAction(event.target.value))
            }
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
          >
            <option value="">All actions</option>
            {actions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={entity}
            onChange={(event) =>
              resetToFirstPage(() => setEntity(event.target.value))
            }
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
          >
            <option value="">All entities</option>
            {entities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            <span>
              Showing <strong>{startIndex}</strong> to <strong>{endIndex}</strong> of{" "}
              <strong>{total}</strong> events
            </span>
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Page {page} of {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-zinc-500">
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">Entity</th>
                  <th className="px-4 py-3 font-semibold">Request</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  [...Array(6)].map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4" colSpan={7}>
                        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-zinc-500" colSpan={7}>
                      No audit events found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="align-top transition hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${
                            actionStyles[log.action] ??
                            "bg-zinc-50 text-zinc-700 ring-zinc-200"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        <div className="font-medium">{log.userEmail ?? "System"}</div>
                        <div className="mt-1 text-xs text-zinc-500">{log.ipAddress ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        <div className="font-medium">{log.entity}</div>
                        <div className="mt-1 text-xs text-zinc-500">{log.entityId ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        <div className="font-mono text-xs font-semibold">{log.method}</div>
                        <div className="mt-1 max-w-[260px] truncate font-mono text-xs text-zinc-500">
                          {log.path}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${
                            log.statusCode >= 400
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <pre className="max-h-24 max-w-[320px] overflow-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-2 font-mono text-xs text-zinc-600">
                          {stringifyMetadata(log.metadata)}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
