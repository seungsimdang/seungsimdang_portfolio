import { AdminConsoleShell } from "@/components/admin/admin-console-shell";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { getProfile } from "@/services/portfolio/portfolio-service";

export default async function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdminPage();
  const profile = await getProfile().catch(() => null);

  return (
    <AdminConsoleShell name={profile?.name || "admin"}>
      {children}
    </AdminConsoleShell>
  );
}
