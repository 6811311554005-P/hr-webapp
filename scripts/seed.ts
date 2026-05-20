/**
 * Database seed script for HR system
 * Creates departments, positions, users, and 10 sample employees with Thai names
 * Run with: npm run db:seed
 */

import { hash } from "bcryptjs";
import { prisma } from "@/src/lib/prisma";

// ─── Departments ────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { code: "DEPT-001", name: "บุคคลทั่วไป", description: "Department of General Human Resources" },
  { code: "DEPT-002", name: "วิศวกรรม", description: "Engineering and Technical Department" },
  { code: "DEPT-003", name: "การเงิน", description: "Finance and Accounting Department" },
  { code: "DEPT-004", name: "การขาย", description: "Sales and Business Development" },
  { code: "DEPT-005", name: "ปฏิบัติการ", description: "Operations and Administration" },
] as const;

// ─── Positions ──────────────────────────────────────────────────────────────
const POSITIONS = [
  { code: "POS-001", name: "ผู้จัดการ", level: "Senior", departmentName: "บุคคลทั่วไป" },
  { code: "POS-002", name: "วิศวกร", level: "Senior", departmentName: "วิศวกรรม" },
  { code: "POS-003", name: "วิศวกรระดับกลาง", level: "Mid", departmentName: "วิศวกรรม" },
  { code: "POS-004", name: "โปรแกรมเมอร์", level: "Junior", departmentName: "วิศวกรรม" },
  { code: "POS-005", name: "นักวิเคราะห์การเงิน", level: "Mid", departmentName: "การเงิน" },
  { code: "POS-006", name: "หัวหน้าฝ่ายขาย", level: "Senior", departmentName: "การขาย" },
  { code: "POS-007", name: "พนักงานขาย", level: "Junior", departmentName: "การขาย" },
  { code: "POS-008", name: "เจ้าหน้าที่ปฏิบัติการ", level: "Junior", departmentName: "ปฏิบัติการ" },
] as const;

// ─── Admin Users ────────────────────────────────────────────────────────────
const USERS = [
  { email: "admin@hr.local", password: "admin@123456", role: "admin" },
  { email: "manager@hr.local", password: "manager@123456", role: "admin" },
] as const;

// ─── Sample Employees with Thai Names ────────────────────────────────────────
const SAMPLE_EMPLOYEES = [
  {
    firstName: "สมชาย",
    lastName: "ศรีสุข",
    employeeCode: "EMP-001",
    contractNumber: "ส-2021-001",
    positionNumber: "POS-001",
    departmentName: "บุคคลทั่วไป",
    positionName: "ผู้จัดการ",
    salary: 150000,
    hireDate: new Date("2021-01-15"),
    birthDate: new Date("1980-03-20"),
    status: "ACTIVE",
  },
  {
    firstName: "นวพรรค",
    lastName: "วิทยากร",
    employeeCode: "EMP-002",
    contractNumber: "ส-2020-002",
    positionNumber: "POS-002",
    departmentName: "วิศวกรรม",
    positionName: "วิศวกร",
    salary: 120000,
    hireDate: new Date("2020-05-10"),
    birthDate: new Date("1982-07-15"),
    status: "ACTIVE",
  },
  {
    firstName: "ธนัชชา",
    lastName: "เรืองศรี",
    employeeCode: "EMP-003",
    contractNumber: "ส-2021-003",
    positionNumber: "POS-003",
    departmentName: "วิศวกรรม",
    positionName: "วิศวกรระดับกลาง",
    salary: 95000,
    hireDate: new Date("2021-03-20"),
    birthDate: new Date("1985-11-08"),
    status: "ACTIVE",
  },
  {
    firstName: "วิชญา",
    lastName: "สุขมาก",
    employeeCode: "EMP-004",
    contractNumber: "ส-2022-004",
    positionNumber: "POS-004",
    departmentName: "วิศวกรรม",
    positionName: "โปรแกรมเมอร์",
    salary: 70000,
    hireDate: new Date("2022-06-15"),
    birthDate: new Date("1995-02-25"),
    status: "ACTIVE",
  },
  {
    firstName: "วรรณี",
    lastName: "แสงอุไร",
    employeeCode: "EMP-005",
    contractNumber: "ส-2021-005",
    positionNumber: "POS-005",
    departmentName: "การเงิน",
    positionName: "นักวิเคราะห์การเงิน",
    salary: 85000,
    hireDate: new Date("2021-09-01"),
    birthDate: new Date("1988-05-12"),
    status: "ACTIVE",
  },
  {
    firstName: "สุรชัย",
    lastName: "ชัยชนะ",
    employeeCode: "EMP-006",
    contractNumber: "ส-2020-006",
    positionNumber: "POS-006",
    departmentName: "การขาย",
    positionName: "หัวหน้าฝ่ายขาย",
    salary: 130000,
    hireDate: new Date("2020-02-20"),
    birthDate: new Date("1981-08-30"),
    status: "ACTIVE",
  },
  {
    firstName: "ศิริวรรณ",
    lastName: "ศรีวัฒน์",
    employeeCode: "EMP-007",
    contractNumber: "ส-2022-007",
    positionNumber: "POS-007",
    departmentName: "การขาย",
    positionName: "พนักงานขาย",
    salary: 60000,
    hireDate: new Date("2022-04-10"),
    birthDate: new Date("1994-12-05"),
    status: "ACTIVE",
  },
  {
    firstName: "อนันต์",
    lastName: "ทองค้อ",
    employeeCode: "EMP-008",
    contractNumber: "ส-2022-008",
    positionNumber: "POS-008",
    departmentName: "ปฏิบัติการ",
    positionName: "เจ้าหน้าที่ปฏิบัติการ",
    salary: 50000,
    hireDate: new Date("2022-08-15"),
    birthDate: new Date("1996-06-18"),
    status: "ACTIVE",
  },
  {
    firstName: "ปรียา",
    lastName: "ศรีประภา",
    employeeCode: "EMP-009",
    contractNumber: "ส-2021-009",
    positionNumber: "POS-009",
    departmentName: "วิศวกรรม",
    positionName: "โปรแกรมเมอร์",
    salary: 72000,
    hireDate: new Date("2021-11-05"),
    birthDate: new Date("1993-09-22"),
    status: "ACTIVE",
  },
  {
    firstName: "กิตติ",
    lastName: "ไกรยิ่ม",
    employeeCode: "EMP-010",
    contractNumber: "ส-2023-010",
    positionNumber: "POS-010",
    departmentName: "วิศวกรรม",
    positionName: "วิศวกรระดับกลาง",
    salary: 98000,
    hireDate: new Date("2023-01-20"),
    birthDate: new Date("1986-04-10"),
    status: "ACTIVE",
  },
] as const;

