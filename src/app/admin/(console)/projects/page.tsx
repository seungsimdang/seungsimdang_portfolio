import type { Metadata } from "next";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SortableList } from "@/components/admin/sortable-list";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { listProjects } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "프로젝트 - admin" },
};

interface ProjectsPageProps {
  searchParams: Promise<{ deleted?: string }>;
}

export default async function AdminProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  await requireAdminPage();
  const [{ deleted }, projects] = await Promise.all([
    searchParams,
    listProjects(),
  ]);
  return (
    <>
      <AdminPageHeader title="프로젝트">
        <AdminButton href="/admin/projects/new" variant="primary">
          새 프로젝트
        </AdminButton>
      </AdminPageHeader>
      <SortableList
        kind="projects"
        initialMessage={deleted ? "삭제했습니다." : ""}
        items={projects.map((project) => ({
          slug: project.slug,
          title: project.title,
          meta: project.period,
          experienceCount: project.experiences.length,
        }))}
      />
    </>
  );
}
