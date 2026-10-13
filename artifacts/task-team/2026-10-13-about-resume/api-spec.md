# api-spec: about 이력서 재구성 (resume_entries + profile.tools)

- 작성일: 2026-10-13
- 작성자: Backend Developer (T04, 명세만. 코드·설정·DB 변경 없음)
- 입력: `requirements.md`, `00-input.md`
- 기준 코드: `src/db/schema/portfolio.ts`, `src/services/portfolio/*`, `src/schemas/portfolio.schema.ts`, `src/app/api/admin/{talks,talk-order,profile}/`, `src/lib/api/*`, `tests/e2e/fixtures/seed.ts`
- 테스트: 새 테스트 작성 담당은 배정하지 않는다(8절은 영향받는 기존 테스트 목록만)

## 목차

- [1. 확인한 사실](#1-확인한-사실)
- [2. DB 스키마와 마이그레이션](#2-db-스키마와-마이그레이션)
- [3. 공유 계약: 타입, 상수, Zod](#3-공유-계약-타입-상수-zod)
- [4. 서비스 함수](#4-서비스-함수)
- [5. API 엔드포인트](#5-api-엔드포인트)
- [6. 시드와 데이터 변경 절차](#6-시드와-데이터-변경-절차)
- [7. 보안과 캐시](#7-보안과-캐시)
- [8. 영향받는 기존 테스트](#8-영향받는-기존-테스트)
- [9. T05/T06 파일 소유 경계](#9-t05t06-파일-소유-경계)
- [10. 열린 이슈와 orchestrator 조치](#10-열린-이슈와-orchestrator-조치)

## 1. 확인한 사실

1. `package.json`에 `db:seed`는 없다. 있는 것은 `db:seed:e2e`(`tests/e2e/fixtures/seed.ts`, `E2E_DATABASE_URL` 전용)뿐이다. 요구사항의 "`db:seed`에 추가"는 운영용 별도 스크립트 신설로 해석한다(6절).
2. `scripts/migrate.mjs --build`는 Vercel Preview/Production, CI 빌드에서 `DATABASE_URL`에 마이그레이션을 자동 적용한다. `develop` push만으로 운영 DB에 마이그레이션이 적용될 수 있다(10절).
3. 서버 DB 드라이버는 `neon-http`다. `db.transaction()`은 없고 `db.batch([...])`만 원자적이다. 기존 `reorderTalks`, `createTalk`(advisory lock + 개수 가드)가 이 방식이다.
4. 기존 오류 코드(`ORDER_MISMATCH`, `NOT_FOUND`, `LIMIT_EXCEEDED`, `VALIDATION_FAILED`)와 `apiErrors`, `OrderMismatchError`, `NotFoundError`, `LimitExceededError`는 그대로 재사용한다. 새 오류 코드는 없다. `SLUG_CONFLICT`는 이력 항목에 해당하지 않는다(slug 없음).
5. 기존 `profile.skills`(시드 이전 운영 값 추정): React, Vue 3, TypeScript, Next.js, TanStack Query, Zustand, Pinia, Tailwind CSS, Playwright (`00-input.md`).

## 2. DB 스키마와 마이그레이션

### 2.1 `src/db/schema/portfolio.ts` 변경 (추가만)

```ts
// profile 테이블에 컬럼 1개 추가
tools: text("tools").array().notNull().default(sql`'{}'::text[]`),

export const resumeEntries = pgTable(
  "resume_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    sortOrder: integer("sort_order").notNull(),
    period: text("period").notNull().default(""),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    details: text("details").array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "resume_entries_kind_valid",
      sql`${table.kind} in ('work','education','activity','award','certification','language')`,
    ),
    index("resume_entries_order_idx").on(
      table.kind,
      table.sortOrder,
      table.createdAt,
      table.id,
    ),
  ],
);
```

결정 사항:

- `period`, `subtitle`은 nullable이 아니라 `not null default ''`다. 빈 문자열이 "없음"이며 읽기 매핑이 단순하다(null 변환 없음). 빈 값이면 UI가 해당 칸을 숨긴다.
- `kind` check의 값 목록은 3절 `RESUME_KINDS`와 같아야 한다. schema 파일에 리터럴로 두고 상수와 동기화한다는 주석을 단다. 어긋나면 insert가 check 위반으로 실패해 드러난다.
- 날짜 컬럼, 유니크 제약, FK는 두지 않는다(요구사항 F3 edge case).
- 식별자는 `resumeEntries`, 테이블 `resume_entries`다. `experience`라는 단어를 쓰지 않는다.

### 2.2 마이그레이션 생성

1. schema 수정 후 `pnpm db:generate`(`drizzle-kit generate`)로 `drizzle/0001_*.sql`과 `drizzle/meta/*`를 생성해 커밋 대상에 포함한다. 파일명은 drizzle이 정한 이름을 그대로 쓴다.
2. 생성된 SQL이 `create table "resume_entries"`, check, index, `alter table "profile" add column "tools" text[] default '{}'::text[] not null`만 포함하는지 확인한다. 추가 외의 drop/alter가 있으면 중단하고 보고한다.
3. 구현자는 `pnpm db:migrate`를 실행하지 않는다(운영 DB 접근 금지). 적용은 orchestrator가 10절 절차로 수행한다.
4. `drizzle.config.ts`는 `DATABASE_URL` 없이도 `db:generate`가 동작한다(접속 불필요).

## 3. 공유 계약: 타입, 상수, Zod

frontend는 아래 이름·모양을 그대로 가정하고 작업한다. 정의 파일은 모두 backend 소유다.

### 3.1 상수: `src/constants/resume.ts` (backend 신규)

```ts
export const RESUME_KINDS = [
  "work", "education", "activity", "award", "certification", "language",
] as const;
export type ResumeKind = (typeof RESUME_KINDS)[number];
```

- 섹션 라벨(`.experience` 등)과 admin 한국어 라벨은 UI 결정이므로 frontend가 자신의 파일에서 `Record<ResumeKind, string>`으로 정의한다. 상수 파일에는 넣지 않는다.
- `RESUME_KINDS` 순서는 화면 섹션 순서와 무관하다.

### 3.2 타입: `src/types/portfolio.ts` (backend가 추가)

```ts
import type { ResumeKind } from "@/constants/resume";

export interface Profile {
  /* 기존 필드 유지 */
  skills: string[];
  tools: string[]; // 추가
}

export interface ResumeEntry {
  id: string; // DB uuid, 렌더 key와 API 경로 식별자
  kind: ResumeKind;
  period: string; // 입력 원문 그대로, 없으면 ""
  title: string;
  subtitle: string; // 없으면 ""
  details: string[]; // 없으면 []
}

// 모든 kind 키가 항상 존재하며, 각 배열은 sort_order, created_at, id 순
export type ResumeByKind = Record<ResumeKind, ResumeEntry[]>;
```

`ResumeEntry`에 `sortOrder`와 날짜는 노출하지 않는다.

### 3.3 Zod: `src/schemas/portfolio.schema.ts` (backend가 추가/수정)

```ts
const PERIOD_MAX = 100;
// kind별 생성 상한이자 정렬 요청 id 상한
export const RESUME_KIND_MAX = LIST_MAX;

// 빈 문자열 허용, trim 적용
const optionalShortText = z
  .string()
  .trim()
  .max(SHORT_TEXT_MAX, `${SHORT_TEXT_MAX}자 이하로 입력해 주세요`);

export const profileInputSchema = z.strictObject({
  /* 기존 */
  skills: stringList,
  tools: stringList, // 추가, 빈 배열 허용, 필수 키
});

export const resumeEntryUpdateInputSchema = z.strictObject({
  period: z
    .string()
    .trim()
    .max(PERIOD_MAX, `${PERIOD_MAX}자 이하로 입력해 주세요`),
  title: shortText,
  subtitle: optionalShortText,
  details: stringList, // 0개 이상, 항목은 shortText, 최대 50개
});

// kind는 생성 시에만 받고 수정으로 바꾸지 않는다(다른 섹션 이동은 삭제 후 재생성)
export const resumeEntryCreateInputSchema = resumeEntryUpdateInputSchema.extend(
  { kind: z.enum(RESUME_KINDS) },
);

export const resumeOrderInputSchema = z.strictObject({
  kind: z.enum(RESUME_KINDS),
  ids: z
    .array(z.uuid("올바른 id가 아닙니다"))
    .min(1, "1개 이상 필요합니다")
    .max(RESUME_KIND_MAX)
    .refine((v) => new Set(v).size === v.length, "중복된 항목이 있습니다"),
});

export type ResumeEntryCreateInput = z.infer<typeof resumeEntryCreateInputSchema>;
export type ResumeEntryUpdateInput = z.infer<typeof resumeEntryUpdateInputSchema>;
```

- 미사용 export는 knip이 막으므로 `RESUME_KIND_MAX`는 서비스 가드가 쓰고, 타입은 서비스가 쓴다.
- 허용 외 `kind`, 알 수 없는 키(strictObject), 빈 `title`은 `VALIDATION_FAILED`(400)이다.
- 항목이 0개인 kind에 정렬 요청이 오면 min(1) 위반으로 400이다. UI는 항목이 1개 이하이면 정렬 저장을 호출하지 않아도 된다.

## 4. 서비스 함수

### 4.1 읽기: `src/services/portfolio/portfolio-service.ts`에 추가 (`cache` 패턴)

| 함수 | 시그니처 | 설명 |
| --- | --- | --- |
| `toResumeEntry` | `(row: ResumeRow) => ResumeEntry` | sort_order, 날짜 제외 매핑. 쓰기 서비스가 재사용하므로 export |
| `getResumeByKind` | `cache(async (): Promise<ResumeByKind>)` | 쿼리 1회(`order by kind, sort_order, created_at, id`)로 가져와 메모리에서 kind별로 묶음. 모든 kind 키를 빈 배열로 초기화 |

- 공개 about와 admin 이력 목록 모두 `getResumeByKind`를 쓴다(raw 구분 없음, URL 필드가 없어 필터할 것이 없다).
- `toProfile`에 `tools: row.tools` 추가. `getProfile`의 `PortfolioNotSeededError` 동작 유지.
- 항목 편집 화면의 단건 조회 함수는 두지 않는다. `getResumeByKind()`를 평탄화해 id로 찾고 없으면 `notFound()`를 호출한다(frontend 판단).

### 4.2 쓰기: `src/services/portfolio/portfolio-admin-service.ts`에 추가

| 함수 | 시그니처 | 동작 |
| --- | --- | --- |
| `updateProfile` | 기존 | `...input` 스프레드로 `tools`가 자동 반영됨. 코드 변경 없음(스키마만 확장) |
| `createResumeEntry` | `(input: ResumeEntryCreateInput) => Promise<ResumeEntry>` | 단일 batch: advisory xact lock(`7_301_003`) + 해당 kind 개수가 `RESUME_KIND_MAX` 이상이면 0으로 나누기 가드 + insert(`sort_order = coalesce(max(sort_order) where kind = $kind, -1) + 1`) returning. 가드 실패는 `LimitExceededError` |
| `updateResumeEntry` | `(id: string, input: ResumeEntryUpdateInput) => Promise<ResumeEntry>` | `where id` update, `updated_at` 갱신. 0행이면 `NotFoundError`. id가 uuid 형식이 아니면 DB 호출 없이 `NotFoundError` |
| `deleteResumeEntry` | `(id: string) => Promise<void>` | `where id` delete returning. 0행이거나 uuid 형식이 아니면 `NotFoundError`. 삭제 후 sort_order 재번호는 하지 않는다(상대 순서만 의미, 간격 허용) |
| `reorderResumeEntries` | `(kind: ResumeKind, ids: string[]) => Promise<void>` | 해당 kind의 현재 id 전체를 select해 `assertSameSet`(같은 파일의 기존 함수)로 비교. 불일치면 `OrderMismatchError`. 일치하면 batch로 `sort_order = index` update(`where id = $id and kind = $kind`) |

- id uuid 형식 검사는 서비스 상단에서 `z.uuid().safeParse` 한 번으로 한다(경로 파라미터 검증용, 별도 export 없음).
- `reorderResumeEntries`는 `reorderTalks`와 같은 경합 한계를 갖고, 편집자 1명 운영 전제로 같은 주석을 단다.
- 동시 생성으로 sort_order가 같아져도 읽기 정렬의 `created_at, id` 타이브레이커로 결과가 고정된다.
- 현재 `limitGuard`는 테이블 전체 count를 센다. 이력용은 kind 조건이 필요하므로 `limitGuard`를 일반화하거나 이력 전용 가드를 인라인으로 둔다. 기존 projects/talks 동작은 바꾸지 않는다(구현자 판단, 기존 `portfolio-admin-service.test.ts`가 회귀 기준).

## 5. API 엔드포인트

모든 라우트는 `adminRoute`로 감싸고 `parseJsonBody` + `ok`를 쓴다. 성공 후 `revalidatePath("/", "layout")`. 응답 본문은 `CustomData<T>`(`{ data, status }`), 오류는 기존 `ApiErrorBody`(`{ code, message, fieldErrors? }`). 상태 코드는 `HttpStatusCode` enum.

| 메서드 | 경로 | 요청 본문 | 성공 응답 | 파일 |
| --- | --- | --- | --- | --- |
| POST | `/api/admin/resume-entries` | `ResumeEntryCreateInput` | `CustomData<ResumeEntry>`, `HttpStatusCode.Created` | `src/app/api/admin/resume-entries/route.ts` |
| PUT | `/api/admin/resume-entries/[id]` | `ResumeEntryUpdateInput` | `CustomData<ResumeEntry>`, `HttpStatusCode.Ok` | `src/app/api/admin/resume-entries/[id]/route.ts` |
| DELETE | `/api/admin/resume-entries/[id]` | 없음 | `CustomData<{ id: string }>`, `HttpStatusCode.Ok` | 같은 파일 |
| PUT | `/api/admin/resume-order` | `{ kind: ResumeKind; ids: string[] }` | `CustomData<{ kind: ResumeKind; ids: string[] }>`, `HttpStatusCode.Ok` | `src/app/api/admin/resume-order/route.ts` |
| PUT | `/api/admin/profile` | 기존 + `tools: string[]` | `CustomData<Profile>`(`tools` 포함) | 기존 파일, 코드 변경 없음 |

오류 응답(전 엔드포인트 공통 + 개별):

| 상황 | code | HttpStatusCode |
| --- | --- | --- |
| 세션 없음 | `UNAUTHORIZED` | `Unauthorized` |
| allowlist 밖 계정 | `FORBIDDEN` | `Forbidden` |
| Origin 불일치 | `FORBIDDEN_ORIGIN` | `Forbidden` |
| Zod 검증 실패(허용 외 kind, 빈 title, 길이 초과, 알 수 없는 키) | `VALIDATION_FAILED` + `fieldErrors` | `BadRequest` |
| 본문 크기 초과, content-type 오류 | 기존 `parseJsonBody` 규칙(`PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`) | 기존과 동일 |
| id 형식 오류 또는 없는 id (PUT/DELETE) | `NOT_FOUND` | `NotFound` |
| kind별 개수 상한 초과 (POST) | `LIMIT_EXCEEDED` | `Conflict` |
| 정렬 id 집합이 kind의 현재 집합과 다름 | `ORDER_MISMATCH` | `Conflict` |
| 프로필 미시드 (PUT profile) | `NOT_SEEDED` | `Conflict` |
| 그 외 | `INTERNAL_ERROR` | `InternalServerError` |

- 서비스 예외를 `ApiError`로 바꾸는 매핑(`OrderMismatchError`, `NotFoundError`, `LimitExceededError`)은 `adminRoute` 내부의 기존 것을 그대로 쓴다. 신규 매핑은 없다.
- `ORDER_MISMATCH` 시 클라이언트는 기존 정렬 저장 흐름의 새로고침 안내를 그대로 쓴다.
- 요청 예시:

```json
POST /api/admin/resume-entries
{ "kind": "work", "period": "2026.08 - 현재", "title": "Frontend Developer",
  "subtitle": "빅웨이브로보틱스", "details": ["휴머노이드 로봇 공정 현황 모니터링 대시보드 개발"] }

PUT /api/admin/resume-order
{ "kind": "work", "ids": ["<uuid>", "<uuid>", "<uuid>"] }
```

## 6. 시드와 데이터 변경 절차

구현자는 아래 스크립트를 작성만 하고 실행하지 않는다. 운영 DB(Neon) 적용(마이그레이션, 시드, skills/tools 갱신)은 orchestrator가 DB 작업 중인 다른 세션과 메시지로 조율한 뒤 직접 실행한다.

### 6.1 스크립트: `scripts/resume-data.ts` (backend 신규, 실행은 `tsx`)

- 실행: `package.json`에 `"db:resume:seed": "tsx --env-file-if-exists=.env.local scripts/resume-data.ts seed"`, `"db:resume:profile": "tsx --env-file-if-exists=.env.local scripts/resume-data.ts profile"`.
- 대상 DB는 `DATABASE_URL`. `tests/e2e/fixtures/seed.ts`처럼 접속 호스트명을 출력하고 y 입력(또는 `--yes`)을 받아야 진행한다. `E2E_DATABASE_URL`과 섞지 않는다.
- knip: `scripts/*.mjs`만 entry라서 `.ts` 스크립트가 미사용 파일로 잡히면 `knip.json`의 `entry`에 `scripts/resume-data.ts`를 추가한다. package.json script 참조만으로 통과하면 추가하지 않는다.

### 6.2 `seed` 서브커맨드 (이력서 항목 추가, 멱등)

1. `resume_entries`에 행이 하나라도 있으면 아무것도 하지 않고 "건너뜀(이미 존재)"만 출력한다. admin에서 섹션을 전부 지운 뒤 재실행해도 되살리지 않도록, kind별이 아니라 테이블 단위로 판정한다.
2. 비어 있으면 단일 `db.insert(resumeEntries).values([...])` 한 문장으로 전부 넣는다(원자적). `sort_order`는 kind별로 이력서 표기 순서(위에서 아래)대로 0부터 부여한다.
3. 운영 편집 데이터를 `update`/`delete`하지 않는다. `profile`은 이 서브커맨드가 건드리지 않는다.
4. 데이터(원문은 `00-input.md`, 학점 제외, `period`는 원문 표기):

| kind | period | title | subtitle | details |
| --- | --- | --- | --- | --- |
| work | 2026.08 - 현재 | Frontend Developer | 빅웨이브로보틱스 | 휴머노이드 로봇 공정 현황 모니터링 대시보드 개발 / 물류 운반 로봇 관제 시스템 및 리포트 기능 개발 (2항목) |
| work | 2024.07 - 2026.07 | Frontend Developer | 웨이센 | 테스트 자동화 도입으로 배포 프로세스 개선 / 렌더링 성능 최적화로 초기 로딩 시간 42% 단축 / AI 내시경 리포트 생성 시스템 구축 / MCP 기술 동향 분석 및 발표 (4항목) |
| work | 2024.02 - 2024.06 | Frontend Developer (Intern) | 웨이센 | AI 호흡기건강 확인서비스 WAYMED Cough 단독 개발 (1항목) |
| education | 졸업 2024.08 | 동국대학교 학사 | 컴퓨터정보통신공학부 컴퓨터공학전공 | 없음 |
| activity | 2025.12 - 현재 | 디프만 코어 (Depromeet Core) 2기 | "" | 없음 |
| activity | 2025.08 - 현재 | 디프만 (Depromeet) 17기 | "" | 없음 |
| activity | 2024.02 - 2024.08 | 9oormthon Univ. 2기 | "" | 없음 |
| activity | 2023.07 - 2024.01 | 패스트캠퍼스 X 야놀자 프론트엔드 부트캠프 1기 | "" | 없음 |
| activity | 2023.07 - 2023.08 | 동국대학교 SW코딩역량강화캠프 | "" | 없음 |
| activity | 2023.01 - 2023.02 | 42 Seoul | "" | 없음 |
| activity | 2022.09 - 2022.12 | DoDream 학습동아리 | "" | 없음 |
| award | "" | 국민행복 서비스 발굴 · 창업 경진대회 | 사회보장정보원 | 장려상 (한국노인개발원장상) (1항목) |
| certification | 2024 | 정보처리기사 | "" | 없음 |
| language | 2024 | TOEIC SPEAKING | IH(150) | 없음 |

경력 3, 학력 1, 활동 7, 수상 1, 자격 1, 어학 1건이 되어야 한다. 문구 전사에서 모호한 부분은 `00-input.md` 원문을 우선한다.

### 6.3 `profile` 서브커맨드 (skills/tools 갱신, 시드와 분리)

시드와 별도 실행 단위다. 운영 편집을 덮어쓰지 않도록 조건부 update 두 개만 실행한다.

1. skills: `update profile set skills = <새 10개> where id = 1 and skills = <1절 5번의 기존 9개 배열>`. 현재 값이 기존 9개와 정확히 같을 때만 갱신한다. 이미 갱신됐거나 사용자가 admin에서 바꿨으면 0행이라 "건너뜀(현재 값이 기대와 다름)"을 출력한다(멱등).
2. tools: `update profile set tools = <새 5개> where id = 1 and tools = '{}'`. 비어 있을 때만 채운다.
3. 새 skills(10개, 순서 고정): React, Vue.js, TypeScript, Next.js, Vite, Tanstack Query, Emotion, TailwindCSS, Zustand, Playwright. tools(5개): Git/Github, Jira, Slack, Notion, Figma.
4. 기존 9개 값은 `00-input.md` 기준 추정이다. orchestrator가 적용 직전 운영 값을 읽어 확인하고 다르면 스크립트의 기대값 상수를 맞춘다. 불일치 시 갱신하지 않으므로 안전한 쪽으로 실패한다.

### 6.4 e2e 시드 갱신 (`tests/e2e/fixtures/seed.ts`, `portfolio.ts`)

- `profileData`에 `tools` 소수 값(예: `["Git/Github", "Jira"]`)을 추가한다.
- e2e 테스트 DB용 이력 fixture(kind별 1~2건, period 없는 항목 1건 포함)를 `portfolio.ts`에 추가하고 `seed.ts`에 기존 패턴("행이 있으면 건너뜀")으로 insert를 넣는다.
- 이 파일들은 backend 소유다. e2e DB 적용도 구현자는 하지 않는다.

## 7. 보안과 캐시

- 모든 쓰기는 `adminRoute`(세션 + allowlist + Origin 검사)를 거친다. 인증 없는 쓰기 엔드포인트는 없다.
- SQL은 drizzle 파라미터 바인딩만 쓴다. 문자열 보간 SQL을 만들지 않는다(`sql` 템플릿의 값 바인딩만 허용).
- 이력 텍스트에 URL/HTML 필드가 없다. frontend는 공개 렌더에서 `dangerouslySetInnerHTML`을 쓰지 않고 텍스트 노드로만 출력한다.
- 쓰기 성공 후 `revalidatePath("/", "layout")`로 about를 포함해 재검증한다(기존과 동일).
- 신규 환경변수 없음. 신규 의존성 없음.

## 8. 영향받는 기존 테스트

새 테스트는 이 명세에서 배정하지 않는다. 동작 변경으로 깨질 수 있는 기존 파일만 나열한다.

| 파일 | 영향 | 갱신 내용 |
| --- | --- | --- |
| `__tests__/schemas/portfolio-schema.test.ts` | `profileInputSchema`가 `tools`를 필수 키로 요구 | 유효 입력 fixture에 `tools: []` 추가 |
| `__tests__/utils/portfolio-read-filter.test.ts` | `toProfile` 입력 row에 `tools` 추가 | row fixture에 `tools` 추가, 기대값 의도 유지 |
| `__tests__/utils/portfolio-admin-service.test.ts` | `limitGuard`를 일반화하면 projects/talks 가드 회귀 가능 | 일반화했다면 기존 단언을 유지한 채 통과 확인 |
| `tests/e2e/fixtures/portfolio.ts`, `seed.ts` | `profileData.tools`, 이력 fixture 추가 | 6.4절 |
| `tests/e2e/navigation.spec.ts` | `/about` 이동 확인, `profileData.skills[0]` 사용 | about 구조 변경 후에도 단언이 유지되는지 확인, 필요 시 갱신 |
| `__tests__/api/admin-route.test.ts` | 변경 없음 예상 | 회귀 확인만 |

## 9. T05/T06 파일 소유 경계

두 담당은 병렬로 각자 worktree에서 일하며 같은 파일을 수정하지 않는다. 공유 파일(타입, 상수, API 경로)은 backend만 수정한다. frontend는 backend 파일을 만들거나 고치지 않는다. frontend worktree에는 backend 산출물(타입, `getResumeByKind`)이 아직 없으므로 type-check 통과는 병합 후 orchestrator 재검증에서 확인한다. frontend는 3절과 5절 계약만 믿고 작성한다.

### backend (T06) 소유

- `src/db/schema/portfolio.ts`, `drizzle/**`
- `src/constants/resume.ts` (신규)
- `src/types/portfolio.ts` (`Profile.tools`, `ResumeEntry`, `ResumeByKind`)
- `src/schemas/portfolio.schema.ts`
- `src/services/portfolio/portfolio-service.ts`, `portfolio-admin-service.ts`
- `src/app/api/admin/resume-entries/**`, `src/app/api/admin/resume-order/**`
- `scripts/resume-data.ts`, `package.json`(scripts 항목만), 필요 시 `knip.json`
- `tests/e2e/fixtures/portfolio.ts`, `tests/e2e/fixtures/seed.ts`
- 기존 테스트 갱신 중 `__tests__/schemas/*`, `__tests__/utils/*` (8절)

### frontend (T05) 소유

- `src/app/(public)/about/page.tsx` 및 about 전용 하위 컴포넌트
- `src/app/admin/(console)/resume/**` (목록, 새 항목, 항목 편집 페이지)
- `src/components/admin/**`의 이력 관련 신규 컴포넌트(이력 폼, 이력 목록), `admin-nav.tsx`(탭 추가: href `/admin/resume`), `profile-form.tsx`(tools용 `StringListEditor` 1개 추가, 저장 본문에 `tools` 포함), `sortable-list.tsx`(id 키 일반화 또는 얇은 분리, 판단은 frontend)
- `src/components/common/**`의 about용 섹션 컴포넌트(`ResumeSection` 등)
- 섹션 라벨과 admin 라벨 상수는 frontend 파일 안에서 정의
- `tests/e2e/navigation.spec.ts`의 about 관련 단언 갱신이 필요하면 frontend가 수정(8절)

### 겹침 방지 규칙

- 서로의 소유 파일에서 필요한 변경이 생기면 직접 고치지 않고 orchestrator에게 보고한다.
- `package.json`은 backend만 수정한다(frontend는 의존성 추가 금지).
- frontend가 의존하는 backend 심볼(고정 계약): `RESUME_KINDS`, `ResumeKind`(`@/constants/resume`), `Profile.tools`, `ResumeEntry`, `ResumeByKind`(`@/types/portfolio`), `getResumeByKind`(`@/services/portfolio/portfolio-service`), `ResumeEntryCreateInput`/`ResumeEntryUpdateInput` 모양(3.3절), 5절의 API 경로/본문/응답. 이름이나 모양을 바꿔야 하면 backend가 orchestrator를 통해 알린다.
- admin 클라이언트 호출은 기존 `src/lib/admin-client/admin-request.ts` 패턴으로 위 경로를 호출하고, 경로는 호출부에 리터럴로 쓴다(공유 상수 파일을 만들지 않는다).

## 10. 열린 이슈와 orchestrator 조치

1. 자동 마이그레이션 위험: `scripts/migrate.mjs --build`가 Preview/Production 빌드에서 마이그레이션을 자동 실행한다. Preview와 Production이 같은 DB면 `develop` push 시점에 운영 DB에 `resume_entries`와 `profile.tools`가 생성된다. 추가만이라 기존 화면은 안전하지만, push 시점을 데이터 적용 순서와 다른 세션 조율에 맞춰야 한다.
2. 적용 순서 권장: (a) 다른 세션과 조율 (b) `pnpm db:migrate`(DATABASE_URL 확인 후) (c) `pnpm db:resume:seed` (d) `pnpm db:resume:profile` (e) 배포. 빈 `resume_entries`로 배포해도 about는 깨지지 않아야 한다(요구사항 F5-4).
3. 6.3절의 기존 skills 9개 값은 추정이다. 적용 직전 운영 값을 읽어 확인한다.
4. 코드 롤백 시 `profile.tools` 컬럼과 `resume_entries` 테이블은 남아도 무해하다(추가만이므로 down 마이그레이션은 두지 않는다).
