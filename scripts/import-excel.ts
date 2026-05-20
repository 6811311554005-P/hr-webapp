import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const asText = (value: unknown): string => {
  return value === null || value === undefined ? "" : String(value).trim();
};

/**
 * Parses Thai date formats, Excel numeric dates, and standard date strings.
 */
export function parseThaiDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  // 1. Handle Excel numeric date
  if (typeof value === "number") {
    // Excel epoch is effectively Dec 30, 1899 due to the 1900 leap year bug
    const dateUTC = new Date(Date.UTC(1899, 11, 30) + value * 24 * 60 * 60 * 1000);
    const date = new Date(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate());
    return isNaN(date.getTime()) ? null : date;
  }

  // 2. Handle strings (Thai or Standard)
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const thaiMonths: Record<string, number> = {
      "มค": 0, "ม.ค.": 0, "มกราคม": 0,
      "กพ": 1, "ก.พ.": 1, "กุมภาพันธ์": 1,
      "มีค": 2, "มี.ค.": 2, "มีนาคม": 2,
      "เมย": 3, "เม.ย.": 3, "เมษายน": 3,
      "พค": 4, "พ.ค.": 4, "พฤษภาคม": 4,
      "มิย": 5, "มิ.ย.": 5, "มิถุนายน": 5,
      "กค": 6, "ก.ค.": 6, "กรกฎาคม": 6,
      "สค": 7, "ส.ค.": 7, "สิงหาคม": 7,
      "กย": 8, "ก.ย.": 8, "กันยายน": 8,
      "ตค": 9, "ต.ค.": 9, "ตุลาคม": 9,
      "พย": 10, "พ.ย.": 10, "พฤศจิกายน": 10,
      "ธค": 11, "ธ.ค.": 11, "ธันวาคม": 11,
    };

    const thaiDateRegex = /^(\d{1,2})\s+([ก-๙\.]+)\s+(\d{2,4})$/;
    const match = trimmed.match(thaiDateRegex);

    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2];
      let year = parseInt(match[3], 10);

      const month = thaiMonths[monthStr];
      if (month === undefined) return null;

      // Handle 2-digit Buddhist year (e.g., 65 -> 2565)
      if (year < 100) year += 2500;
      
      // Convert Buddhist year to Gregorian (e.g., 2565 - 543 = 2022)
      if (year > 2400) year -= 543;

      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    }

    // 3. Fallback for standard date patterns
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
        return isNaN(date.getTime()) ? null : date;
      }
    }
  }

  return null;
}

/**
 * Splits a full name string into first and last name.
 */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }
  return { firstName: fullName, lastName: "" };
}

/**
 * Main import function
 */
async function importExcelData(filePath: string) {
  try {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    console.log(`📄 Reading Excel file: ${absolutePath}`);
    const workbook = XLSX.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Use raw: true to prevent automatic string conversion of numeric dates
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      raw: true,
      defval: null
    });

    console.log(`✅ Found ${rows.length} rows in sheet "${sheetName}". Starting import...\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // +1 for 0-index, +1 for header row

      try {
        const rawFullName = row["ชื่อ - สกุล"];
        const positionName = row["ชื่อตำแหน่ง"];
        const departmentName = row["สถานที่ปฏิบัติงาน"];
        
        if (!rawFullName) {
          console.warn(`⚠️ [Row ${rowIndex}] Skipped: Missing Name`);
          skipCount++;
          continue;
        }

        const positionNameText = asText(positionName);
        const departmentNameText = asText(departmentName);
        const { firstName, lastName } = splitFullName(asText(rawFullName));
        const contractNumber = row["ใบสั่งจ้างเลขที่"] ? String(row["ใบสั่งจ้างเลขที่"]).trim() : undefined;
        const positionNumber = row["ตำแหน่งเลขที่"] ? String(row["ตำแหน่งเลขที่"]).trim() : undefined;

        // Parse dates safely
        const birthDate = parseThaiDate(row["วัน/เดือน/ปี"] || row["วัน/เดือน/ปี เกิด"]);
        const hireDate = parseThaiDate(row["วันเริ่มงาน"]);
        const resignationDate = parseThaiDate(row["วันที่ลาออก"]);



        // 1. Upsert Department (if provided)
        let department = null;
        if (departmentNameText) {
          department = await prisma.department.upsert({
            where: { name: departmentNameText },
            update: {},
            create: {
              name: departmentNameText,
              code: `DEPT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            },
          });
        }

        // 2. Upsert Position (if provided)
        let position = null;
        if (positionNameText) {
          position = await prisma.position.upsert({
            where: { name: positionNameText },
            update: department ? { departmentId: department.id } : {},
            create: {
              name: positionNameText,
              code: `POS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              departmentId: department ? department.id : undefined,
            },
          });
        }

        // Determine Status
        const status = resignationDate ? "RESIGNED" : "ACTIVE";

        // Generate employee code if not provided
        const employeeCode = `EMP-${String(i + 1).padStart(4, "0")}`;

        // 3. Upsert Employee
        await prisma.employee.upsert({
          where: { employeeCode },
          update: {
            firstName,
            lastName,
            contractNumber: contractNumber || null,
            positionNumber: positionNumber || null,
            departmentId: department ? department.id : null,
            positionId: position ? position.id : null,
            birthDate,
            hireDate: hireDate || null,
            status,
          },
          create: {
            employeeCode,
            firstName,
            lastName: lastName || null,
            contractNumber: contractNumber || null,
            positionNumber: positionNumber || null,
            departmentId: department ? department.id : null,
            positionId: position ? position.id : null,
            birthDate,
            hireDate: hireDate || null,
            status,
          },
        });

        console.log(`✅ [Row ${rowIndex}] Imported: ${firstName} ${lastName}`);
        successCount++;
      } catch (rowError) {
        console.error(`❌ [Row ${rowIndex}] Error importing record:`, rowError instanceof Error ? rowError.message : rowError);
        errorCount++;
      }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`  ✅ Successfully imported: ${successCount}`);
    console.log(`  ⚠️ Skipped records: ${skipCount}`);
    console.log(`  ❌ Errors: ${errorCount}\n`);

  } catch (error) {
    console.error("❌ Fatal error during import process:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if run directly via CLI
const argFilePath = process.argv[2];
if (argFilePath) {
  importExcelData(argFilePath);
} else {
  console.log("⚠️ Usage: Please provide a file path to the Excel file.");
  console.log("Example: npx tsx scripts/import-excel.ts ./data/employees.xlsx\n");
}
