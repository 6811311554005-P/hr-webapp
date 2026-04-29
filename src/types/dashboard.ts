/**
 * Dashboard domain types
 */

export interface DashboardStats {
  totalEmployees: number;
  averageAge: string;
  departmentStats: Array<{
    department: string;
    _count: { _all: number };
  }>;
  recentHires: number;
}

export interface DashboardClientProps {
  session: any;
  stats: DashboardStats;
}
