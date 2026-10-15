import "server-only";
import { POST_PAGE_SIZE } from "@/constants/blog";
import { apiErrors } from "@/lib/api/api-error";
import { fail, ok } from "@/lib/api/response";
import { summarizeErrorForLog } from "@/lib/api/safe-error-log";
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
    const { name, pgCode } = summarizeErrorForLog(error);
    console.error("[api/blog/posts] 목록 조회 실패", name, pgCode);
    return fail(apiErrors.internal());
  }
}
