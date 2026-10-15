import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ResumeEntryForm } from "@/components/admin/resume-entry-form";
import { RESUME_KINDS } from "@/constants/resume";
import { requireAdminPage } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: { absolute: "새 이력 - admin" },
};

interface NewResumePageProps {
  searchParams: Promise<{ kind?: string }>;
}

export default async function AdminNewResumePage({
  searchParams,
}: NewResumePageProps) {
  await requireAdminPage();
  const { kind } = await searchParams;
  const resumeKind = RESUME_KINDS.find((item) => item === kind);
  if (!resumeKind) notFound();
  return (
    <>
      <AdminPageHeader title="새 이력" />
      <ResumeEntryForm kind={resumeKind} />
    </>
  );
}
