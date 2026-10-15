import "server-only";
import { and, asc, count, desc, eq, gt, ilike, lt, or, sql } from "drizzle-orm";
import { cache } from "react";
import { POST_SEARCH_TIMEOUT_MS } from "@/constants/blog";
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

// neon-http는 쿼리마다 별도 HTTP 요청이라 세션 SET이 유지되지 않음
// batch가 한 트랜잭션으로 실행되므로 set_config의 is_local=true(SET LOCAL과 같음)가 뒤따르는 쿼리에만 적용됨
// 시간 초과는 PG 57014 오류로 던져짐
// Route Handler 경로는 500으로 응답하고 클라이언트는 5xx를 재시도하지 않음
// 서버 페이지 경로는 QueriesHydration이 fetchQuery 실패를 잡아 skipSsrOnError 기본값에 따라 ClientOnly로 폴백하고 클라이언트 조회로 넘어감
function searchTimeout() {
  return db.execute(
    sql`select set_config('statement_timeout', ${String(POST_SEARCH_TIMEOUT_MS)}, true)`,
  );
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
    const countQuery = db.select({ total: count() }).from(posts).where(where);
    const [{ total = 0 } = {}] = pattern
      ? (await db.batch([searchTimeout(), countQuery]))[1]
      : await countQuery;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(Math.max(1, page), totalPages);
    const rowsQuery = db
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
    let rows: Awaited<typeof rowsQuery> = [];
    if (total > 0) {
      rows = pattern
        ? (await db.batch([searchTimeout(), rowsQuery]))[1]
        : await rowsQuery;
    }
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
