"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserPlus,
  Download,
  Loader,
} from "lucide-react";
import { useEmployees } from "@/src/hooks/useEmployees";
import AddEmployeeModal from "./AddEmployeeModal";
import * as XLSX from "xlsx";

const formatDate = (value: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatTenure = (tenure: number | null) => {
  if (tenure === null || tenure === undefined) return "-";

  const years = Math.floor(tenure);
  const months = Math.max(0, Math.round((tenure - years) * 12));

  if (years === 0 && months === 0) return "น้อยกว่า 1 เดือน";
  if (years === 0) return `${months} เดือน`;
  if (months === 0) return `${years} ปี`;

  return `${years} ปี ${months} เดือน`;
};

const formatResignationDate = (status: string) => {
  return status === "RESIGNED" ? "ไม่ระบุ" : "-";
};

const tableHeaders = [
  "ตำแหน่งเลขที่",
  "ใบสั่งจ้างเลขที่",
  "ชื่อ - สกุล",
  "ชื่อตำแหน่ง",
  "สถานที่ปฏิบัติงาน",
  "วัน/เดือน/ปีเกิด",
  "วันเริ่มงาน",
  "อายุงาน ปี/เดือน",
  "วันที่ลาออก",
  "ดู/แก้ไข",
];

/**
 * EmployeeTable Component
 * 
 * Features:
 * - Fetch employees from API with real-time updates
 * - Search with debounce (300ms)
 * - Filter by department and position
 * - Pagination with page navigation
 * - Loading and error states
 * - Responsive table layout
 */
export function EmployeeTable() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    // Data
    employees,
    total,
    loading,
    error,

    // Filter Options
    departments,
    positions,
    loadingFilters,

    // Current State
    search,
    departmentId,
    positionId,
    status,
    page,
    pageSize,

    // Computed Values
    totalPages,
    currentPageNumber,
    startIndex,
    endIndex,

    // Actions
    setSearch,
    setDepartmentId,
    setPositionId,
    setStatus,
    previousPage,
    nextPage,
    reload,
  } = useEmployees(10);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const params = new URLSearchParams();
      // ไม่ใช้ตัวกรอง เพื่อดึงข้อมูลพนักงานทั้งหมด
      params.append("skip", "0");
      params.append("take", "1000"); // API caps at 1000

      const response = await fetch(`/api/employees?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch data for export");
      
      const result = await response.json();
      const exportData = result.data;

      const excelData = exportData.map((emp: any) => ({
        "รหัสพนักงาน": emp.employeeCode || "-",
        "ชื่อ": emp.firstName || "-",
        "นามสกุล": emp.lastName || "-",
        "ใบสั่งจ้างเลขที่": emp.contractNumber || "-",
        "ตำแหน่งเลขที่": emp.positionNumber || "-",
        "ตำแหน่ง": emp.position?.name || "-",
        "แผนก": emp.department?.name || "-",
        "วันเกิด": formatDate(emp.birthDate),
        "วันเริ่มงาน": formatDate(emp.hireDate),
        "อายุงาน": formatTenure(emp.tenure),
        "สถานะ": emp.status === "ACTIVE" ? "ยังทำงานอยู่" : emp.status === "RESIGNED" ? "ลาออกแล้ว" : emp.status === "ON_LEAVE" ? "ลาพัก" : emp.status === "RETIRED" ? "เกษียณ" : emp.status,
        "วันที่ลาออก": emp.resignationDate ? formatDate(emp.resignationDate) : "-",
        "หมายเหตุการลาออก": emp.resignationReason || "-",
        "เงินเดือน": emp.salary || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      const wscols = [
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
        { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
      ];
      worksheet["!cols"] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
      
      XLSX.writeFile(workbook, "Employee_List.xlsx");
    } catch (err) {
      console.error("Export error:", err);
      alert("เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow">
      {/* Header Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">รายชื่อพนักงาน</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting || loading || employees.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition disabled:opacity-50"
            >
              {isExporting ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export Excel
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md hover:shadow-lg transition"
            >
              <UserPlus className="w-4 h-4" />
              เพิ่มพนักงาน
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ค้นหาจากชื่อหรือเลขพนักงาน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={departmentId || ""}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={loadingFilters}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white disabled:bg-gray-100"
            >
              <option value="">สถานที่ปฏิบัติงานทั้งหมด</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Position Filter */}
          <div>
            <select
              value={positionId || ""}
              onChange={(e) => setPositionId(e.target.value)}
              disabled={loadingFilters}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white disabled:bg-gray-100"
            >
              <option value="">ตำแหน่งทั้งหมด</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={loadingFilters}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white disabled:bg-gray-100"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="ACTIVE">ยังทำงานอยู่</option>
              <option value="RESIGNED">ลาออกแล้ว</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Info */}
      {!error && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
          แสดง <span className="font-semibold">{startIndex}</span> ถึง{" "}
          <span className="font-semibold">{endIndex}</span> จากทั้งหมด{" "}
          <span className="font-semibold">{total}</span> รายการ
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">เกิดข้อผิดพลาด</p>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => reload()}
              className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                {tableHeaders.map((header) => (
                  <th
                    key={header}
                    className="border border-gray-300 bg-gray-50 px-4 py-3 text-center text-sm font-semibold text-gray-900 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(pageSize)].map((_, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-200 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Table */}
      {!loading && !error && employees.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] border-collapse">
            <thead>
              <tr>
                {tableHeaders.map((header) => (
                  <th
                    key={header}
                    className="border border-gray-300 bg-gray-50 px-4 py-3 text-center text-sm font-semibold text-gray-900 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => (
                <tr
                  key={employee.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="border border-gray-200 px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {employee.positionNumber || "-"}
                  </td>
                  <td className="border border-gray-200 px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {employee.contractNumber || "-"}
                  </td>
                  <td className="border border-gray-200 px-4 py-4 text-sm font-semibold text-gray-950 whitespace-nowrap">
                    <div>{employee.firstName} {employee.lastName}</div>
                    <div className="text-xs font-normal text-gray-500 mt-0.5">รหัส: {employee.employeeCode}</div>
                  </td>
                  <td className="border border-gray-200 px-4 py-4 text-sm text-gray-800 min-w-[240px]">
                    {employee.position.name}
                  </td>
                  <td className="border border-gray-200 px-4 py-4 text-sm text-gray-800 whitespace-nowrap">
                    {employee.department.name}
                  </td>
                  <td className="border border-gray-200 px-4 py-4 text-sm text-gray-700 text-center tabular-nums whitespace-nowrap">
                    {formatDate(employee.birthDate)}
                  </td>
                  <td className="border border-gray-200 px-4 py-4 text-sm text-gray-700 text-center tabular-nums whitespace-nowrap">
                    {formatDate(employee.hireDate)}
                  </td>
                  <td className="border border-gray-200 px-4 py-4 text-sm text-gray-700 text-center whitespace-nowrap">
                    {formatTenure(employee.tenure)}
                  </td>
                  <td className="border border-gray-200 px-4 py-4 text-sm text-gray-700 text-center whitespace-nowrap">
                    {formatDate(employee.resignationDate)}
                  </td>
                  <td className="border border-gray-200 px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/employees/${employee.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        aria-label={`ดูข้อมูล ${employee.firstName} ${employee.lastName}`}
                        title="ดูข้อมูล"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && employees.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-600 mb-2">ไม่พบข้อมูลพนักงาน</p>
            <p className="text-sm text-gray-500">
              ลองปรับคำค้นหาหรือตัวกรองใหม่
            </p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && employees.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            หน้า <span className="font-semibold">{currentPageNumber}</span> จาก{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={previousPage}
              disabled={page === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
              ก่อนหน้า
            </button>

            <button
              onClick={nextPage}
              disabled={(page + 1) * pageSize >= total}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ถัดไป
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        departments={departments}
        positions={positions}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => reload()}
      />
    </div>
  );
}

export default EmployeeTable;
