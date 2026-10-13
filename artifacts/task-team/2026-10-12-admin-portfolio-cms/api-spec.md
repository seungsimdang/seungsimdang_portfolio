# api-spec: 포트폴리오 데이터 DB 이전 및 admin CRUD

- 작성일: 2026-10-12
- 작성자: Backend Developer (T04, 명세만. 코드·설정·의존성 변경 없음)
- 입력: `requirements.md`(T02 게이트 사용자 결정 포함), `00-input.md`
- 테스트: 새 테스트 작성 담당은 배정하지 않는다(10절은 영향받는 기존 테스트 목록만)

## 목차

- [0. 확인한 사실과 출처](#0-확인한-사실과-출처)
- [1. 의존성과 스크립트](#1-의존성과-스크립트)
- [2. DB 스키마](#2-db-스키마)
- [3. 마이그레이션과 seed](#3-마이그레이션과-seed)
- [4. 쓰기 경로 결정과 API](#4-쓰기-경로-결정과-api)
- [5. zod 입력 스키마](#5-zod-입력-스키마)
- [6. 인증과 가드](#6-인증과-가드)
- [7. 공개 조회 서비스와 캐시](#7-공개-조회-서비스와-캐시)
- [8. 공개 페이지 전환 계획](#8-공개-페이지-전환-계획)
- [9. 원자적 저장](#9-원자적-저장)
- [10. 영향받는 기존 테스트](#10-영향받는-기존-테스트)
- [11. T05/T06 파일 소유 경계](#11-t05t06-파일-소유-경계)
- [12. 열린 이슈와 사용자 조치](#12-열린-이슈와-사용자-조치)

## 0. 확인한 사실과 출처

1. 이 저장소에 `axios`, `src/types/api-types.ts`(`CustomData`), `src/lib/`, `src/services/`, `src/schemas/`, `src/db/`는 아직 없다. 모두 신규 생성이다.
2. Next.js 16.3.6 문서는 `node_modules/next/dist/docs/01-app/`에서 확인했다(이 워크트리에 존재).
3. `proxy.ts`: `src/proxy.ts`에 `export function proxy` + `export const config = { matcher }`. matcher 값은 정적 상수여야 한다. 출처: `03-api-reference/03-file-conventions/proxy.md`.
4. `revalidatePath(path, type?)`는 Server Function과 Route Handler에서 호출 가능, Client Component와 Proxy에서는 불가. Route Handler에서는 "다음 방문 시 재검증"으로 표시만 한다. 출처: `04-functions/revalidatePath.md`.
5. `updateTag`는 Server Action 전용이고 Route Handler에서는 쓸 수 없다. `revalidateTag(tag, "max")`는 stale-while-revalidate. 출처: `04-functions/updateTag.md`, `revalidateTag.md`.
6. `cacheComponents`는 이 저장소 `next.config.ts`에 꺼져 있다. 켜면 `dynamicParams`와 route segment `revalidate`가 제거되므로(출처: `dynamicParams.md`, `02-route-segment-config/index.md`) 켜지 않는다. 이전 캐시 모델(`caching-without-cache-components.md`)을 쓴다.
7. Server Action은 Origin과 Host를 비교해 불일치 시 중단한다. Route Handler에는 이 보호가 없다. 출처: `02-guides/data-security.md` 544행 부근.
8. next-auth v4 GitHub provider 기본 scope는 `read:user user:email`이다. userinfo는 `https://api.github.com/user`이고 `profile.id`는 number다. 출처: candanta `node_modules/next-auth/providers/github.js`, `github.d.ts`(4.24.15). 숫자 id는 signIn 콜백의 `account.providerAccountId`(string)로 받는다.
9. drizzle `neon-http`: `db.transaction()`은 지원하지 않는다(`session.js`에서 `"No transactions support in neon-http driver"`를 throw). `db.batch([...])`는 있으며 내부에서 Neon `client.transaction(queries)`(HTTP 트랜잭션 엔드포인트)로 한 번에 보내 원자적으로 커밋한다. 출처: candanta `node_modules/drizzle-orm/neon-http/session.js`(131행, 151행)와 `driver.d.ts`(27행), 실제 사용 예 `candanta/src/app/api/strategy-recommendations/[id]/approve/route.ts` 185행 부근.
10. 따라서 interactive transaction이 필요한 설계(읽은 값에 따라 다음 쿼리 분기)는 쓰지 않고, 모든 다중 문장 쓰기를 "값이 미리 정해진 독립 문장의 batch"로 구성한다(9절).
11. PG 에러 코드는 `err.code`(Neon) 또는 `err.cause.code`(DrizzleQueryError 래핑)로 온다. 유니크 위반은 `23505`다. 두 위치를 모두 본다. 출처: candanta `strategy-profiles/[id]/route.ts`의 `getPgErrorCode` 사용례.

## 1. 의존성과 스크립트

기준일 2026-10-12, 7일 대기 정책(`minimumReleaseAge: 10080`) 컷오프는 2026-10-05. 게시일은 `npm view <pkg> time`으로 확인했다. 이 저장소는 버전을 exact로 고정한다.

| 패키지 | 구분 | 선택 버전 | 게시일 | 비고 |
| --- | --- | --- | --- | --- |
| `@neondatabase/serverless` | dependencies | 1.2.0 | 2026-10-01 | 통과(11일). candanta는 1.1.0 |
| `drizzle-orm` | dependencies | 0.45.3 | 2026-09-21 | 0.45.4(2026-10-08)는 4일이라 대기 미충족. 0.45.2도 가능하나 최신 통과본 선택 |
| `next-auth` | dependencies | 4.24.15 | 2026-07-20 | peer `next ^16` 포함. Auth.js v5 beta는 쓰지 않음 |
| `zod` | dependencies | 4.6.5 | 2026-09-13 | 4.6.6(2026-10-11)은 대기 미충족. candanta는 3.x이므로 4.x 문법 차이 주의 |
| `server-only` | dependencies | 0.0.1 | 2022-09-03 | 단일 버전 |
| `drizzle-kit` | devDependencies | 0.31.11 | 2026-09-21 | 통과 |
| `tsx` | devDependencies | 4.23.15 | 2026-09-20 | seed 실행용 |

- `dotenv`는 추가하지 않는다. `drizzle.config.ts`는 Node 내장 `process.loadEnvFile(".env.local")`을 파일 존재 시에만 호출한다(Node 엔진 `>=22.22.1`이라 사용 가능). 누락 시 `DATABASE_URL` 미설정 에러를 던진다.
- `bcryptjs`, `axios`, `@tanstack/react-query`는 추가하지 않는다(Credentials 미사용, 11절의 `HttpStatus` 대체안, admin은 `fetch` + `router.refresh()`).
- `no-downgrade` trust policy: 신규 패키지 설치 시 provenance 비교로 `pnpm install`이 막힐 수 있다. 막히면 T06은 임의로 `trustPolicyExclude`를 추가하지 말고 원인 패키지와 로그를 orchestrator에게 보고한다(설정 변경은 사용자 승인).
- knip: `drizzle.config.ts`는 drizzle-kit 플러그인이, `src/db/seed.ts`는 package.json 스크립트의 `tsx` 인자로 entry 인식된다. 인식되지 않으면 T06이 `knip.json`에 entry를 추가한다.

추가 스크립트(`package.json`, T06 단독):

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:seed": "tsx src/db/seed.ts"
```

- `db:studio`, `db:push`는 추가하지 않는다(요구사항 F1).
- `.env.local` 로딩: `db:seed`는 `tsx --env-file-if-exists=.env.local src/db/seed.ts`로 쓴다(Node 플래그를 tsx가 전달). 동작하지 않으면 seed 파일 상단에서 `process.loadEnvFile`을 직접 호출한다.

## 2. DB 스키마

파일: `src/db/schema/portfolio.ts`(Drizzle `pg-core`), `src/db/index.ts`(candanta의 지연 초기화 Proxy 패턴 그대로, `import * as schema from "./schema/portfolio"`). 타임스탬프는 `timestamp({ withTimezone: true })`.

### profile (단일 행)

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | `smallint` | PK, default 1, `check(id = 1)` |
| `name` | text | not null |
| `title` | text | not null |
| `tagline` | text | not null (`\n` 보존) |
| `description` | text | not null |
| `email` | text | not null |
| `github` | text | not null |
| `skills` | `text[]` | not null, default `'{}'` |
| `updated_at` | timestamptz | not null, default now |

### projects

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | uuid | PK, `defaultRandom()` |
| `slug` | text | not null, UNIQUE, `check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')` |
| `title`, `period`, `role`, `summary` | text | not null |
| `link`, `thumbnail` | text | null 허용 |
| `tech_stack` | `text[]` | not null, default `'{}'` |
| `sort_order` | integer | not null |
| `created_at`, `updated_at` | timestamptz | not null, default now |

- 인덱스: `(sort_order, created_at, id)`(목록 정렬용 결정적 순서).

### experiences

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | uuid | PK, `defaultRandom()` |
| `project_id` | uuid | not null, FK `projects.id` ON DELETE CASCADE |
| `sort_order` | integer | not null |
| `title`, `problem`, `solution`, `result`, `learning` | text | not null |
| `tradeoff_advantages`, `tradeoff_disadvantages`, `tradeoff_rationale` | text | not null, default `''` |
| `links` | jsonb | not null, default `'[]'`, `$type<ExperienceLink[]>()` |
| `created_at`, `updated_at` | timestamptz | not null, default now |

- 인덱스: `(project_id, sort_order)`.
- `links`의 형태 제약은 DB에 두지 않고 쓰기 경계 zod로 보장한다(requirements 4절 결정).

### tech_talks

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | uuid | PK, `defaultRandom()` |
| `slug` | text | not null, UNIQUE, 위와 같은 slug 형식 check |
| `title`, `date`, `venue`, `description`, `impact`, `link` | text | not null |
| `sort_order` | integer | not null |
| `created_at`, `updated_at` | timestamptz | not null, default now |

- 인덱스: `(sort_order, created_at, id)`.
- `impact`는 현재 `TechTalk` 타입에서 필수다. DB와 zod 모두 필수로 유지한다.

## 3. 마이그레이션과 seed

### 마이그레이션

1. `drizzle.config.ts`(루트): `dialect: "postgresql"`, `schema: "./src/db/schema/portfolio.ts"`, `out: "./drizzle"`, `dbCredentials.url = DATABASE_URL`. 미설정이면 throw.
2. `pnpm db:generate`로 `drizzle/0000_*.sql`과 `drizzle/meta/`를 생성해 커밋한다. SQL을 손으로 고치지 않는다. check 제약은 스키마의 `check()`로 표현한다.
3. 적용은 소유자 수동 `pnpm db:migrate`(환경별). 코드 배포 전에 선행한다. CI 자동 적용은 만들지 않는다.
4. 이후 변경은 컬럼 추가 중심의 하위 호환 마이그레이션만 만든다.

### seed (`src/db/seed.ts`)

1. 데이터 원본은 기존 `src/constants/portfolio-data.ts`를 `src/db/seed-data.ts`로 옮긴 파일이다(`git mv`). 공개 코드는 이 파일을 import하지 않는다(seed만 import). 사용자 결정에 따라 Production seed 검증 후 후속 커밋에서 `seed.ts`, `seed-data.ts`, `db:seed` 스크립트를 함께 제거한다.
2. `seed-data.ts`는 `@/types/portfolio`의 새 타입을 쓰지 않고 자체 로컬 인터페이스(`SeedProject`, `SeedTalk`, `id` = slug)를 둔다. 문자열 값은 한 글자도 바꾸지 않는다(`\n`, 빈 `rationale` 포함).
3. 실행 순서: (1) `DATABASE_URL` 검사, (2) 접속 호스트명만 출력(`new URL(DATABASE_URL).hostname`, 비밀번호와 전체 URL은 출력 금지), (3) `--yes`가 없으면 `readline`으로 y/N 확인, (4) 테이블별 비어 있는지 확인, (5) 비어 있는 테이블에 한해 하나의 `db.batch([...])`로 삽입, (6) 결과 요약 출력.
4. 멱등성: `profile`, `projects`, `tech_talks` 각각 "행이 하나라도 있으면 그 테이블은 건너뜀"으로 처리한다. 재실행해도 중복이 없고 admin이 수정한 데이터를 덮어쓰지 않는다. 프로젝트와 experiences는 항상 같은 batch에 들어가므로 projects가 비어 있으면 experiences도 비어 있다.
5. 프로젝트 id는 seed에서 `crypto.randomUUID()`로 미리 만들어 experiences의 `project_id`에 넣는다(batch 안 문장이 서로 결과를 참조하지 않도록).
6. `sort_order`는 배열 인덱스(0부터). 프로젝트 순서는 `globber, dpm-core, semt, endo-admin, endo-report`. experiences 총 9건, tech talks 2건, profile 1건.
7. 환경별 실행: 로컬은 `.env.local`의 개발 Neon 브랜치. Production은 터미널에서 `DATABASE_URL=<main 연결 문자열> pnpm db:seed`를 일회성으로 실행하되 호스트 확인 프롬프트를 통과해야 한다. 실행 절차는 T06이 `README.md`가 아닌 `src/db/seed.ts` 상단 주석에 명사형으로 남긴다(별도 문서 신규 생성 없음).

## 4. 쓰기 경로 결정과 API

### 결정: Route Handler (`src/app/api/admin/...`)

근거는 아래와 같다.

1. 요구사항이 401/403/404/409 등 HTTP 상태별 계약을 요구한다(F3, F4, F10). Server Action은 상태 코드를 쓸 수 없고 반환값으로만 구분하므로 이 계약이 약해진다.
2. `docs/agent-rules/project-structure.md` 규칙 3(`src/app/api/{도메인}/route.ts`, `CustomData<T>`)과 일치한다.
3. T05/T06이 병렬로 작업하므로 HTTP 계약이 파일 경계 역할을 한다. 프런트는 `fetch`와 이 문서의 요청/응답만 알면 된다.
4. 가드를 호출 전에 단위로 검증하기 쉽다(Request 객체를 직접 만들어 핸들러를 호출).
5. 감수하는 비용: Server Action의 기본 Origin 검사가 없어 직접 검사해야 한다(6절 공통 래퍼에 1회만 구현). `updateTag`(read-your-own-writes)를 못 쓰지만 admin 화면은 동적 렌더이고 `router.refresh()`로 충분하다.

### 공통 규약

- 모든 응답은 `CustomData<T>` = `{ data: T; status: number }`. 에러도 같은 형태이며 `data`가 `ApiErrorBody`다.
- 이 저장소에 `axios`가 없으므로 `HttpStatusCode`를 쓸 수 없다. 대체안: `src/constants/http-status.ts`에 `HttpStatus` 상수 객체(`as const`)를 두고 이름과 값은 axios `HttpStatusCode`와 동일하게 쓴다. 사용 코드는 `HttpStatus.Unauthorized`처럼 쓰며 매직넘버를 금지한다. 포함 값: `Ok 200`, `Created 201`, `BadRequest 400`, `Unauthorized 401`, `Forbidden 403`, `NotFound 404`, `Conflict 409`, `PayloadTooLarge 413`, `UnsupportedMediaType 415`, `InternalServerError 500`. 규칙 문서(`react-query.md`) 갱신은 이 Task 범위 밖이므로 orchestrator가 판단한다.
- 신규 파일 `src/types/api-types.ts`:

```ts
export interface CustomData<T> {
  data: T;
  status: number;
}

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "FORBIDDEN_ORIGIN"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "SLUG_CONFLICT"
  | "ORDER_MISMATCH"
  | "NOT_SEEDED"
  | "LIMIT_EXCEEDED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  // 필드 경로(예: "title", "experiences.0.problem") -> 사용자용 메시지. VALIDATION_FAILED에서만 존재
  fieldErrors?: Record<string, string>;
}
```

- 에러 응답에 스택, SQL, 시크릿을 넣지 않는다. 예기치 않은 예외는 서버 로그에 `console.error`(에러 객체 전체가 아닌 name과 message)로 남기고 `INTERNAL_ERROR` 500으로 응답한다.
- 요청 본문은 `Content-Type: application/json`만 허용(아니면 415 `UNSUPPORTED_MEDIA_TYPE`). 본문 크기 상한 256KB(초과 시 413 `PAYLOAD_TOO_LARGE`). JSON 파싱 실패와 zod 실패는 400 `VALIDATION_FAILED`.
- 모든 `/api/admin/**` 응답에 `Cache-Control: no-store`와 `X-Robots-Tag: noindex, nofollow`. proxy가 일괄 부착하고(6절) 핸들러는 중복 설정하지 않는다.
- GET 엔드포인트는 만들지 않는다. admin 화면의 읽기는 서버 컴포넌트가 가드 + 서비스 함수를 직접 호출한다(YAGNI, 읽기용 공격 표면 제거).
- 쓰기 성공 후 `revalidatePath("/", "layout")`(사이트 전체)를 DB 쓰기 성공 직후에만 호출한다. 서비스 함수가 throw하면 호출하지 않는다.

### 엔드포인트 목록

| 메서드 경로 | 요청 본문 | 성공 응답 | 에러 |
| --- | --- | --- | --- |
| `PUT /api/admin/profile` | `ProfileInput` | 200 `Profile` | 400, 401, 403, 413, 415 |
| `POST /api/admin/projects` | `ProjectCreateInput` | 201 `Project` | 400, 401, 403, 409 `SLUG_CONFLICT` |
| `PUT /api/admin/projects/[slug]` | `ProjectUpdateInput`(slug 필드 금지) | 200 `Project` | 400, 401, 403, 404 |
| `DELETE /api/admin/projects/[slug]` | 없음 | 200 `{ slug: string }` | 401, 403, 404 |
| `PUT /api/admin/project-order` | `{ slugs: string[] }` | 200 `{ slugs: string[] }` | 400, 401, 403, 409 `ORDER_MISMATCH` |
| `POST /api/admin/talks` | `TalkCreateInput` | 201 `TechTalk` | 400, 401, 403, 409 `SLUG_CONFLICT` |
| `PUT /api/admin/talks/[slug]` | `TalkUpdateInput`(slug 금지) | 200 `TechTalk` | 400, 401, 403, 404 |
| `DELETE /api/admin/talks/[slug]` | 없음 | 200 `{ slug: string }` | 401, 403, 404 |
| `PUT /api/admin/talk-order` | `{ slugs: string[] }` | 200 `{ slugs: string[] }` | 400, 401, 403, 409 `ORDER_MISMATCH` |

- 순서 변경 경로를 `projects/order`가 아닌 `project-order`로 둔 이유는 `[slug]` 동적 세그먼트와 slug `order` 충돌을 피하기 위해서다.
- `PUT` 프로젝트는 전체 교체다. `experiences` 배열 전체를 보낸 순서대로 `sort_order` 0..n-1로 저장하고 기존 experiences는 전부 삭제 후 새 id로 재삽입한다(부분 수정 없음). 화면 key는 DB id를 쓰되 저장 후 응답 `Project`의 새 id로 갱신해야 한다.
- 순서 변경: `slugs`는 현재 존재하는 전체 slug 집합과 정확히 일치해야 한다(중복 불가, 누락 불가). 불일치(다른 탭에서 추가/삭제된 경우)는 409 `ORDER_MISMATCH`.
- 삭제된 프로젝트의 experiences는 FK cascade로 함께 삭제된다.
- 로그인/로그아웃은 next-auth 표준 경로(`/api/auth/[...nextauth]`)를 쓴다. 프런트는 `next-auth/react`의 `signIn("github", { callbackUrl })`, `signOut({ callbackUrl: "/admin/login" })`만 호출한다.

### 공통 타입 (`src/types/portfolio.ts` 재작성, T06 소유)

```ts
export interface Profile {
  name: string;
  title: string;
  tagline: string;
  description: string;
  email: string;
  github: string;
  skills: string[];
}

export interface ExperienceLink {
  label: string;
  url: string;
}

export interface Experience {
  id: string; // DB uuid, 렌더 key
  title: string;
  problem: string;
  solution: string;
  tradeoff: { advantages: string; disadvantages: string; rationale: string };
  result: string;
  learning: string;
  links?: ExperienceLink[]; // 빈 배열이면 undefined로 매핑해 기존 컴포넌트 호환 유지
}

export interface Project {
  id: string; // DB uuid, 렌더 key
  slug: string; // 공개 URL 식별자 (구 ProjectId 대체)
  title: string;
  period: string;
  role: string;
  techStack: string[];
  summary: string;
  link?: string; // DB null은 undefined로 매핑
  thumbnail?: string; // DB null은 undefined로 매핑
  experiences: Experience[]; // sort_order 오름차순
}

export interface TechTalk {
  id: string; // DB uuid, 렌더 key
  slug: string;
  title: string;
  date: string; // "YYYY.MM"
  venue: string;
  description: string;
  impact: string;
  link: string;
}
```

- `ProjectId`는 삭제한다. 입력 타입(`ProjectCreateInput` 등)은 `src/schemas/portfolio.schema.ts`에서 `z.infer`로 export한다(단일 원본).
- 이 계약은 T05가 먼저 가정하고 작업해야 하므로 위 형태를 바꾸려면 T06은 orchestrator에게 알린다.

## 5. zod 입력 스키마

파일: `src/schemas/portfolio.schema.ts`. 클라이언트에서도 import 가능한 순수 zod 모듈로 만든다(`server-only` 금지). T05는 이 스키마로 필드별 에러 표시용 클라이언트 검증을 하되, 서버 재검증이 신뢰 경계다.

| 상수 | 값 | 용도 |
| --- | --- | --- |
| `SHORT_TEXT_MAX` | 200 | title, period, role, venue, label, date 제외 단문 |
| `LONG_TEXT_MAX` | 5000 | summary, problem, solution, tradeoff 3필드, result, learning, description, impact, tagline |
| `LIST_MAX` | 50 | techStack, skills, experiences, links 항목 수 |
| `URL_MAX` | 2000 | link, url |

- `slug`: `^[a-z0-9]+(-[a-z0-9]+)*$`, 길이 1~64. 예약어 `new`는 거부한다(`/admin/projects/new` 경로와 충돌 방지).
- URL(`link`, `links[].url`, `profile.github`): `new URL()`로 파싱해 `protocol`이 `http:` 또는 `https:`인 경우만 통과. `profile.github`는 `https:`만.
- `email`: zod 이메일 형식.
- `date`(talk): `^\d{4}\.(0[1-9]|1[0-2])$`.
- `thumbnail`: 선택. 비어 있으면 null 저장. 값이 있으면 `^/images/[A-Za-z0-9._/-]+$`이고 `..`를 포함하지 않아야 한다. 외부 https URL은 이번 사이클에서 전부 거부한다(`next.config.ts` `images.remotePatterns`가 비어 있어 런타임에서 깨지기 때문). 외부 호스트 허용이 필요해지면 호스트 상수 + remotePatterns를 함께 추가한다(ceiling).
- 단문/장문 필드는 `trim()` 후 길이 검사한다. 필수 필드는 최소 1자. 빈 문자열 허용: `tradeoff.advantages`, `tradeoff.disadvantages`, `tradeoff.rationale`(기존 데이터 호환).
- `techStack`, `skills` 항목: trim 후 1~`SHORT_TEXT_MAX`자. 빈 항목은 거부.
- 모든 객체 스키마는 `.strict()`로 알 수 없는 키를 거부한다.
- 본문 스키마 구성:
  - `ProfileInput`: name, title, tagline, description, email, github, skills
  - `ProjectUpdateInput`: title, period, role, summary, link?, thumbnail?, techStack, experiences[]
  - `ProjectCreateInput`: `ProjectUpdateInput` + slug
  - `ExperienceInput`: title, problem, solution, tradeoff{advantages, disadvantages, rationale}, result, learning, links[]? (id 필드는 받지 않음)
  - `TalkUpdateInput`: title, date, venue, description, impact, link
  - `TalkCreateInput`: `TalkUpdateInput` + slug
  - `OrderInput`: `{ slugs: string[] }` (1~`LIST_MAX * 2`개, 중복 불가)
- 검증 실패는 `fieldErrors`로 변환한다. 키는 `issue.path.join(".")`, 값은 첫 번째 메시지(한국어 사용자용 문구).
- 텍스트는 일반 텍스트로만 저장/렌더한다. 서버는 HTML을 해석하거나 sanitize하지 않으며 렌더 측이 React 텍스트 노드로만 출력한다.

## 6. 인증과 가드

### auth-options (`src/lib/auth/auth-options.ts`, `import "server-only"`)

```ts
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      authorization: { params: { scope: "read:user" } }, // 숫자 id만 필요하므로 이메일 scope 제외
    }),
  ],
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  jwt: { maxAge: SESSION_MAX_AGE_SECONDS },
  callbacks: {
    async signIn({ account }) {
      // allowlist 불일치는 false로 거부. 사유를 URL이나 화면에 구체적으로 노출하지 않음
      return account?.provider === "github" && isAllowedGithubId(account.providerAccountId);
    },
    async jwt({ token, account }) {
      if (account?.provider === "github") token.githubId = account.providerAccountId;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.githubId === "string") session.user.githubId = token.githubId;
      return session;
    },
  },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
```

- `signIn` 거부 시 next-auth는 `pages.error`로 `?error=AccessDenied`를 붙여 이동시킨다. T05는 `error` 값이 무엇이든 동일한 일반 문구("로그인할 수 없습니다")만 표시한다.
- 로그인은 GitHub 프로필의 이메일, login 이름, 표시명을 사용하지 않는다. 판정은 숫자 id만.
- `src/types/next-auth.d.ts`(T06): `Session.user.githubId?: string`, `JWT.githubId?: string` 모듈 증강.
- 쿠키는 next-auth 기본값(httpOnly, SameSite=Lax, 프로덕션 `__Secure-` 접두사)을 유지하고 오버라이드하지 않는다.

### allowlist (`src/lib/auth/admin-allowlist.ts`)

```ts
// ADMIN_GITHUB_ID: 쉼표 구분 숫자 id. 숫자가 아닌 토큰은 버림. 비어 있으면 전원 거부(fail-closed)
export function getAdminGithubIds(): readonly string[];
export function isAllowedGithubId(id: string | undefined): boolean;
```

### 공통 가드 (`src/lib/auth/require-admin.ts`, `import "server-only"`)

```ts
export type AdminGuardResult =
  | { ok: true; githubId: string }
  | { ok: false; status: typeof HttpStatus.Unauthorized | typeof HttpStatus.Forbidden };

// 세션 없음 -> 401, 세션은 있으나 allowlist 불일치(또는 env 비어 있음) -> 403. 매 호출 시 env를 다시 읽어 판정
export function requireAdmin(): Promise<AdminGuardResult>;

// 서버 컴포넌트용. 실패 시 /admin/login으로 redirect(), 성공 시 { githubId } 반환
export function requireAdminPage(): Promise<{ githubId: string }>;
```

- `requireAdmin`은 `getServerSession(authOptions)`를 호출한다. 모든 진입점은 이 함수만 쓰고 검사 로직을 복붙하지 않는다.
- `requireAdminPage`는 layout이 아니라 모든 admin `page.tsx`(로그인 페이지 제외)의 서버 컴포넌트 최상단에서 호출한다. layout은 네비게이션 시 재실행되지 않기 때문이다. layout에서도 한 번 더 호출해도 된다.
- 로그인 페이지에서 이미 인증된 사용자의 처리는 T05 몫이다. 판정에는 `requireAdmin()`을 쓰고, `ok`이면 `/admin`으로 redirect.

### Route Handler 래퍼 (`src/lib/auth/admin-route.ts`, `import "server-only"`)

```ts
export interface AdminRouteContext<P> {
  request: Request;
  params: P;
  githubId: string;
}

export function adminRoute<P extends Record<string, string> = Record<string, never>>(
  handler: (ctx: AdminRouteContext<P>) => Promise<Response>,
): (request: Request, routeContext: { params: Promise<P> }) => Promise<Response>;
```

처리 순서(래퍼가 모두 수행, 핸들러에는 비즈니스 로직만 남김):

1. `POST/PUT/PATCH/DELETE`이면 Origin 검사: `Origin` 헤더가 없거나, `new URL(origin).host`가 `x-forwarded-host ?? host` 헤더와 다르면 403 `FORBIDDEN_ORIGIN`.
2. `requireAdmin()`: 401 `UNAUTHORIZED` 또는 403 `FORBIDDEN`.
3. `handler` 실행. `ApiError`(아래) throw는 해당 상태로 변환, 그 외 예외는 500 `INTERNAL_ERROR`.

보조 모듈(`src/lib/api/`, 모두 `server-only`):

- `api-error.ts`: `class ApiError extends Error { code: ApiErrorCode; status: number; fieldErrors? }`.
- `response.ts`: `ok<T>(data: T, status?: number): Response`, `fail(error: ApiError): Response`. 둘 다 `CustomData` 형태 `Response.json`.
- `parse-body.ts`: `parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T>`. Content-Type, 크기 상한, JSON 파싱, zod 검증을 수행하고 실패 시 `ApiError`를 throw.

### proxy (`src/proxy.ts`)

```ts
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
```

동작:

1. 모든 매칭 응답에 `X-Robots-Tag: noindex, nofollow`와 `Cache-Control: no-store`를 부착한다(`NextResponse.next()`와 리다이렉트/401 모두).
2. `/admin/login`은 인증 검사 없이 통과(헤더만 부착).
3. 그 외: `getToken({ req, secret: process.env.NEXTAUTH_SECRET })`로 JWT 존재를 확인한다. `NEXTAUTH_SECRET`이 없거나 토큰이 없으면 미인증으로 간주한다(fail-closed).
4. 미인증 `/admin/**` 페이지는 `/admin/login?from=<pathname+search>`로 redirect, 미인증 `/api/admin/**`는 401 `CustomData<ApiErrorBody>` JSON.
5. proxy는 1차 방어이고, 인가(allowlist)는 가드 함수가 항상 다시 한다. proxy에서 DB를 조회하지 않는다.
6. `from` 값 검증은 로그인 페이지(T05) 책임이다. `/admin`으로 시작하고 `//`나 `\`가 없는 상대 경로만 `callbackUrl`로 사용하고 아니면 `/admin`으로 대체한다.
- `/api/auth/**`(next-auth)는 matcher에 포함하지 않는다.
- 공개 경로에는 어떤 인증 검사도 걸지 않는다.

next-auth 라우트: `src/app/api/auth/[...nextauth]/route.ts`에서 `NextAuth(authOptions)`를 `GET`, `POST`로 export(T06).

### 환경변수 (`.env.example`, T06이 기존 파일을 갱신)

```
# Neon Postgres 연결 문자열. 빌드(정적 생성), 런타임, 마이그레이션, seed 모두 필요
DATABASE_URL=

# next-auth JWT 서명 키 (openssl rand -base64 32)
NEXTAUTH_SECRET=

# 콜백 기준 URL. 로컬은 http://localhost:3000, Production은 배포 도메인
NEXTAUTH_URL=http://localhost:3000

# GitHub OAuth App (환경별로 분리 생성. Preview에서는 admin 로그인 미지원)
GITHUB_ID=
GITHUB_SECRET=

# admin으로 허용할 GitHub 숫자 user id. 여러 명이면 쉼표 구분. 비어 있으면 모든 로그인 거부
ADMIN_GITHUB_ID=
```

- 시크릿 값은 어떤 파일이나 로그에도 남기지 않는다. `.env.local`은 gitignore 대상이다.

## 7. 공개 조회 서비스와 캐시

### 서비스 (`src/services/portfolio/portfolio-service.ts`, 첫 줄 `import "server-only";`)

```ts
export const getProfile: () => Promise<Profile>;                 // 행이 없으면 PortfolioNotSeededError throw
export const listProjects: () => Promise<Project[]>;             // sort_order, created_at, id 순. experiences 포함, experiences는 sort_order 순
export const getProjectBySlug: (slug: string) => Promise<Project | null>; // 없으면 null (DB 에러는 throw)
export const listProjectSlugs: () => Promise<string[]>;
export const listTechTalks: () => Promise<TechTalk[]>;
```

- 각 함수는 React `cache()`로 감싼다(같은 요청 안의 `generateMetadata`와 본문 중복 조회 방지).
- `getProjectBySlug`는 slug가 형식에 맞지 않아도 DB를 치지 않고 null 반환해도 된다(slug 정규식 불일치 시 null).
- DB 에러를 `null`이나 `notFound()`로 삼키지 않는다. 호출부가 404(null)와 5xx(throw)를 구분한다.
- 목록 조회는 `projects`와 `experiences`를 쿼리 2회로 가져와 메모리에서 묶는다(N+1 금지).
- `PortfolioNotSeededError`는 같은 파일에서 export한다(seed 전 공개 페이지는 `error.tsx`로 처리).

### 쓰기 서비스 (`src/services/portfolio/portfolio-admin-service.ts`, `server-only`)

```ts
export class SlugConflictError extends Error {}
export class NotFoundError extends Error {}
export class OrderMismatchError extends Error {}

export const updateProfile: (input: ProfileInput) => Promise<Profile>;
export const createProject: (input: ProjectCreateInput) => Promise<Project>;      // SlugConflictError
export const updateProject: (slug: string, input: ProjectUpdateInput) => Promise<Project>; // NotFoundError
export const deleteProject: (slug: string) => Promise<void>;                      // NotFoundError
export const reorderProjects: (slugs: string[]) => Promise<void>;                // OrderMismatchError
export const createTalk / updateTalk / deleteTalk / reorderTalks // 위와 대칭
```

- 유니크 위반(`23505`)을 `SlugConflictError`로 변환하는 곳은 이 서비스뿐이다. Route Handler가 에러 코드 해석을 반복하지 않는다.
- 쓰기 서비스는 `revalidatePath`를 호출하지 않는다. 호출은 Route Handler(성공 반환 직전)가 담당한다.

### 캐시 / revalidate 전략

1. 이전 캐시 모델을 유지한다(`cacheComponents` 미사용, 0절 6번). 공개 페이지는 요청 시점 API(`cookies`, `headers`, `searchParams`)를 쓰지 않으므로 빌드 시 정적 생성되고, DB 조회는 빌드 및 재검증 시점에만 실행된다. `unstable_cache`, `'use cache'`, 시간 기반 `revalidate`는 쓰지 않는다.
2. 쓰기 성공 후 Route Handler가 `revalidatePath("/", "layout")`를 호출한다. `layout` 타입 지정으로 하위 모든 페이지(`/work/[slug]` 포함)가 무효화된다. 호출 위치는 서비스 await 성공 직후, `ok()` 반환 직전이다.
3. 재검증 중 DB 실패 시 Next가 마지막 정상 페이지를 계속 제공한다(요구사항 6절 장애 규칙 1). 최초 렌더 실패는 `app/error.tsx`가 처리한다(T05 신규).
4. 어긋남 위험(구현 중 확인 항목): Route Handler의 `revalidatePath`는 "다음 방문 시 재검증"이다(0절 4번). 저장 직후 공개 페이지를 열었을 때 갱신된 내용이 보이는지 T06이 로컬 `pnpm build && pnpm start`로 한 번 확인하고, stale이 한 번 보이는 동작이면 orchestrator에게 보고한다(대안: admin 쓰기를 Server Action으로 전환하거나 `revalidateTag(tag, { expire: 0 })` + 태그 기반 캐시 도입. 이 대안은 지금 채택하지 않음).
5. admin 서버 컴포넌트는 `requireAdminPage()`가 `getServerSession`을 통해 `cookies()`를 읽으므로 동적 렌더가 된다. 같은 `portfolio-service` 함수를 호출해도 캐시되지 않아 항상 최신 데이터를 본다.
6. 루트 `layout.tsx`에서 `getServerSession`이나 쿠키를 읽지 않는다(전 사이트가 동적으로 바뀜). 인증 확인은 `app/admin/**`에서만 한다.

### `/work/[id]`

- 라우트 폴더명 `[id]`와 세그먼트 값(= slug)은 그대로 둔다(URL 호환, 이름 변경 시 파일 이동만 늘어남).
- `export const dynamicParams = false` 삭제(기본값 true). `generateStaticParams`는 `listProjectSlugs()`를 호출하고 try/catch로 감싸 실패 시 `[]`를 반환한다(빌드 안 깨짐). 미생성 slug는 첫 방문 시 동적 렌더 후 캐시된다.
- `generateMetadata`와 본문은 `getProjectBySlug(id)`를 호출하고 `null`이면 `notFound()`(메타데이터에서는 `{}`), throw는 그대로 전파한다.

## 8. 공개 페이지 전환 계획

전환 담당은 T05다(서비스 계약은 7절). 11개 사용처와 변경 요약은 아래와 같다.

| 파일 | 변경 |
| --- | --- |
| `src/app/layout.tsx` | `metadata` 상수를 `generateMetadata()`로 바꾸고 `getProfile()` 사용. `Navbar`, `Footer`에 `profile` props 전달. |
| `src/app/page.tsx` | `getProfile`, `listProjects`, `listTechTalks` 호출. `HeroSection`, `AboutSection`에 `profile` 전달. 카드 테마는 `getProjectCardTheme(index)`. `href`는 `/work/${project.slug}`, key는 `project.id`. |
| `src/app/projects/page.tsx` | `getProfile`, `listProjects`. 위와 같은 카드 변경. |
| `src/app/about/page.tsx` | `getProfile`. `AboutSection`을 쓰면 `profile` 전달. |
| `src/app/contact/page.tsx` | `getProfile`. |
| `src/app/blog/page.tsx` | `listTechTalks`. key는 `talk.id`. |
| `src/app/work/[id]/page.tsx` | 7절 `/work/[id]` 규칙. `Experience` key는 `experience.id`(제목 중복 허용). |
| `src/components/layout/navbar.tsx` | `profile: Pick<Profile, "name">` props. |
| `src/components/layout/footer.tsx` | `profile: Pick<Profile, "name" \| "title" \| "github" \| "email">` props. |
| `src/components/common/hero-section.tsx` | `profile` props. 모듈 최상단 `skills` 계산을 컴포넌트 안으로 이동. |
| `src/components/common/about-section.tsx` | `profile: Pick<Profile, "description">` props. |

- 클라이언트 컴포넌트는 서비스 모듈을 import하지 않는다(props만).
- `TalkPreview`에 `{...talk}`로 전달할 때 `id`, `slug`가 함께 넘어가도 컴포넌트가 사용하는 props만 구조분해하므로 동작에는 영향 없다. T05가 필요하면 명시 props로 바꿔도 된다.
- 빈 상태: 프로젝트 0개, talks 0개일 때 빈 문구 표시(T05, design-spec 따름). 기존 "전체 N개 중 M개" UI가 없으면 새로 만들지 않는다.
- `src/app/error.tsx`(클라이언트 컴포넌트)를 T05가 신규 생성한다. 최초 렌더 DB 실패 시 표시된다.

### project-card-theme

`src/constants/project-card-theme.ts`를 아래 형태로 바꾼다(T05 소유, `ProjectId` import 제거).

```ts
export interface ProjectCardTheme { bgColor: string; textColor: string }

// 현재 5개 색상 조합을 현재 노출 순서대로 유지
const PALETTE: readonly ProjectCardTheme[] = [ /* globber, dpm-core, semt, endo-admin, endo-report 순 */ ];

// 목록 순번(0부터)으로 순환 선택. 6번째 이후는 처음부터 반복
export function getProjectCardTheme(index: number): ProjectCardTheme;
```

- 호출부는 `listProjects()` 결과의 `map((project, index) => ...)` 인덱스를 넘긴다. 프로젝트별 색상 컬럼은 만들지 않는다.

## 9. 원자적 저장

`neon-http`는 interactive transaction이 없으므로(0절 9번) 모든 다중 문장 쓰기를 `db.batch([...])`로 묶는다. batch는 HTTP 트랜잭션 엔드포인트로 한 번에 전송되어 중간 실패 시 전체가 롤백된다.

- 프로젝트 생성: 서비스가 `crypto.randomUUID()`로 프로젝트 id를 미리 만들고 `batch([insert projects (sort_order는 서브쿼리), insert experiences])`. `sort_order` 값은 `(select coalesce(max(sort_order), -1) + 1 from projects)` SQL 조각으로 한 문장 안에서 정한다. experiences가 0건이면 해당 insert 문장을 배열에서 뺀다(빈 `values()`는 에러).
- 프로젝트 수정: 먼저 `select id from projects where slug = ?`로 id를 얻는다(없으면 `NotFoundError`). 이어서 `batch([update projects set ... where id = ?, delete from experiences where project_id = ?, insert experiences ...])`. 첫 select는 batch 밖이지만 id는 slug에 대해 불변이고, 중간에 프로젝트가 삭제되면 FK 위반으로 batch 전체가 실패(500이 아닌 `NotFoundError`로 변환 가능한 경우에만 변환, 아니면 500)한다.
- 프로젝트 삭제: `delete from projects where slug = ? returning id` 단일 문장(cascade). 반환 0행이면 `NotFoundError`.
- 순서 변경: `select slug from projects`로 현재 집합을 읽어 요청 `slugs`와 비교(`OrderMismatchError`), 같으면 `batch([update ... set sort_order = i where slug = s, ...])`. 비교와 batch 사이의 경쟁은 소유자 1명 전제로 허용한다(ceiling: 동시 편집 충돌 감지는 범위 밖).
- 프로필 수정: 단일 `update profile ... where id = 1 returning`. 0행이면 `PortfolioNotSeededError`.
- slug 중복은 DB UNIQUE 위반(`23505`)이 최종 판정이다. batch 안에서 발생하면 batch 전체가 롤백되고 서비스가 `SlugConflictError`로 변환한다. 사전 조회는 하지 않는다.
- `updated_at`은 수정 문장에서 `new Date()`로 명시 설정한다(DB 트리거 없음).

## 10. 영향받는 기존 테스트

새 테스트는 이 Task 범위가 아니다. 깨질 가능성이 있는 기존 테스트만 적는다.

| 테스트 | 영향 | 갱신 방향 |
| --- | --- | --- |
| `tests/e2e/real-project-data.spec.ts` | `../../src/constants/portfolio-data`를 import하므로 파일 이동으로 깨진다. 렌더 결과 비교 의도는 유지된다. | import 경로를 `src/db/seed-data`로 변경(필드명 `id`, `title`, `experiences` 유지). `profileData` export 이름도 seed-data에서 유지. |
| `tests/e2e/navigation.spec.ts` | 정적 페이지 이동 검증. DB 없이 `pnpm build`/`pnpm start`가 안 되므로 빌드 환경에 `DATABASE_URL`(seed 완료된 DB)이 필요하다. | 코드 변경 없음. 실행 환경 요건(12절). |
| `__tests__/lint/*` | 하네스 린트 테스트. `source-rules.test.ts`가 새 소스의 주석 규칙(명사형 종결, em-dash, 줄바꿈)을 검사한다. | 신규 파일 주석을 규칙에 맞춘다. 테스트 코드 변경 없음. |
| `.github/workflows/ci.yml` | `pnpm build`와 `pnpm test:e2e` 단계가 DB 없이 실패한다. | 12절 참조(사용자 조치 필요). |

- `pnpm exec vitest run`(폴더 지정 없음)의 `__tests__/**/*.test.ts` 범위에는 위 외 영향 테스트가 없다.

## 11. T05/T06 파일 소유 경계

두 구현자는 서로 다른 worktree에서 병렬 작업한다. 같은 파일을 두 명이 수정하지 않는다. 아래 표에 없는 파일은 수정하지 않고 orchestrator에게 문의한다. T05는 7/4절의 타입과 서비스 시그니처를 계약으로 가정해 코드를 쓰며, T06이 먼저 병합되어야 `pnpm type-check`가 통과한다(T05 단독 worktree에서는 타입 에러가 날 수 있으나 파일 생성은 T06 몫이다).

### T06 (backend) 단독 소유

| 경로 | 내용 |
| --- | --- |
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`(필요 시) | 의존성/스크립트 |
| `drizzle.config.ts`, `drizzle/**` | 설정, 마이그레이션 산출물 |
| `src/db/index.ts`, `src/db/schema/portfolio.ts`, `src/db/seed.ts`, `src/db/seed-data.ts` | DB, seed(`git mv src/constants/portfolio-data.ts src/db/seed-data.ts`) |
| `src/constants/portfolio-data.ts` | 위 이동으로 삭제 |
| `src/constants/http-status.ts` | `HttpStatus` |
| `src/types/api-types.ts`, `src/types/portfolio.ts`, `src/types/next-auth.d.ts` | 공통 타입 |
| `src/schemas/portfolio.schema.ts` | zod 스키마와 입력 타입, 길이 상수 |
| `src/services/portfolio/portfolio-service.ts`, `portfolio-admin-service.ts` | 조회/쓰기 서비스 |
| `src/lib/auth/auth-options.ts`, `admin-allowlist.ts`, `require-admin.ts`, `admin-route.ts` | 인증/가드 |
| `src/lib/api/api-error.ts`, `response.ts`, `parse-body.ts` | API 공통 |
| `src/proxy.ts` | 인증 1차 방어, 헤더 |
| `src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/admin/**/route.ts` | Route Handler |
| `.env.example`, `knip.json`(필요 시), `.github/workflows/ci.yml`(env 추가 시) | 환경/도구 설정 |
| `next.config.ts` | 변경 필요 없음(썸네일은 로컬 경로만). 변경이 필요해지면 T06이 담당 |
| `tests/e2e/real-project-data.spec.ts` | 10절의 import 경로 갱신(기존 테스트 갱신만) |

### T05 (frontend) 단독 소유

| 경로 | 내용 |
| --- | --- |
| `src/app/admin/**` | admin 페이지, layout(noindex metadata, `requireAdminPage` 호출), 로그인 페이지 |
| `src/components/admin/**` | admin 전용 컴포넌트 |
| `src/lib/admin-client/**` | 클라이언트 `fetch` 래퍼(`CustomData`/`ApiErrorBody` 파싱, 401 시 `/admin/login` 이동, 입력 유실 경고). 클라이언트 전용이므로 `server-only` 금지 |
| `src/app/layout.tsx`, `page.tsx`, `projects/page.tsx`, `about/page.tsx`, `contact/page.tsx`, `blog/page.tsx`, `work/[id]/page.tsx` | 8절 전환 |
| `src/app/error.tsx` | 신규 |
| `src/components/layout/navbar.tsx`, `footer.tsx` | props 전환 |
| `src/components/common/hero-section.tsx`, `about-section.tsx`, `project-card.tsx`, `talk-preview.tsx` | props 전환, 필요 시 |
| `src/constants/project-card-theme.ts` | 팔레트 순환 |
| `src/app/globals.css`, `src/components/ui/**` | admin 스타일 토큰/버튼 변형이 필요할 때만 수정 |

### 공유 규칙

- T05는 T06 소유 파일을 import만 한다. 시그니처를 바꿔야 하면 수정하지 말고 orchestrator에게 요청한다.
- T06이 7/4절 계약(타입, 서비스 시그니처, 에러 코드, 경로, 본문 스키마)을 바꾸면 반드시 이 문서를 먼저 갱신해 알린다.
- `docs/**`, `.claude/**`, `.codex/**`, `__tests__/**`는 양쪽 모두 수정하지 않는다.
- 새 테스트는 어느 쪽도 작성하지 않는다(qa-engineer 담당).

## 12. 열린 이슈와 사용자 조치

1. CI와 빌드: 정적 생성이 빌드 시 DB를 조회하므로 `pnpm build`가 `DATABASE_URL` 없이 실패한다. `ci.yml`은 `DATABASE_URL`을 GitHub Secret에서 주입해야 하고, 빌드가 읽을 DB에는 seed가 끝나 있어야 한다(CI 전용 Neon 브랜치 권장). Secret 등록은 사용자 조치다. Vercel Preview/Production 환경변수도 동일(사용자 설정).
2. 포크 PR 등 시크릿 없는 CI 실행은 빌드가 실패한다. 현재 저장소는 단일 소유자 운영이라 허용하되, 문제 시 결정이 필요하다.
3. `docs/agent-rules/react-query.md`와 `project-structure.md`는 `axios`의 `HttpStatusCode` 사용을 전제한다. 이 저장소는 `HttpStatus` 대체 상수를 쓰므로 규칙 문서 갱신 여부를 orchestrator가 판단한다.
4. 루트 레이아웃(Navbar, Footer)이 `/admin/**`에도 적용된다. admin에서 숨길지는 design-spec 결정이며, 숨기려면 route group(`(site)`) 이동이 필요해 T05 파일 변경이 커진다. 기본 가정: 숨기지 않는다.
5. `ADMIN_GITHUB_ID` 값(소유자 숫자 id)은 사용자가 제공한다. GitHub OAuth App(로컬/Production)은 사용자가 생성한다.
6. Neon 프로젝트/DB 생성과 `.env.local` 기록은 게이트 결정에 따라 에이전트(Neon MCP)가 수행한다. 구현 시작 전 orchestrator가 먼저 수행해 `DATABASE_URL`이 있어야 T06이 `db:generate`(무접속 가능)와 `db:migrate`, `db:seed`를 검증할 수 있다.
