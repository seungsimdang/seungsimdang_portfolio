# T04 API 명세 - 프로젝트 썸네일 확장

- 작업 브랜치: `feature/project-thumbnails`
- 입력: `artifacts/task-team/requirements.md` (11절 확정 결정 우선)
- 상태: 명세만 작성함. 코드, DB, 마이그레이션 파일은 아직 만들지 않음.
- 새 엔드포인트는 없음. 기존 `POST /api/admin/projects`, `PUT /api/admin/projects/[slug]`의 입출력과 공개 조회 타입만 바뀜.

## 1. 핵심 설계 요약

- `projects.thumbnail`(text)을 `thumbnails text[]`(기본 목록)와 `mobile_thumbnails text[]`(모바일 목록)로 교체한다. 배열 순서가 전환 순서다.
- 모바일 목록이 비면 클라이언트가 기본 목록을 쓴다. 이 폴백은 DB가 아니라 표시 계층(`ProjectCard`)의 규칙이다.
- 마이그레이션은 expand/contract 2단계(0005 추가+이전, 0006 `thumbnail` 제거)로 나눈다. 빌드 시 자동 마이그레이션(`scripts/migrate.mjs --build`) 때문에 한 번에 제거하면 운영 중인 main 코드가 깨진다(2절).
- Zod: 원소는 `isValidThumbnail`, 목록당 최대 10장, 목록 내 중복은 거부, 모바일만 있고 기본이 빈 저장은 거부(스키마 + 서비스 + DB check 3중).
- 수정 API는 `thumbnails`, `mobileThumbnails`를 각각 선택 필드로 받는다. 생략하면 해당 목록 유지, 빈 배열이면 비움.
- 제거된 이미지 Blob 정리는 기존과 같은 방식(저장 성공 후 best-effort, 다른 프로젝트가 참조하지 않을 때만 `del`)을 두 목록의 합집합 차이로 확장한다.
- OG 이미지는 `thumbnails[0]`, 비면 `images` 생략.

## 2. DB 스키마와 마이그레이션

### 2.1 목표 스키마 (`src/db/schema/portfolio.ts`, projects)

```ts
thumbnails: text("thumbnails").array().notNull().default(sql`'{}'::text[]`),
mobileThumbnails: text("mobile_thumbnails").array().notNull().default(sql`'{}'::text[]`),
```

테이블 check 제약 추가:

| 이름 | 식 | 목적 |
| --- | --- | --- |
| `projects_thumbnails_max` | `cardinality(thumbnails) <= 10 AND cardinality(mobile_thumbnails) <= 10` | 서버 스키마를 우회하는 쓰기 방어 (목록당 10장) |
| `projects_mobile_requires_base` | `cardinality(mobile_thumbnails) = 0 OR cardinality(thumbnails) > 0` | 모바일만 있는 저장 방어 |

- 상한 10은 `src/schemas/portfolio.schema.ts`의 `THUMBNAIL_LIST_MAX`와 같은 값으로 유지하고, check의 숫자 리터럴 옆에 그 연결을 주석으로 남긴다(resume kind check와 같은 방식).
- 배열 원소의 URL 형식은 DB에서 강제하지 않는다(기존 `thumbnail` 컬럼도 DB check 없음). 허용 호스트가 환경변수라 DB check로 둘 수 없음.
- 빈 목록은 `'{}'`이며 NULL을 쓰지 않는다. 읽기 코드가 null 분기를 갖지 않게 하기 위함.

### 2.2 마이그레이션 2단계

현재 마이그레이션은 `drizzle/0000`~`0004`이고 `package.json`의 `build`가 `scripts/migrate.mjs --build && next build`를 실행한다. `--build`는 Vercel Preview/Production, CI, `MIGRATE_ON_BUILD=1`에서만 적용된다. 즉 main 배포 빌드가 DB를 먼저 바꾼 뒤 새 코드를 올린다.

운영 main 코드는 `projects.thumbnail`을 읽고 쓴다(`db.select()`는 컬럼 명시 선택이라 컬럼 추가에는 안전하지만, 컬럼 제거 시 즉시 500). 따라서 컬럼 제거를 새 코드 배포와 같은 빌드에 넣으면 빌드 마이그레이션 직후~새 배포 승격 전 구간에 운영 공개 페이지와 admin이 깨진다. E1(이전 후 제거)은 아래 2단계로 지킨다.

