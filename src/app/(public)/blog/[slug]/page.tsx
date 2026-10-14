import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/common/markdown-body";
import { decodePostSlug } from "@/lib/blog/slug";
import { renderMarkdown } from "@/lib/markdown/render-markdown";
import { postSlugSchema } from "@/schemas/blog.schema";
import { getPublicPost } from "@/services/blog/blog-service";
import { formatPostDate } from "@/utils/format-post-date";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

// 디코딩과 형식 검증을 통과한 slug만 조회, 아니면 null
async function loadPost(params: PostPageProps["params"]) {
  const slug = decodePostSlug((await params).slug);
  if (!slug || !postSlugSchema.safeParse(slug).success) return null;
  return getPublicPost(slug);
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const post = await loadPost(params);
  if (!post) return {};
  return {
    title: post.title,
    alternates: { canonical: `/blog/${encodeURIComponent(post.slug)}` },
  };
}

const backLinkClassName =
  "text-small text-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-white";

export default async function PostPage({ params }: PostPageProps) {
  const post = await loadPost(params);
  if (!post) notFound();

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <article className="w-full max-w-content mx-auto container-padding section-spacing">
        <Link href="/blog" className={backLinkClassName}>
          blog 목록으로
        </Link>
        <h1 className="mt-24 text-h3 break-keep max-w-heading">{post.title}</h1>
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
        <div className="mt-32 md:mt-48 max-w-800">
          {post.content.trim() ? (
            <MarkdownBody>{renderMarkdown(post.content)}</MarkdownBody>
          ) : (
            <p className="text-white/50">본문이 없습니다.</p>
          )}
        </div>
        <div className="mt-64">
          <Link href="/blog" className={backLinkClassName}>
            blog 목록으로
          </Link>
        </div>
      </article>
    </div>
  );
}
