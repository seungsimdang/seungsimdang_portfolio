"use client";

import { AdminButton } from "@/components/admin/admin-button";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="space-y-24">
      <h1 className="text-h3">불러오지 못했습니다</h1>
      <p className="text-body opacity-70">
        데이터를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도하세요.
      </p>
      <AdminButton onClick={reset}>다시 시도</AdminButton>
    </div>
  );
}
