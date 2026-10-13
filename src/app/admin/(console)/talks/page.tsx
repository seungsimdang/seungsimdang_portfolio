import type { Metadata } from "next";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SortableList } from "@/components/admin/sortable-list";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { listTechTalks } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "발표 - admin" },
};

interface TalksPageProps {
  searchParams: Promise<{ deleted?: string }>;
}

export default async function AdminTalksPage({ searchParams }: TalksPageProps) {
  await requireAdminPage();
  const [{ deleted }, talks] = await Promise.all([
    searchParams,
    listTechTalks(),
  ]);
  return (
    <>
      <AdminPageHeader title="발표">
        <AdminButton href="/admin/talks/new" variant="primary">
          새 발표
        </AdminButton>
      </AdminPageHeader>
      <SortableList
        kind="talks"
        initialMessage={deleted ? "삭제했습니다." : ""}
        items={talks.map((talk) => ({
          slug: talk.slug,
          title: talk.title,
          meta: `${talk.date} · ${talk.venue}`,
        }))}
      />
    </>
  );
}
