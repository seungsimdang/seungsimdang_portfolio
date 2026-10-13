# security-review-1: about 이력서 재구성 (T08, 1차)

- 작성일: 2026-10-13
- 작성자: Security Reviewer (T08)
- 브랜치: `feature/about-resume`, 사이클 시작 `24d9331`, 검토 HEAD `e9cafb4`
- 방식: 정적 읽기 검토만 수행. 코드 수정, DB 접속, 스크립트 실행은 하지 않았다.

## 최종 판정

**배포 승인** (Critical 0, High 0, Medium 0, Low 3, Info 4). 차단 조건(미수정 Critical, 인증 로직 확인 불가)에 해당하지 않는다.
orchestrator 9-1 게이트가 모든 finding을 재검토하므로 Low 항목의 재작업 여부는 orchestrator가 결정한다.

## 1. 검토 범위

입력 문서: `requirements.md`(5절 보안 요구, F4-1), `api-spec.md`(5절, 7절), `docs/agent-rules/project-structure.md`.

검토한 파일(모두 읽음):

- API: `src/app/api/admin/resume-entries/route.ts`, `resume-entries/[id]/route.ts`, `resume-order/route.ts`
- 서비스: `src/services/portfolio/portfolio-admin-service.ts`(131-151, 364-455행), `portfolio-service.ts`(`toResumeEntry`, `getResumeByKind`)
- 스키마/DB: `src/schemas/portfolio.schema.ts`, `src/db/schema/portfolio.ts`, `drizzle/0001_lowly_rumiko_fujikawa.sql`
- admin 페이지: `src/app/admin/(console)/resume/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `(console)/layout.tsx`
- 컴포넌트: `resume-entry-form.tsx`, `sortable-list.tsx`(resume 분기 grep), `resume-section.tsx`, `about/page.tsx`
- 상수/스크립트: `src/constants/resume.ts`, `scripts/resume-data.ts`, `package.json`(db:resume:*)
- 대조용 기존 코드: `admin-route.ts`, `require-admin.ts`, `proxy.ts`(matcher), `parse-body.ts`, `api-error.ts`, `talk-order/route.ts`

시간상 전체를 정독하지 못하고 grep 수준으로만 본 파일: `resume-labels.ts`, `profile-form.tsx`, `admin-nav.tsx`, `types/portfolio.ts`. 이 파일들은 문자열/타입/폼 입력만 다루며, 쓰기 경로는 위에서 검토한 `adminRoute` 라우트를 통한다.

## 2. Finding 목록

### Critical

없음.

### High

없음.

### Medium

없음.

### Low

**L-1. 정렬 API의 확인 SELECT와 UPDATE batch 사이 경합 (사이클 범위 안, 기존 패턴 계승)**

- 근거: `portfolio-admin-service.ts:423-445` (`reorderResumeEntries`). 집합 비교 후 별도 `runBatch`로 `sort_order`를 재배정하며 advisory lock이 없다. 주석(423-424행)이 한계를 명시한다.
- 영향: 비교와 쓰기 사이에 다른 요청이 항목을 생성/삭제하면 순번이 어긋날 수 있다. 데이터 유출이나 권한 상승은 없고, 정렬 값만 일시적으로 불일치한다. 읽기의 `created_at, id` 타이브레이커와 admin 단일 편집자 전제로 영향이 제한된다. 인증된 admin만 트리거할 수 있다.
- 수정 제안: 현 구조 유지 가능. 원하면 `RESUME_LOCK_KEY`로 `pg_advisory_xact_lock`을 batch 첫 문장에 넣어 생성 경로와 직렬화한다(비교를 batch 안에서 하려면 SQL 조건부 update 필요).
- 범위: 안(기존 `reorderProjects`/`reorderTalks`와 동일한 수용된 한계).

**L-2. 이력 쓰기 라우트에 요청 빈도 제한이 없음 (사이클 범위 밖, 기존 설계)**

- 근거: `admin-route.ts` 전체에 rate limit 없음. kind별 50건 상한(`RESUME_KIND_MAX`, `portfolio.schema.ts:17`)과 본문 256KiB 상한(`parse-body.ts:6`)이 있어 저장소 증가는 제한된다.
- 영향: 인증된 admin 세션이 탈취된 경우에만 의미가 있으며, 총량은 상한으로 묶인다.
- 수정 제안: 조치 불필요. 필요하면 별도 사이클에서 admin 전체에 적용한다.
- 범위: 밖.

**L-3. 시드 스크립트의 `--yes`는 대상 호스트 검증 없이 확인을 건너뜀 (사이클 범위 안)**

- 근거: `scripts/resume-data.ts:124-130`, `146-150`. 호스트명을 출력한 뒤 `--yes`가 있으면 즉시 진행하며, 운영/테스트 DB를 구분하는 allowlist가 없다. `.env.local`의 `DATABASE_URL`이 운영을 가리키면 그대로 쓴다(`package.json:28-29`의 `--env-file-if-exists=.env.local`).
- 완화 요소: 쓰기는 모두 조건부다. `seed`는 테이블에 행이 있으면 건너뜀(156-163행), `profile`은 현재 값이 기대와 같을 때(skills)와 tools가 빈 배열일 때(189행)만 update한다. 삭제 문장은 없다. 따라서 오실행의 최악 결과는 빈 테이블에 시드 삽입, 기대 값 일치 시 skills/tools 갱신이다.
- 수정 제안: 현 상태로 허용 가능. 개선하려면 `--yes` 사용 시에도 호스트명을 로그에 남기는 현재 동작을 유지하고, 운영 적용 절차(api-spec 10절)대로 orchestrator가 직접 실행한다.
- 범위: 안.

### Info

**I-1. `profile.skills` 조건부 update의 배열 비교 (사이클 범위 안, 기능 확인 사항)**

- 근거: `scripts/resume-data.ts:179` `eq(profile.skills, OLD_SKILLS)`. drizzle가 `text[]` 컬럼의 배열 바인딩을 올바르게 직렬화하는지 실행해 확인하지 못했다.
- 영향: 보안 문제가 아니다. 비교가 실패해도 0행이라 "건너뜀"으로 안전하게 실패한다(api-spec 6.3절 4항과 같은 방향). 단 의도한 갱신이 조용히 건너뛰어질 수 있다.
- 제안: orchestrator가 적용 시 "profile.skills: 갱신" 출력이 나왔는지 확인한다. 건너뜀이면 DB 현재 값과 `OLD_SKILLS`를 대조한다.

**I-2. 시드의 존재 확인과 insert가 원자적이지 않음 (사이클 범위 안)**

- 근거: `scripts/resume-data.ts:156-171`. SELECT 후 INSERT 사이에 다른 프로세스가 삽입하면 중복 가능. 일회성 단일 운영자 스크립트이고 api-spec 10절이 다른 세션과 조율하도록 규정하므로 위험은 낮다.

**I-3. advisory lock 키 상수 (사이클 범위 안, 양호)**

- 근거: `portfolio-admin-service.ts:365`. api-spec은 `7_301_003`을 제안했으나 `scripts/migrate.mjs`가 이미 003을 쓰므로 구현은 `7_301_004`를 사용하고 이를 주석으로 남겼다. 충돌 회피가 올바르다.
- 참고: 락은 kind와 무관하게 하나의 키라 모든 kind의 생성이 직렬화된다. 단일 편집자 전제에서는 문제가 없다.

**I-4. 마이그레이션 자동 적용 (사이클 범위 밖, 운영 절차)**

- 근거: api-spec 10절 1항. `scripts/migrate.mjs --build`가 빌드 시 마이그레이션을 적용한다. 이번 마이그레이션은 추가만(`CREATE TABLE`, `ADD COLUMN`, `CREATE INDEX`)이고 drop/alter가 없음을 `0001_lowly_rumiko_fujikawa.sql`에서 확인했다. 보안 결함은 아니며 push 시점은 orchestrator가 관리한다.

## 3. 확인했으나 결함 없는 항목

1. **쓰기 엔드포인트 인증/인가/Origin (중점 1)**
   - POST `resume-entries/route.ts:9`, PUT/DELETE `resume-entries/[id]/route.ts:11,18`, PUT `resume-order/route.ts:8` 모두 `adminRoute`로 감싸져 있다. 미감싼 export는 없다.
   - `admin-route.ts:63`이 POST/PUT/PATCH/DELETE에 Origin 검사를 적용한다. Origin 헤더가 없으면 거부(44-45행), `x-forwarded-host`는 신뢰하지 않는다(47행). 이후 `requireAdmin`이 세션과 GitHub allowlist로 401/403을 판정한다(`require-admin.ts:16-24`). allowlist가 비어 있으면 403이다.
   - 추가로 `proxy.ts` matcher가 `/admin/:path*`, `/api/admin/:path*`를 1차 보호한다.
   - GET 핸들러에 부작용이 없고 이력용 GET 라우트는 존재하지 않는다(공개 읽기는 서비스 직접 호출).
2. **admin 페이지 서버 인증 강제**
   - `resume/page.tsx:21`, `new/page.tsx:19`, `[id]/page.tsx:22` 모두 `requireAdminPage()`를 호출하고 `(console)/layout.tsx:8`에서도 호출한다. 실패 시 `/admin/login`으로 redirect한다.
   - `new?kind=`는 `RESUME_KINDS.find`로 화이트리스트 검증 후 아니면 `notFound()`(`new/page.tsx:21-22`). `[id]`는 DB에서 조회한 목록에서 찾고 없으면 `notFound()`(`[id]/page.tsx:28-31`)라 id가 쿼리에 직접 쓰이지 않는다.
3. **Zod 입력 검증, mass assignment (중점 2)**
   - `resumeEntryUpdateInputSchema`/`resumeOrderInputSchema`는 `z.strictObject`라 알 수 없는 키를 400으로 거부한다(`portfolio.schema.ts:133,148`). `createResumeEntry`의 `...input`(서비스 385-386행)은 검증된 필드(kind, period, title, subtitle, details)만 포함하므로 `id`, `sortOrder`, `createdAt` 주입이 불가능하다. `updateResumeEntry`의 `.set({ ...input, updatedAt })`도 같은 이유로 `kind`/`sortOrder` 변경이 불가능하다(수정 스키마에 `kind` 없음).
   - 상한: `period` 100자, `title`/`subtitle` 200자, `details` 항목 200자 x 최대 50개, `ids` 최대 50개 + 중복 금지 + `z.uuid`, `kind`는 `z.enum(RESUME_KINDS)`. 본문 256KiB와 Content-Type 검사는 `parseJsonBody`가 공통 수행한다.
   - DB 레벨에서도 `kind` check 제약(`0001_...sql:11`)이 이중 방어한다.
   - 프로필 `tools`는 `stringList`(최대 50개, 항목 200자)이고 `profileInputSchema`가 strictObject다(`portfolio.schema.ts:116-125`).
4. **정렬 무결성, SQL 조각, advisory lock (중점 3)**
   - 다른 kind나 존재하지 않는 id가 섞이면 `assertSameSet`이 `OrderMismatchError`(409)로 거부한다(`:447-455`). 요청 길이와 현재 집합 크기 비교 + 전원 포함 검사 + 스키마의 중복 금지로 완전 일치만 통과한다. UPDATE에도 `and(eq(id), eq(kind))` 조건이 있어 kind 경계를 넘는 갱신이 없다(`:442`).
   - `sql` 템플릿 사용처(`:144-149`, `:387`)는 테이블/컬럼은 drizzle 식별자 보간, 값(`lockKey`, `max`, `input.kind`)은 모두 바인딩 파라미터다. `sql.raw` 사용은 이번 diff에 없다(기존 `SLUG_PATTERN_SQL` 상수만 존재). `where` 인자는 `eq()` 결과로 호출부가 고정(`createResumeEntry`)하고 사용자 입력이 문자열로 결합되지 않는다. 인젝션 경로 없음.
   - `kind`는 enum 검증 후에만 쿼리에 도달한다. id 경로 파라미터는 `isUuid` 검사 후 쿼리(`:367-369,403,415`)하며 형식 오류는 DB 호출 없이 404.
   - advisory xact lock은 `db.batch` 단일 트랜잭션 안에서 개수 검사와 insert를 직렬화한다(기존 projects/talks와 같은 방식). 락 키는 상수라 사용자 입력이 락 키에 영향을 주지 않는다. 0 나누기 가드 롤백은 `mapCreateError`가 `LimitExceededError`로 변환한다. 상한(50)과 정렬 요청 상한(`RESUME_KIND_MAX`)이 같아 정렬이 항상 통과 가능하다.
5. **공개 렌더 XSS (중점 4)**
   - `resume-section.tsx`, `about/page.tsx`, admin 이력 페이지/폼에서 `dangerouslySetInnerHTML`, `innerHTML`, 사용자 데이터 기반 `href`는 없다(해당 파일 grep 결과 일치 0건, 직접 읽기로도 확인). 이력 값은 모두 JSX 텍스트 노드로 출력되어 React가 이스케이프한다. 링크 필드도 없다(requirements 5절 준수).
   - admin 목록의 `href`는 `/admin/resume/${item.id}`(DB uuid), `/admin/resume/new?kind=${kind}`(고정 enum)이다(`sortable-list.tsx:145`, `resume/page.tsx:48`).
   - 클라이언트 `router.push`에 쓰이는 값은 서버 응답의 `saved.id`와 `entry.kind`(enum)다(`resume-entry-form.tsx:83,98`).
6. **에러 응답 정보 노출 (중점 6)**
   - 알 수 없는 오류는 `apiErrors.internal()`의 고정 문구(`"서버 오류가 발생했습니다"`)만 반환하고, 서버 로그에는 `name: message`만 남긴다(스택/쿼리 제외, `admin-route.ts:90-93`). 0 나누기 가드는 `LIMIT_EXCEEDED` 409로 변환되어 DB 오류 코드가 노출되지 않는다. 검증 오류는 필드별 메시지만 반환한다. 이력 라우트가 새 오류 매핑을 추가하지 않는다.
7. **시드 스크립트 (중점 5)**
   - 대상 호스트 출력 + y 확인(`--yes`로 생략), 접속 문자열 자체는 출력하지 않는다(호스트명만, `:146`). 오류도 메시지만 출력(`:198-201`). `seed`는 테이블 단위 존재 판정으로 멱등, 편집 데이터 미덮어씀. `profile`은 조건부 update 2건이며 delete/truncate 없음. 시드 데이터에 학점/연락처는 없다(requirements 결정 5 준수). 시크릿 하드코딩 없음(`DATABASE_URL`을 env에서 읽음).
8. **시크릿/의존성**
   - 이번 diff에서 신규 환경변수, 시크릿, 의존성 추가는 확인되지 않았다(api-spec 7절과 일치, `package.json`은 스크립트 2개 추가만 확인).
9. **마이그레이션 SQL**: 추가 전용. `profile.tools`는 `NOT NULL DEFAULT '{}'`라 기존 행 안전.
10. **클라이언트 삭제 처리**: 404도 성공으로 취급해 이동하는 것은 멱등 삭제이며 정보 노출 없음(`resume-entry-form.tsx:97`).

## 4. 사이클 범위 밖 관찰

- L-2 (rate limit 부재), I-4 (빌드 시 자동 마이그레이션)만 해당한다. 기존 코드에서 별도의 취약점은 발견하지 못했다. 기존 `reorderProjects`/`reorderTalks`의 경합 한계는 L-1과 동일하며 이미 주석으로 수용된 사항이다.

## 5. 검토 한계

- 정적 검토만 수행했다. 실제 요청 재현, 테스트 실행, 운영 DB 확인은 하지 않았다.
- `next-auth` 설정(`auth-options.ts`)과 `admin-allowlist.ts`의 내부는 이번 사이클에서 변경되지 않아 정독하지 않았고, `requireAdmin`/`adminRoute`의 호출 계약만 확인했다.
- 의존성 취약점 스캔(`pnpm audit`)은 실행하지 않았다. 이번 사이클에서 의존성이 추가되지 않았다는 점만 확인했다.
