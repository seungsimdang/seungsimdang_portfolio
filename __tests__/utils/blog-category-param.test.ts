import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));

import { POST_LABEL_MAX } from "@/constants/blog";
import { normalizeCategoryParam } from "@/utils/blog-query-params";

describe("normalizeCategoryParam", () => {
  it("앞뒤 공백을 걷어 낸다", () => {
    expect(normalizeCategoryParam("  알고리즘 ")).toBe("알고리즘");
  });

  it("분해된 한글을 NFC로 정규화한다", () => {
    expect(normalizeCategoryParam("한글".normalize("NFD"))).toBe("한글");
  });

  it("배열이면 첫 값만 쓴다", () => {
    expect(normalizeCategoryParam(["a", "b"])).toBe("a");
    expect(normalizeCategoryParam([" ", "b"])).toBeUndefined();
  });

  it.each([undefined, "", "   ", []])("%j는 필터 없음이다", (raw) => {
    expect(normalizeCategoryParam(raw)).toBeUndefined();
  });

  it("라벨 상한 길이는 통과하고 초과는 필터 없음이다", () => {
    const max = "a".repeat(POST_LABEL_MAX);
    expect(normalizeCategoryParam(max)).toBe(max);
    expect(normalizeCategoryParam(`${max}a`)).toBeUndefined();
  });

  it("상한 길이는 트림 후 기준으로 판단한다", () => {
    const max = "a".repeat(POST_LABEL_MAX);
    expect(normalizeCategoryParam(` ${max} `)).toBe(max);
  });
});
