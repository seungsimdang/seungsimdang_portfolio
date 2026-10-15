# api-spec: admin·블로그 UX 개선 (서버·데이터 범위)

- 작성일: 2026-10-15
- 작성자: Backend Developer (T04, 명세만. 코드·설정·DB 변경 없음)
- 입력: `requirements.md`(7절 사용자 확정, 재론하지 않음), `00-input.md`, 선행 `2026-10-14-blog/api-spec.md`
- 직접 확인한 코드: `src/db/schema/portfolio.ts`, `drizzle/0003_purple_blur.sql`, `drizzle/meta/_journal.json`, `scripts/migrate.mjs`, `package.json`(build), `src/services/blog/*`, `src/schemas/blog.schema.ts`, `src/types/blog.ts`, `src/lib/blog/frontmatter.ts`, `src/app/api/admin/posts/**`, `src/app/(public)/blog/**`, `src/app/admin/(console)/blog/**`, `src/components/admin/blog-form.tsx`, `scripts/migrate-blog.ts`, `tests/e2e/fixtures/portfolio.ts`, `node_modules/next/dist/docs/.../revalidatePath.md`
- 범위: F3(이전/다음 글 데이터), F5(admin 카테고리 필터 데이터), F6(published 제거). F1·F2·F4·F7~F11은 서버 변경이 없다. 새 API 엔드포인트도 없다.

## 목차

