import { existsSync } from "node:fs";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { deleteBlob } = vi.hoisted(() => ({ deleteBlob: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob", () => ({ del: deleteBlob }));

if (!process.env.E2E_DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

function databaseHost(value: string | undefined) {
  try {
    return new URL(value ?? "").hostname.toLowerCase().replace("-pooler.", ".");
  } catch {
    return null;
  }
}

const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
const e2eDatabaseIsolated = Boolean(
  process.env.RUN_THUMBNAIL_DB_TESTS === "1" &&
    e2eDatabaseUrl &&
    process.env.DATABASE_URL &&
    databaseHost(e2eDatabaseUrl) !== null &&
    databaseHost(process.env.DATABASE_URL) !== null &&
    databaseHost(e2eDatabaseUrl) !== databaseHost(process.env.DATABASE_URL),
);

if (e2eDatabaseIsolated && e2eDatabaseUrl) {
  process.env.DATABASE_URL = e2eDatabaseUrl;
}

const BLOB_HOST = "ci-test.public.blob.vercel-storage.com";
const slugs = new Set<string>();
const testUrls = new Set<string>();
let service: typeof import("@/services/portfolio/portfolio-admin-service");
let db: typeof import("@/db").db;
let retiredThumbnailBlobs: typeof import("@/db/schema/portfolio").retiredThumbnailBlobs;
let inArray: typeof import("drizzle-orm").inArray;
let eq: typeof import("drizzle-orm").eq;
let sql: typeof import("drizzle-orm").sql;
let releaseDelete: (() => void) | undefined;

function slug(label: string) {
  const value = `qa-${label}-${crypto.randomUUID()}`;
  slugs.add(value);
  return value;
}

function thumbnail() {
  const value = `https://${BLOB_HOST}/thumbnails/qa-${crypto.randomUUID()}.png`;
  testUrls.add(value);
  return value;
}

function project(slugValue: string, thumbnails: string[]) {
  return {
    slug: slugValue,
    title: "QA 썸네일 정리 테스트",
    period: "2026",
    role: "QA",
    summary: "임시 프로젝트",
    techStack: [],
    experiences: [],
    thumbnails,
  };
}

function projectUpdate(slugValue: string, thumbnails: string[]) {
  return {
    ...project(slugValue, thumbnails),
    mobileThumbnails: [],
  };
}

describe.skipIf(!e2eDatabaseIsolated)(
  "실제 E2E DB의 Blob 참조 정리 경쟁",
  () => {
    beforeAll(async () => {
      vi.stubEnv("NEXT_PUBLIC_BLOB_HOSTNAME", BLOB_HOST);
      service = await import("@/services/portfolio/portfolio-admin-service");
      db = (await import("@/db")).db;
      retiredThumbnailBlobs = (await import("@/db/schema/portfolio"))
        .retiredThumbnailBlobs;
      const orm = await import("drizzle-orm");
      inArray = orm.inArray;
      eq = orm.eq;
      sql = orm.sql;
    });

    beforeEach(() => {
      deleteBlob.mockReset();
      deleteBlob.mockResolvedValue(undefined);
    });

    afterEach(() => {
      releaseDelete?.();
      releaseDelete = undefined;
    });

    afterAll(async () => {
      for (const projectSlug of slugs) {
        try {
          await service.deleteProject(projectSlug);
        } catch (error) {
          if (!(error instanceof service.NotFoundError)) throw error;
        }
      }
      if (testUrls.size > 0) {
        await db
          .delete(retiredThumbnailBlobs)
          .where(inArray(retiredThumbnailBlobs.url, [...testUrls]));
      }
      vi.unstubAllEnvs();
    });

    it("같은 URL을 다른 프로젝트가 참조하면 먼저 삭제한 쪽은 Blob을 정리하지 않는다", async () => {
      const url = thumbnail();
      const first = await service.createProject(
        project(slug("shared-a"), [url]),
      );
      const second = await service.createProject(
        project(slug("shared-b"), [url]),
      );

      await service.deleteProject(first.slug);
      expect(deleteBlob).not.toHaveBeenCalledWith(url);

      await service.deleteProject(second.slug);
      expect(deleteBlob).toHaveBeenCalledWith(url);
    });

    it("삭제 확정 중 새 참조를 거부하고 삭제 실패 뒤에도 퇴역 URL을 재사용하지 않는다", async () => {
      const url = thumbnail();
      const first = await service.createProject(
        project(slug("retire-a"), [url]),
      );
      const second = await service.createProject(
        project(slug("retire-b"), [thumbnail()]),
      );
      let notifyStarted!: () => void;
      let completeDelete!: () => void;
      const deletionStarted = new Promise<void>((resolve) => {
        notifyStarted = resolve;
      });
      const deletionBarrier = new Promise<void>((resolve) => {
        completeDelete = resolve;
        releaseDelete = resolve;
      });
      deleteBlob.mockImplementation(async () => {
        notifyStarted();
        await deletionBarrier;
        throw new Error("mocked Blob deletion failure");
      });

      const deleting = service.deleteProject(first.slug);
      await deletionStarted;
      await expect(
        service.updateProject(second.slug, projectUpdate(second.slug, [url])),
      ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
      completeDelete();
      await deleting;
      releaseDelete = undefined;

      await expect(
        service.createProject(project(slug("retire-c"), [url])),
      ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("동시 참조 저장과 삭제 중 한쪽만 성공해 삭제된 Blob의 참조가 남지 않는다", async () => {
      const url = thumbnail();
      const first = await service.createProject(project(slug("race-a"), [url]));
      const secondSlug = slug("race-b");

      const [deleted, created] = await Promise.allSettled([
        service.deleteProject(first.slug),
        service.createProject(project(secondSlug, [url])),
      ]);

      expect(deleted.status).toBe("fulfilled");
      if (created.status === "fulfilled") {
        expect(deleteBlob).not.toHaveBeenCalledWith(url);
        await service.deleteProject(created.value.slug);
      } else {
        expect(created.reason).toMatchObject({ code: "VALIDATION_FAILED" });
        expect(deleteBlob).toHaveBeenCalledWith(url);
      }
    });

    async function deletedAtOf(url: string) {
      const [row] = await db
        .select({ deletedAt: retiredThumbnailBlobs.deletedAt })
        .from(retiredThumbnailBlobs)
        .where(eq(retiredThumbnailBlobs.url, url));
      return row;
    }

    it("첫 삭제가 실패해 남은 퇴역 URL은 다른 프로젝트 정리 때 재시도되어 삭제 시각이 채워진다", async () => {
      const url = thumbnail();
      const first = await service.createProject(
        project(slug("retry-a"), [url]),
      );
      const second = await service.createProject(
        project(slug("retry-b"), [thumbnail()]),
      );
      deleteBlob.mockRejectedValue(new Error("mocked Blob deletion failure"));
      await service.deleteProject(first.slug);
      expect((await deletedAtOf(url)).deletedAt).toBeNull();

      deleteBlob.mockReset();
      deleteBlob.mockResolvedValue(undefined);
      await service.deleteProject(second.slug);
      expect(deleteBlob).toHaveBeenCalledWith(url);
      expect((await deletedAtOf(url)).deletedAt).toBeInstanceOf(Date);
    });

    // 한 batch는 한 트랜잭션이라 xact lock을 sleep 동안 유지함
    function holdLock(key: number, seconds: number) {
      return db.batch([
        db.execute(sql`select pg_advisory_xact_lock(${key})`),
        db.execute(sql`select pg_sleep(${seconds})`),
      ]);
    }

    it("이력서 잠금 7301004를 잡고 있어도 썸네일 저장은 막히지 않는다", async () => {
      const holding = holdLock(7_301_004, 4);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const started = Date.now();
      await service.createProject(project(slug("lock-resume"), [thumbnail()]));
      expect(Date.now() - started).toBeLessThan(3000);
      await holding;
    });

    it("퇴역 잠금 7301005를 잡고 있으면 썸네일 저장이 해제될 때까지 대기한다", async () => {
      const holding = holdLock(7_301_005, 4);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const started = Date.now();
      await service.createProject(project(slug("lock-retire"), [thumbnail()]));
      expect(Date.now() - started).toBeGreaterThan(1500);
      await holding;
    });
  },
);
