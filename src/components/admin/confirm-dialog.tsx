"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { AdminButton } from "./admin-button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  // 성공이면 null, 실패면 대화상자에 보일 오류 문구
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
}

// 네이티브 dialog 기반 삭제 확인, 기본 포커스는 취소 버튼
export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const cancelId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // 파괴적 동작이 아닌 취소 버튼에 기본 포커스
      document.getElementById(cancelId)?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, cancelId]);

  function close() {
    setError(null);
    onClose();
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const result = await onConfirm();
      if (result === null) close();
      else setError(result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
      className="m-auto w-full max-w-480 rounded-lg border border-white/25 bg-black p-24 text-white backdrop:bg-black/80"
    >
      <div className="space-y-16">
        <h2 id={titleId} className="text-h3">
          {title}
        </h2>
        <div id={descriptionId} className="space-y-8 text-body">
          {description}
        </div>
        {error && (
          <p role="alert" className="text-small">
            오류: {error}
          </p>
        )}
        <div className="flex justify-end gap-8">
          <AdminButton id={cancelId} disabled={busy} onClick={close}>
            취소
          </AdminButton>
          <AdminButton variant="danger" disabled={busy} onClick={confirm}>
            {busy ? "삭제 중..." : "삭제"}
          </AdminButton>
        </div>
      </div>
    </dialog>
  );
}
