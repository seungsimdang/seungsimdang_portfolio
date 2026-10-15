import Link from "next/link";
import { cn } from "@/utils/styleUtils";

interface CategoryTabsProps {
  // 목록 경로, 링크는 이 경로에 category 쿼리를 붙임
  basePath: string;
  categories: string[];
  current?: string;
  // 링크에 유지할 추가 쿼리 (예: q), 비어 있으면 기존 링크와 같음
  query?: Record<string, string>;
  // 동적 렌더링 경로의 이탈 시 중단 스트림 오류를 피하려면 false
  prefetch?: false;
}

const linkClassName =
  "inline-flex min-h-44 items-center underline-offset-8 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white md:min-h-0";

// 공개와 admin 블로그 목록이 함께 쓰는 카테고리 필터, 페이지는 항상 1로 초기화
export function CategoryTabs({
  basePath,
  categories,
  current,
  query = {},
  prefetch,
}: CategoryTabsProps) {
  if (categories.length === 0) return null;
  const hrefFor = (category?: string) => {
    const pairs = [
      ...(category ? [["category", category]] : []),
      ...Object.entries(query),
    ];
    if (pairs.length === 0) return basePath;
    return `${basePath}?${pairs
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&")}`;
  };
  const items = [
    { name: "전체", href: hrefFor(), active: current === undefined },
    ...categories.map((name) => ({
      name,
      href: hrefFor(name),
      active: name === current,
    })),
  ];
  return (
    <nav
      aria-label="카테고리"
      className="flex flex-wrap gap-x-16 gap-y-4 text-small md:gap-y-16"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          prefetch={prefetch}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            linkClassName,
            item.active ? "underline opacity-100" : "opacity-50",
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
