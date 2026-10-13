import "server-only";
import { HttpStatusCode } from "axios";
import type { ZodType } from "zod";
import { ApiError } from "./api-error";

const BODY_MAX_BYTES = 256 * 1024;

// Content-Type, 크기 상한, JSON 파싱, zod 검증을 거친 본문 반환
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      HttpStatusCode.UnsupportedMediaType,
      "application/json 요청만 허용됩니다",
    );
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > BODY_MAX_BYTES) throw payloadTooLarge();

  const text = await request.text();
  if (new TextEncoder().encode(text).length > BODY_MAX_BYTES) {
    throw payloadTooLarge();
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError(
      "VALIDATION_FAILED",
      HttpStatusCode.BadRequest,
      "요청 본문이 올바른 JSON이 아닙니다",
    );
  }

  const result = schema.safeParse(json);
  if (result.success) return result.data;

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  throw new ApiError(
    "VALIDATION_FAILED",
    HttpStatusCode.BadRequest,
    "입력값을 확인해 주세요",
    fieldErrors,
  );
}

function payloadTooLarge() {
  return new ApiError(
    "PAYLOAD_TOO_LARGE",
    HttpStatusCode.PayloadTooLarge,
    "요청 본문이 너무 큽니다",
  );
}
