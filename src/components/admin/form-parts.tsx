"use client";

import Link from "next/link";
import type { Notice } from "@/lib/admin-client/use-admin-form";
import { AdminButton } from "./admin-button";
import { SignOutButton } from "./sign-out-button";

// 저장 결과 알림, 성공은 role=status 오류는 role=alert로 읽힘
export function FormStatus({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return (
    <NoticeMessage
      notice={notice}
      className="flex flex-wrap items-center gap-12 rounded-md border border-white/25 p-12 text-small"
    />
  );
}

function NoticeMessage({
  notice,
  className,
}: {
  notice: Notice;
  className: string;
}) {
  const success = notice.tone === "success";
  return (
    <div role={success ? "status" : "alert"} className={className}>
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
  // 상단 FormStatus와 같은 알림의 하단 요약용
  notice: Notice | null;
  cancelHref: string;
  // 편집 화면에서만 전달
  onDelete?: () => void;
  deleteLabel?: string;
  // 상단 FormStatus가 없는 긴 폼용, 알림 전체를 이 바에서 낭독하고 표시
  detailed?: boolean;
  // 진행 중 상태 문구 (예: 이미지 업로드 중), detailed와 함께 사용
  busyMessage?: string;
  // 저장 외 작업 중에 저장 버튼을 막을 때 사용
  saveDisabled?: boolean;
}

// 긴 폼에서도 저장 버튼에 닿도록 하단에 고정되는 액션 바
export function FormActionBar({
  saving,
  notice,
  cancelHref,
  onDelete,
  deleteLabel,
  detailed,
  busyMessage,
  saveDisabled,
}: FormActionBarProps) {
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center gap-8 border-t border-white/25 bg-black py-16">
      <AdminButton
        type="submit"
        variant="primary"
        disabled={saving || saveDisabled}
      >
        {saving ? "저장 중..." : "저장"}
      </AdminButton>
      <AdminButton href={cancelHref}>취소</AdminButton>
      {detailed && busyMessage && (
        <span role="status" className="text-small">
          {busyMessage}
        </span>
      )}
      {detailed && notice && !saving && (
        <NoticeMessage
          notice={notice}
          className="flex flex-wrap items-center gap-12 text-small"
        />
      )}
      {/* 상단 FormStatus가 이미 낭독되므로 중복 낭독 방지 */}
      {!detailed && notice && !saving && (
        <span aria-hidden="true" className="text-small text-white/75">
          {notice.tone === "success"
            ? "저장됨"
            : "저장 실패 (상세는 위 알림 참고)"}
        </span>
      )}
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
