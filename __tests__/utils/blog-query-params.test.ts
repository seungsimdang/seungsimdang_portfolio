import { describe, expect, it } from "vitest";
import {
  escapeLikePattern,
  normalizeSearchQuery,
  parseBlogListParams,
  parseBlogListSearchParams,
} from "@/utils/blog-query-params";

describe("normalizeSearchQuery", () => {
  it("배열이면 첫 값만 사용", () => {
    expect(normalizeSearchQuery(["a", "b"])).toBe("a");
  });
  it("값이 없거나 공백만이면 undefined", () => {
    expect(normalizeSearchQuery(undefined)).toBeUndefined();
    expect(normalizeSearchQuery(null)).toBeUndefined();
    expect(normalizeSearchQuery("")).toBeUndefined();
    expect(normalizeSearchQuery("  \t\n ")).toBeUndefined();
    expect(normalizeSearchQuery([])).toBeUndefined();
  });
  it("좌우 공백 제거와 내부 연속 공백 축약", () => {
    expect(normalizeSearchQuery("  a   b\t\tc  ")).toBe("a b c");
  });
  it("NUL과 제어문자를 공백으로 바꿔 제거", () => {
    expect(normalizeSearchQuery("a\u0000b")).toBe("a b");
    expect(normalizeSearchQuery("\u0000\u0001\u007f")).toBeUndefined();
    expect(normalizeSearchQuery("x\u001fy")).toBe("x y");
  });
  it("NFD 입력을 NFC로 정규화", () => {
    const nfd = "한";
    expect(nfd).not.toBe("한");
    expect(normalizeSearchQuery(nfd)).toBe("한");
  });
  it("100 코드포인트로 절단하고 서로게이트 쌍을 자르지 않음", () => {
    expect(normalizeSearchQuery("a".repeat(300))).toBe("a".repeat(100));
    const emoji = normalizeSearchQuery("\u{1F600}".repeat(150)) ?? "";
    expect(Array.from(emoji)).toHaveLength(100);
    expect(emoji).toBe("\u{1F600}".repeat(100));
  });
  it("NFD 100자 입력은 NFC 정규화 후 절단되어 길이가 부풀지 않음", () => {
    const result = normalizeSearchQuery("한".repeat(100));
    expect(Array.from(result ?? "")).toHaveLength(100);
  });
  it("절단 경계의 후행 공백은 제거", () => {
    expect(normalizeSearchQuery(`${"a".repeat(99)} b`)).toBe("a".repeat(99));
  });
});

describe("escapeLikePattern", () => {
  it("LIKE 메타문자를 이스케이프", () => {
    expect(escapeLikePattern("%")).toBe("\\%");
    expect(escapeLikePattern("_")).toBe("\\_");
    expect(escapeLikePattern("\\")).toBe("\\\\");
  });
  it("역슬래시를 먼저 치환해 이스케이프 문자가 중복 치환되지 않음", () => {
    expect(escapeLikePattern("\\%")).toBe("\\\\\\%");
    expect(escapeLikePattern("a_b%c\\d")).toBe("a\\_b\\%c\\\\d");
  });
  it("일반 문자열은 그대로 반환", () => {
    expect(escapeLikePattern("hello 한글")).toBe("hello 한글");
  });
});

describe("parseBlogListParams", () => {
  it("값이 없으면 page 1만 반환하고 키를 생략", () => {
    const result = parseBlogListParams(new URLSearchParams(""));
    expect(result).toEqual({ page: 1 });
    expect(Object.keys(result)).toEqual(["page"]);
  });
  it("q와 category를 정규화해 포함", () => {
    const params = new URLSearchParams("q=%20a%20%20b&category=%20Dev%20");
    expect(parseBlogListParams(params)).toEqual({
      page: 1,
      category: "Dev",
      q: "a b",
    });
  });
  it("같은 이름이 여러 개면 첫 값 사용", () => {
    expect(parseBlogListParams(new URLSearchParams("q=a&q=b"))).toEqual({
      page: 1,
      q: "a",
    });
  });
  it("빈 q와 공백 q는 키를 생략", () => {
    expect("q" in parseBlogListParams(new URLSearchParams("q="))).toBe(false);
    expect("q" in parseBlogListParams(new URLSearchParams("q=%20%20"))).toBe(
      false,
    );
  });
  it("잘못된 page는 1로 보정", () => {
    for (const page of ["0", "-1", "abc", "1.5", "1000000", ""]) {
      expect(parseBlogListParams(new URLSearchParams({ page })).page).toBe(1);
    }
    expect(parseBlogListParams(new URLSearchParams("page=3")).page).toBe(3);
    expect(parseBlogListParams(new URLSearchParams("page=999999")).page).toBe(
      999999,
    );
  });
  it("50자 초과 category는 필터 없음", () => {
    const result = parseBlogListParams(
      new URLSearchParams({ category: "c".repeat(51) }),
    );
    expect("category" in result).toBe(false);
  });
});

describe("parseBlogListSearchParams", () => {
  it("배열 값은 첫 값만 사용", () => {
    expect(
      parseBlogListSearchParams({
        q: ["a", "b"],
        category: ["X", "Y"],
        page: ["2", "3"],
      }),
    ).toEqual({ page: 2, category: "X", q: "a" });
  });
  it("키 생략 여부가 클라이언트 파서와 일치", () => {
    const fromServer = parseBlogListSearchParams({
      q: "  ",
      page: undefined,
    });
    const fromClient = parseBlogListParams(new URLSearchParams("q=%20%20"));
    expect(fromServer).toEqual(fromClient);
    expect(Object.keys(fromServer)).toEqual(Object.keys(fromClient));
  });
  it("서버 입력과 클라이언트 입력이 같은 결과", () => {
    expect(
      parseBlogListSearchParams({ q: "한 글", category: "Dev", page: "4" }),
    ).toEqual(
      parseBlogListParams(new URLSearchParams("q=한 글&category=Dev&page=4")),
    );
  });
});
