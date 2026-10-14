import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown/render-markdown";

const html = (source: string) =>
  renderToStaticMarkup(renderMarkdown(source) as ReactElement);

describe("renderMarkdown 정화", () => {
  it("script 태그를 제거한다", () => {
    const out = html("a<script>alert(1)</script>b");
    expect(out).not.toContain("<script");
  });

  it("on* 이벤트 핸들러 속성을 제거한다", () => {
    const out = html(
      '<a href="https://a.com" onclick="x()">t</a>\n\n<img src="https://a.com/x.png" onerror="x()">',
    );
    expect(out).not.toMatch(/onclick|onerror/i);
  });

  it("javascript: 링크의 href를 제거한다", () => {
    const out = html(
      '[x](javascript:alert(1))\n\n<a href="JaVaScRiPt:alert(1)">y</a>',
    );
    expect(out).not.toMatch(/javascript:/i);
  });

  it("data: 링크와 data: 이미지를 허용하지 않는다", () => {
    const out = html(
      "[x](data:text/html,<b>)\n\n![i](data:image/png;base64,AAAA)",
    );
    expect(out).not.toMatch(/href="data:/i);
    expect(out).not.toMatch(/src="data:/i);
  });

  it("http 이미지는 img를 만들지 않고 alt 텍스트만 남긴다", () => {
    const out = html("![대체](http://a.com/x.png)");
    expect(out).not.toContain("<img");
    expect(out).toContain("대체");
  });

  it("https 이미지는 img로 렌더링하고 alt를 유지한다", () => {
    const out = html("![그림](https://a.com/x.png)");
    expect(out).toContain("<img");
    expect(out).toContain('alt="그림"');
  });

  it("iframe과 style 태그를 제거한다", () => {
    const out = html('<iframe src="https://a.com"></iframe><style>a{}</style>');
    expect(out).not.toMatch(/<iframe|<style/);
  });

  it("본문 h1은 h2로 강등하고 나머지도 한 단계씩 낮춘다", () => {
    const out = html("# a\n\n## b\n\n### c\n\n###### d");
    expect(out).not.toContain("<h1");
    expect(out).toContain("<h2");
    expect(out).toContain("<h3");
    expect(out).toContain("<h4");
    expect(out).toMatch(/<h6[^>]*>d/);
  });

  it("외부 링크는 새 탭과 rel을 갖고 내부·mailto 링크는 갖지 않는다", () => {
    const ext = html("[a](https://a.com) [b](http://b.com)");
    expect(ext.match(/target="_blank"/g)).toHaveLength(2);
    expect(ext.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    const internal = html("[a](/blog) [m](mailto:a@b.c)");
    expect(internal).not.toContain("target=");
  });

  it("표를 포커스 가능한 스크롤 래퍼로 감싼다", () => {
    const out = html("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(out).toMatch(/<section[^>]*class="table-scroll"[^>]*>/);
    expect(out).toContain('tabindex="0"');
    expect(out).toContain('aria-label="표"');
    expect(out).toContain("<table");
  });

  it("pre에 tabIndex를 붙이고 언어 클래스는 허용한다", () => {
    const out = html("```js\nconst a = 1;\n```");
    expect(out).toMatch(/<pre[^>]*tabindex="0"/);
    expect(out).toContain("language-js");
  });

  it("code의 임의 class는 제거한다", () => {
    const out = html('<code class="evil x">a</code>');
    expect(out).not.toContain("evil");
  });

  it("닫히지 않은 코드 펜스와 빈 본문도 오류 없이 렌더링한다", () => {
    expect(() => html("```js\nconst a = 1;")).not.toThrow();
    expect(html("")).toBe("");
  });

  it("GFM 체크리스트, 취소선, 자동 링크를 지원한다", () => {
    const out = html("- [x] 완료\n\n~~지움~~\n\nhttps://a.com");
    expect(out).toContain('type="checkbox"');
    expect(out).toContain("<del>");
    expect(out).toContain('href="https://a.com"');
  });
});
