"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactNode, useEffect, useRef } from "react";
import { AdminPostRow } from "@/components/admin/admin-post-row";
import { BLOG_SEARCH_INPUT_ID } from "@/components/common/blog-search-box";
import { Pagination } from "@/components/common/pagination";
import { PostRow } from "@/components/common/post-row";
import {
  adminPostsQueryOptions,
  publicPostsQueryOptions,
} from "@/lib/query/blog-posts-queries";
import type { PostPage } from "@/types/blog";
import type { BlogListParams } from "@/utils/blog-query-params";
import { cn } from "@/utils/styleUtils";

type Variant = "public" | "admin";

interface BlogSearchResultsProps {
  variant: Variant;
  basePath: string;
  // 현재 URL 기준의 정규화된 목록 조건
  params: BlogListParams;
}

const LOADING_TEXT = "검색 중...";

function focusSearchInput() {
  document.getElementById(BLOG_SEARCH_INPUT_ID)?.focus();
}

function announcementText(
  data: PostPage,
  { category, q }: BlogListParams,
  hadQuery: boolean,
) {
  if (q) {
    return data.total === 0
      ? `${category ? `${category} 카테고리에서 ` : ""}"${q}"에 대한 검색 결과가 없습니다.`
      : `${category ? `${category} 카테고리 ` : ""}"${q}" 검색 결과 ${data.total}개`;
  }
  return hadQuery ? `검색을 해제했습니다. 총 ${data.total}개` : "";
}

