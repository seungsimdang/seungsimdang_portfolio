export interface CustomData<T> {
  data: T;
  status: number;
}

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "FORBIDDEN_ORIGIN"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "SLUG_CONFLICT"
  | "ORDER_MISMATCH"
  | "NOT_SEEDED"
  | "LIMIT_EXCEEDED"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  // 필드 경로(예: "title", "experiences.0.problem")별 사용자용 메시지, VALIDATION_FAILED에서만 존재
  fieldErrors?: Record<string, string>;
}
