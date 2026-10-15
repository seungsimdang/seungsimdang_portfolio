import { QueriesHydration } from "@suspensive/react-query-5";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogListView } from "@/components/common/blog-list-view";
import { PageHeader } from "@/components/common/page-header";
import { QueryProvider } from "@/components/common/query-provider";
import { POST_PAGE_SIZE } from "@/constants/blog";
import { blogPostsKeys } from "@/lib/query/blog-posts-keys";
import { listCategories, listPosts } from "@/services/blog/blog-service";
import {
  type BlogListParams,
  normalizeCategoryParam,
  normalizeSearchQuery,
  parsePageParam,
} from "@/utils/blog-query-params";

interface BlogPageProps {
  searchParams: Promise<{
    page?: string | string[];
    category?: string | string[];
    q?: string | string[];
  }>;
}

export async function generateMetadata({
  searchParams,
}: BlogPageProps): Promise<Metadata> {
  const q = normalizeSearchQuery((await searchParams).q);
  return {
    title: "blog",
    description: "개발하며 배운 것과 알고리즘 풀이를 정리한 글 목록",
    alternates: { canonical: "/blog" },
    // 검색 결과 페이지는 색인하지 않되 글 링크 발견은 허용함
    ...(q ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const raw = await searchParams;
  const params: BlogListParams = {
    page: parsePageParam(raw.page),
    category: normalizeCategoryParam(raw.category),
    q: normalizeSearchQuery(raw.q),
  };
  const categories = await listCategories();

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <PageHeader title="blog" />

      <section className="w-full max-w-content mx-auto container-padding py-40 md:py-48 lg:py-64">
        <div className="space-y-32 md:space-y-40">
          <div className="flex items-center gap-10">
            <h2 className="text-small whitespace-nowrap">.posts</h2>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <QueryProvider>
            <QueriesHydration
              queries={[
                {
                  queryKey: blogPostsKeys.list(params),
                  queryFn: () =>
                    listPosts(
                      params.page,
                      POST_PAGE_SIZE,
                      params.category,
                      params.q,
                    ),
                },
              ]}
            >
              <Suspense fallback={null}>
                <BlogListView
                  variant="public"
                  basePath="/blog"
                  categories={categories.map((item) => item.name)}
                />
              </Suspense>
            </QueriesHydration>
          </QueryProvider>
        </div>
      </section>
    </div>
  );
}
