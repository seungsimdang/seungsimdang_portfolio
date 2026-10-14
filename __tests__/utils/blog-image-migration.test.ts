import { describe, expect, it } from "vitest";
import { resolveLegacyImage } from "@/lib/blog/migration/legacy-image-url";
import {
  collectImageUrls,
  replaceImageUrls,
} from "@/lib/blog/migration/replace-image-urls";

const OWNER = "222SeungHyun/222SeungHyun.github.io";
const NEW_OWNER = "seungsimdang/seungsimdang.github.io";

describe("resolveLegacyImage", () => {
  it.each([
    [`https://github.com/${OWNER}/blob/main/_images/a.png`, "_images/a.png"],
    [
      `https://github.com/${OWNER}/blob/main/_images/a.png?raw=true`,
      "_images/a.png",
    ],
    [`https://github.com/${OWNER}/raw/main/_images/a.png`, "_images/a.png"],
    [
      `https://raw.githubusercontent.com/${OWNER}/main/_images/a.png`,
      "_images/a.png",
    ],
    [
      `https://github.com/${NEW_OWNER}/blob/master/_images/a.png`,
      "_images/a.png",
    ],
    [
      `https://raw.githubusercontent.com/${NEW_OWNER}/master/_images/a.png`,
      "_images/a.png",
    ],
  ])("%s를 저장소 상대 경로로 매핑한다", (url, expected) => {
    expect(resolveLegacyImage(url)).toBe(expected);
  });

  it("퍼센트 인코딩된 공백과 한글을 디코딩하고 NFC로 맞춘다", () => {
    const url = `https://github.com/${OWNER}/blob/main/_images/${encodeURIComponent("행렬 곱셈".normalize("NFD"))}.png`;
    expect(resolveLegacyImage(url)).toBe(
      "_images/행렬 곱셈.png".normalize("NFC"),
    );
  });

  it("다른 저장소와 다른 호스트는 null이다", () => {
    expect(
      resolveLegacyImage("https://github.com/other/repo/blob/main/a.png"),
    ).toBeNull();
    expect(
      resolveLegacyImage(`https://example.com/${OWNER}/blob/main/a.png`),
    ).toBeNull();
    expect(resolveLegacyImage("https://namu.wiki/a.png")).toBeNull();
  });

  it("저장소 페이지처럼 파일 경로가 없으면 null이다", () => {
    expect(resolveLegacyImage(`https://github.com/${OWNER}`)).toBeNull();
    expect(
      resolveLegacyImage(`https://github.com/${OWNER}/blob/main`),
    ).toBeNull();
    expect(
      resolveLegacyImage(`https://github.com/${OWNER}/tree/main/_images/a.png`),
    ).toBeNull();
  });

  it("경로 탈출(..)과 URL이 아닌 값은 null이다", () => {
    expect(
      resolveLegacyImage(
        `https://github.com/${OWNER}/blob/main/%2e%2e/%2e%2e/etc/passwd`,
      ),
    ).toBeNull();
    // URL 파서가 %2e%2e를 먼저 정규화하므로 저장소 안 경로로만 해석됨
    expect(
      resolveLegacyImage(
        `https://github.com/${OWNER}/blob/main/a/%2e%2e/b.png`,
      ),
    ).toBe("b.png");
    expect(resolveLegacyImage("/path/to/img.jpg")).toBeNull();
    expect(resolveLegacyImage("")).toBeNull();
  });

  it("잘못된 퍼센트 시퀀스는 null이다", () => {
    expect(
      resolveLegacyImage(`https://github.com/${OWNER}/blob/main/%E0%A4%A.png`),
    ).toBeNull();
  });
});

