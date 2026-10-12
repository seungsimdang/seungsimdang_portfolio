import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/require-admin";

export default async function AdminDashboardPage() {
  await requireAdminPage();
  redirect("/admin/projects");
}
