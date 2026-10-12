import "server-only";
import { HttpStatus } from "@/constants/http-status";
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
      HttpStatus.Unauthorized,
      "로그인이 필요합니다",
    ),
  forbidden: () =>
    new ApiError("FORBIDDEN", HttpStatus.Forbidden, "권한이 없습니다"),
  forbiddenOrigin: () =>
    new ApiError(
      "FORBIDDEN_ORIGIN",
      HttpStatus.Forbidden,
      "허용되지 않은 요청 출처입니다",
    ),
  notFound: () =>
    new ApiError("NOT_FOUND", HttpStatus.NotFound, "대상을 찾을 수 없습니다"),
  slugConflict: () =>
    new ApiError(
      "SLUG_CONFLICT",
      HttpStatus.Conflict,
      "이미 사용 중인 slug입니다",
    ),
  orderMismatch: () =>
    new ApiError(
      "ORDER_MISMATCH",
      HttpStatus.Conflict,
      "목록이 변경되었습니다. 새로고침 후 다시 시도해 주세요",
    ),
  internal: () =>
    new ApiError(
      "INTERNAL_ERROR",
      HttpStatus.InternalServerError,
      "서버 오류가 발생했습니다",
    ),
};
