import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { getQueryClient } from "@/lib/query/get-query-client";

function retryPolicy() {
  const retry = getQueryClient().getDefaultOptions().queries?.retry;
  if (typeof retry !== "function") throw new Error("retry 함수 아님");
  return retry;
}

function httpError(status: number) {
  return new AxiosError("fail", undefined, undefined, undefined, {
    status,
  } as AxiosResponse);
}

describe("getQueryClient 재시도 정책", () => {
  it("5xx 응답은 재시도하지 않음", () => {
    const retry = retryPolicy();
    expect(retry(0, httpError(500))).toBe(false);
    expect(retry(0, httpError(503))).toBe(false);
  });
  it("응답이 없는 네트워크 오류는 1회만 재시도", () => {
    const retry = retryPolicy();
    const network = new AxiosError("Network Error", "ERR_NETWORK");
    expect(retry(0, network)).toBe(true);
    expect(retry(1, network)).toBe(false);
  });
  it("4xx와 일반 오류도 1회만 재시도", () => {
    const retry = retryPolicy();
    expect(retry(0, httpError(404))).toBe(true);
    expect(retry(1, httpError(404))).toBe(false);
    expect(retry(0, new Error("x"))).toBe(true);
  });
  it("hydrate 직후 재요청을 막는 staleTime과 포커스 재조회 비활성", () => {
    const options = getQueryClient().getDefaultOptions().queries;
    expect(options?.staleTime).toBeGreaterThan(0);
    expect(options?.refetchOnWindowFocus).toBe(false);
  });
  it("서버 환경에서는 호출마다 새 클라이언트 생성", () => {
    expect(getQueryClient()).not.toBe(getQueryClient());
  });
});
