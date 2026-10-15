"use client";

import { AdminButton } from "./admin-button";

interface FormActionBarProps {
  saving: boolean;
  cancelHref: string;
  // 편집 화면에서만 전달
  onDelete?: () => void;
  deleteLabel?: string;
  // 진행 중 상태 문구 (예: 이미지 업로드 중)
  busyMessage?: string;
  // 저장 외 작업 중에 저장 버튼을 막을 때 사용
  saveDisabled?: boolean;
}

// 긴 폼에서도 저장 버튼에 닿도록 하단에 고정되는 액션 바, 결과는 토스트로 알림
export function FormActionBar({
  saving,
  cancelHref,
  onDelete,
  deleteLabel,
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
      {busyMessage && (
        <span role="status" className="text-small">
          {busyMessage}
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
