"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AdminButton } from "./admin-button";
import { useToast } from "./toast-provider";

// 미저장 변경 가드가 링크 클릭만 가로채므로 링크로 두어 세션 종료 전에 확인을 받음
// 확인 뒤 전체 페이지 이동은 beforeunload 기본 창을 다시 띄우므로 세션 종료 후 라우터로 이동
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { notify } = useToast();
  return (
    <AdminButton
      href="/"
      className={className}
      onClick={async (event) => {
        // 가드가 통과시키는 보조 키 클릭은 확인 없이 세션을 끝내지 않도록 링크 기본 동작에 맡김
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        try {
          await signOut({ redirect: false });
        } catch {
          // 세션이 남아 있으므로 이동하지 않고 다시 시도하도록 안내
          notify({
            tone: "error",
            message: "로그아웃하지 못했습니다. 다시 시도하세요.",
          });
          return;
        }
        router.push("/");
      }}
    >
      logout
    </AdminButton>
  );
}
