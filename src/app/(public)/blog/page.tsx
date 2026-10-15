import type { Metadata } from "next";
import Link from "next/link";
import { CategoryTabs } from "@/components/common/category-tabs";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { PostRow } from "@/components/common/post-row";
import { POST_PAGE_SIZE } from "@/constants/blog";
import {
  listCategories,
  listPosts,
  normalizeCategoryParam,
  parsePageParam,
} from "@/services/blog/blog-service";

export const metadata: Metadata = {
  title: "blog",
  description: "개발하며 배운 것과 알고리즘 풀이를 정리한 글 목록",
  alternates: { canonical: "/blog" },
};

interface BlogPageProps {
  searchParams: Promise<{
    page?: string | string[];
    category?: string | string[];
  }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const category = normalizeCategoryParam(params.category);
  const [result, categories] = await Promise.all([
    listPosts(parsePageParam(params.page), POST_PAGE_SIZE, category),
    listCategories(),
  ]);
  const first = (result.page - 1) * result.pageSize + 1;
  const range = `${first}-${first + result.items.length - 1}번째`;

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <PageHeader title="blog" />

      <section className="w-full max-w-content mx-auto container-padding py-40 md:py-48 lg:py-64">
        <div className="space-y-32 md:space-y-40">
          <div className="flex items-center gap-10">
            <h2 className="text-small whitespace-nowrap">.posts</h2>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <CategoryTabs
            prefetch={false}
            basePath="/blog"
            categories={categories.map((item) => item.name)}
            current={category}
          />

          {result.items.length === 0 ? (
            <div className="space-y-12">
              <p className="text-body text-white/50">
                {category
                  ? "이 카테고리에 글이 없습니다."
                  : "아직 작성한 글이 없습니다."}
              </p>
              {category && (
                <Link
                  prefetch={false}
                  href="/blog"
                  className="text-small underline"
                >
                  전체 보기
                </Link>
              )}
            </div>
          ) : (
            <div>
              <p className="text-small text-white/50">
                {category ? `${category} 카테고리 ` : ""}총 {result.total}개 중{" "}
                {range}
              </p>
              <ul className="mt-16 divide-y divide-white/10">
                {result.items.map((post) => (
                  <PostRow key={post.slug} post={post} />
                ))}
              </ul>
              <Pagination
                prefetch={false}
                label="블로그 페이지"
                basePath="/blog"
                query={category ? { category } : undefined}
                page={result.page}
                totalPages={result.totalPages}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
