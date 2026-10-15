import { QueriesHydration } from "@suspensive/react-query-5";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BlogListView } from "@/components/common/blog-list-view";
import { QueryProvider } from "@/components/common/query-provider";
import { POST_ADMIN_PAGE_SIZE } from "@/constants/blog";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { adminBlogPostsKeys } from "@/lib/query/blog-posts-keys";
import { listCategories, listPosts } from "@/services/blog/blog-service";
import {
  type BlogListParams,
  normalizeCategoryParam,
  normalizeSearchQuery,
  parsePageParam,
} from "@/utils/blog-query-params";

export const metadata: Metadata = {
  title: { absolute: "blog - admin" },
};

interface AdminBlogPageProps {
  searchParams: Promise<{
    page?: string | string[];
    category?: string | string[];
    q?: string | string[];
  }>;
}

export default async function AdminBlogPage({
  searchParams,
}: AdminBlogPageProps) {
  await requireAdminPage();
  const raw = await searchParams;
  const params: BlogListParams = {
    page: parsePageParam(raw.page),
    category: normalizeCategoryParam(raw.category),
    q: normalizeSearchQuery(raw.q),
  };
  const categories = await listCategories();

  return (
    <>
      <AdminPageHeader title="blog">
        <AdminButton href="/admin/blog/new" variant="primary">
          새 글
        </AdminButton>
      </AdminPageHeader>
      <QueryProvider>
        <QueriesHydration
          queries={[
            {
              queryKey: adminBlogPostsKeys.list(params),
              queryFn: () =>
                listPosts(
                  params.page,
                  POST_ADMIN_PAGE_SIZE,
                  params.category,
                  params.q,
                ),
            },
          ]}
        >
          <Suspense fallback={null}>
            <BlogListView
              variant="admin"
              basePath="/admin/blog"
              categories={categories.map((item) => item.name)}
            />
          </Suspense>
        </QueriesHydration>
      </QueryProvider>
    </>
  );
}