- [1. 확인한 사실](#1-확인한-사실)
- [2. F6 published 제거](#2-f6-published-제거)
- [3. 마이그레이션 0004와 배포 순서](#3-마이그레이션-0004와-배포-순서)
- [4. 서비스 함수 (F3, F5, F6 통합)](#4-서비스-함수-f3-f5-f6-통합)
- [5. API 엔드포인트 변경](#5-api-엔드포인트-변경)
- [6. 캐시와 revalidate](#6-캐시와-revalidate)
- [7. 파일별 변경 목록](#7-파일별-변경-목록)
- [8. 영향받는 기존 테스트](#8-영향받는-기존-테스트)
- [9. 요구사항 문서와 어긋나는 사실](#9-요구사항-문서와-어긋나는-사실)

## 1. 확인한 사실

1. `package.json`의 `build`는 `check-upload-env.mjs && migrate.mjs --build && next build` 순서다. 빌드 안에서 마이그레이션이 `next build`보다 먼저 자동 적용된다.
2. `migrate.mjs --build`는 `VERCEL_ENV`가 `preview` 또는 `production`, `CI=true`, `MIGRATE_ON_BUILD=1` 중 하나일 때만 실행된다. 로컬 `pnpm build`는 건너뛴다. 반면 `pnpm db:migrate`(`--build` 없음)는 가드 없이 `.env.local`의 `DATABASE_URL`에 바로 적용한다. 스크립트 주석에 따르면 그 값은 Production이다.
3. `migrate.mjs`는 단일 트랜잭션과 advisory lock으로 `_journal.json`의 `when`이 `__drizzle_migrations.created_at` 최댓값보다 큰 항목만 적용한다. 항목 하나가 실패하면 전체가 롤백되고 빌드가 실패한다(`process.exitCode = 1`).
4. Preview와 Production이 같은 `DATABASE_URL`을 쓰는지는 저장소에서 확인되지 않는다. 선행 api-spec 10절도 "같은 DB면"이라고 가정으로만 적었다. Vercel 환경변수 설정은 사용자 확인 사항이다(9절).
5. 서버 DB 드라이버는 `neon-http`다(`db.transaction()` 없음, 마이그레이션은 `pg` Pool 경유).
6. admin 쓰기 라우트 3개(POST `/api/admin/posts`, PUT·DELETE `/api/admin/posts/[slug]`)는 모두 `revalidatePath("/", "layout")` 한 줄로 끝난다.
7. `.md` 파싱(`parsePostMarkdown`)은 클라이언트 컴포넌트 `blog-form.tsx`에서 호출된다. 서버 API는 frontmatter를 모른다.
8. `listPosts`가 `category`를 `trim().normalize("NFC")`하는 곳은 서비스 내부 한 군데이고, 공개 페이지(`blog/page.tsx`)가 별도로 `trim`과 `POST_LABEL_MAX` 검사를 한다. 정규화 규칙이 두 곳에 나뉘어 있다.

## 2. F6 published 제거

### 2.1 DB 스키마 (`src/db/schema/portfolio.ts`)

`posts`에서 `published` 컬럼 정의를 지우고 인덱스를 재정의한다.

```ts
index("posts_list_idx").on(table.publishedAt.desc(), table.slug.desc()),
```

`unique(slug)`, 두 check 제약, 나머지 컬럼은 변하지 않는다. 인덱스 이름은 그대로 두어 drizzle-kit이 "정의 변경"으로 인식하게 한다.

### 2.2 타입 (`src/types/blog.ts`)

- `PostSummary.published` 삭제.
- `PostCategory.count`의 주석 "공개 글 기준"을 "전체 글 기준"으로 수정.
- F3용 타입 추가(4.3절).

### 2.3 API 입력 (`src/schemas/blog.schema.ts`)

`postUpdateInputSchema`에서 `published: z.boolean()`을 삭제한다. 이미 `z.strictObject`이므로 `published` 키가 오면 `unrecognized_keys` 오류로 400이 되고, 기존 `parseJsonBody`의 검증 오류 변환(`fieldErrors`)을 그대로 쓴다. `postCreateInputSchema`는 `.extend`라 자동으로 따라간다. 서비스의 `createPost`/`updatePost`는 `input`을 그대로 `values`/`set`에 넘기므로 코드 변경이 없다(스키마에서 컬럼이 빠지므로 insert/update가 `published`를 다루지 않음).

이전 번들 탭에서 저장하면 400이 되는 동작은 의도된 결과다(requirements 5.2-4). 구현 문서에 기록한다.

### 2.4 서비스 쿼리 (`src/services/blog/blog-service.ts`)

`eq(posts.published, true)` 3곳(목록, 카테고리 집계, 단건)과 `publishedOnly` 파라미터, `toPostSummary`의 `published` 필드를 모두 삭제한다. 공개/admin 함수가 같아지므로 4절에서 통합한다.

### 2.5 frontmatter 파싱 (`src/lib/blog/frontmatter.ts`)

7-4 결정(가져오기 결과 토스트에 안내 포함)을 위해 클라이언트는 "파일에 `published: false`가 있었다"는 사실만 알면 된다. `published` 값 자체를 폼 상태로 쓰지 않는다.

계약:

```ts
interface PostFrontmatter {
  title?: string;
  categories?: string[];
  tags?: string[];
  date?: string;
  // 원본 frontmatter가 published: false였던 경우에만 true, 그 외에는 키 없음
  unpublished?: true;
}
```

판정 규칙:

| frontmatter | 결과 |
| --- | --- |
| `published: false` (boolean false, YAML core 스키마의 `False`/`FALSE` 포함) | `unpublished: true` |
| `published: true`, 키 없음, `null` | `unpublished` 키 없음 |
| `published: "false"`, `published: yes-please` 등 boolean이 아닌 값 | `unpublished` 키 없음, 오류도 없음 |

- `published` 값의 타입 검사와 `fail("published 형식이 올바르지 않습니다")` 분기를 삭제한다. 비 boolean 값은 `toc` 같은 알 수 없는 키와 동일하게 무시한다.
- 필드명을 `published`로 두지 않는 이유: requirements F6-4의 "저장소 전체에서 `published`(공개 여부 의미) 잔존 확인"이 grep으로 가능해야 하기 때문이다. 이 파일에서 `published`는 `source.published === false` 비교 한 곳과 타입 주석에만 남는다.
- `parsed.error`가 있는 경우 `frontmatter`가 `{}`이므로 `unpublished`는 없다(안내 토스트는 오류 안내와 겹치지 않는다).
- 서버 코드 소비자는 없다. `blog-form.tsx`가 `parsed.frontmatter.unpublished`로 토스트 문구에 안내를 덧붙이는지는 frontend-developer가 정한다(문구 확정: requirements 7-4).

### 2.6 이관 스크립트 (`scripts/migrate-blog.ts`)

- 295행 엔트리 타입의 `published: boolean`, 320행 `published: parsed.frontmatter.published ?? true`, 484행 `published: entry.published`를 삭제한다. 컴파일(`pnpm type-check`)이 깨지는 곳이 이 세 곳이다.
- 이미 운영 이관이 끝난 1회성 스크립트다. 이후 이 스크립트를 다시 돌리면 `published: false` 원본도 공개로 들어가지만, 원본 195개가 모두 `true`임이 확인되어 있어 동작 변화는 없다. 스크립트 상단 주석이나 CLI 계약은 바꾸지 않는다.
- 이관 입력 검증은 `postCreateInputSchema.safeParse`를 쓰므로(486행 부근) 스키마 변경과 같은 커밋에서 맞춰야 한다.

### 2.7 e2e 시드 픽스처 (`tests/e2e/fixtures/portfolio.ts`)

`FixturePost.published` 필드와 4번째 픽스처(`2024-12-30-fixture-draft`, "비공개 글", `published: false`)가 있다. `seed.ts`는 `db.insert(posts).values(seedPosts)`로 그대로 넣으므로, 컬럼 삭제 후에는 `published` 키가 무의미해진다. 이 픽스처의 존재 목적(비공개 제외 검증)이 사라졌으므로 `published` 필드를 모든 픽스처에서 지우고 4번째 픽스처는 삭제한다. e2e 스펙(`navigation.spec.ts`, `real-project-data.spec.ts`)은 posts를 참조하지 않는다(grep 확인).

## 3. 마이그레이션 0004와 배포 순서

### 3.1 생성 방식

1. 2.1절 스키마 수정 후 `pnpm db:generate`(= `drizzle-kit generate`)를 실행한다. DB 연결 없이 스키마와 `drizzle/meta/0003_snapshot.json`의 차이만 보고 생성한다.
2. 산출물: `drizzle/0004_<랜덤이름>.sql`, `drizzle/meta/0004_snapshot.json`, `drizzle/meta/_journal.json`에 idx 4 항목 추가. 세 개를 함께 커밋한다. SQL을 손으로 고치지 않는다(requirements F6-9). 고치면 사유를 기록한다.
3. 예상 SQL(drizzle-kit 0.31.11 기준 예상이며 생성 결과가 정이다):

```sql
DROP INDEX "posts_list_idx";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "published";--> statement-breakpoint
CREATE INDEX "posts_list_idx" ON "posts" USING btree ("published_at" DESC NULLS LAST,"slug" DESC NULLS LAST);
```

문장 순서나 `DROP INDEX` 존재 여부가 다르게 나와도 생성 결과를 따르되, 최종 상태(컬럼 없음, 인덱스가 `(published_at desc, slug desc)`)인지 확인한다. 같은 이름의 `CREATE INDEX`가 구 인덱스 삭제보다 앞서면 이름 충돌로 실패하므로 그 경우에만 순서를 고치고 사유를 기록한다.

4. `migrate.mjs`는 `--> statement-breakpoint`로 문장을 나누어 순차 실행한다. 한 트랜잭션이라 중간 실패 시 전부 롤백된다. `DROP COLUMN`은 메타데이터 변경이라 297행 규모에서 즉시 끝나지만 짧은 ACCESS EXCLUSIVE 락을 잡는다.
5. 로컬 검증은 개발/테스트용 DB에서만 한다(연결 호스트가 `migrate.mjs`가 출력하는 `Migration target host`로 운영이 아님을 확인). `.env.local`의 `DATABASE_URL`은 Production이므로 `pnpm db:migrate`를 승인 없이 실행하지 않는다.

### 3.2 롤백 SQL

운영자가 승인 후 수동으로 실행한다(자동 롤백 없음). 모든 행이 `true`였으므로 기본값 `true`로 재추가해도 손실이 없다.

```sql
BEGIN;
ALTER TABLE "posts" ADD COLUMN "published" boolean DEFAULT true NOT NULL;
DROP INDEX "posts_list_idx";
CREATE INDEX "posts_list_idx" ON "posts" USING btree ("published","published_at" DESC NULLS LAST,"slug" DESC NULLS LAST);
-- 0004가 다시 적용되도록 기록 행 제거, created_at 값은 0004의 _journal.json when 값
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = <0004의 when>;
COMMIT;
```

롤백 후에는 코드도 이전 커밋으로 돌려야 한다(새 코드는 컬럼을 참조하지 않으므로 컬럼이 있어도 동작은 하나, journal에 0004가 남은 채 배포하면 다음 빌드가 다시 컬럼을 삭제한다).

### 3.3 "코드 먼저, 마이그레이션 나중"이 가능한가

사실 기준 결론: 단일 병합으로는 불가능하고, 커밋을 둘로 나누면 가능하다.

- 사실: 마이그레이션 적용이 곧 빌드다(1절 1, 2). 0004 파일이 포함된 커밋이 Preview 또는 Production 빌드에 올라가는 순간 `next build` 이전에 컬럼이 삭제된다. 그 시점에 서비스 중인 이전 배포(옛 코드)는 `posts.published`를 select하므로(`listPosts`, `findPost`의 `select()` 전체 컬럼) 컬럼이 사라지면 캐시되지 않은 공개/admin 블로그 요청이 모두 실패한다. 새 배포가 승격될 때까지(빌드 시간 동안) 이어진다.
- 따라서 requirements 5.2의 "코드 먼저 배포 후 마이그레이션 적용"은 `0004`를 같은 커밋에 넣는 한 지켜지지 않는다. 별도의 "마이그레이션 적용" 동작은 없다(수동 `pnpm db:migrate`는 가능하지만 운영 DB를 로컬에서 직접 건드리므로 권장하지 않는다).

권장 순서(두 단계):

| 단계 | 커밋 내용 | 병합 |
| --- | --- | --- |
| A 코드 | 2절·4절의 모든 코드 변경과 스키마 수정(`portfolio.ts`에서 컬럼·인덱스 삭제). `drizzle/0004*`, 스냅샷, journal 변경은 포함하지 않는다 | feature -> develop -> main |
| B 마이그레이션 | `pnpm db:generate` 산출물 3개만 | A가 main에서 Production 배포를 마친 뒤 feature -> develop -> main |

- A 단계 코드는 컬럼이 있는 DB(INSERT 시 컬럼 생략, 기본값 `true`가 채움)와 없는 DB 양쪽에서 동작한다. select는 스키마에 컬럼이 없으므로 컬럼을 요청하지 않는다. 이 성질이 "코드 먼저"의 근거다.
- A 단계 동안 `schema/portfolio.ts`와 `drizzle/meta/0003_snapshot.json`이 어긋나지만 drizzle-kit check를 쓰는 CI는 저장소에 없다(`.github`, `.husky`, `package.json` 확인). `db:generate`는 B 단계에서 실행한다.
- B를 늦추어도 A만으로 사용자 기능(F6)은 완성이다. 컬럼 삭제는 정리 작업이다.

### 3.4 운영 DB 승인 게이트 위치

적용 = 병합이므로 게이트는 "0004를 담은 커밋(B)을 어느 브랜치에 병합·푸시하기 직전"에 둔다.

1. Preview가 Production과 같은 DB를 쓰면(미확인, 9절) B를 `develop`에 병합·푸시하는 순간 운영 DB가 바뀐다. 이 경우 게이트는 `develop` 병합 직전이다.
2. Preview가 별도 DB를 쓰면 `develop` 병합은 게이트 없이 가능하고 게이트는 `main` 병합 직전이다. Preview 쪽 적용 결과를 먼저 확인할 수 있다.
3. 어느 쪽이든 게이트 직전 순서: (a) 읽기 전용 확인 쿼리 실행, (b) 사용자에게 결과와 대상 호스트 보고 후 승인, (c) 다른 세션의 DB 작업 여부 확인(`git-safety.md`), (d) 병합.
4. 확인 쿼리는 두 번 필요하다. A 단계 병합 전에도 한 번 실행한다. A가 `published = true` 조건을 없애므로 `false` 행이 있으면 그 글이 A 배포 시점에 공개로 노출되기 때문이다. B 병합 전에 한 번 더 실행한다.

```sql
select count(*) from posts where published = false;
```

0이 아니면 중단하고 보고한다. 읽기 전용이라 Neon MCP 등으로 실행해도 변경이 없다.

### 3.5 배포 직후 동작 정리

- A 배포 직후: 이전 번들 탭에서 저장하면 `published` 때문에 400. 새로고침으로 해소. 운영자 1명이라 허용.
- A와 B 사이: 읽기/쓰기 정상.
- B 적용 중(빌드 시간): 새 코드가 아직 승격되지 않았더라도 A가 이미 Production이므로 옛 코드가 서비스될 일이 없다. 이 위험이 A를 먼저 내보내는 이유다.

## 4. 서비스 함수 (F3, F5, F6 통합)

`src/services/blog/blog-service.ts`가 대상이다. F6으로 공개/admin 쌍이 동일해지므로 쌍을 제거해 한 벌로 합친다(requirements 2.3의 "통합" 허용). 호출부 4곳(`blog/page.tsx`, `blog/[slug]/page.tsx`, `admin/(console)/blog/page.tsx`, `admin/(console)/blog/[slug]/page.tsx`)은 frontend-developer가 바꾼다. knip이 미사용 export를 잡으므로 옛 이름을 남기지 않는다.

### 4.1 읽기 함수

```ts
export function normalizeCategoryParam(
  raw: string | string[] | undefined,
): string | undefined;

export const listPosts: (
  page: number,
  pageSize: number,
  category?: string, // normalizeCategoryParam 결과만 받음
) => Promise<PostPage>;

export const listCategories: () => Promise<PostCategory[]>;

export const getPost: (slug: string) => Promise<Post | null>;
```

- `listPosts`, `listCategories`, `getPost`는 기존처럼 `react`의 `cache`로 감싼다(요청 안 중복 제거 목적).
- 삭제: `listPublicPosts`, `listAdminPosts`, `listPublicCategories`, `getPublicPost`, `getAdminPost`, 내부의 `publishedOnly` 인자. 호출부는 공개 목록 `listPosts(page, POST_PAGE_SIZE, category)`, admin 목록 `listPosts(page, POST_ADMIN_PAGE_SIZE, category)`로 쓴다.
- `listPosts`의 `where`는 `normalized ? sql\`${posts.categories} @> array[${normalized}]::text[]\` : undefined`만 남는다. 값은 파라미터 바인딩이라 기존과 같은 안전성이다(F5-7). 정렬 `desc(publishedAt), desc(slug)`와 페이지 보정(`clamp`) 로직은 그대로다.
- `listCategories`는 `.where(eq(posts.published, true))`만 지운다. 반환 정렬(개수 내림차순, 이름)과 개수 포함 형태는 그대로이고 admin 탭은 개수를 표시하지 않을 뿐이다(requirements F5). 집계 범위는 전체 글이다.
- 반환 형태 변경은 `PostSummary.published` 삭제뿐이다. `PostPage`, `PostCategory`는 그대로다.

### 4.2 category 파라미터 정규화 공유 (F5)

`normalizeCategoryParam`이 공개와 admin 페이지가 공유하는 유일한 해석 지점이다. 규칙(순서 중요):

1. 배열이면 첫 값만 사용한다(`parsePageParam`과 동일).
2. `trim()` 후 `normalize("NFC")`.
3. 빈 문자열이면 `undefined`.
4. NFC 이후 길이가 `POST_LABEL_MAX`(50) 초과이면 `undefined`. 스키마가 `trim -> normalize -> max` 순서로 검증하므로(`blog.schema.ts`의 `label`) 같은 순서를 따른다. 이런 값은 어떤 글도 가질 수 없으므로 필터를 적용하지 않는다.

- 위치는 `blog-service.ts`의 `parsePageParam` 바로 옆이다. 같은 성격의 URL 파라미터 해석이고 `blog-excerpt-page.test.ts`가 `parsePageParam`을 이미 같은 모듈에서 import하고 있어 별도 파일을 만들지 않는다.
- `listPosts` 내부의 `category?.trim().normalize("NFC")`는 삭제한다(정규화 단일 지점). `listPosts`는 이미 정규화된 값을 받는다는 전제를 시그니처 주석에 적는다. 공개 `blog/page.tsx`의 인라인 `trimmed`/`POST_LABEL_MAX` 검사도 삭제하고 이 함수를 호출한다. 부수 효과로 공개 페이지의 `aria-current` 비교(`item.name === category`)에 NFC 값이 쓰이게 되어 저장값(NFC)과 일치한다.
- 반환 `undefined`는 "필터 없음"이다. 페이지의 "이 카테고리에 글이 없습니다." 분기는 `category`(정규화 결과)가 있고 결과가 0건일 때만 탄다.

### 4.3 이전/다음 글 (F3)

타입 추가(`src/types/blog.ts`):

```ts
export interface PostLink {
  slug: string;
  title: string;
}

export interface PostNeighbors {
  older: PostLink | null; // 더 오래된 글, 목록에서 뒤쪽
  newer: PostLink | null; // 더 최신 글, 목록에서 앞쪽
}
```

함수:

```ts
export const getPostNeighbors: (
  post: Pick<Post, "slug" | "publishedAt">,
) => Promise<PostNeighbors>;
```

- 현재 글의 키를 호출자가 넘긴다. 상세 페이지는 이미 `getPost`로 글을 읽었으므로 현재 글 재조회가 없고 추가 쿼리는 최대 2개다(F3-4).
- 정렬 키는 목록과 같은 `(published_at desc, slug desc)`다. "이전 글"은 이 정렬에서 현재 글 바로 뒤, "다음 글"은 바로 앞이다(7-3 확정: 이전 = 더 오래된 글).
- 카테고리와 무관하게 전체 글 기준이다.

쿼리(두 개를 `Promise.all`로 병렬 실행):

```ts
// older: 정렬상 바로 뒤
db.select({ slug: posts.slug, title: posts.title })
  .from(posts)
  .where(
    or(
      lt(posts.publishedAt, post.publishedAt),
      and(eq(posts.publishedAt, post.publishedAt), lt(posts.slug, post.slug)),
    ),
  )
  .orderBy(desc(posts.publishedAt), desc(posts.slug))
  .limit(1);

// newer: 정렬상 바로 앞, 방향을 뒤집어 asc로 첫 행
db.select({ slug: posts.slug, title: posts.title })
  .from(posts)
  .where(
    or(
      gt(posts.publishedAt, post.publishedAt),
      and(eq(posts.publishedAt, post.publishedAt), gt(posts.slug, post.slug)),
    ),
  )
  .orderBy(asc(posts.publishedAt), asc(posts.slug))
  .limit(1);
```

- 동일 날짜 처리: 날짜가 같으면 `slug`로 가른다. `slug`는 `unique`이므로 키가 전순서이고 동률이 없다.
- collation 일관성: `ORDER BY slug`와 `slug < $1`은 둘 다 컬럼의 collation을 쓴다. 파라미터는 컬럼 타입(`text`)으로 비교되므로 목록 순서와 이전/다음 순서가 어긋나지 않는다(F3-3). JS 문자열 비교로 대체하지 않는다.
- 인덱스: 재정의한 `posts_list_idx (published_at desc, slug desc)`가 두 쿼리의 정렬과 범위 조건을 모두 받친다(역방향 스캔 포함).
- 이웃 글 없음: 해당 방향이 `null`. 둘 다 `null`이면(글 1개뿐) 상세 페이지가 영역을 렌더링하지 않는다.
- `cache()`로 감싸지 않는다. 한 요청에서 한 번만 호출되고 `generateMetadata`는 쓰지 않는다.
- 새 import: `asc`, `gt`, `lt`, `or` (`drizzle-orm`).
- 본문 제외: `select`가 `slug`, `title`만 가져온다(F3-4).

## 5. API 엔드포인트 변경

엔드포인트 추가·삭제는 없다. 계약 변경은 아래뿐이다.

| 메서드·경로 | 변경 |
| --- | --- |
| `POST /api/admin/posts` | 요청 바디에서 `published` 제거. 포함하면 400(검증 오류, `fieldErrors`) |
| `PUT /api/admin/posts/[slug]` | 위와 같음 |
| `DELETE /api/admin/posts/[slug]` | 변경 없음 |
| 응답 `Post` | `published` 필드 제거 (`PostSummary`가 사라짐) |

- 이전/다음 글과 admin 카테고리 필터는 서버 컴포넌트가 서비스를 직접 호출하므로(nextjs.md 5번) Route Handler를 만들지 않는다.
- 클라이언트 소비자: `blog-form.tsx`의 draft와 요청 바디(`published` 키), `.md` 가져오기. 클라이언트가 응답의 `post.published`를 읽는 코드는 없다(grep 확인, 폼은 draft 상태만 사용).
- 응답 목록을 상한으로 자르는 곳은 없으므로 "정확한 판정 필드 병행 제공" 대상이 아니다. 출처가 다른 항목을 한 배열로 합치는 곳도 없으므로 판별 필드도 필요 없다.

## 6. 캐시와 revalidate

코드 기준 판단: 이웃 글 상세를 위한 추가 revalidate는 필요 없다.

근거:

1. 세 쓰기 라우트(POST, PUT, DELETE)는 모두 `revalidatePath("/", "layout")`을 호출한다. Next 16 문서(`revalidatePath.md`, "Layouts" 항목)는 이 호출이 해당 레이아웃과 그 아래 모든 중첩 레이아웃·페이지를 무효화한다고 규정한다. 따라서 `/blog`, 모든 `/blog/[slug]`, 이웃 글 상세가 다음 방문 때 모두 다시 렌더된다.
2. 글 추가/삭제로 이웃 관계가 바뀌어도 이웃 글 상세는 이미 무효화 대상이다. requirements F3 edge case의 우려("이웃 글 상세는 갱신 대상이 아니다")는 현재 코드에서는 해당하지 않는다(요구사항 문서는 `/blog`, `/blog/{slug}`만 갱신한다고 서술했으나 실제 호출은 루트 레이아웃 전체다).
3. 서비스 함수의 `react.cache`는 요청 단위 메모이제이션이라 요청 간 오래된 값을 보존하지 않는다. 별도의 `unstable_cache`, `fetch` 캐시, `"use cache"`는 이 경로에 없다.
4. admin 목록·편집 페이지는 `requireAdminPage()`가 세션을 읽어 요청마다 동적으로 렌더된다. 카테고리 집계가 오래된 캐시로 보일 수 없다(F5-5).
5. 새 라우트나 새 revalidate 호출은 추가하지 않는다. F3·F5에서 revalidate 코드 변경은 0건이다.

주의: `revalidatePath("/", "layout")`은 사이트 전체 무효화다. 글 한 편 저장이 다른 페이지(홈, 프로젝트)까지 재렌더 대상으로 만든다. 기존 동작이고 이번 범위에서 좁히지 않는다.

## 7. 파일별 변경 목록

서버·데이터 범위만 적는다. 페이지 JSX와 폼 UI는 frontend-developer 소유다.

| 파일 | 변경 |
| --- | --- |
| `src/db/schema/portfolio.ts` | `published` 컬럼 삭제, `posts_list_idx` 재정의 |
| `drizzle/0004_*.sql`, `drizzle/meta/0004_snapshot.json`, `drizzle/meta/_journal.json` | B 단계 커밋에서 `pnpm db:generate` 산출물 |
| `src/types/blog.ts` | `PostSummary.published` 삭제, `PostLink`·`PostNeighbors` 추가, 주석 수정 |
| `src/schemas/blog.schema.ts` | `published` 삭제 |
| `src/services/blog/blog-service.ts` | 공개/admin 쌍 통합(`listPosts`, `listCategories`, `getPost`), `normalizeCategoryParam`, `getPostNeighbors` 추가 |
| `src/services/blog/blog-admin-service.ts` | 변경 없음 |
| `src/lib/blog/frontmatter.ts` | `published` 검사 삭제, `unpublished?: true` 추가 |
| `scripts/migrate-blog.ts` | `published` 3곳 삭제 |
| `tests/e2e/fixtures/portfolio.ts` | `published` 필드 삭제, 비공개 픽스처 삭제 |
| `src/app/api/admin/posts/**` | 변경 없음(스키마가 입력을 바꿈) |
| 호출부(frontend 소유) | `blog/page.tsx`, `blog/[slug]/page.tsx`, `admin/(console)/blog/page.tsx`, `admin/(console)/blog/[slug]/page.tsx`, `blog-form.tsx`, `PostRow` 등 `published` 참조 제거와 새 함수 사용 |

완료 시 확인: 저장소에서 `published`(공개 여부 의미)를 grep해 `source.published === false` 한 곳 외에 남은 곳이 없어야 한다. `published_at`/`publishedAt`은 발행일이므로 제외한다. 확인 결과는 summary에 기록한다.

## 8. 영향받는 기존 테스트

새 테스트 작성 담당은 배정하지 않는다. 동작 변경으로 깨지는 기존 테스트만 원래 검증 의도를 유지한 채 갱신한다.

| 파일 | 영향 |
| --- | --- |
| `__tests__/schemas/blog-schema.test.ts` | `valid` 픽스처의 `published: true`(14행) 삭제. "published가 불리언이 아니면 거부한다"(144행)는 스키마가 `published` 키 자체를 거부하는 검증으로 바꿈(strictObject 의도 유지) |
| `__tests__/utils/blog-frontmatter.test.ts` | 7~14행의 `published: false` 입력과 기대값(`published: false`)은 `unpublished: true`로 갱신. 72행 "published가 문자열" 오류 케이스는 오류가 아닌 무시로 바뀌므로 오류 목록(`it.each`)에서 제외하고 무시 동작으로 단언 |
| `__tests__/utils/blog-excerpt-page.test.ts` | `parsePageParam`만 사용, 영향 없음 |
| `__tests__/utils/migrate-script.test.ts` | `published`를 직접 참조하지 않음. `migrate-blog.ts` 수정 후 통과 확인 |
| `tests/e2e/fixtures/portfolio.ts`, `seed.ts` | 2.7절. e2e 스펙은 posts를 참조하지 않아 단언 갱신 없음 |
| `__tests__/api/post-image-upload-route.test.ts` | 영향 없음(`published` 미사용) |

`list*`, `getPost*` 서비스 함수를 직접 import하는 기존 테스트는 없다(grep 확인). 이름을 바꿔도 깨지는 테스트가 없다.

## 9. 요구사항 문서와 어긋나는 사실

orchestrator가 사용자에게 알리거나 requirements를 보정해야 하는 항목이다.

1. 배포 순서(requirements 5.2, 5.3): "코드 먼저 배포, 마이그레이션은 나중에 적용"과 별도 "적용 방법은 개발자가 확인"이라는 전제와 달리, 마이그레이션은 빌드에서 자동 적용되고 파일이 들어간 커밋이 빌드되는 순간 적용된다. 3.3절의 2단계 커밋 구성이 그 전제를 충족하는 유일한 방법이다. 승인 게이트는 B 커밋의 병합 직전이다(3.4절).
2. Preview와 Production의 `DATABASE_URL` 동일 여부는 저장소에서 확인되지 않는다. Vercel 프로젝트 환경변수에서 사용자가 확인해야 게이트 위치(3.4절 1 또는 2)가 정해진다. 확인 전에는 `develop` 병합도 운영 DB 변경으로 취급한다.
3. 확인 쿼리 시점(requirements 5.3): A 단계 병합 전에도 `published = false` 0건 확인이 필요하다(A가 비공개 필터를 없애므로 B만의 문제가 아니다).
4. F3 edge case의 "이웃 글 상세는 revalidate 대상이 아니다"는 현재 코드에서 사실이 아니다. 6절 참고. 추가 revalidate는 필요 없다.
5. 7-4 안내를 위해 frontmatter 파서가 `published` 값을 완전히 버릴 수는 없다. 2.5절의 `unpublished?: true` 한 비트만 남긴다. requirements F6-5의 "frontmatter의 `published` 값을 무시하고 오류도 내지 않는다"와 모순되지 않는다(폼 상태와 저장 데이터에는 반영되지 않음).
6. 로컬 `.env.local`의 `DATABASE_URL`이 Production이라 로컬에서 `pnpm db:migrate`는 운영 DB에 바로 적용된다. 구현자는 이 명령으로 0004를 검증하지 않는다.
