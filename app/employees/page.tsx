"use client";

// Third-party
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ArrowLeft, Loader, LogOut, Trash2, Users } from "lucide-react";

// Local
import type { Employee } from "@/src/types";
import { MESSAGES, ROUTES, STATUS, TABLE } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

export default function EmployeesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/employees");

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data = await response.json();
      setEmployees(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching employees");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete employee with confirmation
  const handleDelete = async (id: number) => {
    if (!window.confirm(STATUS.CONFIRMATION.DELETE_EMPLOYEE)) {
      return;
    }

    try {
      setIsDeleting(id);
      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete employee");
      }

      // Remove from list
      setEmployees(employees.filter(emp => emp.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting employee");
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    if (status === STATUS.AUTH.UNAUTHENTICATED) {
      router.push(ROUTES.LOGIN);
    } else if (status === STATUS.AUTH.AUTHENTICATED) {
      fetchEmployees();
    }
  }, [status, router]);

  if (status === STATUS.AUTH.LOADING) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{MESSAGES.LOADING}</p>
        </div>
      </div>
    );
  }

  if (status === STATUS.AUTH.UNAUTHENTICATED) {
    return null;
  }

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4\">
            <Link
              href={ROUTES.DASHBOARD}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-gray-900"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
              <p className="text-gray-600 text-sm mt-1">
                {MESSAGES.EMPLOYEE_COUNT(employees.length)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{session?.user?.username}</span>
              </p>
              <p className="text-xs text-gray-500">
                {session?.user?.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">Error: {error}</p>
            <button
              onClick={fetchEmployees}
              className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Employees Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600">{MESSAGES.LOADING}</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">{MESSAGES.NO_EMPLOYEES}</p>
              <p className="text-gray-500 text-sm mt-1">
                {MESSAGES.NO_EMPLOYEES_DESC}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {TABLE.HEADERS.NAME}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {TABLE.HEADERS.POSITION}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {TABLE.HEADERS.DEPARTMENT}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {TABLE.HEADERS.SALARY}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {TABLE.HEADERS.START_DATE}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {TABLE.HEADERS.ACTIONS}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-blue-600">
                              {employee.firstName[0]}
                              {employee.lastName[0]}
                            </span>
                          </div>
                          <div className="font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {employee.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {employee.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${parseFloat(employee.salary.toString()).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(employee.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDelete(employee.id)}
                          disabled={isDeleting === employee.id}
                          className="text-red-600 hover:text-red-700 disabled:text-gray-400 transition"
                          title="Delete employee"
                        >
                          {isDeleting === employee.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* API Documentation */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">{MESSAGES.API_ENDPOINTS}</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              <span className="font-mono bg-white px-2 py-1 rounded">
                GET /api/employees
              </span>
              - List all employees
            </li>
            <li>
              <span className="font-mono bg-white px-2 py-1 rounded">
                POST /api/employees
              </span>
              - Create new employee
            </li>
            <li>
              <span className="font-mono bg-white px-2 py-1 rounded">
                PUT /api/employees/:id
              </span>
              - Update employee
            </li>
            <li>
              <span className="font-mono bg-white px-2 py-1 rounded">
                DELETE /api/employees/:id
              </span>
              - Delete employee
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
