import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { summarizeErrorForLog } from "@/lib/api/safe-error-log";

describe("summarizeErrorForLog", () => {
  it("메시지를 포함하지 않고 name과 cause.code만 반환", () => {
    const cause = Object.assign(new Error("secret-param"), { code: "57014" });
    const error = new Error('Failed query: select ... params: "비밀 검색어"', {
      cause,
    });
    error.name = "DrizzleQueryError";
    const summary = summarizeErrorForLog(error);
    expect(summary).toEqual({ name: "DrizzleQueryError", pgCode: "57014" });
    expect(JSON.stringify(summary)).not.toContain("비밀 검색어");
    expect(JSON.stringify(summary)).not.toContain("secret-param");
  });
  it("cause가 없으면 pgCode는 undefined", () => {
    expect(summarizeErrorForLog(new TypeError("x"))).toEqual({
      name: "TypeError",
      pgCode: undefined,
    });
  });
  it("Error가 아닌 값은 unknown과 undefined", () => {
    expect(summarizeErrorForLog("검색어 문자열")).toEqual({
      name: "unknown",
      pgCode: undefined,
    });
    expect(summarizeErrorForLog(null)).toEqual({
      name: "unknown",
      pgCode: undefined,
    });
  });
  it("code 없는 cause나 문자열 cause는 pgCode가 undefined", () => {
    expect(
      summarizeErrorForLog(new Error("m", { cause: { detail: "x" } })).pgCode,
    ).toBeUndefined();
    expect(
      summarizeErrorForLog(new Error("m", { cause: "text" })).pgCode,
    ).toBeUndefined();
  });
});
