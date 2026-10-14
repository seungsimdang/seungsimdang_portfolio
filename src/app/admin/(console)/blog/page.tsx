import type { Metadata } from "next";
import Link from "next/link";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Pagination } from "@/components/common/pagination";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { listAdminPosts, parsePageParam } from "@/services/blog/blog-service";
import { formatPostDate } from "@/utils/format-post-date";

export const metadata: Metadata = {
  title: { absolute: "블로그 - admin" },
};

interface AdminBlogPageProps {
  searchParams: Promise<{ page?: string | string[]; deleted?: string }>;
}

export default async function AdminBlogPage({
  searchParams,
}: AdminBlogPageProps) {
  await requireAdminPage();
  const params = await searchParams;
  const result = await listAdminPosts(parsePageParam(params.page));
  const first = (result.page - 1) * result.pageSize + 1;

  return (
    <>
      <AdminPageHeader title="블로그">
        <AdminButton href="/admin/blog/new" variant="primary">
          새 글
        </AdminButton>
      </AdminPageHeader>
      {params.deleted && (
        <p role="status" className="mb-16 text-small">
          삭제했습니다.
        </p>
      )}
      {result.items.length === 0 ? (
        <p className="text-body opacity-70">작성한 글이 없습니다.</p>
      ) : (
        <>
          <p className="mb-8 text-small text-white/50">
            총 {result.total}개 중 {first}-{first + result.items.length - 1}
            번째
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
                  {formatPostDate(post.publishedAt)} ·{" "}
                  {post.published ? "공개" : "비공개"}
                </p>
              </li>
            ))}
          </ul>
          <Pagination
            label="블로그 관리 페이지"
            basePath="/admin/blog"
            page={result.page}
            totalPages={result.totalPages}
          />
        </>
      )}
    </>
  );
}
