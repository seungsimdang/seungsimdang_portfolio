import type { ReactNode } from "react";

// 렌더된 마크다운의 타이포그래피는 globals.css의 .markdown-body 규칙이 담당
export function MarkdownBody({ children }: { children: ReactNode }) {
  return <div className="markdown-body wrap-break-word">{children}</div>;
}
