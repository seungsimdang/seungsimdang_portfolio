import { describe, expect, it } from "vitest";

import { postExcerpt } from "@/lib/blog/excerpt";
import { parsePageParam } from "@/utils/blog-query-params";

describe("parsePageParam", () => {
  it.each([
    ["1", 1],
    ["2", 2],
    ["999999", 999999],
  ])("%s는 %i 페이지다", (raw, expected) => {
    expect(parsePageParam(raw)).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "0",
    "-1",
    "abc",
    "1.5",
    "01",
    "1e3",
    " 2",
    "1000000",
    "9007199254740993",
  ])("%s는 1페이지로 취급한다", (raw) => {
    expect(parsePageParam(raw)).toBe(1);
  });

  it("배열이면 첫 값을 쓴다", () => {
    expect(parsePageParam(["3", "5"])).toBe(3);
    expect(parsePageParam(["x", "5"])).toBe(1);
    expect(parsePageParam([])).toBe(1);
  });
});

describe("postExcerpt", () => {
  it("마크다운 기호, 코드 블록, 이미지, HTML을 걷어 낸다", () => {
    const md =
      "# 제목\n\n**굵게** [링크](http://a)\n\n```js\nconst a = 1;\n```\n\n![alt](u.png)\n<b>태그</b>";
    const text = postExcerpt(md);
    expect(text).toBe("제목 굵게 링크 태그");
  });

  it("160자를 넘기면 말줄임표로 자른다", () => {
    const text = postExcerpt("가".repeat(300));
    expect(text.length).toBe(160);
    expect(text.endsWith("…")).toBe(true);
  });

  it("160자 이하는 그대로 둔다", () => {
    expect(postExcerpt("가".repeat(160))).toBe("가".repeat(160));
  });

  it("빈 본문은 빈 문자열이다", () => {
    expect(postExcerpt("")).toBe("");
  });

  it("밑줄과 별표가 든 식별자는 훼손하지 않는다", () => {
    expect(postExcerpt("use_state와 a*b 그리고 `snake_case`")).toBe(
      "use_state와 a*b 그리고 snake_case",
    );
  });

  it("닫히지 않은 코드 펜스 안의 코드는 요약에 넣지 않는다", () => {
    expect(postExcerpt("설명\n\n```js\nconst a = 1;")).toBe("설명");
  });

  it("부등호가 있는 문장은 태그로 오인하지 않는다", () => {
    expect(postExcerpt("a < b 이고 c > d 이다")).toBe("a < b 이고 c > d 이다");
  });

  it("참조형 링크는 링크 텍스트만 남긴다", () => {
    expect(postExcerpt("[문서][ref]\n\n[ref]: https://a.b")).toBe("문서");
  });

  it("줄바꿈과 인라인 HTML 자리에서 단어가 붙지 않는다", () => {
    expect(postExcerpt("line  \nbreak 그리고 a<br>b")).toBe(
      "line break 그리고 a b",
    );
  });

  it("각주 본문은 요약에 넣지 않는다", () => {
    expect(postExcerpt("본문[^1]\n\n[^1]: 각주 내용")).toBe("본문");
  });

  it("이모지를 자르는 위치에서도 서로게이트 쌍을 가르지 않는다", () => {
    const text = postExcerpt("😀".repeat(200));
    expect(Array.from(text)).toHaveLength(160);
    expect(text.endsWith("😀…")).toBe(true);
  });
});
