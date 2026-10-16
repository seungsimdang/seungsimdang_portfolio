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

function row(thumbnails: string[], mobileThumbnails: string[] = []) {
  return {
    id: "p1",
    slug: "s",
    title: "t",
    period: "p",
    role: "r",
    techStack: [],
    summary: "s",
    link: null,
    thumbnails,
    mobileThumbnails,
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
function arrange(
  oldValue: string[],
  savedValue: string[],
  oldMobile: string[] = [],
  savedMobile: string[] = [],
) {
  results.push([
    { id: "p1", thumbnails: oldValue, mobileThumbnails: oldMobile },
  ]);
  batch.mockResolvedValue([]);
  results.push([row(savedValue, savedMobile)]);
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
  it("목록을 생략하면 UPDATE 값에 썸네일이 없고 Blob을 지우지 않는다", async () => {
    arrange([OLD], [OLD]);
    await updateProject("s", base);
    expect(batch).toHaveBeenCalledOnce();
    expect(setCalls[0]).not.toHaveProperty("thumbnails");
    expect(setCalls[0]).not.toHaveProperty("mobileThumbnails");
    expect(del).not.toHaveBeenCalled();
  });

  it("빈 배열이면 비우고 이전 Blob을 지운다", async () => {
    arrange([OLD], []);
    await updateProject("s", { ...base, thumbnails: [] });
    expect(setCalls[0].thumbnails).toEqual([]);
    expect(del).toHaveBeenCalledWith(OLD);
  });

  it("새 URL로 교체하면 이전 Blob을 지운다", async () => {
    arrange([OLD], [NEW]);
    await updateProject("s", { ...base, thumbnails: [NEW] });
    expect(setCalls[0].thumbnails).toEqual([NEW]);
    expect(del).toHaveBeenCalledWith(OLD);
  });

  it("다른 행이 이전 Blob을 참조하면 지우지 않는다", async () => {
    results.push([{ id: "p1", thumbnails: [OLD], mobileThumbnails: [] }]);
    batch.mockResolvedValue([]);
    results.push([row([NEW])]);
    results.push([]);
    results.push([{ id: "other" }]);
    await updateProject("s", { ...base, thumbnails: [NEW] });
    expect(del).not.toHaveBeenCalled();
  });

  it("다른 목록으로 옮겨 계속 쓰이는 URL은 지우지 않는다", async () => {
    arrange([OLD, NEW], [NEW], [], [OLD]);
    await updateProject("s", { ...base, thumbnails: [NEW] });
    expect(del).not.toHaveBeenCalled();
  });

  it("두 목록에서 모두 빠진 URL만 지운다", async () => {
    arrange([OLD], [NEW], [NEW]);
    await updateProject("s", { ...base, thumbnails: [NEW] });
    expect(del).toHaveBeenCalledOnce();
    expect(del).toHaveBeenCalledWith(OLD);
  });

  it("이전 값이 우리 Blob이 아니면 삭제 대상이 아니다", async () => {
    arrange(["/images/a.png"], [NEW]);
    await updateProject("s", { ...base, thumbnails: [NEW] });
    expect(del).not.toHaveBeenCalled();
  });

  it("Blob 삭제가 실패해도 저장은 성공한다", async () => {
    arrange([OLD], [NEW]);
    del.mockRejectedValue(new Error("fail"));
    const project = await updateProject("s", { ...base, thumbnails: [NEW] });
    expect(project.thumbnails).toEqual([NEW]);
  });

  it("기본 목록이 비게 되는데 모바일 목록이 남으면 거부한다", async () => {
    results.push([{ id: "p1", thumbnails: [OLD], mobileThumbnails: [NEW] }]);
    await expect(
      updateProject("s", { ...base, thumbnails: [] }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(batch).not.toHaveBeenCalled();
  });

  it("DB check 위반(23514)은 검증 오류로 변환한다", async () => {
    results.push([{ id: "p1", thumbnails: [OLD], mobileThumbnails: [] }]);
    batch.mockRejectedValue({ code: "23514" });
    await expect(updateProject("s", base)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("프로젝트 삭제는 두 목록의 Blob 썸네일을 지우고 다른 값은 지우지 않는다", async () => {
    results.push(
      [
        {
          id: "p1",
          thumbnails: [OLD, "/images/a.png"],
          mobileThumbnails: [NEW],
        },
      ],
      [],
      [],
    );
    await deleteProject("s");
    expect(del).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenCalledWith(OLD);
    expect(del).toHaveBeenCalledWith(NEW);
  });
});

describe("slug unique 위반 변환", () => {
  it("프로젝트 편집은 SlugConflictError", async () => {
    results.push([{ id: "p1", thumbnails: [], mobileThumbnails: [] }]);
    batch.mockRejectedValue({ code: "23505" });
    await expect(updateProject("s", { ...base, slug: "x" })).rejects.toThrow(
      SlugConflictError,
    );
  });

  it("drizzle 래핑 에러(cause.code)도 변환한다", async () => {
    results.push([{ id: "p1", thumbnails: [], mobileThumbnails: [] }]);
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
