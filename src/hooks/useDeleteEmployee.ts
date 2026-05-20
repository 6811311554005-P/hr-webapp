"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseDeleteEmployeeOptions {
  onSuccessCallback?: () => void;
}

interface DeleteState {
  isDeleting: boolean;
  error: string | null;
}

export function useDeleteEmployee(options?: UseDeleteEmployeeOptions) {
  const router = useRouter();
  const [state, setState] = useState<DeleteState>({
    isDeleting: false,
    error: null,
  });

  const deleteEmployee = useCallback(
    async (employeeId: number | string) => {
      setState({ isDeleting: true, error: null });

      try {
        const response = await fetch(`/api/employees/${employeeId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          throw new Error("Unauthorized. Please log in.");
        }

        if (response.status === 404) {
          throw new Error("Employee not found.");
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to delete employee (${response.status})`);
        }

        // Success - clear state
        setState({ isDeleting: false, error: null });

        // Call optional callback
        options?.onSuccessCallback?.();

        // Redirect to employees list
        router.push("/employees");

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete employee";
        setState({
          isDeleting: false,
          error: errorMessage,
        });
        return false;
      }
    },
    [router, options]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    isDeleting: state.isDeleting,
    error: state.error,
    deleteEmployee,
    clearError,
  };
}
