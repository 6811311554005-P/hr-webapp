/**
 * Excel Column Mapping Configuration
 * Maps Thai column names from Excel to database fields
 * 
 * Customize this mapping based on your Excel file structure
 */

export const EXCEL_COLUMN_MAP = {
  // Employee basic info
  "ชื่อ-นามสกุล": "fullName",        // Full name (will split into firstName, lastName)
  "ชื่อจริง": "firstName",             // First name
  "นามสกุล": "lastName",               // Last name
  
  // Employment details
  "หน่วยงาน": "department",            // Department
  "ตำแหน่ง": "position",               // Position
  "เลขที่ใบสั่งจ้าง": "contractNumber", // Contract number
  "ตำแหน่งเลขที่": "positionNumber",   // Position number
  "เลขที่": "positionNumber",          // Alternative position number column
  
  // Dates
  "วันที่เริ่มงาน": "hireDate",        // Hire date
  "วันเริ่มงาน": "hireDate",           // Alternative hire date
  "วันเกิด": "birthDate",              // Birth date
  
  // Status
  "สถานะ": "status",                  // Status (ACTIVE, RESIGNED, etc.)
  
  // Salary
  "เงินเดือน": "salary",              // Salary
};

/**
 * Reverse mapping - English to Thai
 * Useful for finding columns
 */
export const THAI_COLUMN_REVERSE_MAP = Object.entries(EXCEL_COLUMN_MAP).reduce(
  (acc, [thai, english]) => {
    acc[english] = thai;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Parse Thai date formats
 * Handles various Thai date formats (Buddhist Era and Western)
 */
export function parseDateField(value: unknown): Date | null {
  if (!value) return null;

  // If already a Date object
  if (value instanceof Date) return value;

  // If it's a number (Excel serial date)
  if (typeof value === "number") {
    // Excel dates are stored as days since 1/1/1900
    const excelEpoch = new Date(1900, 0, 1);
    const days = Math.floor(value);
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    return isValidDate(date) ? date : null;
  }

  // If it's a string
  if (typeof value === "string") {
    const trimmed = value.trim();

    // Try common date formats
    const datePatterns = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,  // DD-MM-YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,  // YYYY-MM-DD
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // DD/MM/YY
    ];

    for (const pattern of datePatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const [, part1, part2, part3] = match;
        let day: number, month: number, year: number;

        // Determine format based on pattern
        if (parseInt(part1) > 31) {
          // YYYY format first
          year = parseInt(part1);
          month = parseInt(part2);
          day = parseInt(part3);
        } else if (parseInt(part3) > 31) {
          // Format: DD/MM/YYYY or DD-MM-YYYY
          day = parseInt(part1);
          month = parseInt(part2);
          year = parseInt(part3);
        } else {
          // Ambiguous, assume DD/MM/YY
          day = parseInt(part1);
          month = parseInt(part2);
          year = parseInt(part3);
        }

        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }

        // Handle Buddhist Era (BE) years (543 years ahead)
        if (year > 2300) {
          year -= 543;
        }

        const date = new Date(year, month - 1, day);
        return isValidDate(date) ? date : null;
      }
    }

    // Try ISO format
    const isoDate = new Date(trimmed);
    return isValidDate(isoDate) ? isoDate : null;
  }

  return null;
}

/**
 * Validate if date is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Parse status field
 * Normalize Thai and English status values
 */
export function parseStatus(value: unknown): "ACTIVE" | "RESIGNED" | "ON_LEAVE" | "RETIRED" {
  const statusMap: Record<string, "ACTIVE" | "RESIGNED" | "ON_LEAVE" | "RETIRED"> = {
    // Thai statuses
    "ปฏิบัติงาน": "ACTIVE",
    "กำลังปฏิบัติงาน": "ACTIVE",
    "ลาออก": "RESIGNED",
    "เกษียณอายุ": "RETIRED",
    "ลาไปแล้ว": "ON_LEAVE",
    "ลาพักผ่อน": "ON_LEAVE",

    // English statuses
    active: "ACTIVE",
    resigned: "RESIGNED",
    retired: "RETIRED",
    "on leave": "ON_LEAVE",
    leave: "ON_LEAVE",
  };

  const normalized =
    typeof value === "string"
      ? statusMap[value.toLowerCase().trim()] || "ACTIVE"
      : "ACTIVE";

  return normalized;
}

/**
 * Split full name into first and last name
 */
export function splitFullName(
  fullName: string
): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }

  return {
    firstName: fullName,
    lastName: "",
  };
}
