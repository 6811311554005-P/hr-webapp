"use client";

import { useState, useEffect, useCallback } from "react";
import { X, AlertCircle, CheckCircle, Loader, Plus, Trash2 } from "lucide-react";

interface Department {
  id: number;
  name: string;
}

interface Position {
  id: number;
  name: string;
  level: string;
}

interface ResignationHistory {
  id: number;
  resignationDate: string;
  reason: string | null;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  salary: number;
  departmentId: number;
  positionId: number;
  status: "ACTIVE" | "RESIGNED" | "ON_LEAVE" | "RETIRED";
  resignationDate?: string | Date | null;
  resignationReason?: string | null;
  resignationHistories?: ResignationHistory[];
  birthDate?: string | Date | null;
  hireDate?: string | Date | null;
  [key: string]: unknown;
}

interface EditEmployeeModalProps {
  isOpen: boolean;
  employee: Employee;
  departments: Department[];
  positions: Position[];
  onClose: () => void;
  onSuccess?: (updatedEmployee: Employee) => void;
}

interface ResignationHistoryForm {
  id?: number;
  resignationDate: string;
  reason: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  salary: number;
  departmentId: number;
  positionId: number;
  status: "ACTIVE" | "RESIGNED" | "ON_LEAVE" | "RETIRED";
  resignationHistories: ResignationHistoryForm[];
  birthDate: string;
  hireDate: string;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  salary?: string;
  departmentId?: string;
  positionId?: string;
  status?: string;
  resignationHistories?: string[];
  birthDate?: string;
  hireDate?: string;
}

interface ToastState {
  type: "success" | "error" | null;
  message: string;
}

