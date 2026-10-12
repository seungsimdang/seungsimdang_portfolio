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
import type { Experience, Profile, Project, TechTalk } from "@/types/portfolio";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
function safeHttpUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function toExperience(row: ExperienceRow): Experience {
  const links = row.links.filter((l) => safeHttpUrl(l.url));
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

function toProject(row: ProjectRow, rows: ExperienceRow[]): Project {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    period: row.period,
    role: row.role,
    techStack: row.techStack,
    summary: row.summary,
    link: safeHttpUrl(row.link),
    thumbnail: row.thumbnail ?? undefined,
    experiences: rows.map(toExperience),
  };
}

export function toTalk(row: TalkRow): TechTalk {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.date,
    venue: row.venue,
    description: row.description,
    impact: row.impact,
    link: safeHttpUrl(row.link),
  };
}

export function toProfile(row: typeof profile.$inferSelect): Profile {
  return {
    name: row.name,
    title: row.title,
    tagline: row.tagline,
    description: row.description,
    email: row.email,
    github: row.github,
    skills: row.skills,
  };
}

const projectOrder = [
  asc(projects.sortOrder),
  asc(projects.createdAt),
  asc(projects.id),
];

// 프로젝트와 experiences를 쿼리 2회로 가져와 메모리에서 묶음
export async function loadProjects(rows: ProjectRow[]): Promise<Project[]> {
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
  return rows.map((r) => toProject(r, byProject.get(r.id) ?? []));
}

export const getProfile = cache(async (): Promise<Profile> => {
  const [row] = await db.select().from(profile).where(eq(profile.id, 1));
  if (!row) throw new PortfolioNotSeededError();
  return toProfile(row);
});

export const listProjects = cache(async (): Promise<Project[]> => {
  const rows = await db
    .select()
    .from(projects)
    .orderBy(...projectOrder);
  return loadProjects(rows);
});

// 없으면 null, DB 에러는 그대로 throw
export const getProjectBySlug = cache(
  async (slug: string): Promise<Project | null> => {
    if (!SLUG_PATTERN.test(slug)) return null;
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.slug, slug));
    const [project] = await loadProjects(rows);
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

export const listTechTalks = cache(async (): Promise<TechTalk[]> => {
  const rows = await db
    .select()
    .from(techTalks)
    .orderBy(
      asc(techTalks.sortOrder),
      asc(techTalks.createdAt),
      asc(techTalks.id),
    );
  return rows.map(toTalk);
});
