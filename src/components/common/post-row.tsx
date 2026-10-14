import Link from "next/link";
import type { PostSummary } from "@/types/blog";
import { formatPostDate } from "@/utils/format-post-date";

// 낭독 순서는 제목 다음 날짜, 시각 순서는 날짜가 앞
export function PostRow({ post }: { post: PostSummary }) {
  return (
    <li>
      <Link
        href={`/blog/${encodeURIComponent(post.slug)}`}
        className="group flex flex-col gap-8 py-20 focus-visible:outline-2 focus-visible:outline-white md:grid md:grid-cols-[160px_1fr] md:gap-32 md:py-24"
      >
        <div className="md:col-start-2 md:row-start-1">
          <p className="text-body font-medium break-keep underline-offset-8 group-hover:underline">
            {post.title}
          </p>
          {post.categories.length > 0 && (
            <p className="mt-4 text-small text-white/50">
              {post.categories.join(" / ")}
            </p>
          )}
        </div>
        <time
          dateTime={post.publishedAt}
          className="order-first text-small text-white/50 md:col-start-1 md:row-start-1"
        >
          {formatPostDate(post.publishedAt)}
        </time>
      </Link>
    </li>
  );
}
