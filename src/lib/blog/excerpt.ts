import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const EXCERPT_MAX = 160;

// 요약에서 뺄 노드, 코드 블록과 HTML과 이미지는 본문 문장이 아님
const SKIP = new Set([
  "code",
  "image",
  "imageReference",
  "definition",
  "footnoteDefinition",
]);
// 자식을 공백 없이 잇는 인라인 노드, 나머지는 블록이라 공백으로 구분
const INLINE = new Set([
  "paragraph",
  "heading",
  "emphasis",
  "strong",
  "delete",
  "link",
  "linkReference",
  "tableCell",
]);

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
}

function toText(node: MdNode): string {
  // 줄바꿈과 인라인 HTML 자리는 단어가 붙지 않도록 공백으로 대체
  if (node.type === "break" || node.type === "html") return " ";
  if (SKIP.has(node.type)) return "";
  if (typeof node.value === "string") return node.value;
  const parts = (node.children ?? []).map(toText);
  return parts.join(INLINE.has(node.type) ? "" : " ");
}

// 메타데이터 description용 본문 요약, 마크다운 구문 트리에서 문장 텍스트만 추출
export function postExcerpt(markdown: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const text = toText(tree as MdNode)
    .replace(/\s+/g, " ")
    .trim();
  // 이모지 등 서로게이트 쌍이 갈리지 않도록 코드 포인트 단위로 자름
  const chars = Array.from(text);
  return chars.length > EXCERPT_MAX
    ? `${chars
        .slice(0, EXCERPT_MAX - 1)
        .join("")
        .trimEnd()}…`
    : text;
}
