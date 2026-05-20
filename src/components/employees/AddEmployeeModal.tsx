"use client";

import { useState, useEffect, useCallback } from "react";
import { X, AlertCircle, CheckCircle, Loader, UserPlus } from "lucide-react";
import type { Department, Position, Employee } from "@/src/hooks/useEmployees";

interface AddEmployeeModalProps {
  isOpen: boolean;
  departments: Department[];
  positions: Position[];
  onClose: () => void;
  onSuccess?: (newEmployee: Employee) => void;
}

interface AddFormData {
  employeeCode: string;
  firstName: string;
  lastName: string;
  salary: number;
  departmentId: number;
  positionId: number;
  status: "ACTIVE" | "RESIGNED" | "ON_LEAVE" | "RETIRED";
  hireDate: string;
  birthDate: string;
  contractNumber: string;
  positionNumber: string;
}

interface ValidationErrors {
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  salary?: string;
  departmentId?: string;
  positionId?: string;
  hireDate?: string;
}

interface ToastState {
  type: "success" | "error" | null;
  message: string;
}

export default function AddEmployeeModal({
  isOpen,
  departments,
  positions,
  onClose,
  onSuccess,
}: AddEmployeeModalProps) {
  // ─── State Management ──────────────────────────────────────────────────
  const [formData, setFormData] = useState<AddFormData>({
    employeeCode: "",
    firstName: "",
    lastName: "",
    salary: 0,
    departmentId: 0,
    positionId: 0,
    status: "ACTIVE",
    hireDate: new Date().toISOString().split("T")[0],
    birthDate: "",
    contractNumber: "",
    positionNumber: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [toast, setToast] = useState<ToastState>({ type: null, message: "" });

  // ─── Reset Form when Modal Opens ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      setFormData({
        employeeCode: `EMP${randomId}`,
        firstName: "",
        lastName: "",
        salary: 15000,
        departmentId: departments[0]?.id || 0,
        positionId: positions[0]?.id || 0,
        status: "ACTIVE",
        hireDate: new Date().toISOString().split("T")[0],
        birthDate: "1995-05-15",
        contractNumber: `CN${randomId}`,
        positionNumber: `PN${randomId}`,
      });
      setErrors({});
      setToast({ type: null, message: "" });
    }
  }, [isOpen, departments, positions]);

  // ─── Auto-dismiss Toast ────────────────────────────────────────────────
  useEffect(() => {
    if (toast.type) {
      const timer = setTimeout(() => {
        setToast({ type: null, message: "" });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ─── Validation ────────────────────────────────────────────────────────
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.employeeCode.trim()) {
      newErrors.employeeCode = "กรุณาระบุรหัสพนักงาน";
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = "กรุณาระบุชื่อ";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "กรุณาระบุนามสกุล";
    }
    if (formData.salary === null || formData.salary < 0) {
      newErrors.salary = "กรุณาระบุเงินเดือนที่ถูกต้อง";
    }
    if (!formData.departmentId) {
      newErrors.departmentId = "กรุณาเลือกสถานที่ปฏิบัติงาน";
    }
    if (!formData.positionId) {
      newErrors.positionId = "กรุณาเลือกตำแหน่ง";
    }
    if (!formData.hireDate) {
      newErrors.hireDate = "กรุณาระบุวันเริ่มงาน";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ─── Handle Input Change ──────────────────────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;

      setFormData((prev) => ({
        ...prev,
        [name]:
          name === "salary"
            ? parseFloat(value) || 0
            : name === "departmentId" || name === "positionId"
            ? parseInt(value, 10) || 0
            : value,
      }));

      if (errors[name as keyof ValidationErrors]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  // ─── Handle Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      setToast({ type: "error", message: "กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง" });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        salary: Number(formData.salary),
        departmentId: Number(formData.departmentId),
        positionId: Number(formData.positionId),
      };

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }

      setToast({
        type: "success",
        message: `✓ เพิ่มพนักงาน ${formData.firstName} ${formData.lastName} สำเร็จ!`,
      });

      setTimeout(() => {
        onSuccess?.(data);
        onClose();
      }, 800);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้";
      setToast({ type: "error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ─── Backdrop ────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* ─── Modal Container ──────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto">
        <div
          className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">เพิ่มพนักงานใหม่</h2>
                <p className="text-xs text-blue-100">ระบบจัดการข้อมูลบุคลากร HR Management</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Notification */}
          {toast.type && (
            <div
              className={`m-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
                toast.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <p>{toast.message}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  รหัสพนักงาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="employeeCode"
                  value={formData.employeeCode}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-gray-50/50 ${
                    errors.employeeCode ? "border-red-400 focus:ring-red-500" : "border-gray-300 focus:ring-blue-600"
                  } outline-none focus:ring-2 focus:border-transparent transition`}
                />
                {errors.employeeCode && <p className="mt-1 text-xs text-red-600">{errors.employeeCode}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  ตำแหน่งเลขที่
                </label>
                <input
                  type="text"
                  name="positionNumber"
                  value={formData.positionNumber}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="เช่น PN1234"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-gray-50/50 focus:ring-2 focus:ring-blue-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  ใบสั่งจ้างเลขที่
                </label>
                <input
                  type="text"
                  name="contractNumber"
                  value={formData.contractNumber}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="เช่น CN5678"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-gray-50/50 focus:ring-2 focus:ring-blue-600 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="สมชาย"
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                    errors.firstName ? "border-red-400 focus:ring-red-500" : "border-gray-300 focus:ring-blue-600"
                  } outline-none focus:ring-2 focus:border-transparent transition`}
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="รักดี"
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                    errors.lastName ? "border-red-400 focus:ring-red-500" : "border-gray-300 focus:ring-blue-600"
                  } outline-none focus:ring-2 focus:border-transparent transition`}
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  สถานที่ปฏิบัติงาน <span className="text-red-500">*</span>
                </label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  disabled={isSubmitting || departments.length === 0}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white ${
                    errors.departmentId ? "border-red-400 focus:ring-red-500" : "border-gray-300 focus:ring-blue-600"
                  } outline-none focus:ring-2 focus:border-transparent transition`}
                >
                  <option value={0}>-- เลือกสถานที่ปฏิบัติงาน --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {errors.departmentId && <p className="mt-1 text-xs text-red-600">{errors.departmentId}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  ตำแหน่งงาน <span className="text-red-500">*</span>
                </label>
                <select
                  name="positionId"
                  value={formData.positionId}
                  onChange={handleChange}
                  disabled={isSubmitting || positions.length === 0}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white ${
                    errors.positionId ? "border-red-400 focus:ring-red-500" : "border-gray-300 focus:ring-blue-600"
                  } outline-none focus:ring-2 focus:border-transparent transition`}
                >
                  <option value={0}>-- เลือกตำแหน่งงาน --</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name}
                    </option>
                  ))}
                </select>
                {errors.positionId && <p className="mt-1 text-xs text-red-600">{errors.positionId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  เงินเดือน (บาท) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  min="0"
                  step="100"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  วันเริ่มงาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="hireDate"
                  value={formData.hireDate}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none transition bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  วัน/เดือน/ปีเกิด
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none transition bg-white"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    บันทึกพนักงาน
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
