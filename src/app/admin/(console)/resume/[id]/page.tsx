import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ResumeEntryForm } from "@/components/admin/resume-entry-form";
import { RESUME_KINDS } from "@/constants/resume";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { getResumeByKind } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "이력 편집 - admin" },
};

interface EditResumePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function AdminEditResumePage({
  params,
  searchParams,
}: EditResumePageProps) {
  await requireAdminPage();
  const [{ id }, { saved }, resume] = await Promise.all([
    params,
    searchParams,
    getResumeByKind(),
  ]);
  const entry = RESUME_KINDS.flatMap((kind) => resume[kind]).find(
    (item) => item.id === id,
  );
  if (!entry) notFound();
  return (
    <>
      <AdminPageHeader title="이력 편집" />
      <ResumeEntryForm
        kind={entry.kind}
        entry={entry}
        initialSaved={saved === "1"}
      />
    </>
  );
}
