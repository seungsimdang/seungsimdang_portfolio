import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/http/api-client";
import type { CustomData } from "@/types/api-types";
import type { PostPage } from "@/types/blog";
import type { BlogListParams } from "@/utils/blog-query-params";
import { adminBlogPostsKeys, blogPostsKeys } from "./blog-posts-keys";

async function fetchPosts(
  url: string,
  { page, category, q }: BlogListParams,
  signal: AbortSignal,
) {
  const response = await apiClient.get<CustomData<PostPage>>(url, {
    // axios는 undefined 파라미터를 직렬화하지 않음
    params: { q, category, page: page > 1 ? page : undefined },
    signal,
  });
  return response.data.data;
}

// 공개와 관리자 옵션의 타입을 같게 맞추려고 queryKey를 넓혀 둠, 호출부가 한 훅으로 둘 다 다룸
function listQueryOptions(
  queryKey: readonly unknown[],
  url: string,
  params: BlogListParams,
  staleTime: number,
) {
  return queryOptions({
    queryKey,
    queryFn: ({ signal }) => fetchPosts(url, params, signal),
    staleTime,
    // 이전 결과를 유지해 검색어 변경 중에도 목록이 비지 않게 함
    placeholderData: keepPreviousData,
  });
}

export function publicPostsQueryOptions(params: BlogListParams) {
  return listQueryOptions(
    blogPostsKeys.list(params),
    "/blog/posts",
    params,
    60_000,
  );
}

export function adminPostsQueryOptions(params: BlogListParams) {
  return listQueryOptions(
    adminBlogPostsKeys.list(params),
    "/admin/posts",
    params,
    10_000,
  );
}
