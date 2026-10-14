import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

interface Position {
  start: { offset?: number };
  end: { offset?: number };
}

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string | null;
  position?: Position;
  children?: MdNode[];
}

interface Candidate {
  start: number;
  end: number;
  url: string;
  // 마크다운 이미지는 전체 구문, HTML은 img 태그 하나가 대상 범위
  kind: "markdown" | "html";
  alt: string;
}

const HTML_IMG = /<img\b[^>]*>/gi;
const HTML_SRC = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const HTML_ALT = /\salt\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

const processor = unified().use(remarkParse).use(remarkGfm);

// 코드 블록과 인라인 코드는 image, html 노드가 아니므로 자연히 제외됨
function scan(markdown: string): Candidate[] {
  const found: Candidate[] = [];
  const walk = (node: MdNode) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      if (node.type === "image" && node.url !== undefined) {
        found.push({
          start,
          end,
          url: node.url,
          kind: "markdown",
          alt: node.alt ?? "",
        });
      } else if (node.type === "html" && node.value) {
        for (const match of node.value.matchAll(HTML_IMG)) {
          const tag = match[0];
          const src = tag.match(HTML_SRC);
          const url = src?.[1] ?? src?.[2];
          if (url === undefined) continue;
          const alt = tag.match(HTML_ALT);
          found.push({
            start: start + match.index,
            end: start + match.index + tag.length,
            url,
            kind: "html",
            alt: alt?.[1] ?? alt?.[2] ?? "",
          });
        }
      }
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(processor.parse(markdown) as MdNode);
  return found.sort((a, b) => a.start - b.start);
}

export function collectImageUrls(markdown: string): string[] {
  return scan(markdown).map((c) => c.url);
}

function escapeMarkdownAlt(text: string): string {
  return text.replace(/[\\[\]]/g, (c) => `\\${c}`);
}

function escapeHtmlAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function needsAlt(alt: string): boolean {
  const trimmed = alt.trim();
  return trimmed === "" || trimmed === "image";
}

function rewriteMarkdown(
  source: string,
  newUrl: string | undefined,
  alt: string | undefined,
): string {
  const split = source.lastIndexOf("](");
  if (split < 0) return source;
  let head = source.slice(0, split);
  let rest = source.slice(split);
  if (alt !== undefined) head = `![${escapeMarkdownAlt(alt)}`;
  if (newUrl !== undefined) {
    const dest = rest.match(/^\]\(\s*(<[^>]*>|[^\s)]+)/);
    if (dest?.[1]) {
      // 꺾쇠로 감싼 원래 표기는 공백 포함 URL을 위해 유지
      const wrapped = dest[1].startsWith("<") ? `<${newUrl}>` : newUrl;
      rest = rest.replace(dest[1], () => wrapped);
    } else {
      return source;
    }
  }
  return head + rest;
}

function rewriteHtml(
  source: string,
  url: string,
  newUrl: string | undefined,
  alt: string | undefined,
): string {
  let tag = source;
  if (newUrl !== undefined) {
    tag = tag.replace(HTML_SRC, (m) => m.replace(url, () => newUrl));
  }
  if (alt !== undefined) {
    const safe = escapeHtmlAttr(alt);
    tag = HTML_ALT.test(tag)
      ? tag.replace(HTML_ALT, ` alt="${safe}"`)
      : tag.replace(/^<img\b/i, `<img alt="${safe}"`);
  }
  return tag;
}

// image 노드와 html의 img 태그만 대상이며 위치 기준으로 뒤에서부터 치환함
// alt가 비었거나 image면 "{title} 이미지 {n}"으로 바꾸며 n은 글 안의 이미지 순번
// map이 undefined를 돌려준 URL은 그대로 두고 skipped에 모음
export function replaceImageUrls(
  markdown: string,
  map: (url: string) => string | undefined,
  title: string,
): { markdown: string; replaced: number; skipped: string[] } {
  const candidates = scan(markdown);
  const skipped = new Set<string>();
  let replaced = 0;
  const edits = candidates.flatMap((candidate, index) => {
    const mapped = map(candidate.url);
    if (mapped === undefined) skipped.add(candidate.url);
    else replaced += 1;
    const alt = needsAlt(candidate.alt)
      ? `${title} 이미지 ${index + 1}`
      : undefined;
    if (mapped === undefined && alt === undefined) return [];
    const original = markdown.slice(candidate.start, candidate.end);
    const text =
      candidate.kind === "markdown"
        ? rewriteMarkdown(original, mapped, alt)
        : rewriteHtml(original, candidate.url, mapped, alt);
    return [{ start: candidate.start, end: candidate.end, text }];
  });

  let result = markdown;
  for (const edit of edits.reverse()) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return { markdown: result, replaced, skipped: [...skipped] };
}
