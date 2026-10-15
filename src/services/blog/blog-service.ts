import "server-only";
import { and, asc, count, desc, eq, gt, ilike, lt, or, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { posts } from "@/db/schema/portfolio";
import type {
  Post,
  PostCategory,
  PostNeighbors,
  PostPage,
  PostSummary,
} from "@/types/blog";
import { escapeLikePattern } from "@/utils/blog-query-params";

type PostRow = typeof posts.$inferSelect;

function toPostSummary(
  row: Pick<PostRow, "slug" | "title" | "publishedAt" | "categories" | "tags">,
): PostSummary {
  return {
    slug: row.slug,
    title: row.title,
    publishedAt: row.publishedAt,
    categories: row.categories,
    tags: row.tags,
  };
}

export function toPost(row: PostRow): Post {
  return { ...toPostSummary(row), content: row.content };
}

// category는 normalizeCategoryParam, query는 normalizeSearchQuery를 거친 값만 받음
// query는 이스케이프 전 값이며 LIKE 메타문자 처리는 여기서만 하고 값은 바인딩 파라미터로 전달됨
// 제목과 본문 구절 일치이며 content는 select하지 않음
export const listPosts = cache(
  async (
    page: number,
    pageSize: number,
    category?: string,
    query?: string,
  ): Promise<PostPage> => {
    const categoryCondition = category
      ? sql`${posts.categories} @> array[${category}]::text[]`
      : undefined;
    const trimmedQuery = query?.trim();
    const pattern = trimmedQuery
      ? `%${escapeLikePattern(trimmedQuery)}%`
      : undefined;
    const searchCondition = pattern
      ? or(ilike(posts.title, pattern), ilike(posts.content, pattern))
      : undefined;
    const where = and(categoryCondition, searchCondition);
    const [{ total = 0 } = {}] = await db
      .select({ total: count() })
      .from(posts)
      .where(where);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(Math.max(1, page), totalPages);
    const rows =
      total === 0
        ? []
        : await db
            .select({
              slug: posts.slug,
              title: posts.title,
              publishedAt: posts.publishedAt,
              categories: posts.categories,
              tags: posts.tags,
            })
            .from(posts)
            .where(where)
            .orderBy(desc(posts.publishedAt), desc(posts.slug))
            .limit(pageSize)
            .offset((current - 1) * pageSize);
    return {
      items: rows.map(toPostSummary),
      total,
      page: current,
      pageSize,
      totalPages,
    };
  },
);

export const listCategories = cache(async (): Promise<PostCategory[]> => {
  const name = sql<string>`unnest(${posts.categories})`.as("name");
  const unnested = db.select({ name }).from(posts).as("unnested");
  return db
    .select({ name: unnested.name, count: count() })
    .from(unnested)
    .groupBy(unnested.name)
    .orderBy(desc(count()), unnested.name);
});

export const getPost = cache(async (slug: string): Promise<Post | null> => {
  const [row] = await db.select().from(posts).where(eq(posts.slug, slug));
  return row ? toPost(row) : null;
});

// 목록과 같은 (published_at desc, slug desc) 정렬 기준의 전체 글 이웃
export async function getPostNeighbors(
  post: Pick<Post, "slug" | "publishedAt">,
): Promise<PostNeighbors> {
  const [older, newer] = await Promise.all([
    db
      .select({ slug: posts.slug, title: posts.title })
      .from(posts)
      .where(
        or(
          lt(posts.publishedAt, post.publishedAt),
          and(
            eq(posts.publishedAt, post.publishedAt),
            lt(posts.slug, post.slug),
          ),
        ),
      )
      .orderBy(desc(posts.publishedAt), desc(posts.slug))
      .limit(1),
    db
      .select({ slug: posts.slug, title: posts.title })
      .from(posts)
      .where(
        or(
          gt(posts.publishedAt, post.publishedAt),
          and(
            eq(posts.publishedAt, post.publishedAt),
            gt(posts.slug, post.slug),
          ),
        ),
      )
      .orderBy(asc(posts.publishedAt), asc(posts.slug))
      .limit(1),
  ]);
  return { older: older[0] ?? null, newer: newer[0] ?? null };
}
