import { POST_SLUG_MAX } from "@/constants/blog";

const FILE_NAME_PATTERN = /^(\d{4}-\d{2}-\d{2})-(.+?)(?:\.md)?$/u;

// 소문자화는 ASCII 대문자만 대상이며 한글 등은 건드리지 않음
export function slugifyPostName(name: string): string {
  const slug = name
    .normalize("NFC")
    .replace(/[A-Z]/g, (c) => c.toLowerCase())
    .replace(/[^a-z0-9가-힣]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, POST_SLUG_MAX);
  return slug.replace(/-+$/, "");
}

// 경로 파라미터를 한 번만 디코딩하고 NFC로 맞춤, 실패하면 null
export function decodePostSlug(raw: string): string | null {
  try {
    return decodeURIComponent(raw).normalize("NFC");
  } catch {
    return null;
  }
}

export function parsePostFileName(fileName: string): {
  date: string | null;
  title: string;
} {
  const match = fileName.normalize("NFC").match(FILE_NAME_PATTERN);
  if (match?.[1] && match[2]) return { date: match[1], title: match[2] };
  return { date: null, title: fileName.replace(/\.md$/u, "") };
}
