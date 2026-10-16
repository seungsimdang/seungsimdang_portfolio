import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/common/back-link";
import { MarkdownBody } from "@/components/common/markdown-body";
import { postExcerpt } from "@/lib/blog/excerpt";
import { decodePostSlug } from "@/lib/blog/slug";
import { renderMarkdown } from "@/lib/markdown/render-markdown";
import { postSlugSchema } from "@/schemas/blog.schema";
import { getPost, getPostNeighbors } from "@/services/blog/blog-service";
import { formatPostDate } from "@/utils/format-post-date";
import { cn } from "@/utils/styleUtils";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

// 디코딩과 형식 검증을 통과한 slug만 조회, 아니면 null
async function loadPost(params: PostPageProps["params"]) {
  const slug = decodePostSlug((await params).slug);
  if (!slug || !postSlugSchema.safeParse(slug).success) return null;
  return getPost(slug);
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const post = await loadPost(params);
  if (!post) return {};
  return {
    title: post.title,
    description: postExcerpt(post.content) || post.title,
    alternates: { canonical: `/blog/${encodeURIComponent(post.slug)}` },
  };
}

const neighborLinkClassName =
  "flex flex-col gap-4 rounded-md border border-white/10 p-16 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-white";

export default async function PostPage({ params }: PostPageProps) {
  const post = await loadPost(params);
  if (!post) notFound();
  const { older, newer } = await getPostNeighbors(post);

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <article className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="mx-auto max-w-800">
          <BackLink href="/blog" label="blog" prefetch={false} />
          <h1 className="mt-32 md:mt-48 text-h3 break-keep">{post.title}</h1>
          <div className="mt-16 flex flex-wrap items-center gap-x-16 gap-y-8 text-small text-white/50">
            <time dateTime={post.publishedAt}>
              {formatPostDate(post.publishedAt)}
            </time>
            {post.categories.length > 0 && (
              <span>{post.categories.join(" / ")}</span>
            )}
            {post.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <div className="mt-32 h-px bg-white/25" />
          <div className="mt-32 md:mt-48">
            {post.content.trim() ? (
              <MarkdownBody>{renderMarkdown(post.content)}</MarkdownBody>
            ) : (
              <p className="text-white/50">본문이 없습니다.</p>
            )}
          </div>
          {(older || newer) && (
            <nav
              aria-label="이전·다음 글"
              className="mt-64 grid gap-16 border-t border-white/10 pt-32 md:grid-cols-2 md:gap-32"
            >
              {older && (
                <Link
                  prefetch={false}
                  href={`/blog/${encodeURIComponent(older.slug)}`}
                  className={neighborLinkClassName}
                >
                  <span className="text-small text-white/50">이전 글</span>
                  <span className="text-body font-medium break-keep wrap-break-word">
                    {older.title}
                  </span>
                </Link>
              )}
              {newer && (
                <Link
                  prefetch={false}
                  href={`/blog/${encodeURIComponent(newer.slug)}`}
                  className={cn(
                    neighborLinkClassName,
                    "md:col-start-2 md:text-right",
                  )}
                >
                  <span className="text-small text-white/50">다음 글</span>
                  <span className="text-body font-medium break-keep wrap-break-word">
                    {newer.title}
                  </span>
                </Link>
              )}
            </nav>
          )}
        </div>
      </article>
    </div>
  );
}
