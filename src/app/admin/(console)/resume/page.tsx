import type { Metadata } from "next";
import Link from "next/link";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RESUME_ADMIN_SECTIONS } from "@/components/admin/resume-labels";
import { SortableList } from "@/components/admin/sortable-list";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { getResumeByKind } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "resume - admin" },
};

export default async function AdminResumePage() {
  await requireAdminPage();
  const resume = await getResumeByKind();
  return (
    <>
      <AdminPageHeader title="resume" />
      <p className="text-small opacity-70">
        스킬과 툴은{" "}
        <Link href="/admin/profile" className="underline">
          profile
        </Link>
        에서 편집합니다.
      </p>
      <div className="space-y-48">
        {RESUME_ADMIN_SECTIONS.map(({ kind, noun }) => (
          <section key={kind} className="space-y-16">
            <div className="flex flex-wrap items-center justify-between gap-12">
              <h2
                id={`resume-${kind}-heading`}
                tabIndex={-1}
                className="text-body"
              >
                {noun}
              </h2>
              <AdminButton
                href={`/admin/resume/new?kind=${kind}`}
                variant="primary"
              >
                {noun} 추가
              </AdminButton>
            </div>
            <SortableList
              kind="resume"
              resumeKind={kind}
              noun={noun}
              headingId={`resume-${kind}-heading`}
              items={resume[kind].map((entry) => ({
                id: entry.id,
                title: entry.title,
                meta: [entry.period, entry.subtitle]
                  .filter(Boolean)
                  .join(" · "),
              }))}
            />
          </section>
        ))}
      </div>
    </>
  );
}
