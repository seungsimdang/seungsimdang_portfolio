import "server-only";

export interface SafeErrorSummary {
  name: string;
  pgCode: string | undefined;
}

// DrizzleQueryError 메시지에 SQL 파라미터(검색어 등 사용자 입력)가 포함되므로 메시지는 남기지 않음
// 오류 이름과 원인(cause)의 PG 코드만 기록해 로그로 입력값이 새지 않게 함
export function summarizeErrorForLog(error: unknown): SafeErrorSummary {
  const cause = error instanceof Error ? error.cause : undefined;
  const pgCode =
    cause && typeof cause === "object" && "code" in cause
      ? String(cause.code)
      : undefined;
  return { name: error instanceof Error ? error.name : "unknown", pgCode };
}
