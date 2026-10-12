import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/require-admin";
import {
  getProfile,
  listProjects,
  listTechTalks,
  PortfolioNotSeededError,
} from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "대시보드 - admin" },
};

const cardClassName = "space-y-16 rounded-lg border border-white/25 p-24";

function profileMessage(reason: unknown) {
  return reason instanceof PortfolioNotSeededError
    ? "프로필이 없습니다. seed를 먼저 실행하세요."
    : "프로필을 불러오지 못했습니다.";
}

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const [profile, projects, talks] = await Promise.allSettled([
    getProfile(),
    listProjects(),
    listTechTalks(),
  ]);

  return (
    <>
      <AdminPageHeader title="대시보드" />
      <div className="grid grid-cols-1 gap-24 md:grid-cols-3">
        <section className={cardClassName}>
          <h2 className="text-body">프로필</h2>
          {profile.status === "fulfilled" ? (
            <>
              <p className="text-small opacity-70">
                {profile.value.name} · {profile.value.title}
              </p>
              <Button href="/admin/profile" variant="secondary">
                편집
              </Button>
            </>
          ) : (
            <p role="alert" className="text-small">
              오류: {profileMessage(profile.reason)}
            </p>
          )}
        </section>
        <section className={cardClassName}>
          <h2 className="text-body">프로젝트</h2>
          {projects.status === "fulfilled" ? (
            <p className="text-small opacity-70">{projects.value.length}개</p>
          ) : (
            <p role="alert" className="text-small">
              오류: 프로젝트를 불러오지 못했습니다.
            </p>
          )}
          <div className="flex flex-wrap gap-8">
            <Button href="/admin/projects" variant="secondary">
              목록 보기
            </Button>
            <Button href="/admin/projects/new" variant="secondary">
              새 프로젝트
            </Button>
          </div>
        </section>
        <section className={cardClassName}>
          <h2 className="text-body">발표</h2>
          {talks.status === "fulfilled" ? (
            <p className="text-small opacity-70">{talks.value.length}개</p>
          ) : (
            <p role="alert" className="text-small">
              오류: 발표를 불러오지 못했습니다.
            </p>
          )}
          <div className="flex flex-wrap gap-8">
            <Button href="/admin/talks" variant="secondary">
              목록 보기
            </Button>
            <Button href="/admin/talks/new" variant="secondary">
              새 발표
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
