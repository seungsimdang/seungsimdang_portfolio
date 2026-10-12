import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { HttpStatus } from "@/constants/http-status";
import type { ApiErrorBody, CustomData } from "@/types/api-types";

const LOGIN_PATH = "/admin/login";

function withAdminHeaders(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

// 1차 방어는 JWT 존재 확인뿐이며 인가(allowlist)는 가드 함수가 항상 다시 판정
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === LOGIN_PATH) return withAdminHeaders(NextResponse.next());

  const secret = process.env.NEXTAUTH_SECRET;
  const token = secret ? await getToken({ req: request, secret }) : null;
  if (token) return withAdminHeaders(NextResponse.next());

  if (pathname.startsWith("/api/")) {
    const body: CustomData<ApiErrorBody> = {
      data: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" },
      status: HttpStatus.Unauthorized,
    };
    return withAdminHeaders(
      NextResponse.json(body, { status: HttpStatus.Unauthorized }),
    );
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("from", `${pathname}${search}`);
  return withAdminHeaders(NextResponse.redirect(loginUrl));
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