| 단계 | 파일 | 내용 | 적용 시점 |
| --- | --- | --- | --- |
| 1 (expand) | `drizzle/0005_*.sql` | 컬럼 2개 추가, check 2개 추가, `thumbnail`을 `thumbnails` 첫 장으로 복사 | 이 feature 브랜치 병합 후 첫 빌드 (사용자 승인 후) |
| 2 (contract) | `drizzle/0006_*.sql` | 재동기화 UPDATE 후 `thumbnail` 컬럼 제거 | 새 코드가 운영(main)에 배포되어 안정화된 뒤, 별도 후속 브랜치/커밋 (사용자 승인 후) |

0005 SQL (drizzle-kit `db:generate`로 DDL을 만들고 데이터 이전 UPDATE는 같은 파일에 `--> statement-breakpoint`로 직접 추가):

```sql
ALTER TABLE "projects" ADD COLUMN "thumbnails" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mobile_thumbnails" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "projects" SET "thumbnails" = ARRAY["thumbnail"] WHERE "thumbnail" IS NOT NULL AND "thumbnail" <> '';--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_thumbnails_max" CHECK (cardinality("projects"."thumbnails") <= 10 AND cardinality("projects"."mobile_thumbnails") <= 10);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_mobile_requires_base" CHECK (cardinality("projects"."mobile_thumbnails") = 0 OR cardinality("projects"."thumbnails") > 0);
```

0006 SQL:

```sql
UPDATE "projects" SET "thumbnails" = ARRAY["thumbnail"] WHERE "thumbnail" IS NOT NULL AND "thumbnail" <> '' AND cardinality("thumbnails") = 0;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "thumbnail";
```

- 0006의 재동기화 UPDATE는 0005 적용 후 새 코드 배포 전 구간에 구 코드 admin이 `thumbnail`만 수정한 경우를 복구한다. `cardinality = 0` 조건으로 새 코드가 이미 채운 목록은 덮지 않는다.
- 0005 적용~새 코드 배포 사이에 구 코드가 쓴 `thumbnail` 변경은 `thumbnails`에 반영되지 않는다(구 코드는 새 컬럼을 모름). 이 구간에는 admin 썸네일 편집을 하지 않는 것을 운영 규칙으로 둔다. 구 코드가 INSERT하는 신규 프로젝트는 새 컬럼 default(`'{}'`)가 적용되어 안전하다.
- 마이그레이션 러너는 `entry.when`과 마지막 적용 `created_at`을 비교하므로, 0006 journal 항목의 `when`은 0005보다 커야 한다(drizzle-kit이 자동 생성).
- 0006을 병합하는 시점은 사용자 지시 사항이다. 이 사이클의 구현 범위(T05/T06)에는 0005와 새 코드까지 포함하고, 0006은 파일 생성까지만 하되 같은 브랜치에 넣으면 위 위험이 생기므로 **0006은 이 브랜치에 포함하지 않고 후속 브랜치에서 만든다**(orchestrator가 배포 순서와 함께 사용자에게 확인). 이 경우 `schema/portfolio.ts`에서 `thumbnail` 컬럼 정의는 이번 사이클에 제거하지 않고 후속 브랜치에서 제거한다. 다만 구 컬럼을 스키마에 남기면 새 코드의 INSERT가 `thumbnail`을 채우지 않으므로 구 컬럼 값은 0005 시점 스냅샷으로 고정된다(0006의 재동기화 조건 `cardinality = 0`과 일치).
- Preview 주의: `develop` Preview 빌드가 운영과 같은 `DATABASE_URL`을 쓰는지 사전 확인이 필요하다(`scripts/migrate.mjs` 주석상 로컬 `.env.local`의 URL은 Production). 같은 DB를 쓰면 feature 브랜치 Preview 빌드가 0005를 운영 DB에 먼저 적용한다. 0005는 가산적이라 구 코드에 안전하므로 허용되지만, 이 사실을 승인 요청에 포함한다. 0006은 반드시 main 배포 이후에만 어떤 Preview에서도 실행되게 한다.

### 2.3 E2E DB

