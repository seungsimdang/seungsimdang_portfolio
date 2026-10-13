import "server-only";
import { HttpStatusCode } from "axios";
import type { ApiErrorCode } from "@/types/api-types";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiErrors = {
  unauthorized: () =>
    new ApiError(
      "UNAUTHORIZED",
      HttpStatusCode.Unauthorized,
      "로그인이 필요합니다",
    ),
  forbidden: () =>
    new ApiError("FORBIDDEN", HttpStatusCode.Forbidden, "권한이 없습니다"),
  forbiddenOrigin: () =>
    new ApiError(
      "FORBIDDEN_ORIGIN",
      HttpStatusCode.Forbidden,
      "허용되지 않은 요청 출처입니다",
    ),
  notFound: () =>
    new ApiError(
      "NOT_FOUND",
      HttpStatusCode.NotFound,
      "대상을 찾을 수 없습니다",
    ),
  slugConflict: () =>
    new ApiError(
      "SLUG_CONFLICT",
      HttpStatusCode.Conflict,
      "이미 사용 중인 주소입니다",
      { slug: "이미 사용 중인 주소입니다" },
    ),
  orderMismatch: () =>
    new ApiError(
      "ORDER_MISMATCH",
      HttpStatusCode.Conflict,
      "목록이 변경되었습니다. 새로고침 후 다시 시도해 주세요",
    ),
  limitExceeded: () =>
    new ApiError(
      "LIMIT_EXCEEDED",
      HttpStatusCode.Conflict,
      "더 이상 만들 수 없습니다. 기존 항목을 삭제한 뒤 다시 시도해 주세요",
    ),
  notSeeded: () =>
    new ApiError(
      "NOT_SEEDED",
      HttpStatusCode.Conflict,
      "포트폴리오 데이터가 아직 초기화되지 않았습니다",
    ),
  internal: () =>
    new ApiError(
      "INTERNAL_ERROR",
      HttpStatusCode.InternalServerError,
      "서버 오류가 발생했습니다",
    ),
};
