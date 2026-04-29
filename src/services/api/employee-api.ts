/**
 * Employee API service
 */

import type { Employee } from "@/src/types";

export const employeeApi = {
  /**
   * Fetch all employees
   */
  async list(params?: { skip?: number; take?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append("skip", params.skip.toString());
    if (params?.take) searchParams.append("take", params.take.toString());
    if (params?.search) searchParams.append("search", params.search);

    const response = await fetch(`/api/employees?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch employees");
    }

    return response.json();
  },

  /**
   * Fetch single employee
   */
  async get(id: number): Promise<Employee> {
    const response = await fetch(`/api/employees/${id}`);

    if (!response.ok) {
      throw new Error("Failed to fetch employee");
    }

    return response.json();
  },

  /**
   * Create employee
   */
  async create(data: Omit<Employee, "id">) {
    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create employee");
    }

    return response.json();
  },

  /**
   * Update employee
   */
  async update(id: number, data: Partial<Employee>) {
    const response = await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to update employee");
    }

    return response.json();
  },

  /**
   * Delete employee
   */
  async delete(id: number) {
    const response = await fetch(`/api/employees/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete employee");
    }

    return response.json();
  },
};
