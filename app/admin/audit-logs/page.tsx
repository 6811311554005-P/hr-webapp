import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { AuditLogClient } from "@/src/components/admin/AuditLogClient";

export const metadata = {
  title: "Audit Logs | HR Management System",
  description: "Administrative audit trail for HR system activity.",
};

export default async function AuditLogsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string } | undefined)?.role;
  if (userRole !== "admin") {
    redirect("/");
  }

  return <AuditLogClient />;
}
