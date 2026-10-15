import { zodResolver } from "@hookform/resolvers/zod";
import {
  type FieldValues,
  get,
  type Resolver,
  type UseFormSetError,
  useFormContext,
} from "react-hook-form";
import type { z } from "zod";

// zodResolver의 오버로드 추론이 변환 스키마의 출력 타입을 놓쳐 입력과 출력 타입을 명시함
export function schemaResolver<S extends z.ZodType<unknown, FieldValues>>(
  schema: S,
): Resolver<z.input<S>, unknown, z.output<S>> {
  return zodResolver(schema) as unknown as Resolver<
    z.input<S>,
    unknown,
    z.output<S>
  >;
}

// 입력 칸 이름에 걸린 오류 문구, 배열 전체 오류는 root 아래에 둠
export function useFieldError(name: string): string | undefined {
  const { formState } = useFormContext();
  return (
    get(formState.errors, name)?.message ??
    get(formState.errors, `${name}.root`)?.message
  );
}

// 중첩된 오류 객체의 말단 개수, ref는 DOM 요소라 건너뜀
export function countErrors(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const record = node as Record<string, unknown>;
  let count = typeof record.type === "string" ? 1 : 0;
  for (const [key, child] of Object.entries(record)) {
    if (key !== "ref") count += countErrors(child);
  }
  return count;
}

// 서버 오류 경로(skills.0)를 폼 입력 칸 이름(skills.0.value)에 맞춤
// 객체 항목은 첫 입력 칸까지, 배열은 목록 전체 오류 자리까지 내려감
// 폼 값 객체의 첫 키가 입력 칸이라는 가정이라, 앞쪽에 비입력 키를 두면 그 오류는 칸에 붙지 않음
function inputName(values: FieldValues, path: string): string {
  const current = get(values, path);
  if (Array.isArray(current)) return `${path}.root`;
  if (!current || typeof current !== "object") return path;
  const [first] = Object.keys(current);
  return first === undefined ? path : inputName(values, `${path}.${first}`);
}

export function applyServerErrors(
  setError: UseFormSetError<FieldValues>,
  values: FieldValues,
  fieldErrors: Record<string, string>,
) {
  for (const [path, message] of Object.entries(fieldErrors)) {
    setError(inputName(values, path), { type: "server", message });
  }
}
