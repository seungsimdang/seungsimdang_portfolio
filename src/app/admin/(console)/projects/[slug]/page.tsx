import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProjectForm } from "@/components/admin/project-form";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { getProjectBySlug } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "프로젝트 편집 - admin" },
};

interface EditProjectPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function AdminEditProjectPage({
  params,
  searchParams,
}: EditProjectPageProps) {
  await requireAdminPage();
  const [{ slug }, { saved }] = await Promise.all([params, searchParams]);
  const project = await getProjectBySlug(slug, true);
  if (!project) notFound();
  return (
    <>
      <AdminPageHeader title="프로젝트 편집" />
      <ProjectForm project={project} initialSaved={saved === "1"} />
    </>
  );
}
