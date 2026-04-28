"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import * as xlsx from "xlsx";
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Pencil,
  X,
  Save,
  Users,
  ArrowLeft,
  Database,
  Download,
  BarChart3,
  TableProperties,
  MapPin,
  Wallet,
  CalendarDays,
  Banknote,
  Building2,
  BookOpen,
  Phone,
  Eye,
  UserMinus,
  UserPlus,
  Briefcase,
  Printer
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "hr_employee_data";

/**
 * Parses Thai formatted date string (e.g., "1 กย 65" or "1 ก.ย. 2565") into YYYY-MM-DD
 */
const parseThaiDate = (dateStr: string | number): string => {
  if (!dateStr) return "";
  if (typeof dateStr === "number") {
    // Handle excel date serial numbers
    const excelEpoch = new Date(1899, 11, 30);
    const parsedDate = new Date(excelEpoch.getTime() + dateStr * 86400000);
    return parsedDate.toISOString().split("T")[0];
  }
  
  const str = String(dateStr).trim();

  // 1.4: หากข้อมูลเป็นรูปแบบสากล (YYYY-MM-DD) อยู่แล้ว ให้ส่งค่านั้นกลับไปเลย ไม่ต้อง Parse ใหม่
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  const months = ["มค","กพ","มีค","เมย","พค","มิย","กค","สค","กย","ตค","พย","ธค"];
  
  // Normalize string by removing dots and splitting (รองรับทั้งที่มีจุดและไม่มีจุด)
  const parts = str.replace(/\./g, "").split(/\s+/);
  
  if (parts.length >= 3) {
    const day = parts[0].padStart(2, "0");
    const monthIndex = months.findIndex(m => parts[1].includes(m));
    const month = (monthIndex !== -1 ? monthIndex + 1 : 1).toString().padStart(2, "0");
    
    let year = parseInt(parts[2], 10);
    if (!isNaN(year)) {
      if (year < 100) {
        // ปีแบบ 2 หลัก ให้บวก 2500 ก่อน
        year += 2500;
      }
      if (year > 2400) {
        // ลบ 543 เพื่อให้เป็น ค.ศ.
        year -= 543;
      }
      return `${year}-${month}-${day}`;
    }
  }
  
  return str; // Fallback to original if parsing fails
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface EmployeeData {
  sequence: number | string;
  orderNumber: string;
  name: string;
  position: string;
  location: string;
  salary: number | string;
  duration: string;
  startDate: string;
  workAge: string;
  resignationDate: string;
  budget: number | string;
  birthDate?: string;
}

interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

interface EducationRecord {
  yearFrom: string;
  yearTo: string;
  institution: string;
  degree: string;
}

export interface EmployeeProfile {
  name: string;
  nickname: string;
  birthDate: string;
  age: number;
  maritalStatus: string;
  idNumber: string;
  idIssuedDate: string;
  idExpiryDate: string;
  religion: string;
  nationality: string;
  ethnicity: string;
  phone: string;
  lineId: string;
  email: string;
  address: string;
  province: string;
  currentPosition: string;
  currentLocation: string;
  startDate: string;
  resignationDate: string;
  emergencyContacts: EmergencyContact[];
  educationHistory: EducationRecord[];
}

type AppMode = "upload" | "management";
type ManagementTab = "table" | "dashboard";

// ─── Helper: Format numbers with locale ──────────────────────────────────────
const fmtNum = (val: number | string) =>
  typeof val === "number" ? val.toLocaleString("th-TH") : val;

/** Compact large numbers: 1,234,567 → 1.23M  etc. */
const fmtCompact = (val: number): string => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString("th-TH");
};

// ─── Helper: Clean number from comma-separated string ────────────────────────
const cleanNumber = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  const strVal = String(val).trim().replace(/,/g, "");
  const num = Number(strVal);
  return isNaN(num) ? 0 : num;
};

