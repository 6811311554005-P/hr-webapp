import * as XLSX from 'xlsx';
import path from 'path';

const filePath = path.join(process.cwd(), 'data-employees.xlsx');
try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log("Headers:");
  console.log(data[0]);
  
  console.log("\nSample Row 1:");
  console.log(data[1]);
  
  console.log("\nSample Row 2:");
  console.log(data[2]);
  
  console.log("\nRow Count:", data.length);
} catch (e) {
  console.error("Error reading file:", e);
}
