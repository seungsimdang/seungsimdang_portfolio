import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));

import { postExcerpt } from "@/lib/blog/excerpt";
import { parsePageParam } from "@/services/blog/blog-service";

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
});
