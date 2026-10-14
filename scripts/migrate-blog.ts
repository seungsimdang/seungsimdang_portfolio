// Jekyll 블로그 _posts를 DATABASE_URL 대상 DB의 posts 테이블로 옮기는 일회성 스크립트
// 실행: pnpm blog:migrate -- --source <원본 저장소> [--apply] [--yes] [--report <파일>]
// 기본은 dry-run이며 DB 읽기(기존 slug 조회)와 원본 저장소 읽기만 하고 네트워크 다운로드와 Blob·DB 쓰기는 하지 않음
// --apply일 때만 Blob 업로드와 DB 삽입을 수행하며 이미 있는 slug는 건너뛰어 기존 행을 바꾸지 않음
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, extname, join, sep } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs, promisify } from "node:util";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { posts } from "../src/db/schema/portfolio";
import { parsePostMarkdown } from "../src/lib/blog/frontmatter";
import { sniffImage } from "../src/lib/blog/image-signature";
import { resolveLegacyImage } from "../src/lib/blog/migration/legacy-image-url";
import {
  collectImageUrls,
  replaceImageUrls,
} from "../src/lib/blog/migration/replace-image-urls";
import { parsePostFileName, slugifyPostName } from "../src/lib/blog/slug";
import { postCreateInputSchema } from "../src/schemas/blog.schema";

const run = promisify(execFile);

const EXIT_WARN = 1;
const EXIT_PRECHECK = 2;
const EXPECTED_FILES = 297;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const DOWNLOAD_TIMEOUT_MS = 30_000;
const DOWNLOAD_MAX_BYTES = 10 * 1024 * 1024;
const SELF_REFERENCE = [
  "222SeungHyun/222SeungHyun.github.io",
  "seungsimdang/seungsimdang.github.io",
  "raw.githubusercontent.com",
];
const TCPSCHOOL_URL =
  "http://tcpschool.com/lectures/img_c_floating_point_32.png";

// 임의 외부 이미지는 받지 않고 이 3건만 원본 파일명과 깨진 URL 호스트가 모두 맞을 때 내려받음
const RECOVERIES = [
  {
    file: "2023-12-17-Front-End-미니프로젝트 리팩토링 회고.md",
    host: "private-user-images.githubusercontent.com",
    from: "https://github.com/user-attachments/assets/ad847c87-947f-4b9b-a9c7-e37f1a2a254d",
    ext: ".gif",
  },
  {
    file: "2024-01-31-Front-End-파이널프로젝트 회고.md",
    host: "private-user-images.githubusercontent.com",
    from: "https://github.com/user-attachments/assets/a79617e9-4e90-4b17-939e-dbc45eef2fd6",
    ext: ".png",
  },
  {
    file: "2023-01-09-ComputerArchitecture-고정 소수점 & 부동 소수점.md",
    host: "camo.githubusercontent.com",
    from: TCPSCHOOL_URL,
    ext: ".png",
  },
] as const;

type Status = "INSERT" | "SKIP" | "FAIL";

interface FileResult {
  file: string;
  slug: string;
  status: Status;
  reason?: string;
  images: number;
  warnings: string[];
}

interface BlobRecord {
  source: string;
  pathname: string;
  url?: string;
}

interface ImageBytes {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
  // 로컬 파일 또는 git 복원 여부
  origin: "local" | "git" | "download";
}

const hash8 = (text: string) =>
  createHash("sha256").update(text).digest("hex").slice(0, 8);

function fail(message: string): never {
  console.error(message);
  process.exit(EXIT_PRECHECK);
}

