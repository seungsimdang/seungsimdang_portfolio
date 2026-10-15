import { describe, expect, it } from "vitest";
import { toValueItems } from "@/lib/admin-client/draft";
import { todayInSeoul } from "@/lib/admin-client/post-editing";
import { parsePostMarkdown } from "@/lib/blog/frontmatter";
import {
  buildPostTemplate,
  POST_TEMPLATE_FILE_NAME,
} from "@/lib/blog/post-template";
import { parsePostFileName, slugifyPostName } from "@/lib/blog/slug";
import { postCreateFormSchema } from "@/schemas/blog.schema";

const DATE = "2026-10-15";

describe("buildPostTemplate 왕복", () => {
  const parsed = parsePostMarkdown(buildPostTemplate(DATE));

  it("파싱 오류와 비공개 표시가 없다", () => {
    expect(parsed.error).toBeUndefined();
    expect(parsed.frontmatter.unpublished).toBeUndefined();
  });

  it("title, date, categories, tags를 읽는다", () => {
    expect(parsed.frontmatter.title).toBe("글 제목을 입력하세요");
    expect(parsed.frontmatter.date).toBe(DATE);
    expect(parsed.frontmatter.categories).toEqual(["카테고리 예시"]);
    expect(parsed.frontmatter.tags).toEqual(["태그 예시1", "태그 예시2"]);
  });

  it("본문에 안내 주석 줄이 남지 않는다", () => {
    expect(parsed.body).toContain("본문을 작성하세요.");
    expect(
      parsed.body.split("\n").some((l) => l.trimStart().startsWith("# ")),
    ).toBe(false);
    expect(parsed.body).not.toContain("안내이며");
  });

  it("프론트매터 구간에 펜스 외의 --- 가 없다", () => {
    const text = buildPostTemplate(DATE);
    const lines = text.split("\n");
    const fences = lines.flatMap((l, i) => (l === "---" ? [i] : []));
    expect(fences).toHaveLength(2);
    expect(fences[0]).toBe(0);
    const front = lines.slice(1, fences[1]).join("\n");
    expect(front).not.toContain("---");
  });

  it("BOM과 CR이 없고 끝 개행이 정확히 1개다", () => {
    const text = buildPostTemplate(DATE);
    expect(text.charCodeAt(0)).not.toBe(0xfeff);
    expect(text).not.toContain("\r");
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });

  it("전달한 날짜가 그대로 date에 들어간다", () => {
    const other = parsePostMarkdown(buildPostTemplate("2030-01-02"));
    expect(other.frontmatter.date).toBe("2030-01-02");
  });
});

describe("POST_TEMPLATE_FILE_NAME", () => {
  it("파일명 날짜 접두로 인식되지 않는다", () => {
    expect(POST_TEMPLATE_FILE_NAME).toBe("blog-post-template.md");
    const name = parsePostFileName(POST_TEMPLATE_FILE_NAME);
    expect(name.date).toBeNull();
    expect(name.title).toBe("blog-post-template");
  });
});

describe("템플릿 가져오기 값의 폼 검증", () => {
  it("applyImport와 같은 모양의 값이 postCreateFormSchema를 통과한다", () => {
    const parsed = parsePostMarkdown(buildPostTemplate(todayInSeoul()));
    const name = parsePostFileName(POST_TEMPLATE_FILE_NAME);
    const { frontmatter } = parsed;
    const title = frontmatter.title || name.title;
    const date = name.date ?? frontmatter.date ?? todayInSeoul();
    const values = {
      slug: slugifyPostName(`${date}-${title}`),
      title,
      publishedAt: date.replaceAll("-", "."),
      categories: toValueItems(frontmatter.categories ?? []),
      tags: toValueItems(frontmatter.tags ?? []),
      content: parsed.body,
    };
    const result = postCreateFormSchema.safeParse(values);
    expect(result.success).toBe(true);
    expect(date).toBe(todayInSeoul());
  });
});
