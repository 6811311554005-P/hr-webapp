import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardData } from "@/src/types/dashboard";

export interface UseDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const safeNumber = (value: unknown): number => {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(value, 0)
    : 0;
};

const safeString = (value: unknown, fallback = "ไม่ระบุ"): string => {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
};

const sanitizeBreakdown = <TKey extends "department" | "position">(
  value: unknown,
  key: TKey
): Array<Record<TKey, string> & { count: number }> | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      [key]: safeString(item[key]),
      count: safeNumber(item.count),
    })) as Array<Record<TKey, string> & { count: number }>;
};

const sanitizeRecentEmployees = (
  value: unknown
): DashboardData["recentEmployees"] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter(isRecord).map((employee) => ({
    id: safeNumber(employee.id),
    employeeCode: safeString(employee.employeeCode, "-"),
    firstName: safeString(employee.firstName, ""),
    lastName: safeString(employee.lastName, ""),
    department: safeString(employee.department),
    position: safeString(employee.position),
    createdAt: safeString(employee.createdAt, new Date(0).toISOString()),
  }));
};

const sanitizeDashboardData = (payload: unknown): DashboardData | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const departmentBreakdown = sanitizeBreakdown(
    payload.departmentBreakdown,
    "department"
  );
  const positionBreakdown = sanitizeBreakdown(
    payload.positionBreakdown,
    "position"
  );
  const recentEmployees = sanitizeRecentEmployees(payload.recentEmployees);

  if (!departmentBreakdown || !positionBreakdown || !recentEmployees) {
    return null;
  }

  const totalEmployees = safeNumber(payload.totalEmployees);
  const activeEmployees = Math.min(safeNumber(payload.activeEmployees), totalEmployees);

  return {
    totalEmployees,
    activeEmployees,
    inactiveEmployees: Math.max(
      safeNumber(payload.inactiveEmployees),
      totalEmployees - activeEmployees
    ),
    resignedEmployees: safeNumber(payload.resignedEmployees),
    countWithHireDate: safeNumber(payload.countWithHireDate),
    countWithBirthDate: safeNumber(payload.countWithBirthDate),
    averageAge: safeNumber(payload.averageAge),
    averageTenure: safeNumber(payload.averageTenure),
    departmentBreakdown,
    positionBreakdown,
    generationStats: Array.isArray(payload.generationStats) 
      ? payload.generationStats.map((item: any) => ({
          generation: safeString(item.generation),
          count: safeNumber(item.count)
        }))
      : [],
    recentEmployees,
  };
};

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchDashboard = useCallback(async () => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);

      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }

      if (!response.ok) {
        const message =
          (isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : null) ||
          (response.status === 401
            ? "กรุณาเข้าสู่ระบบก่อนใช้งาน"
            : response.status === 403
            ? "คุณไม่มีสิทธิ์เข้าถึงแดชบอร์ด"
            : `โหลดข้อมูลแดชบอร์ดไม่สำเร็จ (${response.status})`);

        setError(message);
        setData(null);
        return;
      }

      const sanitizedPayload = sanitizeDashboardData(payload);

      if (!sanitizedPayload) {
        setError("รูปแบบข้อมูลแดชบอร์ดไม่ถูกต้อง กรุณาลองใหม่");
        setData(null);
        return;
      }

      setData(sanitizedPayload);
    } catch (err) {
      if (
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError")
      ) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "ไม่สามารถโหลดแดชบอร์ดได้ กรุณาตรวจสอบการเชื่อมต่อ"
      );
      setData(null);
    } finally {
      if (!controller.signal.aborted && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();

    return () => {
      controllerRef.current?.abort();
    };
  }, [fetchDashboard]);

  return {
    data,
    loading,
    error,
    refetch: fetchDashboard,
  };
}
