import type { Metadata } from "next";
import Link from "next/link";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryTabs } from "@/components/common/category-tabs";
import { Pagination } from "@/components/common/pagination";
import { POST_ADMIN_PAGE_SIZE } from "@/constants/blog";
import { requireAdminPage } from "@/lib/auth/require-admin";
import {
  listCategories,
  listPosts,
  normalizeCategoryParam,
  parsePageParam,
} from "@/services/blog/blog-service";
import { formatPostDate } from "@/utils/format-post-date";

export const metadata: Metadata = {
  title: { absolute: "blog - admin" },
};

interface AdminBlogPageProps {
  searchParams: Promise<{
    page?: string | string[];
    category?: string | string[];
  }>;
}

export default async function AdminBlogPage({
  searchParams,
}: AdminBlogPageProps) {
  await requireAdminPage();
  const params = await searchParams;
  const category = normalizeCategoryParam(params.category);
  const [result, categories] = await Promise.all([
    listPosts(parsePageParam(params.page), POST_ADMIN_PAGE_SIZE, category),
    listCategories(),
  ]);
  const first = (result.page - 1) * result.pageSize + 1;

  return (
    <>
      <AdminPageHeader title="blog">
        <AdminButton href="/admin/blog/new" variant="primary">
          새 글
        </AdminButton>
      </AdminPageHeader>
      {categories.length > 0 && (
        <div className="mb-32">
          <CategoryTabs
            basePath="/admin/blog"
            categories={categories.map((item) => item.name)}
            current={category}
          />
        </div>
      )}
      {result.items.length === 0 ? (
        category ? (
          <div className="space-y-12">
            <p className="text-body opacity-70">이 카테고리에 글이 없습니다.</p>
            <Link href="/admin/blog" className="text-small underline">
              전체 보기
            </Link>
          </div>
        ) : (
          <p className="text-body opacity-70">작성한 글이 없습니다.</p>
        )
      ) : (
        <>
          <p className="mb-8 text-small text-white/50">
            {category ? `${category} 카테고리 ` : ""}총 {result.total}개 중{" "}
            {first}-{first + result.items.length - 1}번째
          </p>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {result.items.map((post) => (
              <li
                key={post.slug}
                className="group relative px-12 py-16 transition-colors hover:bg-white/5"
              >
                <Link
                  href={`/admin/blog/${encodeURIComponent(post.slug)}`}
                  className="text-body break-keep underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-2 focus-visible:outline-white"
                >
                  {post.title}
                </Link>
                <p className="text-small opacity-70">
                  {formatPostDate(post.publishedAt)}
                </p>
              </li>
            ))}
          </ul>
          <Pagination
            label="블로그 관리 페이지"
            basePath="/admin/blog"
            query={category ? { category } : undefined}
            page={result.page}
            totalPages={result.totalPages}
          />
        </>
      )}
    </>
  );
}
