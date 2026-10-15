import "server-only";
import { and, asc, count, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import { cache } from "react";
import { POST_LABEL_MAX } from "@/constants/blog";
import { db } from "@/db";
import { posts } from "@/db/schema/portfolio";
import type {
  Post,
  PostCategory,
  PostNeighbors,
  PostPage,
  PostSummary,
} from "@/types/blog";

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

// 배열이면 첫 값을 쓰고 1-999999 범위의 정수가 아니면 1페이지로 취급함
export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1;
}

// 공개와 admin 페이지가 공유하는 category 쿼리 해석 지점
// 배열이면 첫 값을 쓰고 trim 후 NFC로 정규화함
// 빈 값이나 라벨 길이 상한 초과는 필터 없음으로 취급함
export function normalizeCategoryParam(
  raw: string | string[] | undefined,
): string | undefined {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().normalize("NFC");
  return value && value.length <= POST_LABEL_MAX ? value : undefined;
}

// category는 normalizeCategoryParam을 거친 값만 받음
export const listPosts = cache(
  async (
    page: number,
    pageSize: number,
    category?: string,
  ): Promise<PostPage> => {
    const where = category
      ? sql`${posts.categories} @> array[${category}]::text[]`
      : undefined;
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