- `pnpm test:e2e:local`은 빈 DB에 전체 journal을 적용하므로 0005까지 적용된 스키마가 만들어진다(후속 0006 이전까지 `thumbnail` 컬럼은 남아 있되 사용되지 않음).
- `tests/e2e/fixtures/seed.ts`의 `thumbnail: p.thumbnail ?? null` 행을 `thumbnails: p.thumbnails ?? []`, `mobileThumbnails: p.mobileThumbnails ?? []`로 바꾼다. `FixtureProject`의 `thumbnail?: string` 필드는 `thumbnails?: string[]`, `mobileThumbnails?: string[]`로 바꾼다(타입 정의는 `tests/e2e/fixtures/portfolio.ts`). 단 fixture 이미지 값(`fixtureThumbnailUrl`)을 `tests/e2e/fixtures/thumbnail.png` 기반으로 교체하는 작업은 orchestrator 담당이며, T06은 필드 이름/형태 변경만 한다. 같은 파일을 두 사람이 만지므로 병합 시 충돌 가능성이 있어 orchestrator와 조율한다(구현 범위 6절).

## 3. Zod 스키마 (`src/schemas/portfolio.schema.ts`)

### 3.1 상수와 원소 스키마

```ts
export const THUMBNAIL_LIST_MAX = 10; // DB check와 admin 폼 상한이 공유

const thumbnailUrl = z
  .string()
  .trim()
  .min(1, "필수 입력입니다")
  .max(URL_MAX, `${URL_MAX}자 이하로 입력해 주세요`)
  .refine(isValidThumbnail, "등록된 Blob 스토어의 이미지 주소만 입력할 수 있습니다");

const thumbnailList = z
  .array(thumbnailUrl)
  .max(THUMBNAIL_LIST_MAX, `${THUMBNAIL_LIST_MAX}장 이하로 입력해 주세요`)
  .refine((v) => new Set(v).size === v.length, "중복된 이미지가 있습니다");
```

- 빈 문자열 원소는 거부한다(`min(1)`). 클라이언트 폼이 저장 전에 빈 칸을 걸러 보내는 것이 정상 경로이고, 서버는 방어만 한다(AC-20).
- 같은 목록 안의 중복 URL은 조용히 제거하지 않고 필드 오류로 거부한다. 순서가 곧 전환 순서라 임의 제거가 의도를 바꾸기 때문. 서로 다른 목록(기본/모바일)의 같은 URL은 허용한다(E-i).
- 오류 키: `thumbnails`, `mobileThumbnails`(배열 단위). 원소 오류는 `thumbnails.0` 식 경로로 `parseJsonBody`의 `fieldErrors`에 담긴다.

### 3.2 프로젝트 입력 스키마

기존 `thumbnail` 필드를 제거하고 다음을 추가한다.

```ts
thumbnails: thumbnailList.optional(),
mobileThumbnails: thumbnailList.optional(),
```

- `projectUpdateInputSchema`는 `z.strictObject`라 이전 클라이언트가 `thumbnail`을 보내면 400이 된다. 의도된 동작이며 admin 클라이언트와 서버는 같은 배포로 나간다.
- 객체 단위 `superRefine`(update/create 공통, 두 필드가 모두 제공된 경우만 판정): `mobileThumbnails.length > 0 && thumbnails.length === 0`이면 `mobileThumbnails` 경로로 "기본 이미지를 먼저 등록해 주세요" 오류. 한쪽만 제공된 요청은 스키마 단계에서 판정할 수 없으므로 서비스가 기존 행과 합쳐서 판정한다(4.2).
- `projectCreateInputSchema`는 두 필드를 생략하면 빈 배열로 취급한다(서비스에서 `?? []`).
- 단, `projectUpdateInputSchema`에 `superRefine`을 붙이면 `.extend`가 불가능해진다(Zod 4에서 refinement가 있는 스키마의 `extend`는 제한됨, 현재 코드가 `projectCreateInputSchema = projectUpdateInputSchema.extend(...)`, `projectFormSchema = projectUpdateInputSchema.extend(...)`를 사용). 구현 시 refine은 별도 헬퍼 함수(`withThumbnailRules(schema)`)로 빼서 최종 export 스키마에만 적용하고, `extend` 대상 기반 스키마(`projectBaseShape` 등)는 refine 없는 형태로 둔다. T06이 `extend` 체인이 유지되도록 구조를 정한다.

### 3.3 폼 스키마와 "기존 값 유지" 경로

