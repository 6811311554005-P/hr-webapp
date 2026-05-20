import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { DashboardClient } from "@/src/components/dashboard";

export const metadata = {
  title: "แดชบอร์ดบุคลากร",
  description: "สรุปข้อมูลบุคลากร จำนวนพนักงาน และข้อมูลล่าสุด",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string } | undefined)?.role;
  if (userRole !== "admin") {
    redirect("/");
  }

  return (
    <main className="w-full">
      <DashboardClient />
    </main>
  );
}
