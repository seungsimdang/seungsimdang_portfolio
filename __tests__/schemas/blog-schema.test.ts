import { describe, expect, it } from "vitest";
import {
  postCreateInputSchema,
  postSlugSchema,
  postUpdateInputSchema,
} from "@/schemas/blog.schema";

const valid = {
  title: "제목",
  content: "본문",
  categories: ["알고리즘"],
  tags: ["bfs"],
  publishedAt: "2024-10-06",
};

describe("postSlugSchema", () => {
  it.each(["2024-10-06-타일링", "abc", "a1-b2", "한글"])(
    "%s는 통과한다",
    (slug) => {
      expect(postSlugSchema.safeParse(slug).success).toBe(true);
    },
  );

  it.each(["", "-a", "a-", "a--b", "A", "a b", "a_b", "a/b", "a.b", "new"])(
    "'%s'는 거부한다",
    (slug) => {
      expect(postSlugSchema.safeParse(slug).success).toBe(false);
    },
  );

  it("200자는 통과하고 201자는 거부한다", () => {
    expect(postSlugSchema.safeParse("a".repeat(200)).success).toBe(true);
    expect(postSlugSchema.safeParse("a".repeat(201)).success).toBe(false);
  });

  it("new가 접두사인 slug는 허용한다", () => {
    expect(postSlugSchema.safeParse("new-post").success).toBe(true);
  });
});

describe("postCreateInputSchema", () => {
  it("정상 입력은 통과한다", () => {
    expect(
      postCreateInputSchema.safeParse({ ...valid, slug: "a-b" }).success,
    ).toBe(true);
  });

  it("slug가 없으면 거부한다", () => {
    expect(postCreateInputSchema.safeParse(valid).success).toBe(false);
  });
});

describe("postUpdateInputSchema", () => {
  it("slug 등 알 수 없는 키는 거부한다", () => {
    expect(
      postUpdateInputSchema.safeParse({ ...valid, slug: "a" }).success,
    ).toBe(false);
  });

  it("제목은 trim하고 NFC로 맞추며 빈 값은 거부한다", () => {
    const parsed = postUpdateInputSchema.parse({
      ...valid,
      title: ` ${"한".normalize("NFD")} `,
    });
    expect(parsed.title).toBe("한".normalize("NFC"));
    expect(
      postUpdateInputSchema.safeParse({ ...valid, title: "   " }).success,
    ).toBe(false);
  });

  it("제목 200자 초과를 거부한다", () => {
    expect(
      postUpdateInputSchema.safeParse({ ...valid, title: "a".repeat(201) })
        .success,
    ).toBe(false);
  });

  it("카테고리는 10개, 태그는 20개까지 허용한다", () => {
    const labels = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);
    expect(
      postUpdateInputSchema.safeParse({ ...valid, categories: labels(10) })
        .success,
    ).toBe(true);
    expect(
      postUpdateInputSchema.safeParse({ ...valid, categories: labels(11) })
        .success,
    ).toBe(false);
    expect(
      postUpdateInputSchema.safeParse({ ...valid, tags: labels(20) }).success,
    ).toBe(true);
    expect(
      postUpdateInputSchema.safeParse({ ...valid, tags: labels(21) }).success,
    ).toBe(false);
  });

  it("라벨은 50자 초과와 빈 값을 거부하고 중복은 합친다", () => {
    expect(
      postUpdateInputSchema.safeParse({ ...valid, tags: ["a".repeat(51)] })
        .success,
    ).toBe(false);
    expect(
      postUpdateInputSchema.safeParse({ ...valid, tags: [" "] }).success,
    ).toBe(false);
    expect(
      postUpdateInputSchema.parse({ ...valid, tags: ["a", "a", " a "] }).tags,
    ).toEqual(["a"]);
  });

  it("본문은 300000자까지 허용하고 초과는 거부한다", () => {
    expect(
      postUpdateInputSchema.safeParse({
        ...valid,
        content: "a".repeat(300_000),
      }).success,
    ).toBe(true);
    expect(
      postUpdateInputSchema.safeParse({
        ...valid,
        content: "a".repeat(300_001),
      }).success,
    ).toBe(false);
    expect(
      postUpdateInputSchema.safeParse({ ...valid, content: "" }).success,
    ).toBe(true);
  });

  it.each(["2024-02-30", "2024-13-01", "2024/10/06", "20241006", "abc"])(
    "발행일 %s는 거부한다",
    (publishedAt) => {
      expect(
        postUpdateInputSchema.safeParse({ ...valid, publishedAt }).success,
      ).toBe(false);
    },
  );

  it("윤일은 허용한다", () => {
    expect(
      postUpdateInputSchema.safeParse({ ...valid, publishedAt: "2024-02-29" })
        .success,
    ).toBe(true);
  });

  it("published 키 자체를 거부한다", () => {
    expect(
      postUpdateInputSchema.safeParse({ ...valid, published: true }).success,
    ).toBe(false);
  });
});
