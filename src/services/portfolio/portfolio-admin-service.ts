import "server-only";
import { del } from "@vercel/blob";
import { and, eq, type SQL, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import type { ResumeKind } from "@/constants/resume";
import { db } from "@/db";
import {
  experiences,
  profile,
  projects,
  resumeEntries,
  techTalks,
} from "@/db/schema/portfolio";
import {
  type ExperienceInput,
  isValidThumbnail,
  ORDER_SLUGS_MAX,
  type ProfileUpdateInput,
  type ProjectCreateInput,
  type ProjectUpdateInput,
  RESUME_KIND_MAX,
  type ResumeEntryCreateInput,
  type ResumeEntryUpdateInput,
  type TalkCreateInput,
  type TalkUpdateInput,
} from "@/schemas/portfolio.schema";
import type {
  Profile,
  Project,
  ResumeEntry,
  TechTalk,
} from "@/types/portfolio";
import {
  loadProjects,
  PortfolioNotSeededError,
  toProfile,
  toResumeEntry,
  toTalk,
} from "./portfolio-service";

export class SlugConflictError extends Error {
  constructor() {
    super("slug 중복");
    this.name = "SlugConflictError";
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("대상 없음");
    this.name = "NotFoundError";
  }
}

export class OrderMismatchError extends Error {
  constructor() {
    super("순서 목록 불일치");
    this.name = "OrderMismatchError";
  }
}

export class LimitExceededError extends Error {
  constructor() {
    super("생성 개수 상한 초과");
    this.name = "LimitExceededError";
  }
}

export const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

// Neon 직접 에러는 err.code, drizzle 래핑 에러는 err.cause.code에 PG 코드가 있음
export function getPgErrorCode(error: unknown): string | undefined {
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

export async function updateProfile(
  input: ProfileUpdateInput,
): Promise<Profile> {
  const [row] = await db
    .update(profile)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(profile.id, 1))
    .returning();
  if (!row) throw new PortfolioNotSeededError();
  return toProfile(row, true);
}

const PG_DIVISION_BY_ZERO = "22012";
const PROJECTS_LOCK_KEY = 7_301_001;
const TALKS_LOCK_KEY = 7_301_002;

// 순서 변경 요청이 항상 통과하도록 생성 개수에 같은 상한을 둠
// batch 단일 트랜잭션 안에서 테이블별 advisory xact lock으로 동시 생성을 직렬화한 뒤 개수를 검사함
// where를 넘기면 락은 테이블 단위로 유지하고 개수 검사 범위만 조건에 맞는 행으로 좁힘
// 상한 이상이면 0으로 나누기 오류로 batch 전체가 롤백되고 호출부가 LimitExceededError로 변환함
function limitGuard(
  table: typeof projects | typeof techTalks | typeof resumeEntries,
  lockKey: number,
  max = ORDER_SLUGS_MAX,
  where?: SQL,
): BatchItem<"pg">[] {
  const filter = where ? sql` where ${where}` : sql``;
  return [
    db.execute(sql`select pg_advisory_xact_lock(${lockKey})`),
    db.execute(
      sql`select 1 / (c - c) from (select count(*)::int as c from ${table}${filter}) t where c >= ${max}`,
    ),
  ];
}

function mapCreateError(error: unknown): never {
  const code = getPgErrorCode(error);
  if (code === PG_UNIQUE_VIOLATION) throw new SlugConflictError();
  if (code === PG_DIVISION_BY_ZERO) throw new LimitExceededError();
  throw error;
}

export async function createProject(
  input: ProjectCreateInput,
): Promise<Project> {
  const id = crypto.randomUUID();
  const statements: BatchItem<"pg">[] = [
    ...limitGuard(projects, PROJECTS_LOCK_KEY),
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
    mapCreateError(error);
  }
  return loadProjectById(id);
}

export async function updateProject(
  slug: string,
  input: ProjectUpdateInput,
): Promise<Project> {
  const [existing] = await db
    .select({ id: projects.id, thumbnail: projects.thumbnail })
    .from(projects)
    .where(eq(projects.slug, slug));
  if (!existing) throw new NotFoundError();

  const projectUpdate = {
    slug: input.slug,
    title: input.title,
    period: input.period,
    role: input.role,
    summary: input.summary,
    link: blankToNull(input.link),
    techStack: input.techStack,
    updatedAt: new Date(),
    ...(input.thumbnail !== undefined
      ? { thumbnail: blankToNull(input.thumbnail) }
      : {}),
  };
  const statements: BatchItem<"pg">[] = [
    db.update(projects).set(projectUpdate).where(eq(projects.id, existing.id)),
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
    if (getPgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new SlugConflictError();
    }
    // 조회 직후 프로젝트가 삭제되면 experiences 삽입이 FK 위반으로 실패
    if (getPgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new NotFoundError();
    }
    throw error;
  }
  const project = await loadProjectById(existing.id);
  if (
    existing.thumbnail &&
    existing.thumbnail !== project.thumbnail &&
    isOwnBlobUrl(existing.thumbnail)
  ) {
    await deleteBlobIfUnused(existing.thumbnail);
  }
  return project;
}

export async function deleteProject(slug: string): Promise<string | null> {
  const rows = await db
    .delete(projects)
    .where(eq(projects.slug, slug))
    .returning({ id: projects.id, thumbnail: projects.thumbnail });
  if (rows.length === 0) throw new NotFoundError();
  const thumbnail = rows[0].thumbnail;
  if (thumbnail && isOwnBlobUrl(thumbnail)) await deleteBlobIfUnused(thumbnail);
  return thumbnail;
}

function isOwnBlobUrl(value: string): boolean {
  return isValidThumbnail(value);
}

async function deleteBlobIfUnused(url: string): Promise<void> {
  try {
    const [reference] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.thumbnail, url))
      .limit(1);
    if (reference) return;
    await del(url);
  } catch {
    console.error("Blob thumbnail cleanup failed");
  }
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
    const results = await runBatch([
      ...limitGuard(techTalks, TALKS_LOCK_KEY),
      db
        .insert(techTalks)
        .values({
          ...input,
          sortOrder: sql`(select coalesce(max(${techTalks.sortOrder}), -1) + 1 from ${techTalks})`,
        })
        .returning(),
    ]);
    const [row] = results.at(-1) as (typeof techTalks.$inferSelect)[];
    if (!row) throw new Error("insert returned no row");
    return toTalk(row, true);
  } catch (error) {
    return mapCreateError(error);
  }
}

