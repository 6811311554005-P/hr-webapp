export interface DashboardDepartmentBreakdown {
  department: string;
  count: number;
}

export interface DashboardPositionBreakdown {
  position: string;
  count: number;
}

export interface DashboardRecentEmployee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  createdAt: string;
}

export interface DashboardData {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  resignedEmployees: number;
  countWithHireDate: number;
  countWithBirthDate: number;
  averageAge: number;
  averageTenure: number;
  departmentBreakdown: DashboardDepartmentBreakdown[];
  positionBreakdown: DashboardPositionBreakdown[];
  generationStats: { generation: string; count: number }[];
  recentEmployees: DashboardRecentEmployee[];
}
