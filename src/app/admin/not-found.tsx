import { AdminButton } from "@/components/admin/admin-button";

export default function AdminRootNotFound() {
  return (
    <main className="container-padding mx-auto w-full max-w-content py-96">
      <div className="space-y-24">
        <h1 className="text-h3">페이지를 찾을 수 없습니다</h1>
        <AdminButton href="/admin/projects">프로젝트 목록</AdminButton>
      </div>
    </main>
  );
}
