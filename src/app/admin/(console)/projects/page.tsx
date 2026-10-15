import type { Metadata } from "next";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SortableList } from "@/components/admin/sortable-list";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { listProjects } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "projects - admin" },
};

export default async function AdminProjectsPage() {
  await requireAdminPage();
  const projects = await listProjects();
  return (
    <>
      <AdminPageHeader title="projects">
        <AdminButton href="/admin/projects/new" variant="primary">
          새 프로젝트
        </AdminButton>
      </AdminPageHeader>
      <SortableList
        kind="projects"
        items={projects.map((project) => ({
          id: project.slug,
          title: project.title,
          meta: project.period,
          experienceCount: project.experiences.length,
        }))}
      />
    </>
  );
}
