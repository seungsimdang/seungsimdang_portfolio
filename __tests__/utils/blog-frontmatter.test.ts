import { describe, expect, it } from "vitest";
import { parsePostMarkdown } from "@/lib/blog/frontmatter";

describe("parsePostMarkdown", () => {
  it("정상 frontmatter와 본문을 분리한다", () => {
    const result = parsePostMarkdown(
      "---\ntitle: 제목\ncategories: [a, b]\ntags:\n  - x\npublished: false\n---\n본문",
    );
    expect(result.error).toBeUndefined();
    expect(result.frontmatter).toEqual({
      title: "제목",
      categories: ["a", "b"],
      tags: ["x"],
      unpublished: true,
    });
    expect(result.body).toBe("본문");
  });

  it("categories 문자열 단일 값은 배열로 승격한다", () => {
    expect(
      parsePostMarkdown("---\ncategories: algorithm\n---\nb").frontmatter
        .categories,
    ).toEqual(["algorithm"]);
  });

  it("toc 계열 키는 결과에 포함하지 않는다", () => {
    const { frontmatter } = parsePostMarkdown(
      "---\ntitle: t\ntoc: true\ntoc_sticky: true\ntoc_label: x\n---\nb",
    );
    expect(Object.keys(frontmatter)).toEqual(["title"]);
  });

  it("date를 YYYY-MM-DD로 정규화한다", () => {
    expect(
      parsePostMarkdown("---\ndate: 2024-10-06 12:00:00 +0900\n---\nb")
        .frontmatter.date,
    ).toBe("2024-10-06");
    expect(
      parsePostMarkdown('---\ndate: "2024-10-06"\n---\nb').frontmatter.date,
    ).toBe("2024-10-06");
  });

  it("빈 title은 빈 문자열로 돌려준다", () => {
    expect(parsePostMarkdown("---\ntitle: ''\n---\nb").frontmatter.title).toBe(
      "",
    );
  });

  it("frontmatter가 없으면 본문 전체를 돌려주고 오류가 없다", () => {
    expect(parsePostMarkdown("# 제목\n본문")).toEqual({
      frontmatter: {},
      body: "# 제목\n본문",
    });
  });

  it("빈 frontmatter는 빈 객체와 본문을 돌려준다", () => {
    const result = parsePostMarkdown("---\n---\n본문");
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("본문");
    expect(result.error).toBeUndefined();
  });

  it("YAML이 깨지면 오류와 원문 전체를 돌려준다", () => {
    const raw = "---\ntitle: [unclosed\n---\n본문";
    const result = parsePostMarkdown(raw);
    expect(result.error).toBeTruthy();
    expect(result.body).toBe(raw);
  });

  it.each([
    ["title이 객체", "title: {a: 1}"],
    ["tags에 객체", "tags: [{a: 1}]"],
    ["최상위가 배열", "- a\n- b"],
  ])("%s이면 오류다", (_name, yaml) => {
    expect(parsePostMarkdown(`---\n${yaml}\n---\nb`).error).toBeTruthy();
  });

  it("boolean이 아닌 published는 오류 없이 무시한다", () => {
    const result = parsePostMarkdown("---\npublished: yes-please\n---\nb");
    expect(result.error).toBeUndefined();
    expect(result.frontmatter).toEqual({});
  });

  it("BOM과 CRLF를 흡수한다", () => {
    const result = parsePostMarkdown("﻿---\r\ntitle: 제목\r\n---\r\n본문\r\n줄");
    expect(result.frontmatter.title).toBe("제목");
    expect(result.body).toBe("본문\n줄");
  });

  it("빈 문자열도 오류 없이 처리한다", () => {
    expect(parsePostMarkdown("")).toEqual({ frontmatter: {}, body: "" });
  });
});
