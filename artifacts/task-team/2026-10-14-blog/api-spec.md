# api-spec: 블로그 DB 이관과 블로그 기능 (posts)

- 작성일: 2026-10-14
- 작성자: Backend Developer (T04, 명세만. 코드·설정·DB 변경 없음)
- 입력: `requirements.md`(승인됨), `00-input.md`
- 기준 코드: `src/db/schema/portfolio.ts`, `src/schemas/portfolio.schema.ts`, `src/services/portfolio/*`, `src/app/api/admin/{talks,uploads/thumbnail}/`, `src/lib/api/*`, `src/lib/auth/admin-route.ts`, `scripts/{migrate.mjs,migrate-thumbnails.mjs,resume-data.ts}`, `next.config.ts`
- 테스트: 새 테스트 작성 담당은 배정하지 않는다(8절은 영향받는 기존 테스트 목록만)

## 목차

- [1. 확인한 사실과 핵심 결정](#1-확인한-사실과-핵심-결정)
- [2. DB 스키마와 마이그레이션](#2-db-스키마와-마이그레이션)
- [3. 공유 계약: 상수, 타입, Zod, 순수 유틸](#3-공유-계약-상수-타입-zod-순수-유틸)
- [4. 서비스 함수](#4-서비스-함수)
- [5. API 엔드포인트](#5-api-엔드포인트)
- [6. 마크다운 렌더링 파이프라인](#6-마크다운-렌더링-파이프라인)
- [7. 이관 스크립트 CLI 계약](#7-이관-스크립트-cli-계약)
- [8. 보안, 캐시, 영향받는 기존 테스트](#8-보안-캐시-영향받는-기존-테스트)
- [9. T05/T06 파일 소유 경계](#9-t05t06-파일-소유-경계)
- [10. 열린 이슈와 orchestrator 조치](#10-열린-이슈와-orchestrator-조치)

## 1. 확인한 사실과 핵심 결정

확인한 사실:

1. `scripts/migrate.mjs --build`가 Preview/Production/CI 빌드에서 `drizzle/meta/_journal.json` 기준으로 마이그레이션을 자동 적용한다. `develop` push만으로 운영 DB에 `posts`가 생성될 수 있다(추가만이라 기존 화면은 안전).
2. 서버 DB 드라이버는 `neon-http`다. `db.transaction()`은 없고 `db.batch()`만 원자적이다. posts 쓰기는 단일 문장이라 batch가 필요 없다.
3. 기존 오류 변환은 `adminRoute`가 `SlugConflictError`, `NotFoundError`를 `apiErrors.slugConflict()`(409, `fieldErrors.slug`), `apiErrors.notFound()`(404)로 바꾼다. posts도 같은 클래스를 던져 재사용한다. 새 오류 코드는 없다. 메시지는 기존 "이미 사용 중인 주소입니다"를 그대로 쓴다.
4. 썸네일 업로드는 `isValidThumbnail`이 `/thumbnails/` 경로만 허용한다. 본문 이미지는 `/blog/images/`를 허용하는 별도 검사가 필요하다.
5. `parseJsonBody`의 본문 상한은 256KB 고정이다. 본문(content)을 받는 posts 라우트는 더 큰 상한이 필요하다.
6. 쓰기 후 캐시 갱신은 `revalidatePath("/", "layout")` 한 줄이다(기존 전 라우트 동일). posts도 동일하게 쓴다.
7. `next.config.ts`의 이미지 허용 목록은 `NEXT_PUBLIC_BLOB_HOSTNAME` 하나다. 본문 이미지는 `next/image`의 `unoptimized`로 렌더하므로 `next.config.ts`는 변경하지 않는다(6.4절).
8. 한글 slug 경로 파라미터는 퍼센트 인코딩 상태로 들어온다. 디코딩은 `decodePostSlug` 한 곳에서 한다(3.4절).

핵심 결정:

| 항목 | 결정 |
| --- | --- |
| 날짜 컬럼 | `published_at date`(문자열 모드 `YYYY-MM-DD`). 원본에 시각이 없다 |
| 목록 정렬 | `published_at desc, slug desc`. 요구사항의 `id` 타이브레이커 대신 `slug`를 쓴다. 같은 날 여러 글(문제 번호 순)이 많아 uuid 정렬은 임의 순서가 되고, slug는 유일하고 의미 있는 안정 정렬이다(10절 확인 항목) |
| 서비스 위치 | `src/services/blog/blog-service.ts`(읽기), `blog-admin-service.ts`(쓰기) |
| 본문 한도 | content 300,000자 이하(UTF-8 최악 약 900KB), posts 라우트 요청 본문 상한 2MiB(Vercel 4.5MB 이하) |
| 렌더러 | 서버 전용이 아닌 동기 함수 `renderMarkdown(source)`. 공개 상세(서버)와 admin 미리보기(클라이언트)가 같은 모듈을 쓰므로 미리보기용 API가 필요 없다 |
| 프론트매터 파서 | `yaml` 패키지 + 자체 펜스 분리. `gray-matter`는 `fs` 참조로 클라이언트 번들에 부적합해 쓰지 않는다 |
| 이관 스크립트 | `scripts/migrate-blog.ts`(tsx). 순수 로직은 `src/lib/blog/`에 두고 스크립트는 I/O만 한다 |
| 업로드 공용화 | `src/lib/api/image-upload.ts`로 검증을 추출해 썸네일 라우트와 본문 이미지 라우트가 공유한다 |

## 2. DB 스키마와 마이그레이션

### 2.1 `src/db/schema/portfolio.ts` 변경 (추가만)

```ts
import { boolean, date /* 기존 import에 추가 */ } from "drizzle-orm/pg-core";

// 한글 완성형(가-힣), 영문 소문자, 숫자, 하이픈. 하이픈 연속과 양끝 금지
const POST_SLUG_PATTERN_SQL = sql.raw("'^[a-z0-9가-힣]+(-[a-z0-9가-힣]+)*$'");

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    publishedAt: date("published_at", { mode: "string" }).notNull(),
    published: boolean("published").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("posts_slug_format", sql`${table.slug} ~ ${POST_SLUG_PATTERN_SQL}`),
    check("posts_slug_length", sql`char_length(${table.slug}) <= 200`),
    index("posts_list_idx").on(
      table.published,
      table.publishedAt.desc(),
      table.slug.desc(),
    ),
  ],
);
```

- 기존 `SLUG_PATTERN_SQL`과 projects/talks 제약은 변경하지 않는다.
- 자모 분리(NFD) 한글은 check를 통과하지 못한다. 모든 입력 경로가 NFC로 정규화한다(3.4절).
- slug unique 제약이 동시 생성 경쟁의 최종 보증이다. unique 위반(PG `23505`)은 `SlugConflictError`로 변환한다.
- 이관 출처 컬럼은 두지 않는다. 카테고리 필터는 `categories @> array[$1]::text[]`이며 별도 GIN 인덱스는 두지 않는다(297건, 필요 시 후속).

### 2.2 마이그레이션 생성

1. schema 수정 후 `pnpm db:generate`로 `drizzle/0003_*.sql`과 `drizzle/meta/*`를 생성한다. 파일명은 drizzle이 정한 이름을 그대로 쓴다.
2. 생성 SQL이 `create table "posts"`, unique, check 2개, index만 포함하는지 확인한다. 추가 외의 drop/alter가 있으면 중단하고 보고한다.
3. 구현자는 `pnpm db:migrate`를 실행하지 않는다. 적용은 orchestrator가 10절 절차로 수행한다.

## 3. 공유 계약: 상수, 타입, Zod, 순수 유틸

frontend는 아래 이름과 모양을 그대로 가정하고 작업한다. 정의 파일은 모두 backend 소유다.

### 3.1 상수: `src/constants/blog.ts` (신규)

```ts
export const POST_PAGE_SIZE = 20; // 공개 목록
export const POST_ADMIN_PAGE_SIZE = 50; // admin 목록
export const POST_CONTENT_MAX = 300_000; // 글자 수
export const POST_BODY_MAX_BYTES = 2 * 1024 * 1024; // posts 라우트 요청 본문 상한
export const POST_IMPORT_MAX_BYTES = 1024 * 1024; // .md import 파일 크기 상한 (클라이언트 검사용)
export const POST_SLUG_MAX = 200;
```

### 3.2 타입: `src/types/blog.ts` (신규)

```ts
export interface PostSummary {
  slug: string;
  title: string;
  publishedAt: string; // "YYYY-MM-DD"
  categories: string[];
  tags: string[];
  published: boolean; // 공개 조회에서는 항상 true
}

export interface Post extends PostSummary {
  content: string; // 마크다운 원문
}

export interface PostPage {
  items: PostSummary[]; // content 제외
  total: number; // 필터 적용 후 전체 개수
  page: number; // 보정된 현재 페이지 (1 이상)
  pageSize: number;
  totalPages: number; // 최소 1
}

export interface PostCategory {
  name: string;
  count: number; // 공개 글 기준
}
```

### 3.3 Zod: `src/schemas/blog.schema.ts` (신규)

```ts
const CATEGORY_MAX = 10;
const TAG_MAX = 20;
const LABEL_MAX = 50;

export const postSlugSchema = z
  .string()
  .max(POST_SLUG_MAX, `${POST_SLUG_MAX}자 이하로 입력해 주세요`)
  .regex(
    /^[a-z0-9가-힣]+(-[a-z0-9가-힣]+)*$/u,
    "한글, 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다",
  );

const label = z.string().trim().normalize("NFC").min(1, "필수 입력입니다").max(LABEL_MAX, `${LABEL_MAX}자 이하로 입력해 주세요`);
// 중복 제거는 transform으로 처리
const labelList = (max: number) =>
  z.array(label).max(max, `${max}개 이하로 입력해 주세요`).transform((v) => [...new Set(v)]);

export const postUpdateInputSchema = z.strictObject({
  title: z.string().trim().normalize("NFC").min(1, "필수 입력입니다").max(200, "200자 이하로 입력해 주세요"),
  content: z.string().max(POST_CONTENT_MAX, `${POST_CONTENT_MAX}자 이하로 입력해 주세요`), // 빈 문자열 허용
  categories: labelList(CATEGORY_MAX),
  tags: labelList(TAG_MAX),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isRealDate, "올바른 날짜가 아닙니다"),
  published: z.boolean(),
});

export const postCreateInputSchema = postUpdateInputSchema.extend({ slug: postSlugSchema });
export type PostCreateInput = z.infer<typeof postCreateInputSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateInputSchema>;
```

- `isRealDate`는 파일 내부 헬퍼(`new Date(`${v}T00:00:00Z`)`의 ISO 앞 10자가 입력과 같은지 비교). export하지 않는다.
- slug는 NFC가 아니면 위 정규식이 자모 분리 문자에서 실패하므로 별도 정규화 없이 거부된다. 클라이언트 제안값(3.4절)은 이미 NFC다.
- 알 수 없는 키(strictObject), 빈 title, 형식 오류는 `VALIDATION_FAILED`(400)이다. 필드 오류 키는 `slug`, `title`, `content`, `publishedAt`, `categories.0` 등 기존 `parseJsonBody` 규칙을 따른다.

### 3.4 순수 유틸: `src/lib/blog/` (신규, `server-only` 없음, 클라이언트와 스크립트 공용)

| 파일 | export | 설명 |
| --- | --- | --- |
| `slug.ts` | `slugifyPostName(name: string): string` | NFC, ASCII 대문자만 소문자화, `[a-z0-9가-힣]` 외 문자는 하이픈, 연속 하이픈 축약, 양끝 하이픈 제거, 200자 초과 시 잘라내고 끝 하이픈 제거. 예: `2024-10-06-7339. 2xn 타일링 3` -> `2024-10-06-7339-2xn-타일링-3`, `패리티 비트 & 해밍 코드` -> `패리티-비트-해밍-코드` |
| `slug.ts` | `decodePostSlug(raw: string): string \| null` | `decodeURIComponent` 한 번, NFC 정규화, 실패하면 `null`. 이중 인코딩은 `%`가 남아 `postSlugSchema`에서 걸려 조회 전에 `null` 처리한다(결과: 404) |
| `slug.ts` | `parsePostFileName(fileName: string): { date: string \| null; title: string }` | `YYYY-MM-DD-제목.md`에서 날짜와 제목 분리. 날짜 형식이 아니면 `date: null` |
| `frontmatter.ts` | `parsePostMarkdown(raw: string): ParsedPost` | 아래 참조 |

```ts
export interface PostFrontmatter {
  title?: string;
  categories?: string[]; // 문자열 단일 값은 배열로 승격
  tags?: string[];
  published?: boolean;
  date?: string; // "YYYY-MM-DD"로 정규화 가능한 경우만
}
export interface ParsedPost {
  frontmatter: PostFrontmatter; // toc, toc_sticky, toc_label 등 알 수 없는 키는 결과에 포함하지 않음
  body: string;
  // 펜스는 있으나 YAML 파싱 실패 또는 값 형식 오류. 이때 body는 원문 전체
  error?: string;
}
```

- BOM 제거, CRLF를 LF로 변환한 뒤 파싱한다. 맨 앞 `---` 펜스가 없으면 `frontmatter: {}`, `body`는 원문, `error` 없음.
- import 화면은 `error`를 경고로 표시하고 본문 전체를 채운다(요구 F8-8). 이관 스크립트는 `error`가 있으면 그 파일을 실패로 처리한다.
- `yaml` 패키지의 `parse`를 쓰고 예외는 `error`로 변환한다. 위험 태그를 막기 위해 기본(core) 스키마만 쓴다.

## 4. 서비스 함수

### 4.1 읽기: `src/services/blog/blog-service.ts` (신규, `import "server-only"`, `cache` 패턴)

| 함수 | 시그니처 | 설명 |
| --- | --- | --- |
| `listPublicPosts` | `cache(async (page: number, category?: string) => Promise<PostPage>)` | `published = true`, 페이지 크기 `POST_PAGE_SIZE`. 아래 공통 규칙 |
| `listAdminPosts` | `cache(async (page: number) => Promise<PostPage>)` | 공개 여부 무관, 페이지 크기 `POST_ADMIN_PAGE_SIZE`, 카테고리 필터 없음 |
| `listPublicCategories` | `cache(async () => Promise<PostCategory[]>)` | 공개 글의 카테고리별 개수, `count desc, name asc`. `unnest(categories)` 집계 1쿼리 |
| `getPublicPost` | `cache(async (slug: string) => Promise<Post \| null>)` | `published = true`만. 없으면 `null` |
| `getAdminPost` | `cache(async (slug: string) => Promise<Post \| null>)` | 공개 여부 무관. 없으면 `null` |
| `toPost`, `toPostSummary` | `(row) => Post / PostSummary` | 쓰기 서비스가 재사용하므로 export |
| `parsePageParam` | `(raw: string \| string[] \| undefined) => number` | 배열이면 첫 값. `^[1-9]\d{0,5}$`가 아니면 1. 순수 함수 |

공통 규칙(목록):

- `slug` 인자는 호출부가 `decodePostSlug`와 `postSlugSchema.safeParse`를 통과시킨 뒤 넘긴다. 서비스는 파라미터 바인딩만 쓴다.
- 쿼리는 2회: `count(*)`와 페이지 조회. 목록 조회는 `content`를 select하지 않는다.
- 페이지 보정: `page`가 `totalPages`를 넘으면 마지막 페이지로 보정한다(0, 음수, 비숫자는 `parsePageParam`이 1로 만든다). 반환 `PostPage.page`가 보정된 값이다. 리다이렉트는 하지 않는다.
- `category`는 trim + NFC, 빈 문자열이면 필터 없음으로 본다. 존재하지 않는 값은 `items: []`, `total: 0`, `totalPages: 1`이다.
- 정렬: `order by published_at desc, slug desc`.
- 호출 예(공개 목록 page.tsx): `listPublicPosts(parsePageParam((await searchParams).page), category)`. `searchParams`의 `category`는 배열일 수 있으므로 호출부(frontend)가 첫 값을 고른다.
- 상세 호출 예: `const slug = decodePostSlug((await params).slug); if (!slug || !postSlugSchema.safeParse(slug).success) notFound();` 후 `getPublicPost(slug)`가 `null`이면 `notFound()`.

### 4.2 쓰기: `src/services/blog/blog-admin-service.ts` (신규, `server-only`)

| 함수 | 시그니처 | 동작 |
| --- | --- | --- |
| `createPost` | `(input: PostCreateInput) => Promise<Post>` | `insert ... returning`. unique 위반(`23505`)이면 `SlugConflictError` |
| `updatePost` | `(slug: string, input: PostUpdateInput) => Promise<Post>` | `where slug` update + `updatedAt` 갱신 returning. 0행이면 `NotFoundError`. slug는 바꾸지 않는다 |
| `deletePost` | `(slug: string) => Promise<void>` | `where slug` delete returning. 0행이면 `NotFoundError` |

- 오류 클래스는 `portfolio-admin-service.ts`의 `SlugConflictError`, `NotFoundError`를 import해 던진다(`adminRoute` 수정 불필요).
- `portfolio-admin-service.ts`에서 `getPgErrorCode`와 `PG_UNIQUE_VIOLATION`을 export한다(기존 동작 변경 없음, 새 서비스가 import해 사용하므로 knip 통과).
- Blob 객체는 글 삭제와 함께 지우지 않는다(요구 범위 밖, 고아 허용).
- 게시물 개수 상한과 advisory lock은 두지 않는다(정렬 UI 없음, 소유자 1명).

## 5. API 엔드포인트

모든 라우트는 `adminRoute`로 감싼다. 응답 본문은 `CustomData<T>`(`{ data, status }`), 오류는 기존 `ApiErrorBody`. 상태 코드는 `HttpStatusCode` enum. posts 라우트의 `parseJsonBody`는 3번째 인자로 `POST_BODY_MAX_BYTES`를 넘긴다.

| 메서드 | 경로 | 요청 | 성공 응답 | 파일 |
| --- | --- | --- | --- | --- |
| POST | `/api/admin/posts` | `PostCreateInput`(JSON) | `CustomData<Post>`, `HttpStatusCode.Created` | `src/app/api/admin/posts/route.ts` |
| PUT | `/api/admin/posts/[slug]` | `PostUpdateInput`(JSON) | `CustomData<Post>`, `HttpStatusCode.Ok` | `src/app/api/admin/posts/[slug]/route.ts` |
| DELETE | `/api/admin/posts/[slug]` | 없음 | `CustomData<{ slug: string }>`, `HttpStatusCode.Ok` | 같은 파일 |
| POST | `/api/admin/uploads/post-image` | multipart, 필드 `file` 1개 | `CustomData<{ url: string }>`, `HttpStatusCode.Ok` | `src/app/api/admin/uploads/post-image/route.ts` |

- admin 목록과 편집 데이터는 GET API 없이 서버 페이지가 `listAdminPosts`, `getAdminPost`를 직접 호출한다(기존 패턴).
- `[slug]` 라우트는 `decodePostSlug(params.slug)`가 `null`이거나 `postSlugSchema`를 통과하지 못하면 DB 호출 없이 `NotFoundError`를 던진다. 응답의 `slug`는 디코딩된 값이다.
- 쓰기 성공 후 `revalidatePath("/", "layout")`(기존과 동일, 별도 tag 없음).
- 클라이언트는 `adminRequest`로 호출하되 경로의 slug는 `encodeURIComponent`한다(한글 라운드트립).
- `parse-body.ts` 변경: `parseJsonBody(request, schema, maxBytes = BODY_MAX_BYTES)`. 기본값을 유지하므로 기존 호출은 그대로다. 선언 길이와 실제 바이트 모두 `maxBytes`로 검사한다.

오류 응답:

| 상황 | code | HttpStatusCode |
| --- | --- | --- |
| 세션 없음 | `UNAUTHORIZED` | `Unauthorized` |
| allowlist 밖, Origin 불일치 | `FORBIDDEN`, `FORBIDDEN_ORIGIN` | `Forbidden` |
| rate limit | `RATE_LIMITED` | `TooManyRequests` |
| Zod 검증 실패(형식, 빈 title, 길이, 알 수 없는 키, 잘못된 날짜) | `VALIDATION_FAILED` + `fieldErrors` | `BadRequest` |
| 본문 2MiB 초과 | `PAYLOAD_TOO_LARGE` | `PayloadTooLarge` |
| content-type 오류 | `UNSUPPORTED_MEDIA_TYPE` | `UnsupportedMediaType` |
| slug 중복 (POST) | `SLUG_CONFLICT` + `fieldErrors.slug` | `Conflict` |
| 없는 slug, 디코딩 불가, 형식 오류 (PUT/DELETE) | `NOT_FOUND` | `NotFound` |
| 그 외 | `INTERNAL_ERROR` | `InternalServerError` |

### 5.1 본문 이미지 업로드와 썸네일 검증 재사용

`src/lib/api/image-upload.ts`(신규, `server-only`)로 현재 썸네일 라우트의 검증 본문을 추출한다.

```ts
interface ImageUploadOptions {
  allowGif: boolean;
  pathname: string; // 예: "thumbnails/image" 또는 "blog/images/image" (확장자는 시그니처로 결정)
  isValidUrl: (url: string) => boolean;
}
export function handleImageUpload(request: Request, options: ImageUploadOptions): Promise<Response>;
```

- 이동하는 검증: multipart 전용(`multipart/form-data;`), Content-Length 4.5MiB 상한, `formData()` 실패 처리, 엔트리 1개 + `file` 필드, 빈 파일 거부, 4MiB 상한(`PAYLOAD_TOO_LARGE`), 시그니처 판별, 확장자-시그니처 일치, `file.type` 일치, `put`(public, `addRandomSuffix: true`), 반환 URL 검증 실패 시 `del` 후 `INTERNAL_ERROR`.
- `allowGif: true`이면 `sniffImage`가 `GIF87a`/`GIF89a`(앞 6바이트)를 `{ extension: ".gif", contentType: "image/gif" }`로 인식한다. 시그니처 읽기 범위는 12바이트 그대로다.
- 오류 메시지: `allowGif: false`는 기존 문구("PNG, JPG, WebP 파일만 올릴 수 있습니다" 등)를 그대로 유지한다. `allowGif: true`는 같은 문구에 GIF를 더한다("PNG, JPG, WebP, GIF ...").
- `src/app/api/admin/uploads/thumbnail/route.ts`는 `adminRoute(({ request }) => handleImageUpload(request, { allowGif: false, pathname: "thumbnails/image", isValidUrl: isValidThumbnail }))`만 남긴다. 동작과 응답은 회귀하지 않아야 한다(gif 불허 유지).
- 본문 이미지 라우트는 `{ allowGif: true, pathname: "blog/images/image", isValidUrl: isValidPostImage }`. 응답은 `ok({ url })`.
- `portfolio.schema.ts`: `isValidThumbnail`의 본문을 `isBlobUrlUnder(value, prefix)`(비공개 헬퍼)로 일반화하고 `isValidThumbnail = (v) => isBlobUrlUnder(v, "/thumbnails/")`, 신규 `export function isValidPostImage(v) { return isBlobUrlUnder(v, "/blog/images/"); }`. 호스트, 권한 정보, 포트, 쿼리 검사는 기존과 동일.
- 클라이언트 호출은 `thumbnail-field.tsx`의 기존 multipart 호출 방식을 그대로 따른다(`adminRequest`는 JSON 전용이므로 업로드는 해당 컴포넌트가 쓰는 `fetch` 패턴을 재사용).

## 6. 마크다운 렌더링 파이프라인

### 6.1 패키지

`dependencies`에 추가한다. 이 저장소는 정확한 버전을 고정하므로(`"zod": "4.6.5"` 형식) `pnpm add -E`로 설치하고 `^`, `~`를 쓰지 않는다. 버전은 설치 시점의 최신 안정판을 `pnpm view <pkg> version`으로 확인해 고정하며, unified 계열은 아래 메이저 조합으로 맞춘다.

| 패키지 | 메이저 | 용도 |
| --- | --- | --- |
| `unified` | 11 | 프로세서 |
| `remark-parse` | 11 | 마크다운 파싱 |
| `remark-gfm` | 4 | 표, 체크리스트, 취소선, 자동 링크, 각주 |
| `remark-rehype` | 11 | mdast to hast (`allowDangerousHtml: true`) |
| `rehype-raw` | 7 | 본문 HTML(`<img>` 등)을 hast로 파싱. sanitize 앞에서만 사용 |
| `rehype-sanitize` | 6 | allowlist 정화 |
| `rehype-highlight` | 7 | 코드 문법 강조 1종 (`highlight.js`/`lowlight` 기반) |
| `hast-util-to-jsx-runtime` | 2 | hast to React 요소 (`components` 맵 지원) |
| `yaml` | 2 | 프론트매터 파싱(3.4절) |

- `mdast`/`hast` 타입 패키지는 위 패키지가 가져온다. 직접 import하지 않는다(필요하면 `import type`만, knip 미사용 의존성 경고가 나면 제거).
- `@vercel/blob`은 이미 있다. 그 외 신규 의존성은 추가하지 않는다. 코드 하이라이트 색상 CSS는 frontend가 Tailwind/CSS로 직접 작성한다(`highlight.js` 테마 import 금지, 직접 의존성 추가 없음).

### 6.2 `src/lib/markdown/render-markdown.tsx` (신규, 서버 전용 아님)

```ts
export function renderMarkdown(source: string): ReactNode;
```

처리 순서(순서가 보안 경계다): `remarkParse` -> `remarkGfm` -> `remarkRehype({ allowDangerousHtml: true })` -> `rehypeRaw` -> `rehypeSanitize(schema)` -> `rehypeHighlight({ detect: false, ignoreMissing: true })` -> `toJsxRuntime`.

- sanitize 뒤에 highlight를 두므로 강조가 만든 `span.hljs-*`는 정화 대상이 아니다. 대신 sanitize 단계가 `code`의 `className`을 `^language-[A-Za-z0-9_+-]+$` 한 가지로만 통과시켜 임의 클래스를 막는다.
- `processSync`로 동기 처리한다(모든 플러그인이 동기). 닫히지 않은 코드 펜스와 깨진 마크다운은 예외 없이 처리되며, 그래도 예외가 나면 호출부 error boundary가 아닌 함수 내부에서 `try/catch`로 원문을 `<pre>` 텍스트로 출력한다.
- 서버 컴포넌트(공개 상세)와 클라이언트 컴포넌트(admin 미리보기)가 같은 함수를 import한다.

### 6.3 sanitize allowlist (`defaultSchema` 확장)

- 기본 `defaultSchema`를 시작점으로 한다(`script`, `style`, 이벤트 핸들러 속성, `javascript:` URL 제거는 기본 동작).
- `attributes.img = ["src", "alt", "width", "height"]` (그 외 `srcset`, `style`, `onerror` 등 불허).
- `protocols.src = ["https"]`: `http:` 이미지는 `src`가 제거된다. 이관 대상 중 `http:`는 tcpschool 1건뿐이며 Blob(https)으로 치환된다. 별도 https 승격은 하지 않는다.
- `protocols.href = ["http", "https", "mailto"]`.
- `attributes.code = [["className", /^language-[A-Za-z0-9_+-]+$/]]`.
- `tagNames`는 기본 목록을 유지한다(표, 체크리스트 `input[type=checkbox][disabled]`, 취소선, 각주 포함).
- `clobberPrefix`는 기본값 유지.

### 6.4 `components` 맵 (스타일 클래스는 넣지 않고 의미 변환만)

| 요소 | 변환 | 이유 |
| --- | --- | --- |
| `h1`..`h5` | 한 단계 낮은 `h2`..`h6`로 렌더, `h6`은 `h6` 유지 | 페이지 `h1`은 글 제목 하나 |
| `a` | 외부(`http:`/`https:`로 시작) 링크는 `target="_blank" rel="noopener noreferrer"` | 요구 F5-5 |
| `img` | `src`가 `https://`로 시작하면 `next/image`(`unoptimized`, `width={0}`, `height={0}`, `sizes="100vw"`, `alt`) 렌더. 그 외(상대 경로 등)는 `alt` 텍스트만 `<span>`으로 출력 | `nextjs.md` 규칙 4(`<img>` 금지) 준수. `unoptimized`라 `remotePatterns` 검사 대상이 아니어서 외부 유지 이미지 6개와 gif 애니메이션이 모두 동작한다. `next/image`는 상대 `src`에서 예외를 던지므로 분기가 필수다 |

- 이미지 크기 제어(`h-auto max-w-full` 등)와 표 가로 스크롤, 코드 블록 스타일은 frontend가 감싸는 래퍼 컴포넌트(`markdown-body`)의 CSS에서 처리한다. 렌더러는 클래스를 부여하지 않는다.

## 7. 이관 스크립트 CLI 계약

### 7.1 파일과 실행

- 스크립트: `scripts/migrate-blog.ts`(tsx). `package.json` scripts에 `"blog:migrate": "tsx --env-file-if-exists=.env.local scripts/migrate-blog.ts"` 추가(`resume-data.ts`와 같은 방식, package.json 참조만으로 knip 통과. 통과하지 못하면 `knip.json`의 `entry`에 추가).
- DB 접근은 `resume-data.ts`처럼 스크립트 안에서 `neon` + `drizzle-orm/neon-http`로 직접 만든다(`src/db/index.ts`는 `server-only`라 사용 불가). 스키마는 `../src/db/schema/portfolio`에서 상대 import.
- 순수 로직은 `src/lib/blog/migration/`에 둔다(`server-only` 없음, 스크립트 전용이라 knip 진입점 연결됨).

| 파일 | export | 설명 |
| --- | --- | --- |
| `legacy-image-url.ts` | `resolveLegacyImage(url: string): string \| null` | 자기 저장소 URL(owner/repo `222SeungHyun/222SeungHyun.github.io`, `seungsimdang/seungsimdang.github.io`, 호스트 `github.com`의 `blob/`·`raw/`, `raw.githubusercontent.com`, `?raw=true` 유무)이면 저장소 상대 경로(NFC, 퍼센트 디코딩)를 반환, 아니면 `null`. `..` 포함 경로는 `null` |
| `replace-image-urls.ts` | `replaceImageUrls(markdown: string, map: (url: string) => string \| undefined, title: string): { markdown: string; replaced: number; skipped: string[] }` | `remark-parse`로 mdast를 만들어 `image` 노드와 `html` 노드만 대상으로 위치(offset) 기준 치환. `code`/`inlineCode` 내부 예시는 건드리지 않음. alt가 비었거나 `image`면 `{title} 이미지 {n}`(n은 글 내 순번, `[`, `]`, `\` 이스케이프). 치환은 뒤에서부터 적용 |

### 7.2 인자와 환경변수

```
pnpm blog:migrate -- --source <원본 저장소 경로> [--apply] [--yes] [--report <파일>]
```

| 인자 | 설명 |
| --- | --- |
| `--source <path>` | 필수. 원본 저장소 루트(`_posts/`, `_images/` 포함). 읽기 전용으로만 접근 |
| `--apply` | 없으면 dry-run(기본). 있으면 Blob 업로드와 DB 삽입을 수행 |
| `--yes` | `--apply` 확인 프롬프트 생략 |
| `--report <file>` | JSON 리포트 저장 경로. `--apply`에서는 필수(롤백 목록 보존). dry-run은 선택 |

환경변수와 사전 검사(실행 전에 모두 확인하고 부족하면 즉시 종료 코드 2):

- 공통: `DATABASE_URL`(dry-run도 기존 slug 조회를 위해 읽기 전용으로 접속). 잘못된 URL은 변수명만 알리고 종료(비밀번호 노출 금지).
- `--apply` 추가: `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_BLOB_HOSTNAME`.
- `--source` 경로가 존재하고 `_posts/`가 있어야 한다. `git`이 PATH에 있어야 한다(복원, 날짜 없는 파일용).
- 접속 DB 호스트명(비밀번호 제외)을 출력한다. `--apply`는 `y` 입력 또는 `--yes` 없이는 진행하지 않는다(`resume-data.ts`와 동일).

### 7.3 처리 흐름

1. `_posts/*.md`를 NFC 파일명 오름차순(코드포인트 비교)으로 읽는다. 파일 수를 센다(기대값 297).
2. 각 파일: `parsePostMarkdown`(실패하면 해당 파일 FAIL), `parsePostFileName`. title은 프론트매터 우선, 없으면 파일명 제목. `published`는 프론트매터 값(없으면 true). `toc*`는 버린다.
3. 날짜 없는 파일(`how-to-write-by-markdown.md` 1개): `git -C <source> log --diff-filter=A --follow --format=%as -- _posts/<파일>`의 가장 오래된 날짜를 `publishedAt`과 slug 접두사로 쓴다(`execFile`로 인자 배열 전달, 셸 미사용, 읽기 전용 명령만). 요약에 표시한다.
4. slug = `slugifyPostName("{date}-{title}")`(파일명 기반, 날짜 있는 파일은 파일명에서 `.md`만 뗀 전체). 이번 실행의 파일 전체(DB 상태와 무관)를 오름차순으로 훑으며 이미 쓴 slug면 `-2`, `-3`을 붙인다(결정적).
5. DB에서 이미 존재하는 slug 집합을 읽는다(select). 존재하는 slug의 파일은 SKIP(이미지 처리도 하지 않음).
6. 삽입 대상 글의 본문에서 이미지 참조를 수집한다.
   - 자기 저장소 URL: `resolveLegacyImage` -> 소스 경로. 파일이 있으면 로컬 파일, 없으면 대소문자 무시(NFC) 재조회, 그래도 없으면 `git log --all --diff-filter=AM -- <경로>`의 첫 커밋에서 `git show <commit>:<경로>`로 복원(읽기 전용). 모두 실패하면 경고하고 URL을 바꾸지 않는다. 대상 확장자는 png, jpg, jpeg, gif, webp만(그 외는 경고).
   - 외부 이미지 중 7.5절 표의 3건만 다운로드 대상. 나머지 외부 URL은 손대지 않는다. 코드 펜스 내부와 `/path/to/img.jpg` 같은 예시는 대상이 아니다.
7. dry-run은 여기까지만 하고 네트워크 다운로드와 Blob/DB 쓰기를 하지 않는다(로컬 파일 읽기와 git show는 수행해 존재 여부를 검증한다).
8. `--apply`: 이미지 Blob 업로드(7.4절) 후 본문 치환, 그 다음 글별로 `insert ... on conflict (slug) do nothing returning slug`. 반환이 비면 SKIP(경쟁 상황에서도 덮어쓰지 않음). 한 파일의 실패는 FAIL로 기록하고 다음 파일을 계속한다. 이미지 업로드가 실패한 글은 삽입하지 않고 FAIL(재실행 시 다시 시도됨).
9. 치환 후 본문에 자기 저장소 참조(`222SeungHyun/222SeungHyun.github.io`, `seungsimdang/seungsimdang.github.io`, `raw.githubusercontent.com`)가 남았는지 검사해 건수를 출력한다. 남은 것은 경고(원본 누락 이미지)와 일치해야 한다.

### 7.4 Blob 경로 규칙과 멱등

- 로컬 이미지: `blog/images/legacy/{ascii}-{hash8}{ext}`. `ascii`는 파일명(확장자 제외)에서 `[a-z0-9]` 외를 하이픈으로 바꾼 소문자(비면 `image`), `hash8`은 소스 상대 경로(NFC)의 sha256 앞 8자리 hex, `ext`는 소문자 확장자(`.jpeg`는 `.jpg`가 아니라 원래대로 `.jpeg`). 같은 소스는 항상 같은 경로가 되고 한글/공백/대소문자 충돌이 해시로 분리된다.
- 복원된 이미지도 같은 규칙(경로는 git 경로 기준). 다운로드한 3건: `blog/images/recovered/{hash8}{ext}`, `hash8`은 지정된 원본 URL의 sha256.
- `put(pathname, bytes, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType })`. 같은 경로 재업로드는 같은 바이트의 덮어쓰기라 중복 객체가 생기지 않는다(`allowOverwrite` 옵션이 `@vercel/blob@2.3.3` 타입에 있는지 구현자가 확인하고 없으면 `head` 선검사로 대체). 4MB 제한은 적용하지 않는다. gif 변환/리사이즈 금지.
- 콘텐츠 타입은 확장자가 아니라 파일 시그니처(PNG/JPEG/WebP/GIF)로 판별하고 불일치하면 경고하고 건너뛴다.
- 멱등: 이미 존재하는 slug는 SKIP이고 이미지도 올리지 않으므로 동일 입력 `--apply` 두 번째 실행은 삽입 0건, 업로드 0건, 기존 행 변경 0건이다.

### 7.5 지정된 외부 다운로드 3건 (이 외 임의 다운로드 금지)

스크립트에 상수 표로 둔다(원본 글 파일명 + 깨진 URL 호스트 -> 복구 원본). 매칭은 `파일명`과 `호스트`가 모두 일치할 때만 한다.

| 원본 글 파일 | 깨진 URL 호스트 | 복구 원본 URL |
| --- | --- | --- |
| `2023-12-17-Front-End-미니프로젝트 리팩토링 회고.md` | `private-user-images.githubusercontent.com` | `https://github.com/user-attachments/assets/ad847c87-947f-4b9b-a9c7-e37f1a2a254d` |
| `2024-01-31-Front-End-파이널프로젝트 회고.md` | `private-user-images.githubusercontent.com` | `https://github.com/user-attachments/assets/a79617e9-4e90-4b17-939e-dbc45eef2fd6` |
| `2023-01-09-ComputerArchitecture-고정 소수점 & 부동 소수점.md` | `camo.githubusercontent.com` | `http://tcpschool.com/lectures/img_c_floating_point_32.png` |

- 다운로드: `fetch`(리다이렉트 허용은 이 3개 시작 URL에 한정), 타임아웃 30초, 응답 200, 본문 10MB 이하, 시그니처가 이미지가 아니면 실패. 실패는 경고로 남기고 URL을 바꾸지 않으며 종료 코드에 반영한다(대체 문구, 이미지 삭제 없음).
- tcpschool 출처: 치환 후 본문에 `tcpschool` 문자열(대소문자 무시)이 이미 있으면 그대로 둔다. 없으면 해당 이미지가 있는 줄 바로 다음에 빈 줄 + `출처: [tcpschool.com](http://tcpschool.com/lectures/img_c_floating_point_32.png)` 한 줄을 넣는다. 매 실행이 원본 파일에서 새로 변환하므로 중복 삽입이 없다.
- user-attachments URL은 만료될 수 있으므로 승인 직전 재확인한다(10절).

### 7.6 종료 코드와 출력 리포트

| 종료 코드 | 의미 |
| --- | --- |
| 0 | 모든 파일이 INSERT/SKIP(성공)이고 경고 0건 |
| 1 | 실행은 끝났으나 FAIL 파일 또는 경고(원본 누락 이미지, 다운로드 실패, 지원하지 않는 이미지, 건수 불일치)가 1건 이상 |
| 2 | 사전 검사 실패(인자, 환경변수, 경로, 확인 거부). 어떤 쓰기도 일어나지 않음 |

stdout 출력(dry-run과 apply 동일 형식, apply는 결과 반영):

1. 파일별 한 줄: `[INSERT|SKIP|FAIL] <slug> images=<치환수> warn=<건수>`와 FAIL이면 사유.
2. 요약: `총 파일 N / INSERT a / SKIP(이미 존재) b / FAIL c / 의도적 제외 d` 및 `a + b + c + d == N` 검증 결과(불일치면 경고, 종료 코드 1). 날짜 없는 파일 처리 내역. 이미지 요약(고유 로컬 N, git 복원 N, 다운로드 N, 외부 유지 N, 미해결 N). 자기 저장소 참조 잔존 건수.
3. `--report` JSON: `{ mode, generatedAt, files: [{ file, slug, status, reason?, warnings[] }], inserted: [slug...], blobs: [{ source, pathname, url? }], warnings: [...] }`. `inserted`(삭제용 slug 목록)와 `blobs`(원본 파일명 -> Blob 경로 매핑)가 롤백 기준이다. 자동 롤백은 만들지 않는다.

## 8. 보안, 캐시, 영향받는 기존 테스트

### 8.1 보안과 캐시

- 모든 posts 쓰기와 업로드는 `adminRoute`(세션 + allowlist + Origin + rate limit)를 거친다. 인증 없는 쓰기 엔드포인트는 없다. 공개 읽기는 서비스 직접 호출이다.
- SQL은 drizzle 파라미터 바인딩만 쓴다. 카테고리 필터와 slug는 바인딩 값으로만 들어간다.
- 본문은 신뢰하지 않는 입력이다. 모든 렌더 경로는 `renderMarkdown`(6절)의 sanitize를 거친다. `dangerouslySetInnerHTML`을 쓰지 않는다.
- 이관 스크립트: 원본 저장소는 읽기만 하고, 소스 경로 해석은 `..` 및 소스 루트 밖(심볼릭 링크 포함 `realpath` 검사)을 거부한다. 외부 다운로드는 7.5절 3건으로 제한한다. 비밀번호/토큰을 출력하지 않는다.
- 업로드: 시그니처, 확장자, `file.type` 3중 일치와 크기 상한, 반환 URL이 Blob 호스트의 `/blog/images/` 하위가 아니면 `del` 후 오류.
- 캐시: 쓰기 성공 후 `revalidatePath("/", "layout")`. `/blog`, `/blog/[slug]` 포함 전체가 갱신된다.
- 신규 환경변수 없음(스크립트는 기존 이름을 재사용).

### 8.2 영향받는 기존 테스트

새 테스트는 이 명세에서 배정하지 않는다. 동작 변경으로 깨질 수 있는 기존 파일만 나열한다.

| 파일 | 영향 | 갱신 내용 |
| --- | --- | --- |
| `__tests__/api/thumbnail-upload-route.test.ts` | 업로드 검증 추출 리팩터링 | 라우트 import와 모킹 대상이 같으면 그대로 통과해야 함(회귀 기준). 동작 변경 없음 |
| `__tests__/api/parse-body.test.ts` | `maxBytes` 선택 인자 추가 | 기본값 유지로 변경 없음 예상, 회귀 확인 |
| `__tests__/schemas/portfolio-schema.test.ts` | `isValidThumbnail` 내부 일반화 | 단언 유지, 회귀 확인 |
| `__tests__/api/admin-route.test.ts` | 변경 없음 예상 | 회귀 확인 |
| `__tests__/utils/migrate-script.test.ts` | 새 마이그레이션 추가로 영향 가능성 낮음 | 회귀 확인 |
| `tests/e2e/fixtures/portfolio.ts`, `seed.ts` | e2e DB에 posts 데이터가 없으면 `/blog` 단언 불가 | posts fixture 추가(공개 2건 이상, 비공개 1건, 한글 slug 1건)와 기존 패턴("행이 있으면 건너뜀") insert (backend 소유). e2e DB 적용은 구현자가 하지 않음 |
| `tests/e2e/navigation.spec.ts` (`["/blog", "talks"]`) | 경로 이동 | `/talks`로 갱신 (frontend 소유) |
| `tests/e2e/real-project-data.spec.ts` (`/blog` talks 단언 4곳) | 경로 이동 | talks 관련 `/blog`를 `/talks`로 갱신 (frontend 소유) |
| `knip`, `harness`, `source-rules` 린트 테스트 | 신규 파일 규칙 | 신규 파일이 kebab-case, 주석 규칙, em-dash 금지를 지키는지 확인 |

## 9. T05/T06 파일 소유 경계

두 구현자는 병렬로 각자 worktree에서 일하며 같은 파일을 수정하지 않는다. 공유 파일(타입, 상수, API, 렌더러, `package.json`)은 backend만 수정한다. frontend worktree에는 backend 산출물이 아직 없으므로 type-check 통과는 병합 후 orchestrator 재검증에서 확인한다. frontend는 3, 4, 5, 6절 계약만 믿고 작성한다.

### backend (T06) 소유

- `src/db/schema/portfolio.ts`, `drizzle/**`
- `src/constants/blog.ts`, `src/types/blog.ts`, `src/schemas/blog.schema.ts` (모두 신규)
- `src/schemas/portfolio.schema.ts` (`isValidPostImage`, `isBlobUrlUnder` 일반화)
- `src/services/blog/blog-service.ts`, `src/services/blog/blog-admin-service.ts` (신규)
- `src/services/portfolio/portfolio-admin-service.ts` (`getPgErrorCode`, `PG_UNIQUE_VIOLATION` export만)
- `src/lib/api/parse-body.ts` (`maxBytes` 인자), `src/lib/api/image-upload.ts` (신규)
- `src/app/api/admin/posts/**`, `src/app/api/admin/uploads/post-image/route.ts` (신규), `src/app/api/admin/uploads/thumbnail/route.ts` (리팩터링)
- `src/lib/blog/**` (슬러그, 프론트매터, `migration/`), `src/lib/markdown/render-markdown.tsx`
- `scripts/migrate-blog.ts`, `package.json` (의존성 9개 추가와 `blog:migrate` 스크립트), `pnpm-lock.yaml`, 필요 시 `knip.json`
- `tests/e2e/fixtures/portfolio.ts`, `tests/e2e/fixtures/seed.ts` (posts 항목)
- 기존 테스트 갱신 중 `__tests__/api/*`, `__tests__/schemas/*`, `__tests__/utils/*` (8.2절)

### frontend (T05) 소유

- `src/app/(public)/talks/page.tsx` (현재 `src/app/(public)/blog/page.tsx`의 talks 화면 이동, 메타데이터 canonical `/talks`)
- `src/app/(public)/blog/page.tsx` (블로그 목록으로 교체), `src/app/(public)/blog/[slug]/page.tsx` (상세)와 이 페이지 전용 하위 컴포넌트
- `src/components/common/**`의 블로그 신규 컴포넌트(목록 항목, 페이지네이션, 카테고리 필터, `markdown-body` 래퍼와 코드 하이라이트 토큰 스타일)
- `src/components/layout/navbar.tsx`, `src/components/layout/footer.tsx`
- `src/app/admin/(console)/blog/**` (목록, 새 글, 편집 페이지)
- `src/components/admin/**`의 블로그 신규 컴포넌트(글 폼, 목록, 이미지 삽입 UI, import UI), `admin-nav.tsx`(탭 추가: href `/admin/blog`)
- `src/lib/admin-client/**`의 신규 파일(커서 위치 삽입 로직 등). 기존 파일 변경 시 frontend 소유
- `tests/e2e/navigation.spec.ts`, `tests/e2e/real-project-data.spec.ts`의 `/blog` -> `/talks` 갱신 (8.2절)
- 전역 스타일 파일을 건드릴 경우 frontend만 수정

### 겹침 방지 규칙

- 서로의 소유 파일에서 필요한 변경이 생기면 직접 고치지 않고 orchestrator에게 보고한다.
- `package.json`과 lockfile은 backend만 수정한다. frontend는 의존성을 추가하지 않는다(필요하면 보고).
- frontend가 의존하는 backend 심볼(고정 계약):
  - `@/constants/blog`: `POST_PAGE_SIZE`, `POST_ADMIN_PAGE_SIZE`, `POST_CONTENT_MAX`, `POST_IMPORT_MAX_BYTES`, `POST_SLUG_MAX`
  - `@/types/blog`: `PostSummary`, `Post`, `PostPage`, `PostCategory`
  - `@/schemas/blog.schema`: `postSlugSchema`, `postCreateInputSchema`, `postUpdateInputSchema`, `PostCreateInput`, `PostUpdateInput`
  - `@/services/blog/blog-service`: `listPublicPosts`, `listAdminPosts`, `listPublicCategories`, `getPublicPost`, `getAdminPost`, `parsePageParam`
  - `@/lib/blog/slug`: `slugifyPostName`, `decodePostSlug`, `parsePostFileName`
  - `@/lib/blog/frontmatter`: `parsePostMarkdown`, `ParsedPost`
  - `@/lib/markdown/render-markdown`: `renderMarkdown`
  - API: 5절의 경로, 요청, 응답
  - 이름이나 모양을 바꿔야 하면 backend가 orchestrator를 통해 알린다.
- admin 클라이언트 호출은 `adminRequest` 패턴으로 위 경로를 호출하고 경로는 호출부에 리터럴로 쓴다(공유 상수 파일을 만들지 않는다).

## 10. 열린 이슈와 orchestrator 조치

1. 자동 마이그레이션 위험: `scripts/migrate.mjs --build`가 Preview/Production 빌드에서 마이그레이션을 자동 실행한다. Preview와 Production이 같은 DB면 `develop` push 시점에 운영 DB에 `posts`가 생성된다(추가만이라 기존 화면은 안전). push 시점을 데이터 적용 순서와 다른 세션 조율에 맞춘다.
2. 적용 순서 권장: (a) 다른 세션과 조율(`git-safety.md`) (b) 마이그레이션 적용(`pnpm db:migrate`, 대상 DB 호스트 확인) (c) `pnpm blog:migrate -- --source <경로> --report <파일>` dry-run 검토 (d) 사용자 승인 (e) `--apply` (f) 건수와 자기 저장소 참조 0건 확인 (g) 배포. 빈 `posts`로 배포해도 `/blog`는 빈 상태 문구로 깨지지 않아야 한다.
3. 정렬 타이브레이커: 요구사항 F1-4는 `(published, published_at desc, id)`를 권장했으나 이 명세는 `slug desc`를 쓴다(2.1절, 1절 표). id는 uuid라 같은 날 글 순서가 임의이기 때문이다. 이의가 있으면 인덱스 컬럼만 `id`로 바꾸면 되고 다른 부분은 영향 없다.
4. user-attachments URL(7.5절 2건)은 만료될 수 있다. `--apply` 직전에 dry-run 후 200 응답을 재확인한다. 실패하면 경고와 종료 코드 1이 나오고 해당 글은 원본 URL 유지 상태로 삽입된다(사용자와 처리 방식 재협의).
5. 이중 인코딩/자모 분리 slug는 조회 전에 `null`/검증 실패로 404 처리한다. 이미 DB에 비정규화 slug가 들어갈 경로는 check 제약과 Zod가 막는다.
6. 롤백: 코드 롤백 시 `posts` 테이블은 남아도 무해하다(down 마이그레이션 없음). 데이터 롤백은 7.6절 리포트의 slug 목록과 Blob 경로 목록으로 수동 수행한다.
7. `@vercel/blob@2.3.3`의 `allowOverwrite` 옵션 존재 여부와 `rehype-highlight`/`rehype-raw` 최신 메이저의 호환은 설치 시점에 구현자가 확인한다(명세의 메이저 조합이 어긋나면 backend가 orchestrator에 보고).
