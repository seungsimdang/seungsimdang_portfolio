import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TalkForm } from "@/components/admin/talk-form";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { listTechTalks } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "발표 편집 - admin" },
};

interface EditTalkPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function AdminEditTalkPage({
  params,
  searchParams,
}: EditTalkPageProps) {
  await requireAdminPage();
  const [{ slug }, { saved }] = await Promise.all([params, searchParams]);
  const talk = (await listTechTalks(true)).find((item) => item.slug === slug);
  if (!talk) notFound();
  return (
    <>
      <AdminPageHeader title="발표 편집" />
      <TalkForm talk={talk} initialSaved={saved === "1"} />
    </>
  );
}