현재: `projectFormSchema`(strict) / `projectFormKeepThumbnailSchema`(`thumbnail: z.string().trim()`, 형식 무검사). 폼은 `savedThumbnail` ref와 같으면 keep 스키마로 검증하고, 전송 시 `thumbnail`을 body에서 뺀다.

새 설계:

- `useFieldArray`가 `{ value }` 객체를 요구하므로 폼 값 모양은 `thumbnails: { value: string }[]`, `mobileThumbnails: { value: string }[]`. 기존 `formStringList` 패턴처럼 검증 후 `string[]`로 transform하는 `formThumbnailList`를 둔다(`thumbnailList`의 규칙 재사용, 원소 스키마만 `{ value: thumbnailUrl }`).
- keep 스키마 이름: `projectFormKeepThumbnailsSchema` (복수). 기존 `projectFormKeepThumbnailSchema`는 삭제한다. 정의: `projectFormSchema.extend({ thumbnails: keepList, mobileThumbnails: keepList })`, `keepList = z.array(z.object({ value: z.string().trim() })).max(THUMBNAIL_LIST_MAX)` (형식 무검사, 개수만 제한).
- 폼 판정(T05 구현): 저장된 값(`savedThumbnails`, `savedMobileThumbnails`, 문자열 배열)과 현재 값이 **배열로 동일**(길이와 각 원소와 순서)한 목록은 "변경 없음"이다.
  - 두 목록 모두 변경 없음: keep 스키마로 검증.
  - 하나라도 변경: strict `projectFormSchema`로 검증. 변경 없는 목록에 레거시 값이 있으면 거부될 수 있으나, 12절 선행 작업으로 현재 모든 값이 Blob URL이라 실질 영향 없음. 이 한계를 코드 주석에 이유로 남긴다.
  - 전송 body: 변경 없는 목록은 필드 자체를 생략한다(서버가 기존 값 유지, AC-21). 변경된 목록은 배열(빈 배열 포함)을 보낸다.
  - 저장 성공 후 `savedThumbnails`/`savedMobileThumbnails` ref를 응답 값으로 갱신한다.
- 클라이언트 전송 전 정규화: 원소 `trim` 후 빈 문자열 제거(중복 제거는 하지 않고 서버/폼 검증 오류로 안내).

## 4. 서비스 (`src/services/portfolio/portfolio-admin-service.ts`, `portfolio-service.ts`)

### 4.1 읽기 (`portfolio-service.ts`)

- `ProjectRow`에 `thumbnails`, `mobileThumbnails` 포함. `toProject`:
  ```ts
  thumbnails: safeThumbnails(row.thumbnails, raw),
  mobileThumbnails: safeThumbnails(row.mobileThumbnails, raw),
  ```
- `safeThumbnail`을 배열 버전으로 바꾼다(`safeThumbnails`): 원소별로 기존 규칙(raw면 그대로, 아니면 레거시 `/images/` 경로 또는 `isValidThumbnail`)을 적용해 통과한 것만 순서를 유지해 반환. 모두 걸러지면 `[]`.
- 레거시 `/images/` 허용 패턴(`LEGACY_THUMBNAIL_PATTERN`)은 주석상 "이전 완료 후 삭제" 대상이고 12절에서 `public/images/`가 제거되므로 이번에 함께 삭제한다. 삭제하면 공개 읽기에서 `/images/...` 값은 걸러진다(관련 테스트 갱신 필요, 7절).
- 모바일 폴백(비면 기본 사용)은 서비스에서 적용하지 않는다. 두 목록을 그대로 내려주고 `ProjectCard`가 `mobileThumbnails.length > 0 ? mobileThumbnails : thumbnails`로 고른다(관리 폼이 원본 모바일 목록을 그대로 편집해야 하기 때문).
- `raw` 경로(admin 폼)에서도 `thumbnails`가 항상 배열(null 없음).

### 4.2 쓰기

`createProject`
- insert에 `thumbnails: input.thumbnails ?? []`, `mobileThumbnails: input.mobileThumbnails ?? []`. `thumbnail` 컬럼은 쓰지 않는다(0006 전까지 default null).
- 모바일만 있는 요청: 스키마 refine이 이미 거부(`thumbnails` 생략 + `mobileThumbnails` 비어있지 않음은 스키마에서 못 잡으므로 서비스에서 `(input.thumbnails ?? []).length === 0 && (input.mobileThumbnails ?? []).length > 0`이면 거부).

