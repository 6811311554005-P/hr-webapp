import { useState, useEffect, useCallback } from "react";

/**
 * Types for API responses and hook state
 */
export interface Department {
  id: number;
  name: string;
}

export interface Position {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  employeeCode: string;
  contractNumber: string | null;
  positionNumber: string | null;
  firstName: string;
  lastName: string;
  salary: number;
  department: { name: string };
  position: { name: string };
  birthDate: string | null;
  hireDate: string | null;
  resignationDate: string | null;
  resignationReason: string | null;
  resignationHistories?: { id: number; resignationDate: string; reason: string | null }[];
  status: "ACTIVE" | "RESIGNED" | "ON_LEAVE" | "RETIRED";
  age: number | null;
  tenure: number | null;
}

export interface EmployeesApiResponse {
  data: Employee[];
  total: number;
  skip: number;
  take: number;
}

export interface FiltersApiResponse {
  data: Array<{ id: number; name: string }>;
  total: number;
}

/**
 * Debounce hook for search input
 */
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * useEmployees Hook
 * 
 * Manages fetching, searching, filtering, and pagination for employees.
 */
export function useEmployees(initialPageSize: number = 10) {
  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);

  // Loading & Error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("ALL");

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize] = useState(initialPageSize);

  // Dropdown options state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Debounced search for API calls
  const debouncedSearch = useDebounce(search, 300);

  // Fetch filter options (departments and positions)
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setLoadingFilters(true);
        const [deptRes, posRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/positions"),
        ]);

        if (deptRes.ok) {
          const deptData: FiltersApiResponse = await deptRes.json();
          setDepartments(deptData.data);
        }

        if (posRes.ok) {
          const posData: FiltersApiResponse = await posRes.json();
          setPositions(posData.data);
        }
      } catch (err) {
        console.error("Error fetching filter options:", err);
      } finally {
        setLoadingFilters(false);
      }
    };

    fetchFilters();
  }, []);

  // Fetch employees from API
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("skip", (page * pageSize).toString());
      params.append("take", pageSize.toString());

      if (debouncedSearch.trim()) {
        params.append("search", debouncedSearch);
      }
      if (departmentId) {
        params.append("departmentId", departmentId.toString());
      }
      if (positionId) {
        params.append("positionId", positionId.toString());
      }
      if (status && status !== "ALL") {
        params.append("status", status);
      }

      const response = await fetch(`/api/employees?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data: EmployeesApiResponse = await response.json();
      setEmployees(data.data);
      setTotal(data.total);

      // Reset to page 0 if we have no results but previously had them
      if (data.data.length === 0 && page > 0) {
        setPage(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, departmentId, positionId, status]);

  // Trigger fetch when search (debounced), filters, or page changes
  useEffect(() => {
    // Avoid API calls while search is still being debounced
    if (search !== debouncedSearch) return;
    fetchEmployees();
  }, [fetchEmployees, search, debouncedSearch]);

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0); // Reset to first page on search
  }, []);

  const handleDepartmentChange = useCallback((value: string) => {
    setDepartmentId(value ? parseInt(value) : null);
    setPage(0); // Reset to first page on filter change
  }, []);

  const handlePositionChange = useCallback((value: string) => {
    setPositionId(value ? parseInt(value) : null);
    setPage(0); // Reset to first page on filter change
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(0); // Reset to first page on filter change
  }, []);

  const handlePreviousPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((p) => ((p + 1) * pageSize < total ? p + 1 : p));
  }, [pageSize, total]);

  const reload = useCallback(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    // Data
    employees,
    total,
    loading,
    error,

    // Filter Options
    departments,
    positions,
    loadingFilters,

    // Current State
    search,
    departmentId,
    positionId,
    status,
    page,
    pageSize,

    // Computed Values
    totalPages: Math.ceil(total / pageSize),
    currentPageNumber: page + 1,
    startIndex: total > 0 ? page * pageSize + 1 : 0,
    endIndex: Math.min((page + 1) * pageSize, total),

    // Actions
    setSearch: handleSearchChange,
    setDepartmentId: handleDepartmentChange,
    setPositionId: handlePositionChange,
    setStatus: handleStatusChange,
    previousPage: handlePreviousPage,
    nextPage: handleNextPage,
    reload,
  };
}
