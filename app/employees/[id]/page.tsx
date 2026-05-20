"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  DollarSign,
  Building2,
  Briefcase,
  User,
  Users,
  AlertCircle,
  Loader,
  Pencil,
} from "lucide-react";
import EditEmployeeModal from "@/src/components/employees/EditEmployeeModal";

interface EmployeeDetail {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentId: number;
  department?: { name: string };
  positionId: number;
  position?: { name: string; level: string };
  salary: number;
  status: "ACTIVE" | "RESIGNED" | "ON_LEAVE" | "RETIRED";
  birthDate: string | null;
  hireDate: string | null;
  resignationDate?: string | null;
  resignationReason?: string | null;
  resignationHistories?: { id: number; resignationDate: string; reason: string | null }[];
  age?: number | null;
  tenure?: number | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ErrorState {
  message: string;
  code?: string;
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const isEditMode = searchParams?.get("mode") === "edit";

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(isEditMode);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  // Sync mode url param with modal state
  useEffect(() => {
    if (isEditMode) {
      setIsEditModalOpen(true);
    }
  }, [isEditMode]);

  // Fetch Filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [deptRes, posRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/positions"),
        ]);
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(deptData.data);
        }
        if (posRes.ok) {
          const posData = await posRes.json();
          setPositions(posData.data);
        }
      } catch (err) {
        console.error("Error fetching filter options:", err);
      }
    };
    fetchFilters();
  }, []);

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    router.replace(`/employees/${id}`, { scroll: false });
  };

  // ─── Fetch Employee Data ───────────────────────────────────────────────
  const fetchEmployee = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/employees/${id}`);

      if (response.status === 404) {
        setError({
          message: "ไม่พบข้อมูลพนักงาน",
          code: "NOT_FOUND",
        });
        setLoading(false);
        return;
      }

      if (response.status === 401) {
        setError({
          message: "กรุณาเข้าสู่ระบบก่อนใช้งาน",
          code: "UNAUTHORIZED",
        });
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "โหลดข้อมูลพนักงานไม่สำเร็จ");
      }

      const data = await response.json();
      setEmployee(data.data || data);
      setLoading(false);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "โหลดข้อมูลพนักงานไม่สำเร็จ",
        code: "FETCH_ERROR",
      });
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  // ─── Delete Employee ───────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("ลบข้อมูลพนักงานไม่สำเร็จ");
      }

      // Success - redirect to employees list
      router.push("/employees");
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "ลบข้อมูลพนักงานไม่สำเร็จ",
      });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ─── Format Date ───────────────────────────────────────────────────────
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // ─── Format Currency ───────────────────────────────────────────────────
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  // ─── Get Status Badge Color ────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800";
      case "ON_LEAVE":
        return "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-200 border border-amber-200 dark:border-amber-800";
      case "RESIGNED":
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700";
      case "RETIRED":
        return "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700";
      default:
        return "bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200";
    }
  };

  // ─── Get Generation ────────────────────────────────────────────────────
  const getGeneration = (birthDateString: string | null) => {
    if (!birthDateString) return "-";
    const year = new Date(birthDateString).getFullYear();
    if (year >= 2013) return "Gen Alpha";
    if (year >= 1997) return "Gen Z";
    if (year >= 1981) return "Gen Y";
    if (year >= 1965) return "Gen X";
    if (year >= 1946) return "Baby Boomer";
    return "Silent Generation";
  };

  // ─── Loading Skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button Skeleton */}
          <div className="mb-6 h-10 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />

          {/* Header Skeleton */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
            <div className="space-y-4">
              <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Details Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-xl p-6 space-y-3"
              >
                <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            กลับ
          </button>

          {/* Error Alert */}
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-6 flex gap-4">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={24} />
            <div>
              <h2 className="font-semibold text-red-900 dark:text-red-200 mb-1">
                โหลดข้อมูลพนักงานไม่สำเร็จ
              </h2>
              <p className="text-red-700 dark:text-red-300">{error.message}</p>
              <button
                onClick={fetchEmployee}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!employee) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            กลับ
          </button>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">ไม่พบข้อมูลพนักงาน</p>
          </div>
        </div>
      </main>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const departmentName = employee.department?.name || "N/A";
  const positionName = employee.position?.name || "N/A";

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ─── Back Button ──────────────────────────────────────────────── */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          กลับ
        </button>



        {/* ─── Header Card ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm p-6 sm:p-8 mb-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                {fullName}
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 font-mono">
                {employee.employeeCode}
              </p>
            </div>

            {/* Status Badge */}
            <span
              className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(
                employee.status
              )}`}
            >
              {employee.status}
            </span>
          </div>

          {/* Department and Position */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <Building2 className="text-blue-600 dark:text-blue-400" size={20} />
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">สถานที่ปฏิบัติงาน</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {departmentName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="text-purple-600 dark:text-purple-400" size={20} />
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">ตำแหน่ง</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {positionName}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Pencil size={18} />
              แก้ไขข้อมูล
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              <Trash2 size={18} />
              ลบข้อมูล
            </button>
          </div>
        </div>

        {/* ─── Details Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Salary */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 hover:shadow-md dark:hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-emerald-600 dark:text-emerald-400" size={20} />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">เงินเดือน</p>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(employee.salary)}
            </p>
          </div>

          {/* Hire Date */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 hover:shadow-md dark:hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">วันเริ่มงาน</p>
            </div>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {formatDate(employee.hireDate)}
            </p>
          </div>

          {/* Birth Date */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 hover:shadow-md dark:hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-pink-600 dark:text-pink-400" size={20} />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">วันเดือนปีเกิด</p>
            </div>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {formatDate(employee.birthDate)}
            </p>
          </div>

          {/* Tenure */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 hover:shadow-md dark:hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="text-indigo-600 dark:text-indigo-400" size={20} />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">อายุงาน</p>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {employee.tenure !== null && employee.tenure !== undefined ? `${employee.tenure} ปี` : "-"}
            </p>
          </div>

          {/* Age */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 hover:shadow-md dark:hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <User className="text-orange-600 dark:text-orange-400" size={20} />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">อายุ</p>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {employee.age !== null && employee.age !== undefined ? `${employee.age} ปี` : "-"}
            </p>
          </div>

          {/* Generation */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 hover:shadow-md dark:hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-cyan-600 dark:text-cyan-400" size={20} />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Generation</p>
            </div>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{getGeneration(employee.birthDate)}</p>
          </div>
        </div>

        {/* ─── Resignation Info ──────────────────────────────────────── */}
        {(employee.status === "RESIGNED" || (employee.resignationHistories && employee.resignationHistories.length > 0) || employee.resignationDate) && (
          <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-6 border border-red-200 dark:border-red-800/50 mb-6">
            <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              ข้อมูลการลาออก
            </h2>
            
            {employee.resignationHistories && employee.resignationHistories.length > 0 ? (
              <div className="space-y-4">
                {employee.resignationHistories.map((history: any, index: number) => (
                  <div key={history.id || index} className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-red-100 dark:border-red-900/50">
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">ครั้งที่ {employee.resignationHistories!.length - index}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="font-medium text-zinc-500 dark:text-zinc-400 w-32">วันที่ลาออก:</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{formatDate(history.resignationDate)}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-zinc-500 dark:text-zinc-400 w-32">หมายเหตุ:</span>
                        <span className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">{history.reason || "-"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <span className="font-semibold text-red-800 dark:text-red-200 w-32">วันที่ลาออก:</span>
                  <span className="text-red-900 dark:text-red-100">{formatDate(employee.resignationDate || null)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-red-800 dark:text-red-200 w-32">หมายเหตุ:</span>
                  <span className="text-red-900 dark:text-red-100 whitespace-pre-wrap">{employee.resignationReason || "-"}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Notes ──────────────────────────────────────── */}
        {employee.notes && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              หมายเหตุ
            </h2>
            <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{employee.notes}</p>
          </div>
        )}

        {/* ─── Metadata ─────────────────────────────────────────────────── */}
        <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
          <p>Created: {new Date(employee.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(employee.updatedAt).toLocaleString()}</p>
        </div>
      </div>

      {/* ─── Delete Confirmation Modal ────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              ลบข้อมูลพนักงาน?
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              คุณต้องการลบข้อมูล <strong>{fullName}</strong> ใช่ไหม? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    กำลังลบ...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    ลบข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── Edit Employee Modal ────────────────────────────────────────── */}
      {employee && (
        <EditEmployeeModal
          isOpen={isEditModalOpen}
          employee={employee as any}
          departments={departments}
          positions={positions}
          onClose={handleEditModalClose}
          onSuccess={() => fetchEmployee()}
        />
      )}
    </main>
  );
}
