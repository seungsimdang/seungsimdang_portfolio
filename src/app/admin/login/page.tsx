import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/admin/login-panel";
import { HttpStatus } from "@/constants/http-status";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: { absolute: "로그인 - admin" },
};

interface LoginPageProps {
  searchParams: Promise<{ from?: string; error?: string; reason?: string }>;
}

// /admin 하위 상대 경로만 허용하고 그 외는 /admin으로 대체
function safeCallbackUrl(from: string | undefined) {
  if (
    from &&
    (from === "/admin" || from.startsWith("/admin/")) &&
    !from.includes("//") &&
    !from.includes("\\")
  ) {
    return from;
  }
  return "/admin";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { from, error, reason } = await searchParams;
  const callbackUrl = safeCallbackUrl(from);
  const guard = await requireAdmin();
  if (guard.ok) redirect(callbackUrl);

  return (
    <div className="container-padding py-96">
      <LoginPanel
        callbackUrl={callbackUrl}
        forbidden={guard.status === HttpStatus.Forbidden}
        notice={error ? "denied" : reason === "expired" ? "expired" : null}
      />
    </div>
  );
}