describe("collectImageUrls와 replaceImageUrls", () => {
  const map = (url: string) =>
    url.startsWith("https://old/")
      ? url.replace("https://old/", "https://blob/")
      : undefined;

  it("마크다운 이미지와 HTML img를 모두 수집한다", () => {
    const md =
      '![a](https://old/1.png)\n\n<img src="https://old/2.png" alt="b">';
    expect(collectImageUrls(md)).toEqual([
      "https://old/1.png",
      "https://old/2.png",
    ]);
  });

  it("코드 펜스와 인라인 코드 안의 이미지는 수집도 치환도 하지 않는다", () => {
    const md =
      "```\n![a](https://old/1.png)\n```\n\n`![b](https://old/2.png)`\n\n![c](https://old/3.png)";
    expect(collectImageUrls(md)).toEqual(["https://old/3.png"]);
    const result = replaceImageUrls(md, map, "제목");
    expect(result.replaced).toBe(1);
    expect(result.markdown).toContain("![a](https://old/1.png)");
    expect(result.markdown).toContain("`![b](https://old/2.png)`");
    expect(result.markdown).toContain("![c](https://blob/3.png)");
  });

  it("마크다운 이미지 URL을 치환하고 의미 있는 alt는 유지한다", () => {
    const result = replaceImageUrls("![설명](https://old/1.png)", map, "제목");
    expect(result).toEqual({
      markdown: "![설명](https://blob/1.png)",
      replaced: 1,
      skipped: [],
    });
  });

  it("alt가 비었거나 image면 제목과 순번으로 바꾼다", () => {
    const md =
      "![](https://old/1.png)\n\n![image](https://old/2.png)\n\n![ok](https://old/3.png)";
    const result = replaceImageUrls(md, map, "글");
    expect(result.markdown).toBe(
      "![글 이미지 1](https://blob/1.png)\n\n![글 이미지 2](https://blob/2.png)\n\n![ok](https://blob/3.png)",
    );
  });

  it("alt 순번은 매핑되지 않은 이미지도 센다", () => {
    const md = "![ok](https://ext/0.png)\n\n![](https://old/1.png)";
    expect(replaceImageUrls(md, map, "글").markdown).toContain(
      "![글 이미지 2](https://blob/1.png)",
    );
  });

  it("매핑이 없는 URL은 그대로 두고 skipped에 모은다", () => {
    const result = replaceImageUrls("![ok](https://ext/1.png)", map, "글");
    expect(result.markdown).toBe("![ok](https://ext/1.png)");
    expect(result.replaced).toBe(0);
    expect(result.skipped).toEqual(["https://ext/1.png"]);
  });

  it("매핑이 없어도 alt가 빈 이미지는 alt만 채운다", () => {
    const result = replaceImageUrls("![](https://ext/1.png)", map, "글");
    expect(result.markdown).toBe("![글 이미지 1](https://ext/1.png)");
    expect(result.replaced).toBe(0);
  });

  it("alt의 대괄호를 이스케이프한다", () => {
    const result = replaceImageUrls("![](https://old/1.png)", map, "a[b]c");
    expect(result.markdown).toBe("![a\\[b\\]c 이미지 1](https://blob/1.png)");
  });

  it("HTML img의 src를 치환하고 alt가 없으면 추가한다", () => {
    const result = replaceImageUrls(
      '<img src="https://old/1.png" width="10">',
      map,
      "글",
    );
    expect(result.markdown).toBe(
      '<img alt="글 이미지 1" src="https://blob/1.png" width="10">',
    );
  });

  it("HTML img의 alt가 있으면 유지하고 따옴표 alt 제목은 이스케이프한다", () => {
    expect(
      replaceImageUrls("<img src='https://old/1.png' alt='그림'>", map, "글")
        .markdown,
    ).toBe("<img src='https://blob/1.png' alt='그림'>");
    expect(
      replaceImageUrls('<img src="https://old/1.png" alt="">', map, 'a"b')
        .markdown,
    ).toBe('<img src="https://blob/1.png" alt="a&quot;b 이미지 1">');
  });

  it("한 글에 여러 이미지가 있어도 위치가 어긋나지 않는다", () => {
    const md =
      '앞 ![](https://old/1.png) 중간 <img src="https://old/2.png" alt="x"> 뒤';
    const result = replaceImageUrls(md, map, "글");
    expect(result.markdown).toBe(
      '앞 ![글 이미지 1](https://blob/1.png) 중간 <img src="https://blob/2.png" alt="x"> 뒤',
    );
    expect(result.replaced).toBe(2);
  });

  it("이미지가 없는 글은 그대로다", () => {
    expect(replaceImageUrls("텍스트", map, "글")).toEqual({
      markdown: "텍스트",
      replaced: 0,
      skipped: [],
    });
  });

  it("꺾쇠 괄호로 감싼 URL도 치환한다", () => {
    const result = replaceImageUrls("![a](<https://old/a b.png>)", map, "글");
    expect(result.replaced).toBe(1);
    expect(result.markdown).toContain("https://blob/a b.png");
  });
});