// 로딩 중에는 이전 낭독 문구를 유지하고 검색 조건이 바뀌어 확정된 시점에만 갱신하려고 DOM을 직접 갱신함
// 같은 조건의 재조회·재시도·페이지 이동과 직접 진입 직후에는 다시 낭독하지 않음
function SearchAnnouncer({
  busy,
  data,
  params,
}: {
  busy: boolean;
  data: PostPage | undefined;
  params: BlogListParams;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const { category, q } = params;
  const announced = useRef({ category, q });
  useEffect(() => {
    if (busy || !data || !regionRef.current) return;
    const previous = announced.current;
    if (previous.q === q && previous.category === category) return;
    regionRef.current.textContent = announcementText(
      data,
      { page: 1, category, q },
      Boolean(previous.q),
    );
    announced.current = { category, q };
  }, [busy, data, category, q]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}

function LoadingText() {
  return (
    <p aria-busy="true" className="text-small text-white/50">
      {LOADING_TEXT}
    </p>
  );
}

function ErrorState({
  isFetching,
  onRetry,
}: {
  isFetching: boolean;
  onRetry: () => void;
}) {
  if (isFetching) return <LoadingText />;
  return (
    <div className="space-y-12">
      <p role="alert" className="text-body text-white/50">
        검색 결과를 불러오지 못했습니다.
      </p>
      <button
        type="button"
        className="min-h-44 text-small underline focus-visible:outline-2 focus-visible:outline-white"
        onClick={() => {
          focusSearchInput();
          onRetry();
        }}
      >
        다시 시도
      </button>
    </div>
  );
}

function EmptyState({
  variant,
  basePath,
  params: { category, q },
}: {
  variant: Variant;
  basePath: string;
  params: BlogListParams;
}) {
  const isAdmin = variant === "admin";
  const prefetch = isAdmin ? undefined : false;
  const toneClassName = isAdmin ? "opacity-70" : "text-white/50";

  if (q) {
    const resetHref = category
      ? `${basePath}?category=${encodeURIComponent(category)}`
      : basePath;
    return (
      <div className="space-y-12">
        <p className={cn("text-body break-words", toneClassName)}>
          {category ? `${category} 카테고리에서 ` : ""}"{q}"에 대한 검색 결과가
          없습니다.
        </p>
        <Link
          prefetch={prefetch}
          href={resetHref}
          className="text-small underline"
          onClick={focusSearchInput}
        >
          검색 초기화
        </Link>
      </div>
    );
  }
  if (isAdmin && !category) {
    return <p className="text-body opacity-70">작성한 글이 없습니다.</p>;
  }
  return (
    <div className="space-y-12">
      <p className={cn("text-body", toneClassName)}>
        {category
          ? "이 카테고리에 글이 없습니다."
          : "아직 작성한 글이 없습니다."}
      </p>
      {category && (
        <Link
          prefetch={prefetch}
          href={basePath}
          className="text-small underline"
        >
          전체 보기
        </Link>
      )}
    </div>
  );
}

function ResultPagination({
  isAdmin,
  basePath,
  params: { category, q },
  data: { page, totalPages },
  busy,
}: {
  isAdmin: boolean;
  basePath: string;
  params: BlogListParams;
  data: PostPage;
  busy: boolean;
}) {
  const query: Record<string, string> = {
    ...(category ? { category } : {}),
    ...(q ? { q } : {}),
  };
  const pagination = (
    <Pagination
      prefetch={isAdmin ? undefined : false}
      label={isAdmin ? "블로그 관리 페이지" : "블로그 페이지"}
      basePath={basePath}
      query={Object.keys(query).length > 0 ? query : undefined}
      page={page}
      totalPages={totalPages}
    />
  );
  // 로딩 중에는 이전 결과의 page·totalPages가 새 검색 조건과 섞인 링크가 되므로 자리만 유지하고 상호작용을 막음
  return busy ? (
    <div inert className="invisible">
      {pagination}
    </div>
  ) : (
    pagination
  );
}

function ResultList({
  variant,
  basePath,
  params,
  data,
  busy,
}: {
  variant: Variant;
  basePath: string;
  params: BlogListParams;
  data: PostPage;
  busy: boolean;
}) {
  const { category, q } = params;
  const isAdmin = variant === "admin";
  const { items, total, page, pageSize } = data;
  const first = (page - 1) * pageSize + 1;
  const range = `${first}-${first + items.length - 1}번째`;
  const categoryPrefix = category ? `${category} 카테고리 ` : "";

  const countLine = busy
    ? LOADING_TEXT
    : q
      ? `${categoryPrefix}"${q}" 검색 결과 총 ${total}개 중 ${range}`
      : `${categoryPrefix}총 ${total}개 중 ${range}`;
  const content = (
    <>
      <p
        className={cn(
          "text-small text-white/50",
          isAdmin && "mb-8",
          q && "break-words",
        )}
      >
        {countLine}
      </p>
      <ul
        aria-busy={busy || undefined}
        className={cn(
          isAdmin
            ? "divide-y divide-white/10 border-y border-white/10"
            : "mt-16 divide-y divide-white/10",
          busy && "opacity-50",
        )}
      >
        {items.map((post) =>
          isAdmin ? (
            <AdminPostRow key={post.slug} post={post} />
          ) : (
            <PostRow key={post.slug} post={post} />
          ),
        )}
      </ul>
      <ResultPagination
        isAdmin={isAdmin}
        basePath={basePath}
        params={params}
        data={data}
        busy={busy}
      />
    </>
  );
  // 관리자는 기존 마크업처럼 래퍼 없이 이어 붙임
  return isAdmin ? content : <div>{content}</div>;
}

export function BlogSearchResults({
  variant,
  basePath,
  params,
}: BlogSearchResultsProps) {
  const { data, isError, isFetching, isPlaceholderData, refetch } = useQuery(
    variant === "admin"
      ? adminPostsQueryOptions(params)
      : publicPostsQueryOptions(params),
  );
  const busy = isFetching || isPlaceholderData;

  let body: ReactNode;
  if (isError) {
    body = (
      <ErrorState isFetching={isFetching} onRetry={() => void refetch()} />
    );
  } else if (!data) {
    body = <LoadingText />;
  } else if (data.items.length === 0) {
    // 0건은 응답이 확정된 뒤에만 보여주고, 이전 검색의 placeholder 0건은 새 검색어의 결과로 오인되지 않게 함
    body = busy ? (
      <LoadingText />
    ) : (
      <EmptyState variant={variant} basePath={basePath} params={params} />
    );
  } else {
    body = (
      <ResultList
        variant={variant}
        basePath={basePath}
        params={params}
        data={data}
        busy={busy}
      />
    );
  }

  return (
    <>
      <SearchAnnouncer busy={busy} data={data} params={params} />
      {body}
    </>
  );
}
