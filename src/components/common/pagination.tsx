import Link from "next/link";
import { cn } from "@/utils/styleUtils";

interface PaginationProps {
  label: string;
  basePath: string;
  // 페이지 링크에 유지할 쿼리 (예: category)
  query?: Record<string, string>;
  page: number;
  totalPages: number;
}

const itemClassName =
  "flex min-h-44 min-w-44 items-center justify-center text-small underline-offset-8 focus-visible:outline-2 focus-visible:outline-white";

// 현재 페이지 앞뒤 1개와 처음/마지막만 남기고 사이는 생략 key(문자열)로 표시
function pageItems(page: number, totalPages: number): (number | string)[] {
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  return pages.flatMap((n, index) =>
    index > 0 && n - pages[index - 1] > 1 ? [`gap-${n}`, n] : [n],
  );
}

export function Pagination({
  label,
  basePath,
  query = {},
  page,
  totalPages,
}: PaginationProps) {
  if (totalPages <= 1) return null;
  const href = (target: number) => {
    const params = new URLSearchParams(query);
    if (target > 1) params.set("page", String(target));
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-center gap-8 pt-40 md:pt-48"
    >
      {page > 1 ? (
        <Link
          prefetch={false}
          href={href(page - 1)}
          className={cn(itemClassName, "opacity-50 hover:opacity-100")}
        >
          이전
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(itemClassName, "opacity-25")}>
          이전
        </span>
      )}
      {pageItems(page, totalPages).map((item) =>
        typeof item === "string" ? (
          <span key={item} aria-hidden="true" className={itemClassName}>
            ...
          </span>
        ) : (
          <Link
            prefetch={false}
            key={item}
            href={href(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              itemClassName,
              item === page
                ? "underline opacity-100"
                : "opacity-50 hover:opacity-100",
            )}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link
          prefetch={false}
          href={href(page + 1)}
          className={cn(itemClassName, "opacity-50 hover:opacity-100")}
        >
          다음
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(itemClassName, "opacity-25")}>
          다음
        </span>
      )}
    </nav>
  );
}
