import "server-only";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { POST_ADMIN_PAGE_SIZE, POST_PAGE_SIZE } from "@/constants/blog";
import { db } from "@/db";
import { posts } from "@/db/schema/portfolio";
import type { Post, PostCategory, PostPage, PostSummary } from "@/types/blog";

type PostRow = typeof posts.$inferSelect;

function toPostSummary(
  row: Pick<
    PostRow,
    "slug" | "title" | "publishedAt" | "categories" | "tags" | "published"
  >,
): PostSummary {
  return {
    slug: row.slug,
    title: row.title,
    publishedAt: row.publishedAt,
    categories: row.categories,
    tags: row.tags,
    published: row.published,
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

async function listPosts(
  page: number,
  pageSize: number,
  publishedOnly: boolean,
  category?: string,
): Promise<PostPage> {
  const normalized = category?.trim().normalize("NFC");
  const where = and(
    publishedOnly ? eq(posts.published, true) : undefined,
    normalized
      ? sql`${posts.categories} @> array[${normalized}]::text[]`
      : undefined,
  );
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
            published: posts.published,
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
}

export const listPublicPosts = cache(
  (page: number, category?: string): Promise<PostPage> =>
    listPosts(page, POST_PAGE_SIZE, true, category),
);

export const listAdminPosts = cache(
  (page: number): Promise<PostPage> =>
    listPosts(page, POST_ADMIN_PAGE_SIZE, false),
);

export const listPublicCategories = cache(async (): Promise<PostCategory[]> => {
  const name = sql<string>`unnest(${posts.categories})`.as("name");
  const unnested = db
    .select({ name })
    .from(posts)
    .where(eq(posts.published, true))
    .as("unnested");
  return db
    .select({ name: unnested.name, count: count() })
    .from(unnested)
    .groupBy(unnested.name)
    .orderBy(desc(count()), unnested.name);
});

async function findPost(
  slug: string,
  publishedOnly: boolean,
): Promise<Post | null> {
  const [row] = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.slug, slug),
        publishedOnly ? eq(posts.published, true) : undefined,
      ),
    );
  return row ? toPost(row) : null;
}

export const getPublicPost = cache(
  (slug: string): Promise<Post | null> => findPost(slug, true),
);

export const getAdminPost = cache(
  (slug: string): Promise<Post | null> => findPost(slug, false),
);
