import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// await된 쿼리 체인마다 큐에서 결과를 하나씩 꺼내는 DB 대역
const results: unknown[] = [];
const batch = vi.fn();
const setCalls: Record<string, unknown>[] = [];
function chain(): unknown {
  const target = () => undefined;
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        const next = results.shift();
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          next instanceof Error ? reject(next) : resolve(next);
      }
      if (prop === "set") {
        return (v: Record<string, unknown>) => {
          setCalls.push(v);
          return chain();
        };
      }
      return () => chain();
    },
  });
}
vi.mock("@/db", () => ({
  db: {
    select: () => chain(),
    update: () => chain(),
    delete: () => chain(),
    insert: () => chain(),
    execute: () => chain(),
    batch: (...a: unknown[]) => batch(...a),
  },
}));
const del = vi.fn();
vi.mock("@vercel/blob", () => ({ del: (...a: unknown[]) => del(...a) }));

import {
  deleteProject,
  SlugConflictError,
  updateProject,
  updateTalk,
} from "@/services/portfolio/portfolio-admin-service";

const HOST = "ci-test.public.blob.vercel-storage.com";
const OLD = `https://${HOST}/thumbnails/old.png`;
const NEW = `https://${HOST}/thumbnails/new.png`;

function row(thumbnail: string | null) {
  return {
    id: "p1",
    slug: "s",
    title: "t",
    period: "p",
    role: "r",
    techStack: [],
    summary: "s",
    link: null,
    thumbnail,
  };
}

const base = {
  slug: "s",
  title: "t",
  period: "p",
  role: "r",
  summary: "s",
  techStack: [],
  experiences: [],
};

// 편집 전 썸네일이 oldValue, 저장 후 DB 값이 savedValue인 상황
// 순서는 existing 조회, loadProjectById 조회, experiences 조회, 참조 확인 조회
function arrange(oldValue: string | null, savedValue: string | null) {
  results.push([{ id: "p1", thumbnail: oldValue }]);
  batch.mockResolvedValue([]);
  results.push([row(savedValue)]);
  results.push([]);
  results.push([]);
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_BLOB_HOSTNAME", HOST);
  results.length = 0;
  setCalls.length = 0;
  batch.mockReset();
  del.mockReset();
  del.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("프로젝트 편집의 썸네일 처리", () => {
  it("thumbnail을 생략하면 UPDATE 값에 썸네일이 없고 Blob을 지우지 않는다", async () => {
    arrange(OLD, OLD);
    await updateProject("s", base);
    expect(batch).toHaveBeenCalledOnce();
    expect(setCalls[0]).not.toHaveProperty("thumbnail");
    expect(del).not.toHaveBeenCalled();
  });

  it("빈 문자열이면 null로 저장되고 이전 Blob을 지운다", async () => {
    arrange(OLD, null);
    await updateProject("s", { ...base, thumbnail: "" });
    expect(setCalls[0].thumbnail).toBeNull();
    expect(del).toHaveBeenCalledWith(OLD);
  });

  it("새 URL로 교체하면 이전 Blob을 지운다", async () => {
    arrange(OLD, NEW);
    await updateProject("s", { ...base, thumbnail: NEW });
    expect(setCalls[0].thumbnail).toBe(NEW);
    expect(del).toHaveBeenCalledWith(OLD);
  });

  it("다른 행이 이전 Blob을 참조하면 지우지 않는다", async () => {
    results.push([{ id: "p1", thumbnail: OLD }]);
    batch.mockResolvedValue([]);
    results.push([row(NEW)]);
    results.push([]);
    results.push([{ id: "other" }]);
    await updateProject("s", { ...base, thumbnail: NEW });
    expect(del).not.toHaveBeenCalled();
  });

  it("이전 값이 /images 경로면 삭제 대상이 아니다", async () => {
    arrange("/images/a.png", NEW);
    await updateProject("s", { ...base, thumbnail: NEW });
    expect(del).not.toHaveBeenCalled();
  });

  it("Blob 삭제가 실패해도 저장은 성공한다", async () => {
    arrange(OLD, NEW);
    del.mockRejectedValue(new Error("fail"));
    const project = await updateProject("s", { ...base, thumbnail: NEW });
    expect(project.thumbnail).toBe(NEW);
  });

  it("프로젝트 삭제는 Blob 썸네일을 지우고 /images는 지우지 않는다", async () => {
    results.push([{ id: "p1", thumbnail: OLD }], []);
    await deleteProject("s");
    expect(del).toHaveBeenCalledWith(OLD);
    del.mockClear();
    results.push([{ id: "p1", thumbnail: "/images/a.png" }]);
    await deleteProject("s");
    expect(del).not.toHaveBeenCalled();
  });
});

describe("slug unique 위반 변환", () => {
  it("프로젝트 편집은 SlugConflictError", async () => {
    results.push([{ id: "p1", thumbnail: null }]);
    batch.mockRejectedValue({ code: "23505" });
    await expect(updateProject("s", { ...base, slug: "x" })).rejects.toThrow(
      SlugConflictError,
    );
  });

  it("drizzle 래핑 에러(cause.code)도 변환한다", async () => {
    results.push([{ id: "p1", thumbnail: null }]);
    batch.mockRejectedValue(new Error("wrapped", { cause: { code: "23505" } }));
    await expect(updateProject("s", { ...base, slug: "x" })).rejects.toThrow(
      SlugConflictError,
    );
  });

  it("발표 편집은 SlugConflictError", async () => {
    results.push(Object.assign(new Error("dup"), { code: "23505" }));
    await expect(
      updateTalk("s", {
        slug: "x",
        title: "t",
        date: "2025.06",
        venue: "v",
        description: "d",
        impact: "i",
        link: "",
      }),
    ).rejects.toThrow(SlugConflictError);
  });
});
