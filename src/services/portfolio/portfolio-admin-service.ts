import "server-only";
import { del } from "@vercel/blob";
import { HttpStatusCode } from "axios";
import { and, eq, isNull, type SQL, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import type { ResumeKind } from "@/constants/resume";
import { db } from "@/db";
import {
  experiences,
  profile,
  projects,
  resumeEntries,
  retiredThumbnailBlobs,
  techTalks,
} from "@/db/schema/portfolio";
import { ApiError } from "@/lib/api/api-error";
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
const PG_CHECK_VIOLATION = "23514";
const PG_RETIRED_THUMBNAIL_VIOLATION = "P1001";
const PG_RETIRED_MOBILE_THUMBNAIL_VIOLATION = "P1002";
// drizzle/0008 trigger와 같은 값이어야 함
const THUMBNAIL_RETIRE_LOCK_KEY = 7_301_005;

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

function mobileWithoutBaseError() {
  return new ApiError(
    "VALIDATION_FAILED",
    HttpStatusCode.BadRequest,
    "입력값을 확인해 주세요",
    { mobileThumbnails: "기본 이미지를 먼저 등록해 주세요" },
  );
}

function retiredThumbnailError(field: "thumbnails" | "mobileThumbnails") {
  return new ApiError(
    "VALIDATION_FAILED",
    HttpStatusCode.BadRequest,
    "정리된 이미지는 다시 사용할 수 없습니다. 새 이미지를 업로드해 주세요",
    { [field]: "새 이미지를 업로드해 주세요" },
  );
}

function mapCreateError(error: unknown): never {
  const code = getPgErrorCode(error);
  if (code === PG_RETIRED_THUMBNAIL_VIOLATION) {
    throw retiredThumbnailError("thumbnails");
  }
  if (code === PG_RETIRED_MOBILE_THUMBNAIL_VIOLATION) {
    throw retiredThumbnailError("mobileThumbnails");
  }
  if (code === PG_UNIQUE_VIOLATION) throw new SlugConflictError();
  if (code === PG_DIVISION_BY_ZERO) throw new LimitExceededError();
  // 사전 판정 이후 동시 수정으로 어긋난 경우의 안전망
  if (code === PG_CHECK_VIOLATION) throw mobileWithoutBaseError();
  throw error;
}

export async function createProject(
  input: ProjectCreateInput,
): Promise<Project> {
  const id = crypto.randomUUID();
  const thumbnails = input.thumbnails ?? [];
  const mobileThumbnails = input.mobileThumbnails ?? [];
  if (mobileThumbnails.length > 0 && thumbnails.length === 0) {
    throw mobileWithoutBaseError();
  }
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
      thumbnails,
      mobileThumbnails,
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
    .select({
      id: projects.id,
      thumbnails: projects.thumbnails,
      mobileThumbnails: projects.mobileThumbnails,
    })
    .from(projects)
    .where(eq(projects.slug, slug));
  if (!existing) throw new NotFoundError();

  const nextThumbnails = input.thumbnails ?? existing.thumbnails;
  const nextMobile = input.mobileThumbnails ?? existing.mobileThumbnails;
  if (nextMobile.length > 0 && nextThumbnails.length === 0) {
    throw mobileWithoutBaseError();
  }

  const projectUpdate = {
    slug: input.slug,
    title: input.title,
    period: input.period,
    role: input.role,
    summary: input.summary,
    link: blankToNull(input.link),
    techStack: input.techStack,
    updatedAt: new Date(),
    ...(input.thumbnails !== undefined ? { thumbnails: input.thumbnails } : {}),
    ...(input.mobileThumbnails !== undefined
      ? { mobileThumbnails: input.mobileThumbnails }
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
    if (getPgErrorCode(error) === PG_RETIRED_THUMBNAIL_VIOLATION) {
      throw retiredThumbnailError("thumbnails");
    }
    if (getPgErrorCode(error) === PG_RETIRED_MOBILE_THUMBNAIL_VIOLATION) {
      throw retiredThumbnailError("mobileThumbnails");
    }
    if (getPgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new SlugConflictError();
    }
    // 조회 직후 프로젝트가 삭제되면 experiences 삽입이 FK 위반으로 실패
    if (getPgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new NotFoundError();
    }
    if (getPgErrorCode(error) === PG_CHECK_VIOLATION) {
      throw mobileWithoutBaseError();
    }
    throw error;
  }
  const project = await loadProjectById(existing.id);
  const kept = new Set([...project.thumbnails, ...project.mobileThumbnails]);
  const removed = [...existing.thumbnails, ...existing.mobileThumbnails].filter(
    (url) => !kept.has(url),
  );
  await deleteUnusedBlobs(removed);
  return project;
}

export async function deleteProject(slug: string): Promise<void> {
  const rows = await db
    .delete(projects)
    .where(eq(projects.slug, slug))
    .returning({
      id: projects.id,
      thumbnails: projects.thumbnails,
      mobileThumbnails: projects.mobileThumbnails,
    });
  if (rows.length === 0) throw new NotFoundError();
  await deleteUnusedBlobs([...rows[0].thumbnails, ...rows[0].mobileThumbnails]);
}

function isOwnBlobUrl(value: string): boolean {
  return isValidThumbnail(value);
}

// 저장이 끝난 뒤의 정리라 개별 실패는 응답에 영향을 주지 않음
async function deleteUnusedBlobs(urls: string[]): Promise<void> {
  const targets = [...new Set(urls)].filter(isOwnBlobUrl);
  await Promise.allSettled(targets.map(retireBlobIfUnused));
  await deleteRetiredBlobs();
}

// 같은 프로젝트의 다른 목록과 다른 프로젝트의 참조를 모두 보호함
async function retireBlobIfUnused(url: string): Promise<void> {
  try {
    // Blob 삭제 결과가 모호해도 참조가 되살아나지 않도록 퇴역 상태를 먼저 기록함
    await db.batch([
      db.execute(sql`set transaction isolation level read committed`),
      db.execute(
        sql`select pg_advisory_xact_lock(${THUMBNAIL_RETIRE_LOCK_KEY})`,
      ),
      db.execute(sql`
        insert into retired_thumbnail_blobs (url)
        select ${url}
        where not exists (
          select 1
          from projects
          where ${url} = any(thumbnails)
             or ${url} = any(mobile_thumbnails)
        )
        on conflict (url) do nothing
      `),
    ]);
  } catch {
    console.error("Blob thumbnail cleanup failed");
  }
}

// 퇴역 기록이 있는 URL은 trigger가 새 참조를 거부하므로 잠금 없이 지워도 경합이 없음
// 이번 요청 대상뿐 아니라 이전 요청에서 삭제가 실패한 URL도 함께 재시도함
async function deleteRetiredBlobs(): Promise<void> {
  try {
    const pending = await db
      .select({ url: retiredThumbnailBlobs.url })
      .from(retiredThumbnailBlobs)
      .where(isNull(retiredThumbnailBlobs.deletedAt));
    const results = await Promise.allSettled(
      pending.map(async ({ url }) => {
        await del(url);
        await db
          .update(retiredThumbnailBlobs)
          .set({ deletedAt: new Date() })
          .where(eq(retiredThumbnailBlobs.url, url));
      }),
    );
    if (results.some((result) => result.status === "rejected")) {
      console.error("Blob thumbnail cleanup failed");
    }
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