export default function EditEmployeeModal({
  isOpen,
  employee,
  departments,
  positions,
  onClose,
  onSuccess,
}: EditEmployeeModalProps) {
  // ─── State Management ──────────────────────────────────────────────────
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    salary: 0,
    departmentId: 0,
    positionId: 0,
    status: "ACTIVE",
    resignationHistories: [],
    birthDate: "",
    hireDate: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [toast, setToast] = useState<ToastState>({ type: null, message: "" });

  // ─── Initialize Form Data ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && employee) {
      // Map existing histories, or fallback to the scalar fields if no histories exist
      let mappedHistories: ResignationHistoryForm[] = [];
      if (employee.resignationHistories && employee.resignationHistories.length > 0) {
        mappedHistories = employee.resignationHistories.map((h) => ({
          id: h.id,
          resignationDate: new Date(h.resignationDate).toISOString().split("T")[0],
          reason: h.reason || "",
        }));
      } else if (employee.resignationDate) {
        mappedHistories = [
          {
            resignationDate: new Date(employee.resignationDate as any).toISOString().split("T")[0],
            reason: employee.resignationReason || "",
          },
        ];
      }

      setFormData({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        salary: employee.salary || 0,
        departmentId: employee.departmentId || 0,
        positionId: employee.positionId || 0,
        status: employee.status || "ACTIVE",
        resignationHistories: mappedHistories,
        birthDate: employee.birthDate ? new Date(employee.birthDate as any).toISOString().split("T")[0] : "",
        hireDate: employee.hireDate ? new Date(employee.hireDate as any).toISOString().split("T")[0] : "",
      });
      setErrors({});
      setToast({ type: null, message: "" });
    }
  }, [isOpen, employee?.id]);

  // ─── Auto-dismiss Toast ────────────────────────────────────────────────
  useEffect(() => {
    if (toast.type) {
      const timer = setTimeout(() => {
        setToast({ type: null, message: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ─── Validation ────────────────────────────────────────────────────────
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    const historyErrors: string[] = [];
    let hasHistoryErrors = false;

    // First Name
    if (!formData.firstName.trim()) {
      newErrors.firstName = "กรุณากรอกชื่อ";
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร";
    }

    // Last Name
    if (!formData.lastName.trim()) {
      newErrors.lastName = "กรุณากรอกนามสกุล";
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = "นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร";
    }

    // Salary
    if (formData.salary === null || formData.salary === undefined) {
      newErrors.salary = "กรุณากรอกเงินเดือน";
    } else if (formData.salary < 0) {
      newErrors.salary = "เงินเดือนห้ามติดลบ";
    }

    // Department
    if (!formData.departmentId) {
      newErrors.departmentId = "กรุณาเลือกแผนก";
    }

    // Position
    if (!formData.positionId) {
      newErrors.positionId = "กรุณาเลือกตำแหน่ง";
    }

    // Status
    if (!formData.status) {
      newErrors.status = "กรุณาเลือกสถานะ";
    }

    // Histories
    formData.resignationHistories.forEach((history, idx) => {
      if (!history.resignationDate) {
        historyErrors[idx] = "กรุณาระบุวันที่ลาออก";
        hasHistoryErrors = true;
      }
    });

    if (hasHistoryErrors) {
      newErrors.resignationHistories = historyErrors;
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
          name === "salary" ? parseFloat(value) || 0 : name === "departmentId" || name === "positionId"
            ? parseInt(value) || 0
            : (value as any),
      }));

      if (errors[name as keyof ValidationErrors]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  const handleHistoryChange = (index: number, field: keyof ResignationHistoryForm, value: string) => {
    const newHistories = [...formData.resignationHistories];
    newHistories[index] = { ...newHistories[index], [field]: value };
    setFormData({ ...formData, resignationHistories: newHistories });
    
    if (errors.resignationHistories) {
      const newHistoryErrors = [...errors.resignationHistories];
      newHistoryErrors[index] = "";
      setErrors((prev) => ({ ...prev, resignationHistories: newHistoryErrors }));
    }
  };

  const addHistory = () => {
    setFormData({
      ...formData,
      status: "RESIGNED",
      resignationHistories: [
        { resignationDate: new Date().toISOString().split("T")[0], reason: "" },
        ...formData.resignationHistories,
      ],
    });
  };

  const removeHistory = (index: number) => {
    const newHistories = formData.resignationHistories.filter((_, i) => i !== index);
    setFormData({ ...formData, resignationHistories: newHistories });
  };

  // ─── Handle Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      setToast({ type: "error", message: "โปรดแก้ไขข้อผิดพลาดด้านล่าง" });
      return;
    }

    setIsSubmitting(true);

    try {
      const latestResignation = formData.resignationHistories.length > 0 ? formData.resignationHistories[0] : null;
      
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        salary: formData.salary,
        departmentId: formData.departmentId,
        positionId: formData.positionId,
        status: formData.status,
        birthDate: formData.birthDate ? formData.birthDate : null,
        hireDate: formData.hireDate ? formData.hireDate : null,
        resignationDate: latestResignation ? latestResignation.resignationDate : null,
        resignationReason: latestResignation ? latestResignation.reason : null,
        resignationHistories: formData.resignationHistories.map(h => ({
          resignationDate: h.resignationDate,
          reason: h.reason || null
        }))
      };

      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to update employee (${response.status})`);
      }

      const result = await response.json();
      const updatedEmployee = result.data || result;

      setToast({ type: "success", message: `✓ บันทึกข้อมูล ${formData.firstName} ${formData.lastName} สำเร็จ` });

      setTimeout(() => {
        onSuccess?.(updatedEmployee);
        onClose();
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update employee";
      setToast({ type: "error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto border border-zinc-200 dark:border-zinc-800">
          <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">แก้ไขข้อมูลพนักงาน</h2>
            <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50">
              <X size={24} className="text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          {toast.type && (
            <div className={`mx-6 mt-6 p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50" : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50"}`}>
              {toast.type === "success" ? <CheckCircle className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" size={20} /> : <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />}
              <p className={toast.type === "success" ? "text-emerald-800 dark:text-emerald-200" : "text-red-800 dark:text-red-200"}>{toast.message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">ชื่อ <span className="text-red-500">*</span></label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} disabled={isSubmitting} className={`w-full px-4 py-2 rounded-lg border transition-colors disabled:bg-zinc-100 dark:disabled:bg-zinc-800 ${errors.firstName ? "border-red-300 focus:ring-red-500" : "border-zinc-300 focus:ring-blue-500"} bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100`} placeholder="John" />
                {errors.firstName && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} />{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">นามสกุล <span className="text-red-500">*</span></label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} disabled={isSubmitting} className={`w-full px-4 py-2 rounded-lg border transition-colors disabled:bg-zinc-100 dark:disabled:bg-zinc-800 ${errors.lastName ? "border-red-300 focus:ring-red-500" : "border-zinc-300 focus:ring-blue-500"} bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100`} placeholder="Doe" />
                {errors.lastName && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} />{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">วันเกิด</label>
                <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} disabled={isSubmitting} className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">วันเริ่มงาน</label>
                <input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} disabled={isSubmitting} className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">เงินเดือน <span className="text-red-500">*</span></label>
              <input type="number" name="salary" value={formData.salary} onChange={handleChange} disabled={isSubmitting} step="0.01" min="0" className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" placeholder="75000" />
              {errors.salary && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} />{errors.salary}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">แผนก <span className="text-red-500">*</span></label>
                <select name="departmentId" value={formData.departmentId} onChange={handleChange} disabled={isSubmitting} className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <option value={0}>เลือกแผนก...</option>
                  {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
                {errors.departmentId && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} />{errors.departmentId}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">ตำแหน่ง <span className="text-red-500">*</span></label>
                <select name="positionId" value={formData.positionId} onChange={handleChange} disabled={isSubmitting} className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <option value={0}>เลือกตำแหน่ง...</option>
                  {positions.map((pos) => <option key={pos.id} value={pos.id}>{pos.name} ({pos.level})</option>)}
                </select>
                {errors.positionId && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} />{errors.positionId}</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">สถานะ <span className="text-red-500">*</span></label>
              <select name="status" value={formData.status} onChange={handleChange} disabled={isSubmitting} className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 mb-2">
                <option value="ACTIVE">ทำงานปกติ</option>
                <option value="RESIGNED">ลาออก</option>
                <option value="ON_LEAVE">ลาพัก</option>
                <option value="RETIRED">เกษียณ</option>
              </select>
              {errors.status && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} />{errors.status}</p>}
            </div>

            {/* Resignation Histories */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-500" />
                  ประวัติการลาออก
                </h3>
                <button type="button" onClick={addHistory} disabled={isSubmitting} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                  <Plus size={16} /> เพิ่มประวัติ
                </button>
              </div>

              {formData.resignationHistories.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">ไม่มีประวัติการลาออก</p>
              ) : (
                <div className="space-y-4">
                  {formData.resignationHistories.map((history, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 relative group">
                      <button type="button" onClick={() => removeHistory(idx)} disabled={isSubmitting} className="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors" title="ลบประวัตินี้">
                        <Trash2 size={16} />
                      </button>
                      
                      <div className="grid gap-3 pr-8">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">วันที่ลาออก ครั้งที่ {formData.resignationHistories.length - idx} <span className="text-red-500">*</span></label>
                          <input type="date" value={history.resignationDate} onChange={(e) => handleHistoryChange(idx, "resignationDate", e.target.value)} disabled={isSubmitting} className={`w-full px-3 py-1.5 text-sm rounded-md border ${errors.resignationHistories?.[idx] ? "border-red-300" : "border-zinc-300"} bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100`} />
                          {errors.resignationHistories?.[idx] && <p className="mt-1 text-xs text-red-600">{errors.resignationHistories[idx]}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">หมายเหตุ / เหตุผล</label>
                          <textarea value={history.reason} onChange={(e) => handleHistoryChange(idx, "reason", e.target.value)} disabled={isSubmitting} rows={2} className="w-full px-3 py-1.5 text-sm rounded-md border border-zinc-300 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" placeholder="ระบุเหตุผล" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg font-semibold transition-colors disabled:opacity-50">ยกเลิก</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
                {isSubmitting ? <><Loader size={18} className="animate-spin" /> กำลังบันทึก...</> : "บันทึกข้อมูล"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
