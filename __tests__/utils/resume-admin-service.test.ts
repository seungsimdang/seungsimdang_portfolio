import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob", () => ({ del: vi.fn() }));

// await된 쿼리 체인마다 큐에서 결과를 하나씩 꺼내는 DB 대역
const results: unknown[] = [];
const batch = vi.fn();
const executed: unknown[] = [];
const updateCalls = vi.fn();
function chain(): unknown {
  return new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === "then") {
        const next = results.shift();
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          next instanceof Error ? reject(next) : resolve(next);
      }
      return () => chain();
    },
  });
}
vi.mock("@/db", () => ({
  db: {
    select: () => chain(),
    update: () => {
      updateCalls();
      return chain();
    },
    delete: () => chain(),
    insert: () => chain(),
    execute: (q: unknown) => {
      executed.push(q);
      return chain();
    },
    batch: (...a: unknown[]) => batch(...a),
  },
}));

import {
  createResumeEntry,
  deleteResumeEntry,
  LimitExceededError,
  NotFoundError,
  OrderMismatchError,
  reorderResumeEntries,
  SlugConflictError,
  updateResumeEntry,
} from "@/services/portfolio/portfolio-admin-service";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const input = {
  kind: "work" as const,
  period: "",
  title: "t",
  subtitle: "",
  details: [],
};
const dialect = new PgDialect();

beforeEach(() => {
  results.length = 0;
  executed.length = 0;
  batch.mockReset();
  updateCalls.mockReset();
});

describe("이력 정렬 집합 검사", () => {
  it("같은 집합의 다른 순서는 통과하고 id마다 UPDATE를 실행한다", async () => {
    results.push([{ id: id(1) }, { id: id(2) }, { id: id(3) }]);
    batch.mockResolvedValue([]);
    await reorderResumeEntries("work", [id(3), id(1), id(2)]);
    expect(batch).toHaveBeenCalledOnce();
    expect((batch.mock.calls[0][0] as unknown[]).length).toBe(3);
    expect(updateCalls).toHaveBeenCalledTimes(3);
  });

  it("요청에 id가 빠지면 OrderMismatchError", async () => {
    results.push([{ id: id(1) }, { id: id(2) }]);
    await expect(reorderResumeEntries("work", [id(1)])).rejects.toThrow(
      OrderMismatchError,
    );
    expect(batch).not.toHaveBeenCalled();
  });

  it("요청에 모르는 id가 더해지면 OrderMismatchError", async () => {
    results.push([{ id: id(1) }]);
    await expect(reorderResumeEntries("work", [id(1), id(2)])).rejects.toThrow(
      OrderMismatchError,
    );
    expect(batch).not.toHaveBeenCalled();
  });

  it("개수는 같고 id가 다르면 OrderMismatchError", async () => {
    results.push([{ id: id(1) }, { id: id(2) }]);
    await expect(reorderResumeEntries("work", [id(1), id(9)])).rejects.toThrow(
      OrderMismatchError,
    );
    expect(batch).not.toHaveBeenCalled();
  });

  it("해당 kind에 항목이 없으면 어떤 요청도 OrderMismatchError", async () => {
    results.push([]);
    await expect(reorderResumeEntries("award", [id(1)])).rejects.toThrow(
      OrderMismatchError,
    );
  });
});

describe("이력 생성", () => {
  it("batch 마지막 결과의 행을 ResumeEntry로 변환해 반환한다", async () => {
    const row = {
      id: id(1),
      kind: "work",
      sortOrder: 0,
      period: "p",
      title: "t",
      subtitle: "s",
      details: ["d"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    batch.mockResolvedValue([[], [], [row]]);
    const created = await createResumeEntry(input);
    expect(created).toEqual({
      id: id(1),
      kind: "work",
      period: "p",
      title: "t",
      subtitle: "s",
      details: ["d"],
    });
  });

  it("상한 검사 쿼리는 요청 kind로 개수를 센다", async () => {
    batch.mockResolvedValue([
      [],
      [],
      [
        {
          id: id(1),
          kind: "award",
          period: "",
          title: "t",
          subtitle: "",
          details: [],
        },
      ],
    ]);
    await createResumeEntry({ ...input, kind: "award" });
    const guard = dialect.sqlToQuery(executed[1] as never);
    expect(guard.sql).toContain('"kind" = $');
    expect(guard.params).toContain("award");
    expect(guard.params).toContain(50);
  });

  it("0으로 나누기 오류는 LimitExceededError", async () => {
    batch.mockRejectedValue({ code: "22012" });
    await expect(createResumeEntry(input)).rejects.toThrow(LimitExceededError);
  });

  it("drizzle 래핑 오류의 cause 코드도 LimitExceededError", async () => {
    batch.mockRejectedValue(new Error("w", { cause: { code: "22012" } }));
    await expect(createResumeEntry(input)).rejects.toThrow(LimitExceededError);
  });

  it("그 밖의 오류는 그대로 다시 던진다", async () => {
    const boom = new Error("boom");
    batch.mockRejectedValue(boom);
    await expect(createResumeEntry(input)).rejects.toBe(boom);
  });

  it("unique 위반은 SlugConflictError로 변환된다", async () => {
    batch.mockRejectedValue({ code: "23505" });
    await expect(createResumeEntry(input)).rejects.toThrow(SlugConflictError);
  });
});

describe("이력 수정과 삭제", () => {
  it("uuid가 아닌 id는 DB 호출 없이 NotFoundError", async () => {
    await expect(updateResumeEntry("abc", input)).rejects.toThrow(
      NotFoundError,
    );
    await expect(deleteResumeEntry("abc")).rejects.toThrow(NotFoundError);
    expect(updateCalls).not.toHaveBeenCalled();
  });

  it("없는 id의 수정과 삭제는 NotFoundError", async () => {
    results.push([], []);
    await expect(updateResumeEntry(id(1), input)).rejects.toThrow(
      NotFoundError,
    );
    await expect(deleteResumeEntry(id(1))).rejects.toThrow(NotFoundError);
  });

  it("존재하는 id의 삭제는 성공한다", async () => {
    results.push([{ id: id(1) }]);
    await expect(deleteResumeEntry(id(1))).resolves.toBeUndefined();
  });
});
