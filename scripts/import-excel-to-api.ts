import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

interface Employee {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position: string;
  department: string;
  level?: string;
  salary: number;
  startDate: string; // ISO format: YYYY-MM-DD
  birthDate: string | null; // ISO format: YYYY-MM-DD or null
  employeeCode?: string;
}

interface ImportStats {
  totalRows: number;
  validRows: number;
  skippedRows: number;
  batchesSent: number;
  successCount: number;
  failedCount: number;
  errors: string[];
}

interface BatchResponse {
  success: boolean;
  message: string;
  imported?: number;
  errors?: string[];
}

const asText = (value: unknown): string => {
  return value === null || value === undefined ? "" : String(value).trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses Thai date formats and converts to ISO string (YYYY-MM-DD)
 *
 * Supports:
 * - Thai format: "1 กค 65", "9 ตค 66", "21 พย 2540"
 * - Excel numeric dates
 * - Standard formats: "DD/MM/YYYY", "YYYY-MM-DD"
 *
 * Converts Buddhist Year (BE) to Common Era (CE): year - 543
 */
function parseThaiDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  // 1. Handle Excel numeric date
  if (typeof value === "number") {
    const dateUTC = new Date(
      Date.UTC(1899, 11, 30) + value * 24 * 60 * 60 * 1000
    );
    const date = new Date(
      dateUTC.getUTCFullYear(),
      dateUTC.getUTCMonth(),
      dateUTC.getUTCDate()
    );
    if (isNaN(date.getTime())) return null;
    return formatDateToISO(date);
  }

  // 2. Handle string Thai dates
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const thaiMonths: Record<string, number> = {
      มค: 0,
      "ม.ค.": 0,
      มกราคม: 0,
      กพ: 1,
      "ก.พ.": 1,
      กุมภาพันธ์: 1,
      มีค: 2,
      "มี.ค.": 2,
      มีนาคม: 2,
      เมย: 3,
      "เม.ย.": 3,
      เมษายน: 3,
      พค: 4,
      "พ.ค.": 4,
      พฤษภาคม: 4,
      มิย: 5,
      "มิ.ย.": 5,
      มิถุนายน: 5,
      กค: 6,
      "ก.ค.": 6,
      กรกฎาคม: 6,
      สค: 7,
      "ส.ค.": 7,
      สิงหาคม: 7,
      กย: 8,
      "ก.ย.": 8,
      กันยายน: 8,
      ตค: 9,
      "ต.ค.": 9,
      ตุลาคม: 9,
      พย: 10,
      "พ.ย.": 10,
      พฤศจิกายน: 10,
      ธค: 11,
      "ธ.ค.": 11,
      ธันวาคม: 11,
    };

    // Thai date regex: "1 กค 65"
    const thaiDateRegex = /^(\d{1,2})\s+([ก-๙\.]+)\s+(\d{2,4})$/;
    const match = trimmed.match(thaiDateRegex);

    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2];
      let year = parseInt(match[3], 10);

      const month = thaiMonths[monthStr];
      if (month === undefined) return null;

      // Handle 2-digit Buddhist year
      if (year < 100) year += 2500;

      // Convert Buddhist year to Gregorian
      if (year > 2400) year -= 543;

      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) return null;
      return formatDateToISO(date);
    }

    // 3. Standard date patterns
    const standardPatterns = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    ];

    for (const pattern of standardPatterns) {
      const stdMatch = trimmed.match(pattern);
      if (stdMatch) {
        const [, p1, p2, p3] = stdMatch;
        let day: number, month: number, year: number;

        if (parseInt(p1) > 31) {
          year = parseInt(p1);
          month = parseInt(p2) - 1;
          day = parseInt(p3);
        } else {
          day = parseInt(p1);
          month = parseInt(p2) - 1;
          year = parseInt(p3);
        }

        if (year > 2400) year -= 543;

        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) return null;
        return formatDateToISO(date);
      }
    }
  }

  return null;
}

/**
 * Normalizes Thai prefixes and splits into firstName and lastName
 *
 * Thai titles: นาย, นาง, นางสาว, ว่าที่ร้อยตรี, ว่าที่ร.ต., ว่าที่ร.ต.หญิง
 */
function normalizeThaiName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const thaiPrefixes = [
    "ว่าที่ร.ต.หญิง",
    "ว่าที่ร้อยตรี",
    "ว่าที่ร.ต.",
    "นางสาว",
    "นาง",
    "นาย",
  ];

  let cleaned = fullName.trim();

  // Remove Thai titles
  for (const prefix of thaiPrefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length).trim();
      break;
    }
  }

  // Split into first and last name
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }

  return {
    firstName: cleaned || "Unknown",
    lastName: "",
  };
}

