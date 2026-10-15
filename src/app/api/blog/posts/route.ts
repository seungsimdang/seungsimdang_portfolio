import "server-only";
import { POST_PAGE_SIZE } from "@/constants/blog";
import { apiErrors } from "@/lib/api/api-error";
import { fail, ok } from "@/lib/api/response";
import { listPosts } from "@/services/blog/blog-service";
import { parseBlogListParams } from "@/utils/blog-query-params";

// 공개 검색 목록
// 서버 prefetch와 결과가 갈리지 않도록 CDN 캐시를 쓰지 않고 중복 요청은 클라이언트 staleTime이 줄임
// 잘못된 쿼리는 400이 아니라 페이지와 같은 관용 규칙으로 보정함
export async function GET(request: Request) {
  try {
    const { page, category, q } = parseBlogListParams(
      new URL(request.url).searchParams,
    );
    const response = ok(await listPosts(page, POST_PAGE_SIZE, category, q));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    // DrizzleQueryError 메시지에 SQL 파라미터(검색어)가 포함되므로 메시지는 남기지 않고 오류 이름과 원인의 PG 코드만 기록함
    const cause = error instanceof Error ? error.cause : undefined;
    const pgCode =
      cause && typeof cause === "object" && "code" in cause
        ? String(cause.code)
        : undefined;
    console.error(
      "[api/blog/posts] 목록 조회 실패",
      error instanceof Error ? error.name : "unknown",
      pgCode,
    );
    return fail(apiErrors.internal());
  }
}
