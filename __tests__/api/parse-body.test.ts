import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { ApiError } from "@/lib/api/api-error";
import { parseJsonBody } from "@/lib/api/parse-body";

const schema = z.strictObject({ a: z.string().min(1, "필수") });

function req(
  body: string,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return new Request("http://localhost/x", { method: "POST", body, headers });
}

async function code(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError)
      return { code: e.code, status: e.status, fields: e.fieldErrors };
    throw e;
  }
  return null;
}

describe("parseJsonBody", () => {
  it("정상 JSON 반환", async () => {
    expect(await parseJsonBody(req('{"a":"x"}'), schema)).toEqual({ a: "x" });
  });

  it("charset이 붙은 Content-Type 허용", async () => {
    const r = req('{"a":"x"}', {
      "content-type": "Application/JSON; charset=utf-8",
    });
    expect(await parseJsonBody(r, schema)).toEqual({ a: "x" });
  });

  it("Content-Type이 json이 아니면 415", async () => {
    expect(
      await code(
        parseJsonBody(req("{}", { "content-type": "text/plain" }), schema),
      ),
    ).toMatchObject({ status: 415 });
  });

  it("Content-Type 없음은 415", async () => {
    expect(await code(parseJsonBody(req("{}", {}), schema))).toMatchObject({
      status: 415,
    });
  });

  it("content-length 선언이 상한 초과면 413", async () => {
    const r = req("{}", {
      "content-type": "application/json",
      "content-length": String(300 * 1024),
    });
    expect(await code(parseJsonBody(r, schema))).toMatchObject({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("실제 본문이 상한 초과면 413", async () => {
    const big = JSON.stringify({ a: "x".repeat(300 * 1024) });
    expect(await code(parseJsonBody(req(big), schema))).toMatchObject({
      status: 413,
    });
  });

  it("멀티바이트 본문도 바이트 기준으로 413", async () => {
    const big = JSON.stringify({ a: "가".repeat(100 * 1024) });
    expect(await code(parseJsonBody(req(big), schema))).toMatchObject({
      status: 413,
    });
  });

  it("JSON 파싱 실패는 400", async () => {
    expect(await code(parseJsonBody(req("{bad"), schema))).toMatchObject({
      status: 400,
      code: "VALIDATION_FAILED",
    });
  });

  it("스키마 위반은 400과 필드 에러", async () => {
    expect(await code(parseJsonBody(req('{"a":""}'), schema))).toMatchObject({
      status: 400,
      fields: { a: "필수" },
    });
  });

  it("미지 필드는 400", async () => {
    expect(
      await code(parseJsonBody(req('{"a":"x","b":1}'), schema)),
    ).toMatchObject({ status: 400 });
  });
});
