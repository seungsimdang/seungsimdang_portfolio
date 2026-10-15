import type { BlogListParams } from "@/utils/blog-query-params";

// 서버 prefetch와 클라이언트가 같은 키를 쓰도록 정규화된 params만 받음
export const blogPostsKeys = {
  list: (params: BlogListParams) => ["blog-posts", "list", params] as const,
};

export const adminBlogPostsKeys = {
  list: (params: BlogListParams) =>
    ["admin-blog-posts", "list", params] as const,
};
