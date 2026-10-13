import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  experiences,
  profile,
  projects,
  techTalks,
} from "@/db/schema/portfolio";
import { isValidThumbnail } from "@/schemas/portfolio.schema";
import type { Experience, Profile, Project, TechTalk } from "@/types/portfolio";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// F11 이전 전까지 남아 있는 로컬 썸네일 경로, 이전 완료 후 함께 삭제
const LEGACY_THUMBNAIL_PATTERN = /^\/images\/[A-Za-z0-9._/-]+$/;

export class PortfolioNotSeededError extends Error {
  constructor() {
    super("포트폴리오 데이터가 아직 입력되지 않음");
    this.name = "PortfolioNotSeededError";
  }
}

type ProjectRow = typeof projects.$inferSelect;
type ExperienceRow = typeof experiences.$inferSelect;
type TalkRow = typeof techTalks.$inferSelect;

// 읽기 시점에도 http/https 스킴만 통과시키고 그 외는 제외함
// raw가 true면 관리 폼이 DB 원값을 그대로 보여주도록 필터를 건너뜀
function safeHttpUrl(
  url: string | null | undefined,
  raw = false,
): string | undefined {
  if (!url) return undefined;
  if (raw) return url;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

// 기존 로컬 이미지와 현재 Blob 이미지를 공개 화면에서 계속 읽음
function safeThumbnail(
  thumbnail: string | null | undefined,
  raw: boolean,
): string | undefined {
  if (!thumbnail) return undefined;
  return raw ||
    (LEGACY_THUMBNAIL_PATTERN.test(thumbnail) && !thumbnail.includes("..")) ||
    isValidThumbnail(thumbnail)
    ? thumbnail
    : undefined;
}

function toExperience(row: ExperienceRow, raw: boolean): Experience {
  const links = row.links.filter((l) => safeHttpUrl(l.url, raw));
  return {
    id: row.id,
    title: row.title,
    problem: row.problem,
    solution: row.solution,
    tradeoff: {
      advantages: row.tradeoffAdvantages,
      disadvantages: row.tradeoffDisadvantages,
      rationale: row.tradeoffRationale,
    },
    result: row.result,
    learning: row.learning,
    links: links.length > 0 ? links : undefined,
  };
}

function toProject(
  row: ProjectRow,
  rows: ExperienceRow[],
  raw: boolean,
): Project {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    period: row.period,
    role: row.role,
    techStack: row.techStack,
    summary: row.summary,
    link: safeHttpUrl(row.link, raw),
    thumbnail: safeThumbnail(row.thumbnail, raw),
    experiences: rows.map((e) => toExperience(e, raw)),
  };
}

export function toTalk(row: TalkRow, raw = false): TechTalk {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.date,
    venue: row.venue,
    description: row.description,
    impact: row.impact,
    link: safeHttpUrl(row.link, raw),
  };
}

export function toProfile(
  row: typeof profile.$inferSelect,
  raw = false,
): Profile {
  return {
    name: row.name,
    title: row.title,
    tagline: row.tagline,
    description: row.description,
    email: row.email,
    github: safeHttpUrl(row.github, raw),
    skills: row.skills,
  };
}

const projectOrder = [
  asc(projects.sortOrder),
  asc(projects.createdAt),
  asc(projects.id),
];

// 프로젝트와 experiences를 쿼리 2회로 가져와 메모리에서 묶음
export async function loadProjects(
  rows: ProjectRow[],
  raw = false,
): Promise<Project[]> {
  if (rows.length === 0) return [];
  const experienceRows = await db
    .select()
    .from(experiences)
    .where(
      inArray(
        experiences.projectId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(
      asc(experiences.sortOrder),
      asc(experiences.createdAt),
      asc(experiences.id),
    );
  const byProject = new Map<string, ExperienceRow[]>();
  for (const e of experienceRows) {
    byProject.set(e.projectId, [...(byProject.get(e.projectId) ?? []), e]);
  }
  return rows.map((r) => toProject(r, byProject.get(r.id) ?? [], raw));
}

// 아래 조회 함수의 raw 인자는 관리 편집 화면 전용으로 링크 필터를 끔
export const getProfile = cache(async (raw = false): Promise<Profile> => {
  const [row] = await db.select().from(profile).where(eq(profile.id, 1));
  if (!row) throw new PortfolioNotSeededError();
  return toProfile(row, raw);
});

export const listProjects = cache(async (raw = false): Promise<Project[]> => {
  const rows = await db
    .select()
    .from(projects)
    .orderBy(...projectOrder);
  return loadProjects(rows, raw);
});

// 없으면 null, DB 에러는 그대로 throw
export const getProjectBySlug = cache(
  async (slug: string, raw = false): Promise<Project | null> => {
    if (!SLUG_PATTERN.test(slug)) return null;
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.slug, slug));
    const [project] = await loadProjects(rows, raw);
    return project ?? null;
  },
);

export const listProjectSlugs = cache(async (): Promise<string[]> => {
  const rows = await db
    .select({ slug: projects.slug })
    .from(projects)
    .orderBy(...projectOrder);
  return rows.map((r) => r.slug);
});

export const listTechTalks = cache(async (raw = false): Promise<TechTalk[]> => {
  const rows = await db
    .select()
    .from(techTalks)
    .orderBy(
      asc(techTalks.sortOrder),
      asc(techTalks.createdAt),
      asc(techTalks.id),
    );
  return rows.map((row) => toTalk(row, raw));
});