`updateProject`
- 기존 행 조회에 `thumbnails`, `mobileThumbnails`를 추가(`thumbnail` 대신).
- 유효 상태 계산: `nextThumbnails = input.thumbnails ?? existing.thumbnails`, `nextMobile = input.mobileThumbnails ?? existing.mobileThumbnails`. `nextMobile.length > 0 && nextThumbnails.length === 0`이면 `ApiError("VALIDATION_FAILED", HttpStatusCode.BadRequest, "입력값을 확인해 주세요", { mobileThumbnails: "기본 이미지를 먼저 등록해 주세요" })`를 던진다. `adminRoute`가 `ApiError`를 그대로 응답한다.
- UPDATE 값: 제공된 필드만 `set`에 포함(`input.thumbnails !== undefined`일 때만 `thumbnails`). 빈 배열은 비우기.
- DB check 위반(23514) 방어: `PG_CHECK_VIOLATION = "23514"`를 `updateProject`/`createProject` 에러 매핑에서 위와 같은 VALIDATION_FAILED(400)로 변환한다(동시 수정으로 사전 판정과 어긋나는 경우의 안전망).
- 단일 편집자 전제는 기존 동작과 동일(읽기와 쓰기 사이 경합은 별도 락 없음).

### 4.3 Blob 정리 (E2: 기존과 같은 방식)

기존 동작: 수정 후 조회한 새 값과 비교해, 이전 단일 썸네일이 바뀌었고 `isValidThumbnail`(자체 Blob)이며 다른 프로젝트가 참조하지 않으면 `del`. 삭제 실패는 로그만 남기고 응답에 영향 없음. 프로젝트 삭제 시에도 동일.

확장:
- 수정: `removed = (existing.thumbnails ∪ existing.mobileThumbnails) − (project.thumbnails ∪ project.mobileThumbnails)`(저장 후 조회한 새 상태 기준, 중복 URL은 집합으로 처리). `removed` 각 원소 중 `isOwnBlobUrl`인 것만 `deleteBlobIfUnused`. `input`에서 목록을 생략해 유지한 경우 `removed`는 자연히 비어 있다.
- 삭제: `.returning({ id, thumbnails, mobileThumbnails })`로 받은 두 목록의 합집합 각각에 `deleteBlobIfUnused`.
- `deleteBlobIfUnused(url)`의 참조 검사를 두 배열 컬럼 모두로 확장한다. 같은 프로젝트의 다른 목록에도 쓰이는 URL(E-i)과 다른 프로젝트의 참조(E-k)를 모두 보호한다:
  ```ts
  where(or(
    sql`${url} = any(${projects.thumbnails})`,
    sql`${url} = any(${projects.mobileThumbnails})`,
  ))
  ```
  파라미터 바인딩으로 SQL injection 없음.
- `deleteProject` 반환 타입은 현재 `string | null`(썸네일)인데 호출부(`DELETE` 라우트)는 반환값을 쓰지 않는다. `Promise<void>`로 바꾼다.
- 한 요청에서 `del` 호출 최대 20회까지 가능하므로 `Promise.allSettled`로 병렬 처리하되 개별 실패는 기존처럼 `console.error("Blob thumbnail cleanup failed")`만 남긴다.
- 업로드 후 저장하지 않고 이탈해 남는 고아 Blob은 기존에도 정리하지 않으며(업로드 API는 Blob만 올림), 이번 범위에서도 동일 수준을 유지한다.

## 5. API 입출력

경로와 인증(`adminRoute`), 응답 형식(`ok`/`fail`, `CustomData<T>`), 본문 크기 상한(256KB)은 변경 없음. 최대 20개 URL(각 2000자 상한)은 상한 안.

### POST `/api/admin/projects` (201)

요청 본문 변경점:

| 필드 | 이전 | 이후 |
| --- | --- | --- |
| `thumbnail?: string` | 있음 (빈 문자열이면 null) | 제거 (보내면 400, strictObject) |
| `thumbnails?: string[]` | 없음 | 선택. 생략 시 `[]`. 최대 10, 중복 불가, 각 원소 `isValidThumbnail` |
| `mobileThumbnails?: string[]` | 없음 | 선택. 생략 시 `[]`. 규칙 동일. 비어있지 않으면 `thumbnails`도 비어있지 않아야 함 |

