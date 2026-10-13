import { AdminButton } from "@/components/admin/admin-button";

export default function AdminNotFound() {
  return (
    <div className="space-y-24">
      <h1 className="text-h3">항목을 찾을 수 없습니다</h1>
      <p className="text-body opacity-70">
        이미 삭제되었거나 주소가 올바르지 않습니다.
      </p>
      <AdminButton href="/admin/projects">프로젝트 목록</AdminButton>
    </div>
  );
}
