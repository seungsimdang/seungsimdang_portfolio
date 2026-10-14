import type { ReactNode } from "react";

// 필드 힌트·오류 문구 id를 aria-describedby 값으로 연결
export function describedBy(id: string, hint: ReactNode, error?: string) {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
