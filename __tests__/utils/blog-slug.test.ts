import { describe, expect, it } from "vitest";
import {
  decodePostSlug,
  parsePostFileName,
  slugifyPostName,
} from "@/lib/blog/slug";

describe("slugifyPostName", () => {
  it("한글 제목과 공백, 마침표를 하이픈 slug로 만든다", () => {
    expect(slugifyPostName("2024-10-06-7339. 2xn 타일링 3")).toBe(
      "2024-10-06-7339-2xn-타일링-3",
    );
  });

  it("ASCII 대문자만 소문자로 바꾸고 특수문자는 하이픈이 된다", () => {
    expect(slugifyPostName("2023-01-09-ComputerArchitecture-고정 & 부동")).toBe(
      "2023-01-09-computerarchitecture-고정-부동",
    );
  });

  it("NFD 입력을 NFC로 맞춘다", () => {
    const nfd = "한글".normalize("NFD");
    expect(slugifyPostName(nfd)).toBe("한글".normalize("NFC"));
  });

  it("앞뒤 하이픈과 연속 하이픈을 정리한다", () => {
    expect(slugifyPostName("--a   b--")).toBe("a-b");
  });

  it("200자를 넘기면 자르고 끝 하이픈을 남기지 않는다", () => {
    const slug = slugifyPostName(`${"a".repeat(199)} b`);
    expect(slug.length).toBeLessThanOrEqual(200);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("허용 문자가 없으면 빈 문자열을 돌려준다", () => {
    expect(slugifyPostName("!!!")).toBe("");
  });
});

describe("parsePostFileName", () => {
  it("날짜와 제목을 분리하고 .md를 뗀다", () => {
    expect(parsePostFileName("2024-10-06-7339. 2xn 타일링 3.md")).toEqual({
      date: "2024-10-06",
      title: "7339. 2xn 타일링 3",
    });
  });

  it("날짜가 없으면 date는 null이고 제목은 확장자만 뗀다", () => {
    expect(parsePostFileName("how-to-write-by-markdown.md")).toEqual({
      date: null,
      title: "how-to-write-by-markdown",
    });
  });

  it("NFD 파일명을 NFC로 맞춘다", () => {
    const name = "2024-01-01-한글.md".normalize("NFD");
    expect(parsePostFileName(name).title).toBe("한글".normalize("NFC"));
  });
});

describe("decodePostSlug", () => {
  it("퍼센트 인코딩된 한글을 한 번만 디코딩한다", () => {
    expect(decodePostSlug(encodeURIComponent("2024-01-01-타일링"))).toBe(
      "2024-01-01-타일링",
    );
  });

  it("이중 인코딩은 한 번만 풀어 퍼센트 문자열을 남긴다", () => {
    const once = encodeURIComponent("타일링");
    expect(decodePostSlug(encodeURIComponent(once))).toBe(once);
  });

  it("NFD로 디코딩되는 값을 NFC로 맞춘다", () => {
    const nfd = encodeURIComponent("한".normalize("NFD"));
    expect(decodePostSlug(nfd)).toBe("한".normalize("NFC"));
  });

  it("잘못된 퍼센트 시퀀스는 null이다", () => {
    expect(decodePostSlug("%E0%A4%A")).toBeNull();
    expect(decodePostSlug("%")).toBeNull();
  });
});
