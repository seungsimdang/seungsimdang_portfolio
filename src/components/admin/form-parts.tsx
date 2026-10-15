"use client";

import { useEffect, useRef } from "react";
import { AdminButton } from "./admin-button";

// 목록이 있는 폼은 목록으로 나가는 링크, 폼 자체가 페이지인 탭은 마지막 저장값으로 되돌리는 버튼
type CancelAction =
  | { cancelHref: string; onDiscard?: undefined; discardDisabled?: undefined }
  | { cancelHref?: undefined; onDiscard: () => void; discardDisabled: boolean };

type FormActionBarProps = CancelAction & {
  saving: boolean;
  // 편집 화면에서만 전달
  onDelete?: () => void;
  deleteLabel?: string;
  // 진행 중 상태 문구 (예: 이미지 업로드 중)
  busyMessage?: string;
  // 저장 외 작업 중에 저장 버튼을 막을 때 사용
  saveDisabled?: boolean;
};

// 긴 폼에서도 저장 버튼에 닿도록 하단에 고정되는 액션 바, 결과는 토스트로 알림
export function FormActionBar({
  saving,
  cancelHref,
  onDiscard,
  discardDisabled,
  onDelete,
  deleteLabel,
  busyMessage,
  saveDisabled,
}: FormActionBarProps) {
  // 업로드 문구 등으로 바가 여러 줄이 돼도 토스트가 실제 높이 위에 뜨도록 높이를 CSS 변수로 노출
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = barRef.current;
    if (!node) return;
    const root = document.documentElement;
    const sync = () =>
      root.style.setProperty("--admin-action-bar-h", `${node.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--admin-action-bar-h");
    };
  }, []);
  return (
    <div
      ref={barRef}
      className="sticky bottom-0 flex flex-wrap items-center gap-8 border-t border-white/25 bg-black py-16"
    >
      <AdminButton
        type="submit"
        variant="primary"
        disabled={saving || saveDisabled}
      >
        {saving ? "저장 중..." : "저장"}
      </AdminButton>
      {onDiscard ? (
        <AdminButton onClick={onDiscard} disabled={discardDisabled}>
          변경 취소
        </AdminButton>
      ) : (
        <AdminButton href={cancelHref}>취소</AdminButton>
      )}
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
