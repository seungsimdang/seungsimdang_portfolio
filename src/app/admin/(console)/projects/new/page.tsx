import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProjectForm } from "@/components/admin/project-form";
import { requireAdminPage } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: { absolute: "새 프로젝트 - admin" },
};

export default async function AdminNewProjectPage() {
  await requireAdminPage();
  return (
    <>
      <AdminPageHeader title="새 프로젝트" />
      <ProjectForm />
    </>
  );
}