async function confirm(hostname: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${hostname} 에 실행할까요? (y/N) `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

async function git(source: string, args: string[]): Promise<Buffer> {
  const { stdout } = await run("git", ["-C", source, ...args], {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

// 원본 저장소 루트 밖(심볼릭 링크 포함)을 가리키는 경로는 읽지 않음
async function readInside(root: string, relative: string) {
  const full = await realpath(join(root, relative));
  if (!full.startsWith(root + sep)) return null;
  return new Uint8Array(await readFile(full));
}

async function findLocalCaseInsensitive(root: string, relative: string) {
  const parts = relative.split("/");
  let current = "";
  for (const part of parts) {
    const names = await readdir(join(root, current)).catch(() => []);
    const hit = names.find(
      (n) => n.normalize("NFC").toLowerCase() === part.toLowerCase(),
    );
    if (!hit) return null;
    current = current ? `${current}/${hit.normalize("NFC")}` : hit;
  }
  return current;
}

async function loadRepoImage(
  root: string,
  relative: string,
): Promise<ImageBytes | string> {
  const extension = extname(relative).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) {
    return `지원하지 않는 이미지 확장자: ${relative}`;
  }
  let bytes: Uint8Array | null = null;
  let origin: ImageBytes["origin"] = "local";
  try {
    bytes = await readInside(root, relative);
  } catch {
    const found = await findLocalCaseInsensitive(root, relative);
    if (found) bytes = await readInside(root, found).catch(() => null);
  }
  if (!bytes) {
    try {
      const log = (
        await git(root, [
          "log",
          "--all",
          "--diff-filter=AM",
          "--format=%H",
          "--",
          relative,
        ])
      )
        .toString()
        .trim();
      const commit = log.split("\n")[0];
      if (commit) {
        bytes = new Uint8Array(
          await git(root, ["show", `${commit}:${relative}`]),
        );
        origin = "git";
      }
    } catch {
      bytes = null;
    }
  }
  if (!bytes) return `원본 이미지를 찾지 못함: ${relative}`;
  const detected = sniffImage(bytes, true);
  if (!detected) return `이미지 시그니처가 아님: ${relative}`;
  return { bytes, contentType: detected.contentType, extension, origin };
}

async function download(url: string): Promise<Uint8Array | string> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (response.status !== 200) return `다운로드 실패 HTTP ${response.status}`;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > DOWNLOAD_MAX_BYTES) return "다운로드 크기 초과";
    return bytes;
  } catch (error) {
    return `다운로드 실패: ${error instanceof Error ? error.name : "unknown"}`;
  }
}

function localPathname(relative: string): string {
  const stem = basename(relative, extname(relative));
  const ascii =
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";
  return `blog/images/legacy/${ascii}-${hash8(relative)}${extname(relative).toLowerCase()}`;
}

async function oldestGitDate(root: string, file: string): Promise<string> {
  const out = (
    await git(root, [
      "log",
      "--diff-filter=A",
      "--follow",
      "--format=%as",
      "--",
      `_posts/${file}`,
    ])
  )
    .toString()
    .trim();
  const date = out.split("\n").at(-1);
  if (!date) throw new Error("git 이력에서 날짜를 찾지 못함");
  return date;
}

// 이미지 바로 다음 줄에 출처 한 줄을 넣고 이미 tcpschool 표기가 있으면 그대로 둠
function addTcpschoolSource(markdown: string, imageUrl: string): string {
  if (/tcpschool/i.test(markdown)) return markdown;
  const lines = markdown.split("\n");
  const index = lines.findIndex((line) => line.includes(imageUrl));
  if (index < 0) return markdown;
  lines.splice(index + 1, 0, "", `출처: [tcpschool.com](${TCPSCHOOL_URL})`);
  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((a) => a !== "--"),
    options: {
      source: { type: "string" },
      apply: { type: "boolean", default: false },
      yes: { type: "boolean", default: false },
      report: { type: "string" },
    },
    strict: true,
  });
  const apply = values.apply;
  if (!values.source) fail("--source <원본 저장소 경로>가 필요함");
  if (apply && !values.report) fail("--apply에는 --report <파일>이 필요함");
  if (apply) {
    for (const name of ["BLOB_READ_WRITE_TOKEN", "NEXT_PUBLIC_BLOB_HOSTNAME"]) {
      if (!process.env[name]) fail(`${name}이 설정되지 않음`);
    }
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && apply) fail("DATABASE_URL이 설정되지 않음");
  let dbHost: string | null = null;
  if (databaseUrl) {
    try {
      dbHost = new URL(databaseUrl).hostname;
    } catch {
      fail("DATABASE_URL 형식이 올바르지 않음");
    }
  }
  const root = await realpath(values.source).catch(() =>
    fail("--source 경로가 없음"),
  );
  const postDir = join(root, "_posts");
  const names = (await readdir(postDir).catch(() => fail("_posts가 없음")))
    .filter((n) => n.endsWith(".md"))
    .map((n) => n.normalize("NFC"))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  await run("git", ["--version"]).catch(() => fail("git이 필요함"));

  console.log(`모드: ${apply ? "APPLY" : "dry-run"}`);
  console.log(
    `DB 호스트: ${dbHost ?? "(DATABASE_URL 없음, 기존 slug 조회 생략)"}`,
  );
  if (apply && !values.yes && dbHost && !(await confirm(dbHost))) {
    fail("취소됨");
  }

  const db = databaseUrl ? drizzle(neon(databaseUrl)) : null;
  const blobHost = process.env.NEXT_PUBLIC_BLOB_HOSTNAME ?? "<blob-host>";
  const warnings: string[] = [];
  const results: FileResult[] = [];
  const blobs: BlobRecord[] = [];
  const inserted: string[] = [];
  const dateNotes: string[] = [];

  // 1단계: 파싱, slug 생성(충돌은 정렬 순으로 -2, -3)
  const usedSlugs = new Set<string>();
  const entries: {
    file: string;
    slug: string;
    title: string;
    date: string;
    body: string;
    published: boolean;
    categories: string[];
    tags: string[];
  }[] = [];
  for (const file of names) {
    try {
      const raw = await readFile(join(postDir, file), "utf8");
      const parsed = parsePostMarkdown(raw);
      if (parsed.error) throw new Error(parsed.error);
      const name = parsePostFileName(file);
      let date = name.date;
      if (!date) {
        date = await oldestGitDate(root, file);
        dateNotes.push(`${file}: git 최초 커밋 날짜 ${date} 사용`);
      }
      const base = slugifyPostName(`${date}-${name.title}`);
      let slug = base;
      for (let n = 2; usedSlugs.has(slug); n += 1) slug = `${base}-${n}`;
      usedSlugs.add(slug);
      entries.push({
        file,
        slug,
        title: parsed.frontmatter.title || name.title,
        date,
        body: parsed.body,
        published: parsed.frontmatter.published ?? true,
        categories: parsed.frontmatter.categories ?? [],
        tags: parsed.frontmatter.tags ?? [],
      });
    } catch (error) {
      results.push({
        file,
        slug: "",
        status: "FAIL",
        reason: error instanceof Error ? error.message : "알 수 없는 오류",
        images: 0,
        warnings: [],
      });
    }
  }

  // 2단계: DB에 이미 있는 slug는 건너뜀
  const existing = new Set<string>();
  if (db && entries.length > 0) {
    const rows = await db
      .select({ slug: posts.slug })
      .from(posts)
      .where(
        inArray(
          posts.slug,
          entries.map((e) => e.slug),
        ),
      );
    for (const row of rows) existing.add(row.slug);
  }

  // 3단계: 이미지 처리와 삽입, 같은 이미지는 한 번만 올림
  const imageCache = new Map<string, ImageBytes | string>();
  const uploaded = new Map<string, string>();
  const stats = {
    local: new Set<string>(),
    git: new Set<string>(),
    download: new Set<string>(),
    external: new Set<string>(),
    unresolved: new Set<string>(),
  };
  let remainingReferences = 0;

  const upload = async (
    pathname: string,
    image: ImageBytes,
    source: string,
  ) => {
    const known = uploaded.get(pathname);
    if (known) return known;
    let url = `https://${blobHost}/${pathname}`;
    if (apply) {
      const result = await put(pathname, Buffer.from(image.bytes), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: image.contentType,
      });
      url = result.url;
    }
    uploaded.set(pathname, url);
    blobs.push({ source, pathname, ...(apply ? { url } : {}) });
    return url;
  };

  for (const entry of entries) {
    if (existing.has(entry.slug)) {
      results.push({
        file: entry.file,
        slug: entry.slug,
        status: "SKIP",
        reason: "이미 존재하는 slug",
        images: 0,
        warnings: [],
      });
      continue;
    }
    const fileWarnings: string[] = [];
    const urlMap = new Map<string, string>();
    let recovered: string | undefined;
    try {
      for (const url of new Set(collectImageUrls(entry.body))) {
        const legacy = resolveLegacyImage(url);
        if (legacy) {
          let image = imageCache.get(legacy);
          if (!image) {
            image = await loadRepoImage(root, legacy);
            imageCache.set(legacy, image);
          }
          if (typeof image === "string") {
            fileWarnings.push(image);
            stats.unresolved.add(legacy);
            continue;
          }
          (image.origin === "git" ? stats.git : stats.local).add(legacy);
          urlMap.set(url, await upload(localPathname(legacy), image, legacy));
          continue;
        }
        let host = "";
        try {
          host = new URL(url).hostname;
        } catch {
          // 상대 경로 등은 외부 URL로 취급해 그대로 둠
        }
        const recovery = RECOVERIES.find(
          (r) => r.file === entry.file && r.host === host,
        );
        if (!recovery) {
          stats.external.add(url);
          continue;
        }
        const pathname = `blog/images/recovered/${hash8(recovery.from)}${recovery.ext}`;
        let image: ImageBytes | undefined;
        if (apply) {
          const downloaded = await download(recovery.from);
          if (typeof downloaded === "string") {
            fileWarnings.push(`${recovery.from}: ${downloaded}`);
            stats.unresolved.add(recovery.from);
            continue;
          }
          const detected = sniffImage(downloaded, true);
          if (!detected || detected.extension !== recovery.ext) {
            fileWarnings.push(`${recovery.from}: 이미지 형식이 예상과 다름`);
            stats.unresolved.add(recovery.from);
            continue;
          }
          image = {
            bytes: downloaded,
            contentType: detected.contentType,
            extension: detected.extension,
            origin: "download",
          };
        } else {
          image = {
            bytes: new Uint8Array(),
            contentType: "",
            extension: recovery.ext,
            origin: "download",
          };
        }
        stats.download.add(recovery.from);
        const blobUrl = await upload(pathname, image, recovery.from);
        urlMap.set(url, blobUrl);
        if (recovery.from === TCPSCHOOL_URL) recovered = blobUrl;
      }

      const replacedResult = replaceImageUrls(
        entry.body,
        (url) => urlMap.get(url),
        entry.title,
      );
      let content = replacedResult.markdown;
      if (recovered) content = addTcpschoolSource(content, recovered);
      remainingReferences += SELF_REFERENCE.filter((s) =>
        content.includes(s),
      ).length;

      const input = postCreateInputSchema.safeParse({
        slug: entry.slug,
        title: entry.title,
        content,
        categories: entry.categories,
        tags: entry.tags,
        publishedAt: entry.date,
        published: entry.published,
      });
      if (!input.success) {
        throw new Error(
          input.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(", "),
        );
      }
      if (apply && db) {
        const rows = await db
          .insert(posts)
          .values(input.data)
          .onConflictDoNothing({ target: posts.slug })
          .returning({ slug: posts.slug });
        if (rows.length === 0) {
          results.push({
            file: entry.file,
            slug: entry.slug,
            status: "SKIP",
            reason: "이미 존재하는 slug",
            images: 0,
            warnings: fileWarnings,
          });
          continue;
        }
        inserted.push(entry.slug);
      }
      results.push({
        file: entry.file,
        slug: entry.slug,
        status: "INSERT",
        images: replacedResult.replaced,
        warnings: fileWarnings,
      });
    } catch (error) {
      results.push({
        file: entry.file,
        slug: entry.slug,
        status: "FAIL",
        reason: error instanceof Error ? error.message : "알 수 없는 오류",
        images: 0,
        warnings: fileWarnings,
      });
    }
  }

  // 4단계: 출력
  const order = new Map(names.map((n, i) => [n, i]));
  results.sort((a, b) => (order.get(a.file) ?? 0) - (order.get(b.file) ?? 0));
  for (const r of results) {
    console.log(
      `[${r.status}] ${r.slug || r.file} images=${r.images} warn=${r.warnings.length}${r.reason ? ` (${r.reason})` : ""}`,
    );
    for (const w of r.warnings) console.log(`    warn: ${w}`);
    warnings.push(...r.warnings.map((w) => `${r.file}: ${w}`));
  }
  const count = (s: Status) => results.filter((r) => r.status === s).length;
  const excluded = 0;
  const total = names.length;
  const sumOk =
    count("INSERT") + count("SKIP") + count("FAIL") + excluded === total;
  console.log(
    `\n총 파일 ${total} / INSERT ${count("INSERT")} / SKIP(이미 존재) ${count("SKIP")} / FAIL ${count("FAIL")} / 의도적 제외 ${excluded}`,
  );
  console.log(
    `건수 검증: ${sumOk ? "일치" : "불일치"} (기대 파일 수 ${EXPECTED_FILES}, 실제 ${total})`,
  );
  if (!sumOk) warnings.push("건수 불일치");
  if (total !== EXPECTED_FILES)
    warnings.push(`파일 수가 ${EXPECTED_FILES}가 아님`);
  for (const note of dateNotes) console.log(`날짜 없는 파일: ${note}`);
  console.log(
    `이미지: 고유 로컬 ${stats.local.size}, git 복원 ${stats.git.size}, 다운로드 ${stats.download.size}${apply ? "" : "(dry-run은 계획만)"}, 외부 유지 ${stats.external.size}, 미해결 ${stats.unresolved.size}`,
  );
  console.log(`자기 저장소 참조 잔존: ${remainingReferences}건`);
  if (remainingReferences > 0)
    warnings.push(`자기 저장소 참조 ${remainingReferences}건 잔존`);

  if (values.report) {
    await writeFile(
      values.report,
      JSON.stringify(
        {
          mode: apply ? "apply" : "dry-run",
          generatedAt: new Date().toISOString(),
          files: results.map(({ file, slug, status, reason, warnings: w }) => ({
            file,
            slug,
            status,
            ...(reason ? { reason } : {}),
            warnings: w,
          })),
          inserted,
          blobs,
          warnings,
        },
        null,
        2,
      ),
    );
  }
  process.exit(count("FAIL") > 0 || warnings.length > 0 ? EXIT_WARN : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "알 수 없는 오류");
  process.exit(EXIT_WARN);
});