응답 `data`: `Project`(5.3).

### PUT `/api/admin/projects/[slug]` (200)

- `thumbnails`, `mobileThumbnails` 각각 선택. 생략: 해당 목록 유지. `[]`: 비움. 배열: 교체(순서 유지).
- 유효 상태에서 모바일만 있고 기본이 빈 경우 400 `VALIDATION_FAILED`, `fieldErrors.mobileThumbnails`.
- 오류 예: 목록 11장 -> `fieldErrors.thumbnails: "10장 이하로 입력해 주세요"`, 원소 형식 오류 -> `fieldErrors["thumbnails.2"]`, 중복 -> `fieldErrors.thumbnails: "중복된 이미지가 있습니다"`.

### DELETE `/api/admin/projects/[slug]`

응답 변경 없음 (`{ slug }`). 서비스 시그니처만 4.3대로 변경.

### POST `/api/admin/uploads/thumbnail`

변경 없음(4MB 이하 PNG/JPG/WebP, Blob `thumbnails/`). 여러 장은 클라이언트가 파일마다 호출한다.

### 5.3 공개/응답 타입 (`src/types/portfolio.ts`)

```ts
interface Project {
  // 기본(PC) 이미지 목록, 순서가 전환 순서. 없으면 빈 배열
  thumbnails: string[];
  // 모바일 전용 목록. 비면 표시 계층이 thumbnails를 대신 사용. 없으면 빈 배열
  mobileThumbnails: string[];
  ...
}
```

- 기존 `thumbnail?: string`은 제거한다. 호출부: `src/app/(public)/page.tsx`, `src/app/(public)/projects/page.tsx`(`ProjectCard` 전달), `work/[id]/page.tsx`(OG), `project-form.tsx`.
- 항목별 출처 구분이 필요한 병합 배열은 없다(두 목록은 별도 필드이므로 판별 필드 불필요). 상한 절단 응답도 없다(개수 상한은 입력 검증이고, 읽기는 저장된 전체를 반환).
- 기존 필드 없는 과거 레코드 해석 문제 없음: DB default `'{}'`가 모든 기존 행에 채워진다.

## 6. OG 규칙 (`src/app/(public)/work/[id]/page.tsx`)

- `...(project.thumbnails[0] && { images: [project.thumbnails[0]] })`. 기본 목록이 비면 `images` 생략(모바일만 있는 상태는 저장 거부되므로 발생하지 않음).
- 단일 썸네일 프로젝트는 마이그레이션으로 `thumbnails[0]`이 기존 `thumbnail`과 같으므로 OG 값이 변경 전과 동일하다(AC-25).

## 7. 영향받는 기존 테스트 (나열만, 작성 담당 미배정)

Unit (`__tests__/`):
- `utils/portfolio-admin-service.test.ts`: `thumbnail` 단일 값 기준 select/update/delete/Blob 정리 케이스 전반(`row()`의 `thumbnail`, `results.push([{ id, thumbnail }])`, `setCalls[0].thumbnail`, 반환 `project.thumbnail`)이 목록 필드와 합집합 정리 기준으로 갱신 대상.
- `utils/portfolio-thumbnail-read.test.ts`: 행 `thumbnail`, 결과 `.thumbnail`, 레거시 `/images/` 허용 케이스(레거시 패턴 삭제 시) 갱신 대상.
- `schemas/portfolio-schema.test.ts`: `thumbnail` 필드 허용/거부/빈 문자열 케이스(156~180행 부근)가 `thumbnails` 기준으로 갱신 대상.
- `schemas/admin-form-schema.test.ts`: `thumbnail` fixture(48행), `projectFormKeepThumbnailSchema`(12, 138~145행) 케이스가 새 스키마명/모양으로 갱신 대상.
- `api/thumbnail-upload-route.test.ts`, `api/post-image-upload-route.test.ts`: 업로드 API 자체는 변경 없음. 영향 없을 것으로 예상하나 전체 실행으로 확인.
- 마이그레이션 journal/스키마를 점검하는 테스트(예: `drizzle` 관련)가 있으면 0005 추가 영향 확인 필요(전체 `pnpm exec vitest run`으로 검증).

