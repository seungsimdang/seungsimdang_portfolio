"use client";

import type { useLeaveConfirm } from "@/lib/admin-client/use-leave-confirm";
import { ConfirmDialog } from "./confirm-dialog";

interface LeaveDialogProps {
  guard: ReturnType<typeof useLeaveConfirm>;
  description?: string;
}

// 미저장 변경을 버리고 떠날지 묻는 확인 모달
export function LeaveDialog({
  guard,
  description = "저장하지 않은 변경 사항이 사라집니다. 이동할까요?",
}: LeaveDialogProps) {
  return (
    <ConfirmDialog
      open={guard.open}
      title="이 페이지를 떠날까요?"
      description={<p>{description}</p>}
      confirmLabel="이동"
      busyLabel="이동 중..."
      cancelLabel="머무르기"
      onConfirm={guard.proceed}
      onClose={guard.stay}
    />
  );
}
