import type { Metadata } from "next";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProfileForm } from "@/components/admin/profile-form";
import { RESUME_ADMIN_SECTIONS } from "@/components/admin/resume-labels";
import { SortableList } from "@/components/admin/sortable-list";
import { requireAdminPage } from "@/lib/auth/require-admin";
import {
  getProfile,
  getResumeByKind,
} from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "about - admin" },
};

export default async function AdminAboutPage() {
  await requireAdminPage();
  const [resume, profile] = await Promise.all([
    getResumeByKind(),
    getProfile(true),
  ]);
  return (
    <>
      <AdminPageHeader title="about" />
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
                href={`/admin/about/resume/new?kind=${kind}`}
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
        <section className="space-y-16">
          <h2 className="text-body">스킬과 툴</h2>
          <ProfileForm profile={profile} section="about" />
        </section>
      </div>
    </>
  );
}
