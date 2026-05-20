/**
 * EXAMPLE: How to use Delete Employee functionality
 * 
 * This file shows the complete implementation pattern
 * for the useDeleteEmployee hook and DeleteEmployeeDialog component
 */

"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useDeleteEmployee } from "@/src/hooks/useDeleteEmployee";
import DeleteEmployeeDialog from "@/src/components/employees/DeleteEmployeeDialog";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface DeleteEmployeeButtonProps {
  employee: Employee;
  onSuccess?: () => void;
}

/**
 * Standalone Delete Button Component
 * Can be used anywhere in your app
 */
export function DeleteEmployeeButton({
  employee,
  onSuccess,
}: DeleteEmployeeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { isDeleting, error, deleteEmployee, clearError } = useDeleteEmployee({
    onSuccessCallback: onSuccess,
  });

  const handleConfirm = async () => {
    await deleteEmployee(employee.id);
  };

  return (
    <>
      {/* Delete Button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        <Trash2 size={18} />
        Delete
      </button>

      {/* Confirmation Dialog */}
      <DeleteEmployeeDialog
        isOpen={showConfirm}
        employeeName={`${employee.firstName} ${employee.lastName}`}
        isDeleting={isDeleting}
        error={error}
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowConfirm(false);
          clearError();
        }}
      />
    </>
  );
}

/**
 * USAGE IN EMPLOYEE DETAIL PAGE:
 * 
 * import { DeleteEmployeeButton } from "@/src/components/employees/DeleteEmployeeButton";
 * 
 * export default function EmployeeDetailPage() {
 *   const [employee, setEmployee] = useState(null);
 *   
 *   return (
 *     <>
 *       <h1>{employee.firstName} {employee.lastName}</h1>
 *       
 *       <DeleteEmployeeButton 
 *         employee={employee}
 *         onSuccess={() => {
 *           // Optional: do something after successful delete
 *         }}
 *       />
 *     </>
 *   );
 * }
 */

/**
 * USAGE IN EMPLOYEE TABLE:
 * 
 * {employees.map((emp) => (
 *   <tr key={emp.id}>
 *     <td>{emp.firstName} {emp.lastName}</td>
 *     <td>
 *       <DeleteEmployeeButton 
 *         employee={emp}
 *         onSuccess={() => refetchEmployees()}
 *       />
 *     </td>
 *   </tr>
 * ))}
 */
