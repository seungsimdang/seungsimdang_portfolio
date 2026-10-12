import "server-only";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { HttpStatus } from "@/constants/http-status";
import { isAllowedGithubId } from "./admin-allowlist";
import { authOptions } from "./auth-options";

type AdminGuardResult =
  | { ok: true; githubId: string }
  | {
      ok: false;
      status: typeof HttpStatus.Unauthorized | typeof HttpStatus.Forbidden;
    };

// 세션 없음은 401, 세션은 있으나 allowlist 불일치(또는 env 비어 있음)는 403, 매 호출마다 env를 다시 읽어 판정
export async function requireAdmin(): Promise<AdminGuardResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, status: HttpStatus.Unauthorized };
  const githubId = session.user.githubId;
  if (!isAllowedGithubId(githubId) || !githubId) {
    return { ok: false, status: HttpStatus.Forbidden };
  }
  return { ok: true, githubId };
}

// 서버 컴포넌트용, 실패 시 /admin/login으로 redirect
export async function requireAdminPage(): Promise<{ githubId: string }> {
  const result = await requireAdmin();
  if (!result.ok) redirect("/admin/login");
  return { githubId: result.githubId };
}
