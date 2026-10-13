import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => Promise.resolve([]) }),
      }),
    }),
  },
}));

import { loadProjects } from "@/services/portfolio/portfolio-service";

const HOST = "ci-test.public.blob.vercel-storage.com";

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
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const read = async (value: string | null, raw = false) =>
  (await loadProjects([row(value)], raw))[0].thumbnail;

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_BLOB_HOSTNAME", HOST);
});

describe("공개 읽기 썸네일 필터", () => {
  it("레거시 /images 경로는 그대로 렌더한다", async () => {
    expect(await read("/images/a-b_c.png")).toBe("/images/a-b_c.png");
  });

  it("Blob URL은 그대로 렌더한다", async () => {
    const url = `https://${HOST}/thumbnails/x.png`;
    expect(await read(url)).toBe(url);
  });

  it.each([
    "/images/../secret.png",
    "/images/a b.png",
    "/other/a.png",
    "javascript:alert(1)",
    "https://evil.example/thumbnails/x.png",
    `https://${HOST}.evil.test/thumbnails/x.png`,
    `http://${HOST}/thumbnails/x.png`,
  ])("%s는 썸네일만 생략한다", async (value) => {
    expect(await read(value)).toBeUndefined();
  });

  it("null은 undefined", async () => {
    expect(await read(null)).toBeUndefined();
  });

  it("raw=true는 DB 원값을 유지한다", async () => {
    expect(await read("/other/a.png", true)).toBe("/other/a.png");
  });

  it("Blob 호스트 환경변수가 없어도 /images는 읽힌다", async () => {
    vi.stubEnv("NEXT_PUBLIC_BLOB_HOSTNAME", "");
    expect(await read("/images/a.png")).toBe("/images/a.png");
  });
});