/**
 * Generate employee code: EMP-001, EMP-002, etc.
 */
function generateEmployeeCode(index: number): string {
  return `EMP-${String(index + 1).padStart(3, "0")}`;
}

/**
 * Format date object to ISO string (YYYY-MM-DD)
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Sleep for milliseconds (for retry delays)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get current timestamp for logging
 */
function getTimestamp(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read and parse Excel file
 */
async function readExcelFile(filePath: string): Promise<Record<string, unknown>[]> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`❌ File not found: ${absolutePath}`);
  }

  console.log(`\n📄 Reading Excel file: ${absolutePath}`);
  const workbook = XLSX.readFile(absolutePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    raw: true,
    defval: null,
  });

  console.log(`✅ Found ${rows.length} rows in sheet "${sheetName}"\n`);
  return rows;
}

/**
 * Transform Excel rows into Employee objects
 */
async function transformRows(rows: Record<string, unknown>[]): Promise<{
  employees: Employee[];
  stats: ImportStats;
}> {
  const employees: Employee[] = [];
  const stats: ImportStats = {
    totalRows: rows.length,
    validRows: 0,
    skippedRows: 0,
    batchesSent: 0,
    successCount: 0,
    failedCount: 0,
    errors: [],
  };

  console.log("🔄 Transforming data...");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = i + 2; // +1 for 0-index, +1 for header

    try {
      // Extract data from columns
      const rawFullName = row["ชื่อ-นามสกุล"] || row["ชื่อ - สกุล"];
      const positionName = row["ตำแหน่ง"];
      const departmentName = row["สังกัด/หน่วยงาน"] || row["สถานที่ปฏิบัติงาน"];
      const birthDateRaw = row["วันเดือนปีเกิด"] || row["วัน/เดือน/ปี เกิด"];
      const startDateRaw = row["วันที่เริ่มงาน"] || row["วันเริ่มงาน"];

      // Validate required fields
      if (!rawFullName || !positionName || !departmentName || !startDateRaw) {
        stats.skippedRows++;
        console.warn(
          `⚠️ [Row ${rowIndex}] Skipped: Missing required fields (Name, Position, Department, Start Date)`
        );
        stats.errors.push(`Row ${rowIndex}: Missing required fields`);
        continue;
      }

      // Parse dates
      const birthDate = parseThaiDate(birthDateRaw);
      const startDate = parseThaiDate(startDateRaw);

      if (!startDate) {
        stats.skippedRows++;
        console.warn(
          `⚠️ [Row ${rowIndex}] Skipped: Invalid start date "${startDateRaw}"`
        );
        stats.errors.push(`Row ${rowIndex}: Invalid start date`);
        continue;
      }

      // Normalize name
      const { firstName, lastName } = normalizeThaiName(asText(rawFullName));

      // Create employee object
      const employee: Employee = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        position: asText(positionName),
        department: asText(departmentName),
        salary: 0, // Default salary
        startDate,
        birthDate,
        employeeCode: generateEmployeeCode(i),
      };

      employees.push(employee);
      stats.validRows++;

      console.log(
        `✅ [Row ${rowIndex}] ${employee.firstName} ${employee.lastName}`
      );
    } catch (error) {
      stats.skippedRows++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [Row ${rowIndex}] Error: ${errorMsg}`);
      stats.errors.push(`Row ${rowIndex}: ${errorMsg}`);
    }
  }

  console.log(
    `\n📊 Transformation complete: ${stats.validRows} valid, ${stats.skippedRows} skipped\n`
  );
  return { employees, stats };
}

/**
 * Send batch of employees to API endpoint
 * Implements retry logic: 3 attempts with 1 second delay
 */
async function sendBatchToAPI(
  employees: Employee[],
  batchNumber: number,
  totalBatches: number,
  baseURL: string = "http://localhost:3000"
): Promise<{ success: boolean; imported: number; error?: string }> {
  const url = `${baseURL}/api/employees/batch`;
  const maxRetries = 3;
  let lastError: string = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();

      console.log(
        `[${batchNumber}/${totalBatches}] Sending batch (${employees.length} records)...`
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employees }),
      });

      const duration = Date.now() - startTime;
      const data: BatchResponse = await response.json();

      if (!response.ok) {
        lastError = `HTTP ${response.status}: ${data.message || "Unknown error"}`;
        throw new Error(lastError);
      }

      if (data.success) {
        console.log(
          `✅ Success (${employees.length} records, ${duration}ms)\n`
        );
        return { success: true, imported: employees.length };
      } else {
        lastError = data.message || "Unknown error";
        throw new Error(lastError);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (attempt < maxRetries) {
        console.warn(
          `❌ Failed → retrying (${attempt}/${maxRetries - 1})...\n`
        );
        await sleep(1000); // 1 second delay before retry
      } else {
        console.error(
          `❌ Failed after ${maxRetries} attempts: ${lastError}\n`
        );
        return {
          success: false,
          imported: 0,
          error: lastError,
        };
      }
    }
  }

  return {
    success: false,
    imported: 0,
    error: lastError,
  };
}

/**
 * Split employees into batches of 50
 */
function createBatches(
  employees: Employee[],
  batchSize: number = 50
): Employee[][] {
  const batches: Employee[][] = [];
  for (let i = 0; i < employees.length; i += batchSize) {
    batches.push(employees.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Save cleaned data to JSON file (optional)
 */
async function saveCleanedData(
  employees: Employee[],
  outputPath: string = "cleaned-data.json"
): Promise<void> {
  const filePath = path.resolve(outputPath);
  fs.writeFileSync(filePath, JSON.stringify(employees, null, 2));
  console.log(`💾 Cleaned data saved to: ${filePath}\n`);
}

/**
 * Print final summary
 */
function printSummary(stats: ImportStats): void {
  console.log("\n" + "=".repeat(50));
  console.log("📈 IMPORT SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total rows: ${stats.totalRows}`);
  console.log(`Valid rows: ${stats.validRows}`);
  console.log(`Skipped rows: ${stats.skippedRows}`);
  console.log(`Batches sent: ${stats.batchesSent}`);
  console.log(`Success: ${stats.successCount}`);
  console.log(`Failed: ${stats.failedCount}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️ Errors (${stats.errors.length}):`);
    stats.errors.slice(0, 5).forEach((err) => console.log(`   - ${err}`));
    if (stats.errors.length > 5) {
      console.log(`   ... and ${stats.errors.length - 5} more`);
    }
  }

  console.log("=".repeat(50));
  console.log(`\n✨ Import completed at ${getTimestamp()}\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  try {
    const filePath = process.argv[2];

    if (!filePath) {
      console.log(`
❌ Usage: npx tsx scripts/import-excel-to-api.ts <file.xlsx> [baseURL]

Examples:
  npx tsx scripts/import-excel-to-api.ts ./data.xlsx
  npx tsx scripts/import-excel-to-api.ts ./employees.xlsx http://localhost:3000

Features:
  ✅ Reads Thai employee data from Excel
  ✅ Cleans and transforms data
  ✅ Sends to API in batches of 50
  ✅ Retries failed batches up to 3 times
  ✅ Logs progress and errors
  ✅ Saves cleaned data to JSON

      `);
      process.exit(1);
    }

    const baseURL = process.argv[3] || "http://localhost:3000";
    console.log(`🚀 Starting import process at ${getTimestamp()}`);
    console.log(`📍 API Endpoint: ${baseURL}/api/employees/batch\n`);

    // Step 1: Read Excel file
    const rows = await readExcelFile(filePath);

    // Step 2: Transform rows
    const { employees, stats } = await transformRows(rows);

    if (employees.length === 0) {
      console.error("❌ No valid employees found. Exiting.");
      process.exit(1);
    }

    // Step 3: Save cleaned data
    await saveCleanedData(employees);

    // Step 4: Create batches
    const batches = createBatches(employees, 50);
    console.log(`📦 Created ${batches.length} batches (50 employees per batch)\n`);

    // Step 5: Send batches to API
    let totalImported = 0;
    for (let i = 0; i < batches.length; i++) {
      const result = await sendBatchToAPI(
        batches[i],
        i + 1,
        batches.length,
        baseURL
      );

      if (result.success) {
        stats.successCount += result.imported;
        stats.batchesSent++;
      } else {
        stats.failedCount += batches[i].length;
        if (result.error) {
          stats.errors.push(`Batch ${i + 1}: ${result.error}`);
        }
      }

      totalImported += result.imported;
    }

    stats.successCount = totalImported;
    stats.failedCount = employees.length - totalImported;

    // Step 6: Print summary
    printSummary(stats);

    // Exit with appropriate code
    process.exit(stats.failedCount > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
