const EXCERPT_MAX = 160;

// 메타데이터 description용 본문 요약, 마크다운 기호를 걷어 낸 앞부분만 사용
// ponytail: 정규식 근사라 중첩 구문은 일부 기호가 남을 수 있음, 정확도가 필요하면 mdast 텍스트 추출로 교체
export function postExcerpt(markdown: string): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[`*_~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > EXCERPT_MAX
    ? `${text.slice(0, EXCERPT_MAX - 1).trimEnd()}…`
    : text;
}
