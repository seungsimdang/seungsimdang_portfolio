import { describe, expect, it } from "vitest";
import {
  insertImageMarkdown,
  todayInSeoul,
} from "@/lib/admin-client/post-editing";

describe("insertImageMarkdown", () => {
  it("빈 본문에는 이미지만 넣고 커서를 끝에 둔다", () => {
    expect(insertImageMarkdown("", 0, "a", "https://x/y.png")).toEqual({
      text: "![a](https://x/y.png)",
      cursor: "![a](https://x/y.png)".length,
    });
  });

  it("줄 중간이면 앞뒤에 줄바꿈을 보강하고 커서는 삽입 뒤로 간다", () => {
    const result = insertImageMarkdown("abcdef", 3, "a", "https://x/y.png");
    expect(result.text).toBe("abc\n![a](https://x/y.png)\ndef");
    expect(result.cursor).toBe("abc\n![a](https://x/y.png)\n".length);
  });

  it("줄 시작과 끝에서는 불필요한 줄바꿈을 넣지 않는다", () => {
    expect(insertImageMarkdown("abc\ndef", 4, "a", "u").text).toBe(
      "abc\n![a](u)def".replace("![a](u)def", "![a](u)\ndef"),
    );
    expect(insertImageMarkdown("abc\n", 4, "a", "u").text).toBe("abc\n![a](u)");
  });

  it("본문 끝에는 앞에만 줄바꿈을 넣는다", () => {
    expect(insertImageMarkdown("abc", 3, "a", "u").text).toBe("abc\n![a](u)");
  });

  it("범위를 벗어난 위치는 본문 범위로 보정한다", () => {
    expect(insertImageMarkdown("abc", 99, "a", "u").text).toBe("abc\n![a](u)");
    expect(insertImageMarkdown("abc", -5, "a", "u").text).toBe("![a](u)\nabc");
  });

  it("alt의 대괄호와 역슬래시를 이스케이프한다", () => {
    expect(insertImageMarkdown("", 0, "a]b[c\\d", "u").text).toBe(
      "![a\\]b\\[c\\\\d](u)",
    );
  });

  it("URL의 공백을 퍼센트 인코딩한다", () => {
    expect(insertImageMarkdown("", 0, "a", "https://x/a b.png").text).toBe(
      "![a](https://x/a%20b.png)",
    );
  });

  it("URL의 괄호를 퍼센트 인코딩해 이미지 문법이 닫히지 않게 한다", () => {
    expect(insertImageMarkdown("", 0, "a", "https://x/a(1).png").text).toBe(
      "![a](https://x/a%281%29.png)",
    );
  });
});

describe("todayInSeoul", () => {
  it("YYYY-MM-DD 형식이다", () => {
    expect(todayInSeoul()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
