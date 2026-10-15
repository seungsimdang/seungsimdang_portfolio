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
}

export default async function AdminEditTalkPage({ params }: EditTalkPageProps) {
  await requireAdminPage();
  const { slug } = await params;
  const talk = (await listTechTalks(true)).find((item) => item.slug === slug);
  if (!talk) notFound();
  return (
    <>
      <AdminPageHeader title="발표 편집" />
      <TalkForm talk={talk} />
    </>
  );
}
