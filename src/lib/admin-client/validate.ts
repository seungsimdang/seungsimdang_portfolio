import type { ZodType } from "zod";

export type Validation<I> =
  | { success: true; data: I }
  | { success: false; errors: Record<string, string> };

// 서버와 같은 zod 스키마로 즉시 검증, 오류는 필드 경로별 첫 메시지만 유지
export function validateWith<I>(
  schema: ZodType<I>,
  input: unknown,
): Validation<I> {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!(path in errors)) errors[path] = issue.message;
  }
  return { success: false, errors };
}
