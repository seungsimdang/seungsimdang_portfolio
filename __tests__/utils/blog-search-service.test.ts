import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// db.select 체인을 흉내 내어 where에 전달된 SQL 조건과 batch 호출만 기록함
const state = vi.hoisted(() => ({
  wheres: [] as unknown[],
  batches: 0,
  total: 0,
  rows: [] as unknown[],
}));

vi.mock("@/db", () => {
  const rowsChain = () => {
    const chain = {
      where(condition: unknown) {
        state.wheres.push(condition);
        return chain;
      },
      from: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      offset: () => chain,
      // biome-ignore lint/suspicious/noThenProperty: drizzle 쿼리 빌더가 await 가능한 thenable이라 같은 형태로 흉내 냄
      then(resolve: (value: unknown) => void) {
        resolve(state.rows);
      },
      kind: "rows",
    };
    return chain;
  };
  const countChain = () => {
    const chain = {
      from: () => chain,
      where(condition: unknown) {
        state.wheres.push(condition);
        return chain;
      },
      // biome-ignore lint/suspicious/noThenProperty: drizzle 쿼리 빌더가 await 가능한 thenable이라 같은 형태로 흉내 냄
      then(resolve: (value: unknown) => void) {
        resolve([{ total: state.total }]);
      },
      kind: "count",
    };
    return chain;
  };
  return {
    db: {
      select(fields: Record<string, unknown>) {
        return "total" in fields ? countChain() : rowsChain();
      },
      execute: () => ({ kind: "timeout" }),
      batch: async (queries: { kind: string }[]) => {
        state.batches += 1;
        return [
          [],
          queries[1].kind === "count" ? [{ total: state.total }] : state.rows,
        ];
      },
    },
  };
});

import { listPosts } from "@/services/blog/blog-service";

const dialect = new PgDialect();
const render = (condition: unknown) =>
  dialect.sqlToQuery(condition as Parameters<PgDialect["sqlToQuery"]>[0]);

beforeEach(() => {
  state.wheres = [];
  state.batches = 0;
  state.total = 3;
  state.rows = [
    {
      slug: "s",
      title: "t",
      publishedAt: "2025-01-01",
      categories: [],
      tags: [],
    },
  ];
});

describe("listPosts 검색 조건", () => {
  it("count와 목록 쿼리에 같은 조건이 적용", async () => {
    await listPosts(1, 20, "Dev", "abc");
    expect(state.wheres).toHaveLength(2);
    const [countWhere, rowsWhere] = state.wheres.map(render);
    expect(countWhere).toEqual(rowsWhere);
    expect(countWhere.sql).toContain("ilike");
    expect(countWhere.sql).toContain("@>");
  });
  it("이스케이프된 패턴이 바인딩 파라미터로만 전달되고 SQL 문자열에는 없음", async () => {
    await listPosts(1, 20, undefined, "a%_\\'; drop table posts;--");
    const query = render(state.wheres[0]);
    const pattern = "%a\\%\\_\\\\'; drop table posts;--%";
    expect(query.params).toEqual([pattern, pattern]);
    expect(query.sql).not.toContain("drop table");
  });
  it("q가 없거나 공백이면 검색 조건과 batch 없이 조회", async () => {
    await listPosts(1, 20);
    await listPosts(1, 20, undefined, "   ");
    expect(state.batches).toBe(0);
    for (const where of state.wheres) {
      expect(where).toBeUndefined();
    }
  });
  it("q가 있으면 count와 목록 모두 timeout과 함께 batch로 실행", async () => {
    await listPosts(1, 20, undefined, "abc");
    expect(state.batches).toBe(2);
  });
  it("결과가 0건이면 목록 쿼리를 실행하지 않고 total 0을 반환", async () => {
    state.total = 0;
    const result = await listPosts(5, 20, undefined, "abc");
    expect(state.batches).toBe(1);
    expect(result).toMatchObject({
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
    });
  });
  it("범위를 넘은 page는 마지막 페이지로 보정", async () => {
    state.total = 45;
    const result = await listPosts(999, 20, undefined, "abc");
    expect(result).toMatchObject({ page: 3, totalPages: 3, total: 45 });
  });
});
