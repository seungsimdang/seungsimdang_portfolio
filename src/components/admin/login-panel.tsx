"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/utils/styleUtils";
import { AdminButton } from "./admin-button";
import { SignOutButton } from "./sign-out-button";

interface LoginPanelProps {
  callbackUrl: string;
  // 로그인 거부 또는 세션 만료로 이동해 온 사유
  notice: "denied" | "expired" | null;
  // 세션은 있으나 허용 계정이 아닌 경우
  forbidden: boolean;
}

const NOTICES = {
  denied: "로그인할 수 없습니다. 허용된 계정인지 확인하세요.",
  expired: "세션이 만료되었습니다. 다시 로그인하세요.",
} as const;

export function LoginPanel({
  callbackUrl,
  notice,
  forbidden,
}: LoginPanelProps) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto w-full max-w-480 space-y-16 rounded-lg border border-white/25 p-24 sm:p-32">
      <h1 className="text-h3">admin 로그인</h1>
      {forbidden ? (
        <>
          <p
            role="alert"
            className="border-l-2 border-danger pl-12 text-body text-danger"
          >
            오류: 접근 권한이 없습니다.
          </p>
          <SignOutButton className="w-full" />
        </>
      ) : (
        <>
          <p className="break-keep text-small opacity-70">
            허용된 GitHub 계정으로만 로그인할 수 있습니다.
          </p>
          {notice && (
            <p
              role="alert"
              className={cn(
                "border-l-2 pl-12 text-small",
                notice === "denied"
                  ? "border-danger text-danger"
                  : "border-white",
              )}
            >
              {notice === "denied" ? "오류: " : "안내: "}
              {NOTICES[notice]}
            </p>
          )}
          <AdminButton
            variant="primary"
            className="w-full"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              signIn("github", { callbackUrl });
            }}
          >
            {loading ? "이동 중..." : "GitHub로 로그인"}
          </AdminButton>
        </>
      )}
      <div className="h-px w-full bg-white/25" />
      <Link
        href="/"
        className="flex min-h-44 items-center justify-center text-small underline-offset-4 opacity-70 hover:underline hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