E2E (`tests/e2e/`):
- `fixtures/portfolio.ts`: `FixtureProject.thumbnail`, `fixtureThumbnailUrl` 사용(113행). orchestrator의 fixture 교체와 겹침.
- `fixtures/seed.ts`: `thumbnail: p.thumbnail ?? null`(82행).
- `fixtures/test.ts`: 썸네일 route mock(`public/images/projects/globber/thumbnail.png` 경로). orchestrator 교체 범위.
- `real-project-data.spec.ts`: 썸네일 이미지 표시 확인(60~67행). 값 형태가 목록으로 바뀌어도 단일 장 표시가 유지되는지 확인 대상.

기타:
- `scripts/migrate-thumbnails.mjs`는 `thumbnail` 컬럼을 직접 참조하는 일회성 이전 스크립트다. `public/images/` 제거(12절)로 의미가 사라지고 0006 이후에는 실행 시 컬럼 부재로 실패하므로 삭제 대상으로 제안한다(`knip`/lint 영향은 구현 시 확인). 삭제 여부는 orchestrator가 사용자에게 확인.

## 8. 구현 파일 범위 분담 (겹치지 않음)

### T06 backend

| 파일 | 변경 |
| --- | --- |
| `src/db/schema/portfolio.ts` | `thumbnails`, `mobileThumbnails` 컬럼, check 2개 추가 (`thumbnail` 컬럼은 0006 후속에서 제거하므로 이번에는 유지) |
| `drizzle/0005_*.sql`, `drizzle/meta/_journal.json`, `drizzle/meta/0005_snapshot.json` | `pnpm db:generate`로 생성 후 SQL에 데이터 이전 UPDATE 추가. 실행은 하지 않음 |
| `src/schemas/portfolio.schema.ts` | 상수, `thumbnailList`, 입력/폼/keep 스키마, refine 구조 |
| `src/services/portfolio/portfolio-service.ts` | `safeThumbnails`, `toProject`, 레거시 패턴 삭제 |
| `src/services/portfolio/portfolio-admin-service.ts` | create/update/delete, Blob 정리, 23514 매핑 |
| `src/app/api/admin/projects/route.ts`, `projects/[slug]/route.ts` | 로직 변경은 없고 import만 영향 시 수정 |
| `src/types/portfolio.ts` | `Project` 타입 |
| `tests/e2e/fixtures/seed.ts` | 필드 매핑만 변경 |
| `tests/e2e/fixtures/portfolio.ts` | `FixtureProject` 타입 필드 형태만 변경 (이미지 값 교체는 orchestrator, 병합 시 조율) |
| 기존 unit 테스트 7절 항목 | 깨지는 것만 의도 유지한 채 갱신 |

### T05 frontend

| 파일 | 변경 |
| --- | --- |
| `src/components/common/project-card.tsx` | `thumbnails`, `mobileThumbnails` props, `md` 분기, 4초 크로스페이드, 일시정지, reduced-motion |
| `src/app/(public)/page.tsx`, `src/app/(public)/projects/page.tsx` | `ProjectCard`에 두 목록 전달 (두 호출부 모두) |
| `src/app/(public)/work/[id]/page.tsx` | OG `images` 규칙 (6절) |
| `src/components/admin/project-form.tsx` | 목록 필드(`useFieldArray`), 변경 판정, keep 스키마 선택, 전송 body |
| `src/components/admin/thumbnail-field.tsx` | 단일 업로드 컴포넌트를 목록 편집용으로 확장하거나 목록 컴포넌트 신설 (추가, 삭제, 위/아래 이동, 업로드 중 저장 차단) |
| 신규 파일(필요 시) | 목록 편집 컴포넌트, 카드 슬라이드 훅 등 (kebab-case) |

경계:
- T05는 `src/schemas/`, `src/services/`, `src/db/`, `src/types/`, `drizzle/`를 수정하지 않는다. T06이 먼저 스키마 export 이름(`THUMBNAIL_LIST_MAX`, `projectFormSchema`, `projectFormKeepThumbnailsSchema`)과 `Project` 타입을 확정해 두고, T05는 그 이름을 소비한다. 병렬 진행 시 위 이름과 타입을 계약으로 고정한다.
- `ProjectCard` 새 props 이름은 `thumbnails: string[]`, `mobileThumbnails: string[]`(필수 아님, 기본 `[]`)로 제안하며 T05가 소유한다.
- 이 사이클에서 건드리지 않는 파일: `src/app/api/admin/uploads/thumbnail/route.ts`(변경 없음), `public/images/`와 E2E 이미지 값 교체(orchestrator).
- 병렬 스폰은 `git-safety.md`대로 `Agent` 호출을 별도 메시지로 하나씩, `isolation: "worktree"`로.