async function main() {
  try {
    console.log("\n🌱 Starting HR System Database Seed...\n");

    // ─── Clear existing data (optional, remove in production) ─────────────
    console.log("🗑️  Clearing existing data...");
    await prisma.employee.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.user.deleteMany({});
    console.log("✅ Data cleared\n");

    // ─── Create Departments ─────────────────────────────────────────────────
    console.log("📁 Creating Departments...");
    const departmentMap = new Map();

    for (const dept of DEPARTMENTS) {
      const created = await prisma.department.create({
        data: {
          code: dept.code,
          name: dept.name,
          description: dept.description,
          isActive: true,
        },
      });
      departmentMap.set(dept.name, created);
      console.log(`  ✅ [${dept.code}] ${dept.name}`);
    }

    // ─── Create Positions ───────────────────────────────────────────────────
    console.log("\n💼 Creating Positions...");
    const positionMap = new Map();

    for (const pos of POSITIONS) {
      const dept = departmentMap.get(pos.departmentName);
      if (!dept) {
        console.log(`  ⚠️  Department not found for position ${pos.name}`);
        continue;
      }

      const created = await prisma.position.create({
        data: {
          code: pos.code,
          name: pos.name,
          level: pos.level,
          departmentId: dept.id,
          isActive: true,
        },
      });
      positionMap.set(pos.name, created);
      console.log(`  ✅ [${pos.code}] ${pos.name} - ${pos.level} (${dept.name})`);
    }

    // ─── Create Admin Users ──────────────────────────────────────────────────
    console.log("\n👤 Creating Admin Users...");

    for (const user of USERS) {
      const hashedPassword = await hash(user.password, 12);
      await prisma.user.create({
        data: {
          email: user.email,
          passwordHash: hashedPassword,
          role: user.role,
          isActive: true,
        },
      });
      console.log(`  ✅ ${user.email} (Role: ${user.role})`);
    }

    // ─── Create Sample Employees ────────────────────────────────────────────
    console.log("\n👥 Creating Sample Employees (10)...");
    for (const emp of SAMPLE_EMPLOYEES) {
      const dept = departmentMap.get(emp.departmentName);
      const pos = positionMap.get(emp.positionName);

      if (!dept || !pos) {
        console.log(
          `  ⚠️  Skipping ${emp.firstName} ${emp.lastName} - Missing department or position`
        );
        continue;
      }

      await prisma.employee.create({
        data: {
          employeeCode: emp.employeeCode,
          firstName: emp.firstName,
          lastName: emp.lastName,
          contractNumber: emp.contractNumber,
          positionNumber: emp.positionNumber,
          departmentId: dept.id,
          positionId: pos.id,
          salary: emp.salary,
          hireDate: emp.hireDate,
          birthDate: emp.birthDate,
          status: "ACTIVE",
        },
      });

      console.log(
        `  ✅ [${emp.employeeCode}] ${emp.firstName} ${emp.lastName} - ${pos.name}`
      );
    }

    // ─── Display Summary ─────────────────────────────────────────────────────
    const stats = await Promise.all([
      prisma.department.count(),
      prisma.position.count(),
      prisma.user.count(),
      prisma.employee.count(),
    ]);
                            
    console.log("\n📊 ═══════════════════════════════════════════════════════");
    console.log("📊 Seed Summary:");
    console.log(`📊   • Departments:  ${stats[0]}`);
    console.log(`📊   • Positions:    ${stats[1]}`);
    console.log(`📊   • Admin Users:  ${stats[2]}`);
    console.log(`📊   • Employees:    ${stats[3]}`);
    console.log("📊 ═══════════════════════════════════════════════════════\n");

    console.log("✅ Database seeding completed successfully!\n");
    console.log("🔐 Default Admin Credentials:");
    console.log("   Email:    admin@hr.local");
    console.log("   Password: admin@123456\n");
    console.log("   Email:    manager@hr.local");
    console.log("   Password: manager@123456\n");
  } catch (error) {
    console.error("\n❌ Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

