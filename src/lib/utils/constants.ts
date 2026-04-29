/**
 * Application-wide constants
 */

// ─── UI/Layout Constants ───────────────────────────────────────────────────
export const UI = {
  // Breakpoints
  BREAKPOINTS: {
    SM: "sm",
    MD: "md",
    LG: "lg",
    XL: "xl",
  } as const,

  // Spacing (in Tailwind units)
  SPACING: {
    XS: 2,
    SM: 4,
    MD: 6,
    LG: 8,
    XL: 10,
    XXL: 12,
  } as const,

  // Icon sizes (in pixels)
  ICON_SIZES: {
    SM: 4,
    MD: 5,
    LG: 6,
    XL: 8,
    XXL: 12,
  } as const,

  // Grid columns
  GRID: {
    SINGLE: 1,
    DOUBLE: 2,
    TRIPLE: 3,
    QUAD: 4,
  } as const,

  // Animation durations (in ms)
  ANIMATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
    VERY_SLOW: 1000,
  } as const,

  // Border radius
  RADIUS: {
    SM: "lg",
    MD: "2xl",
    LG: "3xl",
  } as const,
} as const;

// ─── API Constants ─────────────────────────────────────────────────────────
export const API = {
  ENDPOINTS: {
    EMPLOYEES: "/api/employees",
    HEALTH: "/api/health",
    AUTH: "/api/auth",
  } as const,

  HTTP_METHODS: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE",
    PATCH: "PATCH",
  } as const,

  HEADERS: {
    CONTENT_JSON: { "Content-Type": "application/json" },
  } as const,

  ERRORS: {
    FETCH_FAILED: "Failed to fetch",
    CREATE_FAILED: "Failed to create",
    UPDATE_FAILED: "Failed to update",
    DELETE_FAILED: "Failed to delete",
  } as const,
} as const;

// ─── Time Constants ───────────────────────────────────────────────────────
export const TIME = {
  DAYS: {
    RECENT_HIRE_WINDOW: 30, // 30 days
  } as const,

  MS: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
  } as const,
} as const;

// ─── Status/State Constants ────────────────────────────────────────────────
export const STATUS = {
  AUTH: {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
  } as const,

  CONFIRMATION: {
    DELETE_EMPLOYEE: "Are you sure you want to delete this employee?",
  } as const,
} as const;

// ─── Navigation Constants ─────────────────────────────────────────────────
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  EMPLOYEES: "/employees",
} as const;

// ─── UI Messages ───────────────────────────────────────────────────────────
export const MESSAGES = {
  LOADING: "Loading...",
  NO_EMPLOYEES: "No employees found",
  NO_EMPLOYEES_DESC: "Start by creating a new employee record.",
  EMPLOYEE_COUNT: (count: number) => `Total: ${count} employee${count !== 1 ? "s" : ""}`,
  API_ENDPOINTS: "API Endpoints",
  API_ENDPOINTS_DESC: "Available API endpoints for managing employees",
  SYSTEM_ONLINE: "System Online",
  CURRENT_USER: "Current User",
} as const;

// ─── Dashboard Text ───────────────────────────────────────────────────────
export const DASHBOARD = {
  TITLE: "HR Core",
  SUBTITLE: "Management Suite",
  OVERVIEW: "System Overview",
  OVERVIEW_DESC:
    "Welcome back. Here's a snapshot of your organization's health today.",
  STATS: {
    TOTAL_PERSONNEL: "Total Personnel",
    AVERAGE_AGE: "Average Age",
    AVERAGE_AGE_UNIT: "years",
    DEPARTMENTS: "Departments",
    NEW_HIRES: "New Hires (30d)",
  } as const,
  SECTIONS: {
    DEPARTMENT_DISTRIBUTION: "Department Distribution",
    QUICK_ACTIONS: "Quick Actions",
    VIEW_ALL: "View All",
    MANAGE_EMPLOYEES: "Manage Employees",
    FINANCIAL_REPORTS: "Financial Reports",
    LOCKED: "Locked",
  } as const,
  GROWTH_BADGE: "+12%",
} as const;

// ─── Table Headers ───────────────────────────────────────────────────────
export const TABLE = {
  HEADERS: {
    NAME: "Name",
    POSITION: "Position",
    DEPARTMENT: "Department",
    SALARY: "Salary",
    START_DATE: "Start Date",
    ACTIONS: "Actions",
  } as const,
} as const;

// ─── Number Formats ───────────────────────────────────────────────────────
export const FORMATS = {
  DECIMAL_PLACES: {
    AVERAGE_AGE: 1,
    SALARY: 0,
  } as const,
  LOCALE: "en-US",
} as const;