// ─── localStorage helpers ────────────────────────────────────────────────────
const loadFromStorage = (): EmployeeData[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (data: EmployeeData[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// ─── Export CSV helper ───────────────────────────────────────────────────────
const exportToCSV = (data: EmployeeData[]) => {
  const headers = [
    "ลำดับ", "เลขใบสั่งจ้าง", "ชื่อ-นามสกุล", "ตำแหน่ง",
    "สถานที่ปฏิบัติงาน", "อัตราเงินเดือน", "ระยะเวลาจ้าง",
    "วงเงินงบประมาณ", "วันเริ่มงาน", "อายุงาน", "วันที่ลาออก",
  ];

  const rows = data.map(e => [
    e.sequence, e.orderNumber, e.name, e.position,
    e.location, e.salary, e.duration,
    e.budget, e.startDate, e.workAge, e.resignationDate,
  ]);

  // BOM for Thai characters in Excel
  const BOM = "\uFEFF";
  const csvContent =
    BOM +
    [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hr_employee_data_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Stat Card
// ═══════════════════════════════════════════════════════════════════════════════
function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: "blue" | "emerald" | "violet" | "amber" | "orange";
}) {
  const palette = {
    blue:    { bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-600 dark:text-blue-400",    ring: "ring-blue-200 dark:ring-blue-800" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-800" },
    violet:  { bg: "bg-violet-50 dark:bg-violet-900/20",  text: "text-violet-600 dark:text-violet-400",  ring: "ring-violet-200 dark:ring-violet-800" },
    amber:   { bg: "bg-amber-50 dark:bg-amber-900/20",   text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-200 dark:ring-amber-800" },
    orange:  { bg: "bg-orange-50 dark:bg-orange-900/20",  text: "text-orange-600 dark:text-orange-400",  ring: "ring-orange-200 dark:ring-orange-800" },
  };
  const p = palette[color];

  return (
    <div className={`relative overflow-hidden bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm ring-1 ${p.ring} transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className={`text-3xl font-bold tabular-nums ${p.text}`}>{value}</p>
          {subValue && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{subValue}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${p.bg} ${p.text}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Generation Breakdown
// ═══════════════════════════════════════════════════════════════════════════════
function GenerationBreakdown({ genCounts }: { genCounts: { Z: number, Y: number, X: number, Boomer: number } }) {
  const total = genCounts.Z + genCounts.Y + genCounts.X + genCounts.Boomer;
  if (total === 0) return null;

  const zP = (genCounts.Z / total) * 100;
  const yP = (genCounts.Y / total) * 100;
  const xP = (genCounts.X / total) * 100;
  const bP = (genCounts.Boomer / total) * 100;

  // CSS Conic Gradient for the Pie Chart
  const pieGradient = `conic-gradient(
    #3b82f6 0% ${zP}%,
    #10b981 ${zP}% ${zP + yP}%,
    #f59e0b ${zP + yP}% ${zP + yP + xP}%,
    #f43f5e ${zP + yP + xP}% 100%
  )`;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm mt-6">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
        <Users size={20} className="text-blue-500" />
        สัดส่วน Generation ของพนักงาน
      </h3>
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Pie Chart */}
        <div 
          className="w-48 h-48 rounded-full shadow-inner border-4 border-white dark:border-zinc-800 shrink-0 transform hover:scale-105 transition-transform duration-300"
          style={{ background: pieGradient }}
        />
        
        {/* Legend / Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-b-4 border-blue-500 text-center">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Gen Z (2540+)</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{genCounts.Z} คน</p>
            <p className="text-xs text-zinc-500 mt-1">{zP.toFixed(1)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border-b-4 border-emerald-500 text-center">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Gen Y (2524-2539)</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{genCounts.Y} คน</p>
            <p className="text-xs text-zinc-500 mt-1">{yP.toFixed(1)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-b-4 border-amber-500 text-center">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Gen X (2508-2523)</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{genCounts.X} คน</p>
            <p className="text-xs text-zinc-500 mt-1">{xP.toFixed(1)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border-b-4 border-rose-500 text-center">
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Baby Boomer</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{genCounts.Boomer} คน</p>
            <p className="text-xs text-zinc-500 mt-1">{bP.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Budget Progress Bar (per location)
// ═══════════════════════════════════════════════════════════════════════════════
function BudgetBreakdown({ data }: { data: EmployeeData[] }) {
  // Group by location
  const locationMap = useMemo(() => {
    const map = new Map<string, { budget: number; salary: number; count: number }>();
    for (const emp of data) {
      const loc = emp.location || "ไม่ระบุ";
      const entry = map.get(loc) || { budget: 0, salary: 0, count: 0 };
      entry.budget += typeof emp.budget === "number" ? emp.budget : 0;
      entry.salary += typeof emp.salary === "number" ? emp.salary : 0;
      entry.count += 1;
      map.set(loc, entry);
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8); // Top 8
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Per-location breakdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
          <Building2 size={18} className="text-violet-500" />
          จำนวนพนักงานแต่ละสถานที่ปฏิบัติงาน
        </h3>
        <div className="space-y-4 pr-16 py-2">
          {(() => {
            const maxCount = locationMap.length > 0 ? Math.max(...locationMap.map(m => m[1].count)) : 1;
            return locationMap.map(([loc, info]) => {
              const barWidth = Math.max((info.count / maxCount) * 100, 1.5);
              return (
                <div key={loc} className="flex items-center gap-2 sm:gap-3 group">
                  <div className="w-[60px] sm:w-[80px] md:w-[100px] text-sm font-medium text-zinc-600 dark:text-zinc-300 truncate text-left shrink-0">
                    {loc}
                  </div>
                  <div className="flex-1 flex items-center h-8">
                    <div
                      className="relative h-6 bg-emerald-500 dark:bg-emerald-600 rounded-r-lg rounded-l-sm transition-all duration-700 ease-out group-hover:bg-emerald-400 dark:group-hover:bg-emerald-500"
                      style={{ width: `${barWidth}%` }}
                    >
                      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                        {info.count} คน
                      </span>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: EditModal
// ═══════════════════════════════════════════════════════════════════════════════
function EditModal({
  employee,
  isAddingNew,
  onSave,
  onClose,
}: {
  employee: EmployeeData;
  isAddingNew?: boolean;
  onSave: (updated: EmployeeData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EmployeeData>({ ...employee });

  const handleChange = (field: keyof EmployeeData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Re-clean numeric fields before saving
    onSave({
      ...form,
      salary: cleanNumber(form.salary),
      budget: cleanNumber(form.budget),
    });
  };

  const fields: { key: keyof EmployeeData; label: string; type?: string }[] = [
    { key: "name", label: "ชื่อ-นามสกุล" },
    { key: "orderNumber", label: "เลขใบสั่งจ้าง" },
    { key: "position", label: "ตำแหน่ง" },
    { key: "location", label: "สถานที่ปฏิบัติงาน" },
    { key: "salary", label: "อัตราเงินเดือน", type: "text" },
    { key: "budget", label: "วงเงินงบประมาณ", type: "text" },
    { key: "duration", label: "ระยะเวลาจ้าง" },
    { key: "startDate", label: "วันเริ่มงาน", type: "date" },
    { key: "workAge", label: "อายุงาน" },
    { key: "resignationDate", label: "วันที่ลาออก", type: "date" },
  ];

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Modal Panel */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-t-2xl">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            {isAddingNew ? <UserPlus size={18} className="text-blue-500" /> : <Pencil size={18} className="text-blue-500" />}
            {isAddingNew ? "เพิ่มข้อมูลพนักงานใหม่" : "แก้ไขข้อมูลพนักงาน"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {fields.map(({ key, label, type }) => (
              <div key={key} className={key === "name" || key === "location" ? "md:col-span-2" : ""}>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {label}
                </label>
                <input
                  type={type || "text"}
                  value={String(form[key] ?? "")}
                  onChange={e => handleChange(key, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                  placeholder={label}
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Save size={16} />
              บันทึกการแก้ไข
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: Delete Confirmation Modal
// ═══════════════════════════════════════════════════════════════════════════════
function DeleteConfirmModal({
  employeeName,
  onConfirm,
  onClose,
}: {
  employeeName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">ยืนยันการลบ</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
          </div>
        </div>

        <p className="text-zinc-700 dark:text-zinc-300">
          คุณต้องการลบข้อมูลของ <span className="font-semibold text-red-600 dark:text-red-400">{employeeName}</span> ออกจากระบบหรือไม่?
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 transition-all active:scale-95"
          >
            ลบข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmployeeProfileModal({
  employee,
  mode,
  onClose,
  onSave,
}: {
  employee: EmployeeProfile;
  mode: "view" | "edit";
  onClose: () => void;
  onSave: (updatedEmployee: EmployeeProfile) => void;
}) {
  const [editedEmployee, setEditedEmployee] = useState<EmployeeProfile>({ ...employee });

  useEffect(() => {
    setEditedEmployee({ ...employee });
  }, [employee, mode]);

  const isEditing = mode === "edit";

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return "-";
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) return "-";
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age -= 1;
    }
    return age >= 0 ? `${age} ปี` : "-";
  };

  const calculateGeneration = (birthDate: string) => {
    if (!birthDate) return "-";
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) return "-";
    const birthYearCE = date.getFullYear();
    const birthYearBE = birthYearCE + 543;
    if (birthYearBE >= 2540) return "Gen Z";
    if (birthYearBE >= 2524) return "Gen Y";
    if (birthYearBE >= 2508) return "Gen X";
    return "Baby Boomer";
  };

  const calculateWorkExperience = (startDate: string) => {
    if (!startDate || startDate === "-") return "-";
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return "-";
    const today = new Date();
    const years = today.getFullYear() - start.getFullYear();
    const months = today.getMonth() - start.getMonth();
    const totalMonths = years * 12 + months;
    const expYears = Math.floor(totalMonths / 12);
    const expMonths = totalMonths % 12;
    if (expYears > 0) {
      return `${expYears} ปี ${expMonths} เดือน`;
    }
    return `${expMonths} เดือน`;
  };

  const handleSave = () => {
    onSave(editedEmployee);
  };

  const handleEmergencyContactChange = (index: number, field: keyof EmergencyContact, value: string) => {
    const updatedContacts = [...editedEmployee.emergencyContacts];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setEditedEmployee(prev => ({ ...prev, emergencyContacts: updatedContacts }));
  };

  const handleEducationChange = (index: number, field: keyof EducationRecord, value: string) => {
    const updatedEducation = [...editedEmployee.educationHistory];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };
    setEditedEmployee(prev => ({ ...prev, educationHistory: updatedEducation }));
  };

  const handleInputChange = (field: keyof EmployeeProfile, value: string | number) => {
    setEditedEmployee(prev => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const ViewField = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
      <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {value || <span className="text-zinc-300 dark:text-zinc-600">—</span>}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:static print:block print:p-0 print:bg-white print:backdrop-blur-none">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col relative print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:h-auto print:max-h-none print:block">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-6 border-b border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md sticky top-0 z-20 flex-shrink-0 print:static print:border-b-0 print:bg-white print:p-0 print:pb-4 print:mb-4">
          <div>
            <p className="text-sm uppercase font-semibold tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Employee Profile</p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {mode === "view" ? "ดูรายละเอียดพนักงาน" : "แก้ไขข้อมูลพนักงาน"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors print:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-zinc-950/50 print:overflow-visible print:bg-white print:p-0 print:space-y-6">
          {mode === "view" ? (
            <div className="space-y-6">
              {/* Card 1: ข้อมูลส่วนตัว */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 print:break-inside-avoid print:shadow-none print:border-none print:p-0 print:mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    <Users size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">ข้อมูลส่วนตัว</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                  <ViewField label="ชื่อ-นามสกุล" value={employee.name} />
                  <ViewField label="ชื่อเล่น" value={employee.nickname} />
                  <ViewField label="เลขบัตรประชาชน" value={employee.idNumber} />
                  <ViewField label="วันเกิด" value={employee.birthDate} />
                  <ViewField label="อายุ" value={employee.age || calculateAge(employee.birthDate)} />
                  <ViewField label="Generation" value={calculateGeneration(employee.birthDate)} />
                  <ViewField label="ศาสนา" value={employee.religion} />
                  <ViewField label="สัญชาติ" value={employee.nationality} />
                  <ViewField label="เชื้อชาติ" value={employee.ethnicity} />
                  <ViewField label="สถานภาพ" value={employee.maritalStatus} />
                </div>
              </div>

              {/* Card 2: ประวัติการทำงาน */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 print:break-inside-avoid print:shadow-none print:border-none print:p-0 print:mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                    <Briefcase size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">ประวัติการทำงาน</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <ViewField label="ตำแหน่งปัจจุบัน" value={employee.currentPosition} />
                  <ViewField label="สถานที่ปฏิบัติงาน" value={employee.currentLocation} />
                  <ViewField label="วันที่เริ่มงาน" value={employee.startDate} />
                  <ViewField label="วันที่ลาออก" value={employee.resignationDate} />
                  <ViewField label="อายุงาน" value={calculateWorkExperience(employee.startDate)} />
                </div>
              </div>

              {/* Card 3: ข้อมูลติดต่อและการศึกษา */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 print:break-inside-avoid print:shadow-none print:border-none print:p-0 print:mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                    <Phone size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">ข้อมูลติดต่อและการศึกษา</h3>
                </div>
                
                <div className="space-y-8">
                  {/* ติดต่อ */}
                  <div>
                    <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">ช่องทางติดต่อหลัก</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                      <ViewField label="เบอร์โทรศัพท์" value={employee.phone} />
                      <ViewField label="Line ID" value={employee.lineId} />
                      <div className="sm:col-span-2">
                        <ViewField label="ที่อยู่ปัจจุบัน" value={employee.address} />
                      </div>
                    </div>
                  </div>

                  {/* ฉุกเฉิน */}
                  <div>
                    <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">บุคคลติดต่อฉุกเฉิน</h4>
                    {employee.emergencyContacts && employee.emergencyContacts.some(c => c.name || c.relation || c.phone) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {employee.emergencyContacts.filter(c => c.name || c.relation || c.phone).map((contact, i) => (
                          <div key={i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">ผู้ติดต่อ {i + 1}</p>
                            <ViewField label="ชื่อ-นามสกุล" value={contact.name} />
                            <ViewField label="ความสัมพันธ์" value={contact.relation} />
                            <ViewField label="เบอร์โทรศัพท์" value={contact.phone} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400">— ไม่ระบุข้อมูลติดต่อฉุกเฉิน</p>
                    )}
                  </div>

                  {/* การศึกษา */}
                  <div>
                    <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">ประวัติการศึกษา</h4>
                    {employee.educationHistory && employee.educationHistory.some(e => e.institution || e.degree || e.yearFrom) ? (
                      <div className="space-y-3">
                        {employee.educationHistory.filter(e => e.institution || e.degree || e.yearFrom).map((edu, i) => (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 gap-3">
                            <div>
                              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{edu.institution || "—"}</p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{edu.degree || "—"}</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">ปีการศึกษา</p>
                              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                {edu.yearFrom && edu.yearTo ? `${edu.yearFrom} - ${edu.yearTo}` : "—"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400">— ไม่ระบุประวัติการศึกษา</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* ประวัติส่วนบุคคล */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 mb-2">
              <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">ประวัติส่วนบุคคล</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">ข้อมูลพื้นฐานและข้อมูลส่วนตัว</p>
              </div>
            </div>

            <div className="grid gap-6 grid-cols-1">
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <dl className="grid gap-5 grid-cols-1">
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">ชื่อ-นามสกุล</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEmployee.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.name || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">ชื่อเล่น</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEmployee.nickname}
                          onChange={(e) => handleInputChange('nickname', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.nickname || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">เลขบัตรประชาชน</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEmployee.idNumber}
                          onChange={(e) => handleInputChange('idNumber', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.idNumber || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">วันเกิด</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedEmployee.birthDate}
                          onChange={(e) => handleInputChange('birthDate', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.birthDate || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">อายุ</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editedEmployee.age}
                          onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                          min="0"
                          max="120"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base font-medium">{employee.age || calculateAge(employee.birthDate)}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">ศาสนา</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEmployee.religion}
                          onChange={(e) => handleInputChange('religion', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.religion || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">สัญชาติ</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEmployee.nationality}
                          onChange={(e) => handleInputChange('nationality', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.nationality || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">เชื้อชาติ</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEmployee.ethnicity}
                          onChange={(e) => handleInputChange('ethnicity', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.ethnicity || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">สถานภาพ</dt>
                    <dd>
                      {isEditing ? (
                        <select
                          value={editedEmployee.maritalStatus}
                          onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        >
                          <option value="โสด">โสด</option>
                          <option value="สมรส">สมรส</option>
                          <option value="หย่าร้าง">หย่าร้าง</option>
                        </select>
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base font-medium">{employee.maritalStatus || "โสด"}</div>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* ข้อมูลการติดต่อ */}
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mt-6">
                <div className="flex items-center gap-3 mb-5 text-zinc-900 dark:text-zinc-100">
                  <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">ข้อมูลการติดต่อ</h4>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">ช่องทางติดต่อหลัก</p>
                  </div>
                </div>

                <dl className="grid gap-5 grid-cols-1">
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">เบอร์โทรศัพท์</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editedEmployee.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.phone || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">Line ID</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEmployee.lineId}
                          onChange={(e) => handleInputChange('lineId', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.lineId || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">ที่อยู่ปัจจุบัน</dt>
                    <dd>
                      {isEditing ? (
                        <textarea
                          value={editedEmployee.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.address || "-"}</div>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* บุคคลติดต่อฉุกเฉิน */}
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mt-6">
                <div className="flex items-center gap-3 mb-5 text-zinc-900 dark:text-zinc-100">
                  <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300">
                    <Users size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">บุคคลติดต่อฉุกเฉิน</h4>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">สำหรับติดต่อในกรณีฉุกเฉิน</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {isEditing ? (
                    <>
                      {[0, 1].map((index) => (
                        <div key={index} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 p-5">
                          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">{`ผู้ติดต่อฉุกเฉิน ${index + 1}`}</p>
                          <div className="grid gap-4 grid-cols-1">
                            <div>
                              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">ชื่อ-นามสกุล</label>
                              <input
                                type="text"
                                value={editedEmployee.emergencyContacts[index]?.name || ""}
                                onChange={(e) => handleEmergencyContactChange(index, 'name', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                                placeholder="ชื่อ-นามสกุล"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">ความสัมพันธ์</label>
                              <input
                                type="text"
                                value={editedEmployee.emergencyContacts[index]?.relation || ""}
                                onChange={(e) => handleEmergencyContactChange(index, 'relation', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                                placeholder="ความสัมพันธ์"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">เบอร์โทรศัพท์</label>
                              <input
                                type="tel"
                                value={editedEmployee.emergencyContacts[index]?.phone || ""}
                                onChange={(e) => handleEmergencyContactChange(index, 'phone', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                                placeholder="เบอร์โทรศัพท์"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    employee.emergencyContacts.some(contact => contact.name || contact.relation || contact.phone) ? (
                      employee.emergencyContacts.map((contact, index) => (
                        <div key={index} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 p-5">
                          <p className="text-sm font-semibold text-zinc-500 mb-3">{`ผู้ติดต่อฉุกเฉิน ${index + 1}`}</p>
                          <div className="space-y-3">
                            <div>
                               <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">ชื่อ-นามสกุล</p>
                               <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-base">{contact.name || "-"}</div>
                            </div>
                            <div>
                               <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">ความสัมพันธ์</p>
                               <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-base">{contact.relation || "-"}</div>
                            </div>
                            <div>
                               <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">เบอร์โทรศัพท์</p>
                               <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-base">{contact.phone || "-"}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500 p-4 bg-slate-50 rounded-xl border border-slate-100">ไม่มีข้อมูลบุคคลติดต่อฉุกเฉิน</p>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ประวัติการทำงาน */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 mb-2 mt-8">
              <div className="p-3 rounded-2xl bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300">
                <Briefcase size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">ประวัติการทำงาน</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">ข้อมูลการทำงานและการศึกษา</p>
              </div>
            </div>

            <div className="grid gap-6 grid-cols-1">
              {/* ข้อมูลการทำงาน */}
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <dl className="grid gap-5 grid-cols-1">
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">ตำแหน่งปัจจุบัน</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEmployee.currentPosition}
                          onChange={(e) => handleInputChange('currentPosition', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base font-medium">{employee.currentPosition || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">สถานที่ปฏิบัติงาน</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedEmployee.currentLocation}
                          onChange={(e) => handleInputChange('currentLocation', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base font-medium">{employee.currentLocation || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">วันที่เริ่มงาน</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedEmployee.startDate}
                          onChange={(e) => handleInputChange('startDate', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.startDate || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">วันที่ลาออก</dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedEmployee.resignationDate}
                          onChange={(e) => handleInputChange('resignationDate', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-base"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base">{employee.resignationDate || "-"}</div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">อายุงาน</dt>
                    <dd>
                      <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 text-base font-medium">
                        {calculateWorkExperience(isEditing ? editedEmployee.startDate : employee.startDate || "")}
                      </div>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* ประวัติการศึกษา */}
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 overflow-x-auto mt-6">
                <div className="flex items-center gap-2 mb-4 text-zinc-800 dark:text-zinc-200">
                  <BookOpen size={20} />
                  <span className="font-semibold text-lg">ประวัติการศึกษา</span>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-zinc-950/80 text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-[0.08em] border-b border-slate-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-5 py-4 font-semibold">ปี พ.ศ.</th>
                        <th className="px-5 py-4 font-semibold">สถานศึกษา</th>
                        <th className="px-5 py-4 font-semibold">วุฒิ/วิชาเอก</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900">
                      {isEditing ? (
                        editedEmployee.educationHistory.map((record, index) => (
                          <tr key={index} className="border-b last:border-0 border-slate-100 dark:border-zinc-800">
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={record.yearFrom}
                                  onChange={(e) => handleEducationChange(index, 'yearFrom', e.target.value)}
                                  className="w-20 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                                  placeholder="ปีเริ่ม"
                                />
                                <span className="text-zinc-400 self-center">-</span>
                                <input
                                  type="text"
                                  value={record.yearTo}
                                  onChange={(e) => handleEducationChange(index, 'yearTo', e.target.value)}
                                  className="w-20 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                                  placeholder="ปีจบ"
                                />
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <input
                                type="text"
                                value={record.institution}
                                onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                                placeholder="ชื่อสถานศึกษา"
                              />
                            </td>
                            <td className="px-5 py-3">
                              <input
                                type="text"
                                value={record.degree}
                                onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                                placeholder="วุฒิ/วิชาเอก"
                              />
                            </td>
                          </tr>
                        ))
                      ) : (
                        employee.educationHistory.some(record => record.yearFrom || record.yearTo || record.institution || record.degree) ? (
                          employee.educationHistory.map((record, index) => (
                            <tr key={index} className="border-b last:border-0 border-slate-100 dark:border-zinc-800">
                              <td className="px-5 py-4 text-zinc-800 dark:text-zinc-200">{record.yearFrom && record.yearTo ? `${record.yearFrom} - ${record.yearTo}` : "-"}</td>
                              <td className="px-5 py-4 text-zinc-900 dark:text-zinc-100 font-medium">{record.institution || "-"}</td>
                              <td className="px-5 py-4 text-zinc-700 dark:text-zinc-300">{record.degree || "-"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400 bg-slate-50/50">ไม่มีข้อมูลการศึกษา</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky bottom-0 z-20 flex justify-end gap-3 flex-shrink-0 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
          {mode === "view" ? (
            <>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-sm font-medium transition-colors"
              >
                ปิด
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 text-sm font-semibold transition-all active:scale-95"
              >
                <Printer size={18} />
                พิมพ์เอกสาร
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-sm font-medium transition-colors"
              >
                <X size={18} />
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                <Save size={18} />
                บันทึกการเปลี่ยนแปลง
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function HRUploadPage() {
  // ─── App mode ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<AppMode>("upload");
  const [mgmtTab, setMgmtTab] = useState<ManagementTab>("table");

  // ─── Upload / Preview state ────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<EmployeeData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // ─── Management state ──────────────────────────────────────────────────────
  const [savedData, setSavedData] = useState<EmployeeData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [selectedEmployeeForView, setSelectedEmployeeForView] = useState<EmployeeData | null>(null);
  const [selectedViewIndex, setSelectedViewIndex] = useState<number | null>(null);
  const [employeeModalMode, setEmployeeModalMode] = useState<"view" | "edit">("view");
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // ─── Pagination state ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ─── Load persisted data on mount ──────────────────────────────────────────
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored.length > 0) {
      setSavedData(stored);
      setMode("management");
    }
  }, []);

  // ─── Computed analytics ────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const totalBudget = savedData.reduce((s, e) => s + (typeof e.budget === "number" ? e.budget : 0), 0);
    const totalSalary = savedData.reduce((s, e) => s + (typeof e.salary === "number" ? e.salary : 0), 0);
    const avgSalary = savedData.length > 0 ? totalSalary / savedData.length : 0;
    const uniqueLocations = new Set(savedData.map(e => e.location).filter(Boolean));
    const resignedCount = savedData.filter(e => e.resignationDate && e.resignationDate.trim() !== "" && e.resignationDate.trim() !== "-").length;

    // Average tenure calculation
    const now = new Date();
    let tenureMonthsTotal = 0;
    let tenureCount = 0;
    for (const emp of savedData) {
      const sd = emp.startDate?.trim();
      if (!sd || sd === "-" || sd === "") continue;
      const parsed = new Date(sd);
      if (isNaN(parsed.getTime())) continue;
      const diffMs = now.getTime() - parsed.getTime();
      if (diffMs < 0) continue;
      const months = (now.getFullYear() - parsed.getFullYear()) * 12 + (now.getMonth() - parsed.getMonth());
      tenureMonthsTotal += months;
      tenureCount += 1;
    }
    const avgTenureMonths = tenureCount > 0 ? Math.round(tenureMonthsTotal / tenureCount) : 0;
    const avgTenureYears = Math.floor(avgTenureMonths / 12);
    const avgTenureRemMonths = avgTenureMonths % 12;
    const avgTenureLabel = avgTenureYears > 0
      ? `${avgTenureYears} ปี ${avgTenureRemMonths} เดือน`
      : `${avgTenureRemMonths} เดือน`;

    // Age and Generation calculation
    let totalAge = 0;
    let ageCount = 0;
    const genCounts = { Z: 0, Y: 0, X: 0, Boomer: 0 };
    for (const emp of savedData) {
      if (emp.birthDate && emp.birthDate !== "" && emp.birthDate !== "-") {
        const parsed = new Date(emp.birthDate);
        if (!isNaN(parsed.getTime())) {
          const age = now.getFullYear() - parsed.getFullYear();
          if (age >= 0 && age <= 120) {
            totalAge += age;
            ageCount += 1;
            
            const birthYearCE = parsed.getFullYear(); 
            const birthYearBE = birthYearCE + 543; 
            
            if (birthYearBE >= 2540) genCounts.Z += 1;
            else if (birthYearBE >= 2524) genCounts.Y += 1;
            else if (birthYearBE >= 2508) genCounts.X += 1;
            else genCounts.Boomer += 1;
          }
        }
      }
    }
    const avgAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;

    return { totalBudget, totalSalary, avgSalary, locationCount: uniqueLocations.size, resignedCount, avgTenureLabel, tenureCount, avgAge, ageCount, genCounts };
  }, [savedData]);

  // ─── File upload ───────────────────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setError(null);
    if (fileRejections.length > 0) {
      setError("กรุณาอัปโหลดไฟล์นามสกุล .xlsx, .xls หรือ .csv เท่านั้น");
      return;
    }
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      processFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"]
    },
    maxFiles: 1
  });

  // ─── File processing (preserves all Step 1 logic) ─────────────────────────
  const processFile = async (uploadedFile: File) => {
    setLoading(true);
    try {
      const buffer = await uploadedFile.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Parse sheet to array of arrays
      const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      
      const cleanedData: EmployeeData[] = [];
      
      for (const row of rows) {
        // Skip completely empty rows
        if (row.length === 0 || row.every(cell => String(cell).trim() === "")) {
          continue;
        }

        // Schema Mapping
        // 0: ลำดับ, 1: เลขใบสั่งจ้าง, 2: ชื่อ-นามสกุล, 3: ตำแหน่ง, 4: สถานที่ปฏิบัติงาน
        // 5: อัตราเงินเดือน, 6: ระยะเวลาจ้าง, 7: วงเงินงบประมาณ, 8: (ว่าง), 9: วันเริ่มงาน
        // 10: อายุงาน, 11: วันที่ลาออก
        
        const colSeq = String(row[0] || "").trim();
        const colName = String(row[2] || "").trim();
        const colSalary = String(row[5] || "").trim();

        // Data Integrity: Must have both Name-Surname and Salary
        if (!colName || !colSalary) continue;

        // 4.1 Strict Filtering: รับเฉพาะแถวที่ row[0] เป็นตัวเลขเท่านั้น
        if (colSeq === "" || !/^\d+$/.test(colSeq)) continue;

        // Keyword Exclusion: skip non-employee grouping rows
        const excludedKeywords = ['อัตรา', 'รวม', 'กลุ่มงาน', 'ปฏิบัติงาน', 'ชื่อ-นามสกุล'];
        if (excludedKeywords.some(keyword => colName.includes(keyword))) continue;

        const rawResignation = String(row[11] || "").trim();
        const rawStartDate = String(row[9] || "").trim();

        cleanedData.push({
          sequence: colSeq,
          orderNumber: String(row[1] || "").trim(),
          name: colName,
          position: String(row[3] || "").trim(),
          location: String(row[4] || "").trim(),
          salary: cleanNumber(row[5]),
          duration: String(row[6] || "").trim(),
          birthDate: String(row[8] || "").trim() ? parseThaiDate(String(row[8] || "").trim()) : "",
          startDate: rawStartDate ? parseThaiDate(rawStartDate) : "-",
          budget: cleanNumber(row[7]),
          workAge: String(row[10] || "").trim(),
          resignationDate: rawResignation ? parseThaiDate(rawResignation) : "-"
        });
      }
      
      setPreviewData(cleanedData);
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการอ่านไฟล์ โปรดตรวจสอบรูปแบบไฟล์อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreviewData([]);
    setError(null);
  };

  // ─── Confirm & Save → Replace into localStorage ───────────────────────────
  const handleConfirmSave = () => {
    saveToStorage(previewData);
    setSavedData(previewData);
    setPreviewData([]);
    setFile(null);
    setMode("management");
    setMgmtTab("table");
  };

  // ─── Switch back to upload mode ────────────────────────────────────────────
  const goToUpload = () => {
    setMode("upload");
    setFile(null);
    setPreviewData([]);
    setError(null);
  };

  // ─── Extract unique locations and positions for filter dropdowns ──────────
  const uniqueLocations = useMemo(() => {
    const set = new Set(savedData.map(e => e.location).filter(Boolean));
    return Array.from(set).sort();
  }, [savedData]);

  const uniquePositions = useMemo(() => {
    const set = new Set(savedData.map(e => e.position).filter(Boolean));
    return Array.from(set).sort();
  }, [savedData]);

  // ─── Search & Filter logic (combined: search + location + position) ──────
  const filteredData = useMemo(() => {
    let result = savedData;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        emp =>
          emp.name.toLowerCase().includes(q)
      );
    }

    // Filter by selected location
    if (selectedLocation) {
      result = result.filter(emp => emp.location === selectedLocation);
    }

    // Filter by selected position
    if (selectedPosition) {
      result = result.filter(emp => emp.position === selectedPosition);
    }

    return result;
  }, [savedData, searchQuery, selectedLocation, selectedPosition]);

  // Reset pagination when filters or data change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLocation, selectedPosition, savedData.length]);

  // ─── Pagination logic ──────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // ─── Edit handler ──────────────────────────────────────────────────────────
  const mapEmployeeToProfile = (emp: EmployeeData): EmployeeProfile => ({
    name: emp.name,
    nickname: "",
    birthDate: emp.birthDate || "",
    age: 0,
    maritalStatus: "โสด",
    idNumber: "",
    idIssuedDate: "",
    idExpiryDate: "",
    religion: "",
    nationality: "",
    ethnicity: "",
    phone: "",
    lineId: "",
    email: "",
    address: "",
    province: "",
    currentPosition: emp.position,
    currentLocation: emp.location,
    startDate: emp.startDate,
    resignationDate: emp.resignationDate,
    emergencyContacts: [
      { name: "", relation: "", phone: "" },
      { name: "", relation: "", phone: "" }
    ],
    educationHistory: [
      { yearFrom: "", yearTo: "", institution: "", degree: "" },
      { yearFrom: "", yearTo: "", institution: "", degree: "" },
      { yearFrom: "", yearTo: "", institution: "", degree: "" },
      { yearFrom: "", yearTo: "", institution: "", degree: "" },
      { yearFrom: "", yearTo: "", institution: "", degree: "" }
    ],
  });

  const openProfileDetail = (emp: EmployeeData, idx: number) => {
    setSelectedEmployeeForView(emp);
    setSelectedViewIndex(idx);
    setEmployeeModalMode("view");
    setIsEmployeeModalOpen(true);
  };

  const openProfileEdit = (emp: EmployeeData, idx: number) => {
    setSelectedEmployeeForView(emp);
    setSelectedViewIndex(idx);
    setEmployeeModalMode("edit");
    setIsEmployeeModalOpen(true);
  };

  const closeProfileDetail = () => {
    setIsEmployeeModalOpen(false);
    setSelectedEmployeeForView(null);
    setSelectedViewIndex(null);
  };

  const handleProfileSave = (updatedProfile: EmployeeProfile) => {
    if (!selectedEmployeeForView) return;

    // 1. Check for Identity: ใช้ sequence เป็นตัวระบุ (Unique ID)
    const targetSequence = selectedEmployeeForView.sequence;

    // เตรียมข้อมูลใหม่โดยรวมข้อมูลเดิมและข้อมูลที่ถูกแก้ไข (รวมถึง Profile ทั้งหมดเผื่อเรียกใช้)
    const updatedEmployee: EmployeeData = {
      ...selectedEmployeeForView,
      ...updatedProfile,
      name: updatedProfile.name,
      position: updatedProfile.currentPosition,
      location: updatedProfile.currentLocation,
      startDate: updatedProfile.startDate,
      resignationDate: updatedProfile.resignationDate,
      birthDate: updatedProfile.birthDate,
    } as unknown as EmployeeData;

    // ตรวจสอบว่ามีพนักงานคนนี้อยู่แล้วหรือไม่
    const exists = savedData.some(emp => emp.sequence === targetSequence);

    let nextData;
    if (exists) {
      // 2. Update Logic: ถ้ามีอยู่แล้วให้ใช้ .map() หา ID ตรงกันแล้วแทนที่ข้อมูล
      nextData = savedData.map(emp => 
        emp.sequence === targetSequence ? updatedEmployee : emp
      );
    } else {
      // 2.1 ถ้าไม่มีพนักงานคนนี้ ให้เพิ่มข้อมูลต่อท้าย
      nextData = [...savedData, updatedEmployee];
    }

    // 3. Sync to LocalStorage: บันทึกข้อมูลลง state และ localStorage ทันที
    setSavedData(nextData);
    saveToStorage(nextData);

    // 4. Close Modal: ปิดหน้าต่างการทำงานและคืนค่าสถานะ
    setIsEmployeeModalOpen(false);
    setSelectedEmployeeForView(null);
    setSelectedViewIndex(null);
  };

  const handleEditSave = (updated: EmployeeData) => {
    // 1. Check for Identity: ใช้ sequence เป็นตัวระบุ
    const targetSequence = updated.sequence;
    const exists = savedData.some(emp => emp.sequence === targetSequence);

    let nextData;
    if (exists) {
      // 2. Update Logic: ถ้ามีอยู่แล้วให้ใช้ .map() หา ID ตรงกันแล้วแทนที่ข้อมูล
      nextData = savedData.map(emp => 
        emp.sequence === targetSequence ? updated : emp
      );
    } else {
      // 2.1 ถ้าไม่มีพนักงานคนนี้ ให้เพิ่มข้อมูลต่อท้าย
      nextData = [...savedData, updated];
    }

    // 3. Sync to LocalStorage: บันทึกข้อมูลลง state และ localStorage ทันที
    setSavedData(nextData);
    saveToStorage(nextData);

    // 4. Close Modal: ปิดหน้าต่างการทำงาน
    setEditingIndex(null);
  };

  // ─── Add handler ───────────────────────────────────────────────────────────
  const handleAddSave = (newEmp: EmployeeData) => {
    // Auto-generate sequence by picking the max current sequence + 1
    const currentMaxSeq = savedData.reduce((max, e) => {
      const seq = parseInt(String(e.sequence), 10);
      return !isNaN(seq) && seq > max ? seq : max;
    }, 0);
    newEmp.sequence = currentMaxSeq + 1;

    const next = [...savedData, newEmp];
    setSavedData(next);
    saveToStorage(next);
    setIsAddingNew(false);
  };

  // ─── Delete handler ────────────────────────────────────────────────────────
  const handleDeleteConfirm = () => {
    if (deletingIndex === null) return;
    const actualEmployee = filteredData[deletingIndex];
    const realIndex = savedData.indexOf(actualEmployee);
    if (realIndex === -1) return;

    const next = savedData.filter((_, i) => i !== realIndex);
    setSavedData(next);
    saveToStorage(next);
    setDeletingIndex(null);
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════

  // ─── Shared table header ───────────────────────────────────────────────────
  const tableHeaders = (showActions: boolean) => (
    <tr>
      <th className="px-5 py-4 font-semibold whitespace-nowrap w-[60px]">ลำดับ</th>
      <th className="px-5 py-4 font-semibold whitespace-nowrap w-[100px]">เลขใบสั่งจ้าง</th>
      <th className="px-5 py-4 font-semibold min-w-[200px]">ชื่อ-นามสกุล</th>
      <th className="px-5 py-4 font-semibold min-w-[200px]">ตำแหน่ง</th>
      <th className="px-5 py-4 font-semibold min-w-[200px]">สถานที่ปฏิบัติงาน</th>
      <th className="px-5 py-4 font-semibold text-right whitespace-nowrap">เงินเดือน</th>
      <th className="px-5 py-4 font-semibold whitespace-nowrap">ระยะเวลาจ้าง</th>
      <th className="px-5 py-4 font-semibold whitespace-nowrap">วันเริ่มงาน</th>
      <th className="px-5 py-4 font-semibold whitespace-nowrap">อายุงาน</th>
      <th className="px-5 py-4 font-semibold whitespace-nowrap">วันที่ลาออก</th>
      <th className="px-5 py-4 font-semibold text-right whitespace-nowrap">งบประมาณ</th>
      {showActions && <th className="px-5 py-4 font-semibold text-center whitespace-nowrap">การจัดการ</th>}
    </tr>
  );

  // ─── Shared table row ─────────────────────────────────────────────────────
  const tableRow = (row: EmployeeData, idx: number, showActions: boolean) => (
    <tr key={idx} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group text-sm">
      <td className="px-5 py-4 text-zinc-500 dark:text-zinc-400 tabular-nums w-[60px]">{row.sequence}</td>
      <td className="px-5 py-4 text-zinc-900 dark:text-zinc-200 tabular-nums w-[100px]">{row.orderNumber}</td>
      <td className="px-5 py-4 font-bold text-zinc-900 dark:text-zinc-50">{row.name}</td>
      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">{row.position}</td>
      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">{row.location}</td>
      <td className="px-5 py-4 text-zinc-900 dark:text-zinc-200 text-right font-medium tabular-nums">{fmtNum(row.salary)}</td>
      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">{row.duration}</td>
      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400 tabular-nums">{row.startDate}</td>
      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">{row.workAge}</td>
      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400 tabular-nums">{row.resignationDate}</td>
      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400 text-right tabular-nums">{fmtNum(row.budget)}</td>
      {showActions && (
        <td className="px-5 py-4">
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => openProfileDetail(row, idx)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Eye size={14} /> ดูรายละเอียด
            </button>
            <button
              onClick={() => openProfileEdit(row, idx)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Pencil size={14} /> แก้ไข
            </button>
            <button
              onClick={() => setDeletingIndex(idx)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
            >
              <Trash2 size={14} /> ลบ
            </button>
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8 lg:p-12 font-sans transition-colors print:p-0 print:bg-white`}>
      <div className={`max-w-[1400px] mx-auto space-y-6 ${isEmployeeModalOpen && employeeModalMode === 'view' ? 'print:hidden' : ''}`}>

        {/* ════════════════════════════════════════════════════════════════════
            MODE: UPLOAD / PREVIEW
        ════════════════════════════════════════════════════════════════════ */}
        {mode === "upload" && (
          <>
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    อัปโหลดข้อมูลพนักงาน
                  </h1>
                  <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                    ลากและวางไฟล์ Excel หรือ CSV ของคุณที่นี่ ระบบจะจัดการข้อมูลและแสดงตัวอย่างให้อัตโนมัติ
                  </p>
                </div>
                {savedData.length > 0 && (
                  <button
                    onClick={() => setMode("management")}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 shadow-md transition-all active:scale-95"
                  >
                    <Database size={16} />
                    ดูข้อมูลที่บันทึกไว้ ({savedData.length})
                  </button>
                )}
              </div>
            </div>

            {/* Upload Dropzone */}
            <div 
              {...getRootProps()} 
              className={`
                relative group overflow-hidden rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[300px]
                ${isDragActive 
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
                  : "border-zinc-300 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 bg-white dark:bg-zinc-900"}
              `}
            >
              <input {...getInputProps()} />
              <div className={`p-4 rounded-full mb-4 transition-transform duration-300 ${isDragActive ? "scale-110 bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500"}`}>
                <UploadCloud size={48} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-zinc-800 dark:text-zinc-200">
                {isDragActive ? "วางไฟล์ที่นี่..." : "ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                รองรับไฟล์ .xlsx, .xls และ .csv (แนะนำไฟล์ที่มีข้อมูลครบถ้วน 10 คอลัมน์ตามโครงสร้าง)
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm">
                <AlertCircle size={20} />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Selected File Overview */}
            {file && !error && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                  <div className="p-3 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-xl">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{file.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <span>{(file.size / 1024).toFixed(2)} KB</span>
                      <span>•</span>
                      {loading ? (
                        <span className="flex items-center gap-1">กำลังประมวลผล...</span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 size={14} /> เตรียมข้อมูลสำเร็จ</span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                >
                  <Trash2 size={16} /> ลบไฟล์
                </button>
              </div>
            )}

            {/* Data Preview Table */}
            {previewData.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-end flex-wrap gap-4">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    ตัวอย่างข้อมูล <span className="text-zinc-400 dark:text-zinc-500 font-normal text-base ml-2">({previewData.length} รายการ)</span>
                  </h2>
                  <button 
                    onClick={handleConfirmSave}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    ยืนยันและบันทึกข้อมูล
                  </button>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px] pb-10">
                  <div className="overflow-x-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <table className="w-full text-sm text-left">
                      <thead className="text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-50/90 dark:bg-zinc-800/90 uppercase sticky top-0 backdrop-blur-md z-10 border-b border-zinc-200 dark:border-zinc-800">
                        {tableHeaders(false)}
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {previewData.slice(0, 50).map((row, idx) => tableRow(row, idx, false))}
                      </tbody>
                    </table>
                  </div>
                  {previewData.length > 50 && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/80 py-3 text-center text-sm text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
                      แสดงตัวอย่างข้อมูลเพียง 50 แถวแรก
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            MODE: MANAGEMENT
        ════════════════════════════════════════════════════════════════════ */}
        {mode === "management" && (
          <>
            {/* Header + Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
                  <Users size={32} className="text-blue-500" />
                  ระบบจัดการพนักงาน
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                  ดูภาพรวม ค้นหา แก้ไข และส่งออกข้อมูลพนักงานในระบบ
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Export CSV */}
                <button
                  onClick={() => exportToCSV(savedData)}
                  disabled={savedData.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <Download size={16} />
                  Export CSV
                </button>
                {/* Add new employee */}
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
                >
                  <UserPlus size={16} />
                  เพิ่มพนักงาน
                </button>
                {/* Upload new */}
                <button
                  onClick={goToUpload}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
                >
                  <UploadCloud size={16} />
                  อัปโหลดข้อมูลใหม่
                </button>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
              <button
                onClick={() => setMgmtTab("dashboard")}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  mgmtTab === "dashboard"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                }`}
              >
                <BarChart3 size={16} />
                ภาพรวม
              </button>
              <button
                onClick={() => setMgmtTab("table")}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  mgmtTab === "table"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                }`}
              >
                <TableProperties size={16} />
                ตารางจัดการ
              </button>
            </div>

            {/* ─── TAB: DASHBOARD ─────────────────────────────────────────── */}
            {mgmtTab === "dashboard" && (
              <>
                {/* ─── Summary Stat Cards ─────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={<Users size={22} />}
                    label="จำนวนพนักงานทั้งหมด"
                    value={savedData.length.toLocaleString("th-TH")}
                    subValue={searchQuery ? `ผลค้นหา: ${filteredData.length} คน` : undefined}
                    color="blue"
                  />
                  <StatCard
                    icon={<CalendarDays size={22} />}
                    label="อายุงานเฉลี่ย"
                    value={analytics.avgTenureLabel}
                    subValue={`จากพนักงาน ${analytics.tenureCount} คน`}
                    color="emerald"
                  />
                  <StatCard
                    icon={<Users size={22} />}
                    label="อายุเฉลี่ยพนักงาน"
                    value={analytics.ageCount > 0 ? `${analytics.avgAge} ปี` : "-"}
                    subValue={analytics.ageCount > 0 ? `จากพนักงาน ${analytics.ageCount} คน` : "ไม่มีข้อมูลวันเกิด"}
                    color="violet"
                  />
                  <StatCard
                    icon={<UserMinus size={22} />}
                    label="พนักงานที่ลาออก"
                    value={`${analytics.resignedCount.toLocaleString("th-TH")} คน`}
                    subValue={savedData.length > 0 ? `คิดเป็น ${((analytics.resignedCount / savedData.length) * 100).toFixed(1)}% ของทั้งหมด` : undefined}
                    color="orange"
                  />
                </div>

                <BudgetBreakdown data={savedData} />
                <GenerationBreakdown genCounts={analytics.genCounts} />
              </>
            )}

            {/* ─── TAB: TABLE ─────────────────────────────────────────────── */}
            {mgmtTab === "table" && (
              <>
                {/* Search & Filter Bar (Flexbox) */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[250px]">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาจากชื่อ-นามสกุล..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm placeholder:text-zinc-400 shadow-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {/* Location Filter Dropdown */}
                  <select
                    value={selectedLocation}
                    onChange={e => setSelectedLocation(e.target.value)}
                    className="px-4 py-3.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm shadow-sm min-w-[200px] sm:min-w-[220px]"
                  >
                    <option value="">สถานที่ปฏิบัติงานทั้งหมด</option>
                    {uniqueLocations.map(location => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>

                  {/* Position Filter Dropdown */}
                  <select
                    value={selectedPosition}
                    onChange={e => setSelectedPosition(e.target.value)}
                    className="px-4 py-3.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm shadow-sm min-w-[200px] sm:min-w-[220px]"
                  >
                    <option value="">ตำแหน่งทั้งหมด</option>
                    {uniquePositions.map(position => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Management Table */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px] pb-10">
                  <div className="overflow-x-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <table className="w-full text-sm text-left">
                      <thead className="text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-50/90 dark:bg-zinc-800/90 uppercase sticky top-0 backdrop-blur-md z-10 border-b border-zinc-200 dark:border-zinc-800">
                        {tableHeaders(true)}
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {paginatedData.length > 0 ? (
                          paginatedData.map((row, idx) => {
                            const filteredIdx = (currentPage - 1) * itemsPerPage + idx;
                            return tableRow(row, filteredIdx, true);
                          })
                        ) : (
                          <tr>
                            <td colSpan={12} className="px-6 py-16 text-center">
                              <div className="flex flex-col items-center gap-3 text-zinc-400 dark:text-zinc-500">
                                <Search size={40} strokeWidth={1.5} />
                                <p className="text-lg font-medium">ไม่พบข้อมูลพนักงาน</p>
                                <p className="text-sm">
                                  {searchQuery
                                    ? `ไม่พบผลลัพธ์สำหรับ "${searchQuery}"`
                                    : "ยังไม่มีข้อมูลพนักงานในระบบ กรุณาอัปโหลดไฟล์"}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {filteredData.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mt-auto">
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredData.length)} จากทั้งหมด {filteredData.length} รายการ
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ก่อนหน้า
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                            .map((page, index, array) => {
                              const isGap = index > 0 && page - array[index - 1] > 1;
                              return (
                                <React.Fragment key={page}>
                                  {isGap && <span className="px-2 text-zinc-400">...</span>}
                                  <button
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                                      currentPage === page
                                        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"
                                        : "border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    }`}
                                  >
                                    {page}
                                  </button>
                                </React.Fragment>
                              );
                            })
                          }
                        </div>

                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ถัดไป
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ═══════ Modals ═══════ */}
      {isAddingNew && (
        <EditModal
          isAddingNew={true}
          employee={{
            sequence: "", orderNumber: "", name: "", position: "", location: "",
            salary: "", duration: "", startDate: "", workAge: "", resignationDate: "", budget: "", birthDate: ""
          }}
          onSave={handleAddSave}
          onClose={() => setIsAddingNew(false)}
        />
      )}

      {editingIndex !== null && filteredData[editingIndex] && (
        <EditModal
          employee={filteredData[editingIndex]}
          onSave={handleEditSave}
          onClose={() => setEditingIndex(null)}
        />
      )}

      {deletingIndex !== null && filteredData[deletingIndex] && (
        <DeleteConfirmModal
          employeeName={filteredData[deletingIndex].name}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingIndex(null)}
        />
      )}

      {isEmployeeModalOpen && selectedEmployeeForView && (
        <EmployeeProfileModal
          employee={mapEmployeeToProfile(selectedEmployeeForView)}
          mode={employeeModalMode}
          onClose={closeProfileDetail}
          onSave={handleProfileSave}
        />
      )}
    </div>
  );
}