export async function updateTalk(
  slug: string,
  input: TalkUpdateInput,
): Promise<TechTalk> {
  try {
    const [row] = await db
      .update(techTalks)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(techTalks.slug, slug))
      .returning();
    if (!row) throw new NotFoundError();
    return toTalk(row, true);
  } catch (error) {
    if (getPgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new SlugConflictError();
    }
    throw error;
  }
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

// 7_301_003은 scripts/migrate.mjs의 마이그레이션 잠금 키라 사용 불가
const RESUME_LOCK_KEY = 7_301_004;

function isUuid(value: string) {
  return z.uuid().safeParse(value).success;
}

// 생성 개수 상한은 kind별로 검사함, 상한 이상이면 0으로 나누기 오류로 batch가 롤백됨
export async function createResumeEntry(
  input: ResumeEntryCreateInput,
): Promise<ResumeEntry> {
  try {
    const results = await runBatch([
      ...limitGuard(
        resumeEntries,
        RESUME_LOCK_KEY,
        RESUME_KIND_MAX,
        eq(resumeEntries.kind, input.kind),
      ),
      db
        .insert(resumeEntries)
        .values({
          ...input,
          sortOrder: sql`(select coalesce(max(${resumeEntries.sortOrder}), -1) + 1 from ${resumeEntries} where ${resumeEntries.kind} = ${input.kind})`,
        })
        .returning(),
    ]);
    const [row] = results.at(-1) as (typeof resumeEntries.$inferSelect)[];
    if (!row) throw new Error("insert returned no row");
    return toResumeEntry(row);
  } catch (error) {
    return mapCreateError(error);
  }
}

export async function updateResumeEntry(
  id: string,
  input: ResumeEntryUpdateInput,
): Promise<ResumeEntry> {
  if (!isUuid(id)) throw new NotFoundError();
  const [row] = await db
    .update(resumeEntries)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(resumeEntries.id, id))
    .returning();
  if (!row) throw new NotFoundError();
  return toResumeEntry(row);
}

// 삭제 후 sort_order 재번호는 하지 않음, 상대 순서만 의미가 있어 간격을 허용함
export async function deleteResumeEntry(id: string): Promise<void> {
  if (!isUuid(id)) throw new NotFoundError();
  const rows = await db
    .delete(resumeEntries)
    .where(eq(resumeEntries.id, id))
    .returning({ id: resumeEntries.id });
  if (rows.length === 0) throw new NotFoundError();
}

// 일치 확인 SELECT와 batch UPDATE 사이에 다른 요청이 목록을 바꾸면 순번이 어긋날 수 있는 한계가 있음
// 편집자가 한 명인 운영 전제로 별도 락이나 트랜잭션 격리는 두지 않음
export async function reorderResumeEntries(
  kind: ResumeKind,
  ids: string[],
): Promise<void> {
  const current = await db
    .select({ id: resumeEntries.id })
    .from(resumeEntries)
    .where(eq(resumeEntries.kind, kind));
  assertSameSet(
    current.map((r) => r.id),
    ids,
  );
  await runBatch(
    ids.map((id, i) =>
      db
        .update(resumeEntries)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(and(eq(resumeEntries.id, id), eq(resumeEntries.kind, kind))),
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
