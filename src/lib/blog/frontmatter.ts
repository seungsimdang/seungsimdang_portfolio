import { parse } from "yaml";

interface PostFrontmatter {
  title?: string;
  categories?: string[]; // 문자열 단일 값은 배열로 승격
  tags?: string[];
  published?: boolean;
  date?: string; // "YYYY-MM-DD"로 정규화 가능한 경우만
}

export interface ParsedPost {
  // toc, toc_sticky, toc_label 등 알 수 없는 키는 결과에 포함하지 않음
  frontmatter: PostFrontmatter;
  body: string;
  // 펜스는 있으나 YAML 파싱 실패 또는 값 형식 오류이며 이때 body는 원문 전체
  error?: string;
}

const FENCE = /^---[ \t]*\n([\s\S]*?)\n?---[ \t]*(?:\n|$)/;

function toStringList(value: unknown): string[] | undefined | null {
  if (value === undefined || value === null) return undefined;
  const list = Array.isArray(value) ? value : [value];
  const strings = list.map((v) =>
    typeof v === "string" || typeof v === "number" ? String(v).trim() : null,
  );
  if (strings.some((v) => v === null)) return null;
  return (strings as string[]).filter(Boolean);
}

function toDate(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? undefined
      : value.toISOString().slice(0, 10);
  }
  const match = typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : undefined;
}

// 위험한 YAML 태그를 막기 위해 core 스키마만 사용함
export function parsePostMarkdown(raw: string): ParsedPost {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const fence = text.match(FENCE);
  if (!fence) return { frontmatter: {}, body: text };

  const fail = (error: string): ParsedPost => ({
    frontmatter: {},
    body: text,
    error,
  });

  let data: unknown;
  try {
    data = parse(fence[1] ?? "", { schema: "core" });
  } catch {
    return fail("프론트매터를 해석하지 못했습니다");
  }
  if (data === null || data === undefined) {
    return { frontmatter: {}, body: text.slice(fence[0].length) };
  }
  if (typeof data !== "object" || Array.isArray(data)) {
    return fail("프론트매터 형식이 올바르지 않습니다");
  }

  const source = data as Record<string, unknown>;
  const frontmatter: PostFrontmatter = {};

  if (source.title !== undefined && source.title !== null) {
    if (typeof source.title !== "string") {
      return fail("title 형식이 올바르지 않습니다");
    }
    frontmatter.title = source.title.trim();
  }
  for (const key of ["categories", "tags"] as const) {
    const list = toStringList(source[key]);
    if (list === null) return fail(`${key} 형식이 올바르지 않습니다`);
    if (list) frontmatter[key] = list;
  }
  if (source.published !== undefined && source.published !== null) {
    if (typeof source.published !== "boolean") {
      return fail("published 형식이 올바르지 않습니다");
    }
    frontmatter.published = source.published;
  }
  const date = toDate(source.date);
  if (date) frontmatter.date = date;

  return { frontmatter, body: text.slice(fence[0].length) };
}