## 9. 보안 점검

- 모든 URL 원소가 서버에서 `isValidThumbnail`(호스트, `/thumbnails/` 경로, https, 자격증명/포트/쿼리/해시 금지)을 거친다. 클라이언트 검증은 UX용.
- 참조 검사와 UPDATE는 Drizzle 파라미터 바인딩만 사용(문자열 보간 SQL 없음). `= any(column)`에서 URL은 바인딩 값.
- 엔드포인트는 모두 기존 `adminRoute`(인증, allowlist, Origin 검사, rate limit) 뒤에 있고 새 엔드포인트는 없다.
- DB check로 서버 스키마 우회 시에도 개수 상한과 모바일 단독 저장을 막는다.

## 10. 확인 필요 (blocking 아님)

- 0006(컬럼 제거)을 이번 브랜치에서 제외하고 후속으로 분리하는 안(2.2)에 대한 orchestrator/사용자 확인. 요구사항 E1 "이전 후 제거"의 이행 시점이 후속 배포로 미뤄짐.
- Preview 빌드의 `DATABASE_URL`이 운영 DB와 같은지(2.2 Preview 주의).

## 부록. 사용자 결정 반영 (orchestrator, 2026-10-16)

- requirements.md 13절 D1에 따라 `thumbnail` 컬럼 제거(이 문서의 0006)를 이번 브랜치에 포함한다. 데이터 이전과 컬럼 제거를 이번 브랜치의 마이그레이션으로 함께 적용하고, `src/db/schema/portfolio.ts`에서 `thumbnail` 정의를 제거한다. 배포 사이 운영 화면 중단 위험은 사용자가 알고 선택했으며 main 배포 직전 재확인한다.
- D2에 따라 `scripts/migrate-thumbnails.mjs`와 `LEGACY_THUMBNAIL_PATTERN`을 삭제한다.
- D4(Candanta PC/모바일 분리)는 데이터 변경이며 스키마·API 설계에는 영향이 없다.

## 리뷰 재개 후 보안 보완 (2026-10-16)

- 사용자가 기존 Origin scheme 미비교 및 Blob 삭제 경합을 이번 사이클 수정에 포함하고, Blob 자동 삭제 유지를 선택함.
- Origin은 `NEXTAUTH_URL`(없으면 요청 URL)의 scheme과 기존 허용 host·port를 조합한 전체 origin과 비교함. `ADMIN_ALLOWED_HOSTS`의 host 형식은 유지함.
- 마이그레이션 0007은 `retired_thumbnail_blobs(url PRIMARY KEY)` 및 프로젝트 썸네일 쓰기 trigger를 추가함.
- 미참조 Blob 삭제 경로는 READ COMMITTED 트랜잭션에서 advisory lock `7301005`(0008에서 이력서 잠금 `7301004`와 분리)를 얻고, 두 목록 전체에서 참조가 없는 URL만 삭제 대상으로 기록함. 기록 커밋 후 외부 Blob 삭제를 실행함.
- 프로젝트 INSERT 및 두 썸네일 배열 UPDATE trigger도 같은 lock 아래에서 기록을 검사함. 새 참조 저장이 먼저면 삭제 대상 기록을 만들지 않으며, 기록이 먼저면 새 참조 저장을 거부함. Trigger는 READ COMMITTED 외 격리수준을 거부함.
- 삭제 대상 URL의 재등록은 `VALIDATION_FAILED`(400)와 `thumbnails` 또는 `mobileThumbnails` 필드 오류로 반환하고 재업로드를 안내함.
- 외부 삭제 실패에도 URL 기록은 유지함. 0008이 `retired_thumbnail_blobs.deleted_at`을 추가하고, 삭제 성공 시에만 값을 기록함. 이후 프로젝트 수정·삭제로 Blob 정리가 실행될 때마다 `deleted_at`이 null인 모든 URL의 삭제를 다시 시도함(사용자 결정: 별도 cron·worker 없이 다음 정리 때 재시도). 관리자 편집이 없으면 재시도도 일어나지 않음.
