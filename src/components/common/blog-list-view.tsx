"use client";

import { useSearchParams } from "next/navigation";
import { BlogSearchBox } from "@/components/common/blog-search-box";
import { BlogSearchResults } from "@/components/common/blog-search-results";
import { CategoryTabs } from "@/components/common/category-tabs";
import { parseBlogListParams } from "@/utils/blog-query-params";

interface BlogListViewProps {
  variant: "public" | "admin";
  basePath: string;
  categories: string[];
}

// 검색은 replaceState로 URL만 바꾸므로 탭 링크의 q도 서버 props가 아닌 현재 URL에서 읽음
export function BlogListView({
  variant,
  basePath,
  categories,
}: BlogListViewProps) {
  const params = parseBlogListParams(useSearchParams());
  const isAdmin = variant === "admin";
  const tabs = (
    <CategoryTabs
      prefetch={isAdmin ? undefined : false}
      basePath={basePath}
      categories={categories}
      current={params.category}
      query={params.q ? { q: params.q } : undefined}
    />
  );
  const results = (
    <BlogSearchResults variant={variant} basePath={basePath} params={params} />
  );

  if (isAdmin) {
    return (
      <>
        <div className="mb-16">
          <BlogSearchBox query={params.q ?? ""} />
        </div>
        {categories.length > 0 && <div className="mb-32">{tabs}</div>}
        {results}
      </>
    );
  }
  return (
    <>
      <div className="space-y-16 md:space-y-20">
        <BlogSearchBox query={params.q ?? ""} />
        {tabs}
      </div>
      {results}
    </>
  );
}
