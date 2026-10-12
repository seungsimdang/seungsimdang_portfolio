import "server-only";
import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import {
  experiences,
  profile,
  projects,
  techTalks,
} from "@/db/schema/portfolio";
import type {
  ExperienceInput,
  ProfileInput,
  ProjectCreateInput,
  ProjectUpdateInput,
  TalkCreateInput,
  TalkUpdateInput,
} from "@/schemas/portfolio.schema";
import type { Profile, Project, TechTalk } from "@/types/portfolio";
import {
  loadProjects,
  PortfolioNotSeededError,
  toProfile,
  toTalk,
} from "./portfolio-service";

export class SlugConflictError extends Error {}
export class NotFoundError extends Error {}
export class OrderMismatchError extends Error {}

const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

// Neon 직접 에러는 err.code, drizzle 래핑 에러는 err.cause.code에 PG 코드가 있음
function getPgErrorCode(error: unknown): string | undefined {
  const read = (value: unknown) =>
    typeof value === "object" && value !== null && "code" in value
      ? String((value as { code: unknown }).code)
      : undefined;
  return (
    read(error) ??
    read(
      typeof error === "object" && error !== null
        ? (error as { cause?: unknown }).cause
        : undefined,
    )
  );
}

// batch는 최소 1개 문장이 필요한 튜플 타입이라 빈 배열이 아님을 호출부가 보장
function runBatch(items: BatchItem<"pg">[]) {
  return db.batch(items as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
}

function experienceRows(projectId: string, inputs: ExperienceInput[]) {
  return inputs.map((e, i) => ({
    projectId,
    sortOrder: i,
    title: e.title,
    problem: e.problem,
    solution: e.solution,
    result: e.result,
    learning: e.learning,
    tradeoffAdvantages: e.tradeoff.advantages,
    tradeoffDisadvantages: e.tradeoff.disadvantages,
    tradeoffRationale: e.tradeoff.rationale,
    links: e.links ?? [],
  }));
}

function blankToNull(value: string | undefined) {
  return value ? value : null;
}

async function loadProjectById(id: string): Promise<Project> {
  const rows = await db.select().from(projects).where(eq(projects.id, id));
  const [project] = await loadProjects(rows, true);
  if (!project) throw new NotFoundError();
  return project;
}

export async function updateProfile(input: ProfileInput): Promise<Profile> {
  const [row] = await db
    .update(profile)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(profile.id, 1))
    .returning();
  if (!row) throw new PortfolioNotSeededError();
  return toProfile(row, true);
}

export async function createProject(
  input: ProjectCreateInput,
): Promise<Project> {
  const id = crypto.randomUUID();
  const statements: BatchItem<"pg">[] = [
    db.insert(projects).values({
      id,
      slug: input.slug,
      title: input.title,
      period: input.period,
      role: input.role,
      summary: input.summary,
      link: blankToNull(input.link),
      thumbnail: blankToNull(input.thumbnail),
      techStack: input.techStack,
      // 한 문장 안에서 맨 끝 순번을 정해 동시 삽입 사이의 간격을 허용
      sortOrder: sql`(select coalesce(max(${projects.sortOrder}), -1) + 1 from ${projects})`,
    }),
  ];
  if (input.experiences.length > 0) {
    statements.push(
      db.insert(experiences).values(experienceRows(id, input.experiences)),
    );
  }
  try {
    await runBatch(statements);
  } catch (error) {
    if (getPgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new SlugConflictError();
    }
    throw error;
  }
  return loadProjectById(id);
}

export async function updateProject(
  slug: string,
  input: ProjectUpdateInput,
): Promise<Project> {
  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug));
  if (!existing) throw new NotFoundError();

  const statements: BatchItem<"pg">[] = [
    db
      .update(projects)
      .set({
        title: input.title,
        period: input.period,
        role: input.role,
        summary: input.summary,
        link: blankToNull(input.link),
        thumbnail: blankToNull(input.thumbnail),
        techStack: input.techStack,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, existing.id)),
    db.delete(experiences).where(eq(experiences.projectId, existing.id)),
  ];
  if (input.experiences.length > 0) {
    statements.push(
      db
        .insert(experiences)
        .values(experienceRows(existing.id, input.experiences)),
    );
  }
  try {
    await runBatch(statements);
  } catch (error) {
    // 조회 직후 프로젝트가 삭제되면 experiences 삽입이 FK 위반으로 실패
    if (getPgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new NotFoundError();
    }
    throw error;
  }
  return loadProjectById(existing.id);
}

export async function deleteProject(slug: string): Promise<void> {
  const rows = await db
    .delete(projects)
    .where(eq(projects.slug, slug))
    .returning({ id: projects.id });
  if (rows.length === 0) throw new NotFoundError();
}

// 요청 slug 목록이 현재 전체 집합과 정확히 일치할 때만 순번 재배정
// 일치 확인 SELECT와 batch UPDATE 사이에 다른 요청이 목록을 바꾸면 순번이 어긋날 수 있는 한계가 있음
// 편집자가 한 명인 운영 전제로 별도 락이나 트랜잭션 격리는 두지 않음
export async function reorderProjects(slugs: string[]): Promise<void> {
  const current = await db.select({ slug: projects.slug }).from(projects);
  assertSameSet(
    current.map((r) => r.slug),
    slugs,
  );
  await runBatch(
    slugs.map((slug, i) =>
      db
        .update(projects)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(projects.slug, slug)),
    ),
  );
}

export async function createTalk(input: TalkCreateInput): Promise<TechTalk> {
  try {
    const [row] = await db
      .insert(techTalks)
      .values({
        ...input,
        sortOrder: sql`(select coalesce(max(${techTalks.sortOrder}), -1) + 1 from ${techTalks})`,
      })
      .returning();
    if (!row) throw new Error("insert returned no row");
    return toTalk(row, true);
  } catch (error) {
    if (getPgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new SlugConflictError();
    }
    throw error;
  }
}

export async function updateTalk(
  slug: string,
  input: TalkUpdateInput,
): Promise<TechTalk> {
  const [row] = await db
    .update(techTalks)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(techTalks.slug, slug))
    .returning();
  if (!row) throw new NotFoundError();
  return toTalk(row, true);
}

export async function deleteTalk(slug: string): Promise<void> {
  const rows = await db
    .delete(techTalks)
    .where(eq(techTalks.slug, slug))
    .returning({ id: techTalks.id });
  if (rows.length === 0) throw new NotFoundError();
}

// 일치 확인 SELECT와 batch UPDATE 사이에 다른 요청이 목록을 바꾸면 순번이 어긋날 수 있는 한계가 있음
// 편집자가 한 명인 운영 전제로 별도 락이나 트랜잭션 격리는 두지 않음
export async function reorderTalks(slugs: string[]): Promise<void> {
  const current = await db.select({ slug: techTalks.slug }).from(techTalks);
  assertSameSet(
    current.map((r) => r.slug),
    slugs,
  );
  await runBatch(
    slugs.map((slug, i) =>
      db
        .update(techTalks)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(techTalks.slug, slug)),
    ),
  );
}

function assertSameSet(currentSlugs: string[], requested: string[]) {
  const current = new Set(currentSlugs);
  if (
    requested.length !== current.size ||
    !requested.every((slug) => current.has(slug))
  ) {
    throw new OrderMismatchError();
  }
}
