"use client";

import Link from "next/link";
import type { Notice } from "@/lib/admin-client/use-admin-form";
import { AdminButton } from "./admin-button";
import { SignOutButton } from "./sign-out-button";

// 저장 결과 알림, 성공은 role=status 오류는 role=alert로 읽힘
export function FormStatus({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  const success = notice.tone === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      className="flex flex-wrap items-center gap-12 rounded-md border border-white/25 p-12 text-small"
    >
      <span>
        {success ? "완료: " : "오류: "}
        {notice.message}
      </span>
      {notice.link && (
        <Link href={notice.link.href} className="underline underline-offset-4">
          {notice.link.label}
        </Link>
      )}
      {notice.signOut && <SignOutButton />}
    </div>
  );
}

interface FormActionBarProps {
  saving: boolean;
  cancelHref: string;
  // 편집 화면에서만 전달
  onDelete?: () => void;
  deleteLabel?: string;
}

// 긴 폼에서도 저장 버튼에 닿도록 하단에 고정되는 액션 바
export function FormActionBar({
  saving,
  cancelHref,
  onDelete,
  deleteLabel,
}: FormActionBarProps) {
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center gap-8 border-t border-white/25 bg-black py-16">
      <AdminButton type="submit" variant="primary" disabled={saving}>
        {saving ? "저장 중..." : "저장"}
      </AdminButton>
      <AdminButton href={cancelHref}>취소</AdminButton>
      {onDelete && (
        <div className="ml-auto">
          <AdminButton variant="danger" onClick={onDelete}>
            {deleteLabel}
          </AdminButton>
        </div>
      )}
    </div>
  );
}
