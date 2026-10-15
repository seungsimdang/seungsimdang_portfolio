import type { Metadata } from "next";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SortableList } from "@/components/admin/sortable-list";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { listTechTalks } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "talks - admin" },
};

export default async function AdminTalksPage() {
  await requireAdminPage();
  const talks = await listTechTalks();
  return (
    <>
      <AdminPageHeader title="talks">
        <AdminButton href="/admin/talks/new" variant="primary">
          새 발표
        </AdminButton>
      </AdminPageHeader>
      <SortableList
        kind="talks"
        items={talks.map((talk) => ({
          id: talk.slug,
          title: talk.title,
          meta: `${talk.date} · ${talk.venue}`,
        }))}
      />
    </>
  );
}
