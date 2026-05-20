/**
 * Generate Sample Excel Template for HR Import
 * 
 * Usage:
 *   npx tsx scripts/generate-excel-template.ts
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

function generateSampleExcel() {
  // Sample data with Thai names
  const sampleData = [
    {
      "ชื่อ-นามสกุล": "สมชาย ศรีสุข",
      "หน่วยงาน": "วิศวกรรม",
      "ตำแหน่ง": "วิศวกร",
      "เลขที่ใบสั่งจ้าง": "ส-2021-001",
      "ตำแหน่งเลขที่": "POS-001",
      "วันที่เริ่มงาน": "15/01/2021",
      "วันเกิด": "20/03/1980",
      "เงินเดือน": 150000,
      "สถานะ": "ปฏิบัติงาน",
    },
    {
      "ชื่อ-นามสกุล": "นวพรรค วิทยากร",
      "หน่วยงาน": "วิศวกรรม",
      "ตำแหน่ง": "โปรแกรมเมอร์",
      "เลขที่ใบสั่งจ้าง": "ส-2021-002",
      "ตำแหน่งเลขที่": "POS-002",
      "วันที่เริ่มงาน": "01/06/2021",
      "วันเกิด": "15/07/1985",
      "เงินเดือน": 120000,
      "สถานะ": "ปฏิบัติงาน",
    },
    {
      "ชื่อ-นามสกุล": "ธนัชชา เรืองศรี",
      "หน่วยงาน": "บุคคลทั่วไป",
      "ตำแหน่ง": "ผู้จัดการ",
      "เลขที่ใบสั่งจ้าง": "ส-2021-003",
      "ตำแหน่งเลขที่": "POS-003",
      "วันที่เริ่มงาน": "20/03/2021",
      "วันเกิด": "08/11/1985",
      "เงินเดือน": 180000,
      "สถานะ": "ปฏิบัติงาน",
    },
  ];

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

  // Set column widths
  worksheet["!cols"] = [
    { wch: 20 }, // ชื่อ-นามสกุล
    { wch: 15 }, // หน่วยงาน
    { wch: 15 }, // ตำแหน่ง
    { wch: 18 }, // เลขที่ใบสั่งจ้าง
    { wch: 15 }, // ตำแหน่งเลขที่
    { wch: 15 }, // วันที่เริ่มงาน
    { wch: 15 }, // วันเกิด
    { wch: 12 }, // เงินเดือน
    { wch: 12 }, // สถานะ
  ];

  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Write file
  const filePath = path.join(dataDir, "employees-template.xlsx");
  XLSX.writeFile(workbook, filePath);

  console.log(`✅ Sample Excel template created: ${filePath}`);
  console.log(`📋 Contains ${sampleData.length} sample employees`);
  console.log("\n💡 Use this template as reference for your own data.");
}

try {
  generateSampleExcel();
} catch (error) {
  console.error("❌ Error generating template:", error);
  process.exit(1);
}
