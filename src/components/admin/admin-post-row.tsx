import Link from "next/link";
import type { PostSummary } from "@/types/blog";
import { formatPostDate } from "@/utils/format-post-date";

export function AdminPostRow({ post }: { post: PostSummary }) {
  return (
    <li className="group relative px-12 py-16 transition-colors hover:bg-white/5">
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
  );
}
