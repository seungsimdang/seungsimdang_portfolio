# requirements: 포트폴리오 데이터 DB 이전 및 admin CRUD

- 작성일: 2026-10-12
- 작성자: Project Manager (T02)
- 입력: `00-input.md`, 기준 커밋 `609d242` (develop)
- 브랜치: Task Team 사이클은 `develop`에서 `feature/admin-portfolio-cms`로 분기 (`docs/agent-rules/branch-strategy.md`)

## 목차

- [1. 목적과 현재 상태](#1-목적과-현재-상태)
- [2. admin 아키텍처 결정](#2-admin-아키텍처-결정)
- [3. 기능 분해와 수용 기준](#3-기능-분해와-수용-기준)
- [4. DB 설계 초안](#4-db-설계-초안)
- [5. ProjectId와 URL 호환](#5-projectid와-url-호환)
- [6. 공개 페이지 조회와 캐시](#6-공개-페이지-조회와-캐시)
- [7. 비기능 요구사항](#7-비기능-요구사항)
- [8. 환경변수와 배포 경로](#8-환경변수와-배포-경로)
- [9. 모호한 항목별 권장 기본값](#9-모호한-항목별-권장-기본값)
- [10. 사용자 확인 필요](#10-사용자-확인-필요)
- [11. 범위 밖](#11-범위-밖)
- [12. 검증 시 주의](#12-검증-시-주의)

## 1. 목적과 현재 상태

- 목적: `src/constants/portfolio-data.ts`의 `profileData`, `projects`, `techTalks`를 DB로 옮기고, 인증된 소유자가 admin 화면에서 추가/수정/삭제하게 한다.
- 현재: 앱 의존성은 `next`, `react`, `react-dom`, `pretendard`뿐이며 DB, 인증, API 라우트, `src/proxy.ts`가 없다. 공개 페이지는 모두 정적이다.
- 현재 `/work/[id]`는 `generateStaticParams` + `dynamicParams = false`라서 DB에서 프로젝트를 추가해도 재빌드 없이는 404가 된다. 이 설정은 바뀌어야 한다.
- `ProjectId` 리터럴 유니언은 `src/types/portfolio.ts` 외에 `src/constants/project-card-theme.ts`(`Record<ProjectId, ...>`)와 `src/app/page.tsx`(`projectCardTheme[project.id]`)에서도 쓰인다. 5절에서 함께 다룬다.
- `navbar.tsx`, `footer.tsx`, `hero-section.tsx`, `about-section.tsx`는 `"use client"` 컴포넌트가 `profileData`를 직접 import한다. DB 조회는 서버에서만 가능하므로 props 전달 경로가 바뀐다(3절 F2).
- 참고: `node_modules/next/dist/docs/`가 현재 워크트리에 없어 Next.js 16 문서를 직접 확인하지 못했다. proxy.ts, 캐시 무효화(revalidatePath/revalidateTag) 시그니처는 개발자가 설치 후 해당 문서로 반드시 재확인한다.

## 2. admin 아키텍처 결정

### 결정: A안 (같은 Next.js 프로젝트의 `/admin` 라우트로 분리)

### 판단 축별 비교

| 판단 축 | A안 (같은 프로젝트 `/admin`) | B안 (별도 앱 + turborepo) |
| --- | --- | --- |
| 사용자 수 | 소유자 1명 전제. 1명용 앱을 따로 둘 이유가 없다 | 여러 편집자/팀 단위 운영에서 정당화되는 구조 |
| DB 스키마·타입 공유 | 같은 `src/db`, `src/schemas`, `src/types`를 그대로 import | 공유 패키지(`packages/db` 등) 신설, 빌드/버전 관리 필요 |
| Vercel 배포·환경변수 | 프로젝트 1개, 환경변수 1세트 | 프로젝트 2개, `DATABASE_URL` 등 환경변수 중복 설정 |
| 공격 표면 | admin 코드가 같은 배포물에 있으나, 라우트/서버 코드는 번들 분리되고 서버측 재검사로 방어 가능 | 공개 사이트에 admin 코드가 아예 없어 가장 작다. 단 admin 앱 자체가 별도 공개 URL이라 그 앱의 인증이 같은 수준으로 필요 |
| 운영 복잡도 | 변경 없음 | 워크스페이스, 파이프라인, 버전 정렬, 캐시 무효화를 위한 앱 간 통신(revalidate webhook 등) 추가 |
| 하네스 영향 | 없음 | 아래 참조 |

### 선택 근거

1. 사용자가 사실상 1명이라 B안의 이점(팀 단위 분리, 독립 배포 주기)이 필요 없다.
2. admin 수정 후 공개 페이지 재검증이 같은 프로세스에서 `revalidate` 호출 한 번으로 끝난다. B안은 앱 간 webhook과 시크릿을 따로 만들어야 한다.
3. 스키마, zod 스키마, 타입을 한 곳에서 공유해 `ProjectId` 같은 타입 변경이 컴파일 단계에서 양쪽에 반영된다.
4. 공개 사이트 번들 노출 우려는 `/admin` 하위 클라이언트 코드가 라우트별 코드 분할로 공개 페이지 번들에 포함되지 않고, 비밀 값과 쓰기 로직은 서버 전용(`server-only`)에 두는 것으로 충분히 낮출 수 있다. 진짜 방어선은 번들 비노출이 아니라 서버측 인가 재검사다.

### 기각 근거 (B안)

1. 저장소 하네스(`husky`, `knip`, `biome`, `harness-sync`, `lint-staged`, `__tests__/lint`, `scripts/sync-agent-harness.mjs`, `.claude`/`.codex` 훅)는 루트 단일 패키지를 전제로 한다.
2. 모노레포로 가면 knip 워크스페이스 설정, biome 루트/패키지 설정, harness-sync 경로, 훅과 pre-commit 경로, `pnpm verify` 체인, Playwright 설정을 전부 재구성해야 하고 하네스 테스트도 다시 맞춰야 한다. 포트폴리오 규모에 비해 이전 비용이 크다.
3. Vercel 프로젝트가 2개가 되어 환경변수와 도메인 관리가 2배가 된다.

### 트레이드오프 (A안을 택해 감수하는 것)

- 공개 사이트와 admin이 같은 배포 단위라 admin 변경도 공개 사이트 재배포를 동반한다. 소유자 1명 기준 문제가 되지 않는다.
- admin 코드가 공개 저장소/배포물에 같이 있다. 따라서 인증/인가 로직의 안전성이 코드 비공개에 의존하면 안 된다(시크릿은 환경변수에만).
- 장래에 편집자가 늘거나 admin을 독립 서비스로 키우면 분리 비용이 든다. 이 경우를 대비해 admin 코드는 `src/app/admin/**`, `src/services/portfolio/**`, `src/app/api/admin/**`에만 두어 분리 가능한 경계를 유지한다.

### 인증/인가 방식 비교와 선택

| 항목 | next-auth Credentials + bcrypt (candanta 방식) | GitHub OAuth + 소유자 allowlist |
| --- | --- | --- |
| 저장할 비밀 | 비밀번호 해시(env 또는 users 테이블) | 없음. GitHub 계정이 자격증명 |
| 공격 표면 | 비밀번호 무차별 대입 대상. rate limit, 타이밍 방어(dummy hash), 비밀번호 재설정/세션 무효화(candanta의 `sessionVersion`)까지 따라온다 | 로그인 시도가 GitHub에서 처리됨. 앱은 콜백에서 allowlist만 판정 |
| 필요한 코드 | users 테이블 또는 env 해시, verify 로직, rate limit | `signIn` 콜백의 allowlist 비교뿐 |
| 외부 리소스 | 없음 | GitHub OAuth App 생성(사용자 승인 필요) |
| 소유자 1명 적합도 | 과함 | 적합 |

선택: next-auth v4 + GitHub OAuth, 허용 계정 allowlist.

선택 근거는 1명 전용이라 users 테이블, 비밀번호 저장, 재설정, 로그인 rate limit이 필요 없다는 점이다. next-auth v4는 candanta가 같은 Next.js 16에서 사용 중인 검증된 조합이라 채택하고, Auth.js v5 beta는 쓰지 않는다. Credentials를 택하면 위 표의 부가 요건(특히 로그인 rate limit)이 필수가 된다. 이 선택은 10절의 사용자 확인 항목이다.

### 인증/인가 상세 요건

1. 세션 전략: JWT 세션(DB 세션 테이블 없음). 만료는 짧게(권장 8시간 이하, 값은 개발자가 상수로 둠). 로그아웃 지원.
2. allowlist 판정: GitHub 숫자 user id(불변)로 비교한다. 로그인 이름(login)이나 이메일은 변경/재사용 가능하므로 판정 기준으로 쓰지 않는다. allowlist 값은 환경변수로 두며 코드에 하드코딩하지 않는다.
3. allowlist 미일치 로그인은 `signIn` 콜백에서 거부하고 세션을 발급하지 않는다. 거부 사유를 화면에 구체적으로 노출하지 않는다(계정 존재 여부 유추 방지).
4. `src/proxy.ts` 보호 범위: `/admin/**`(로그인 페이지 `/admin/login` 제외)와 `/api/admin/**`. 공개 경로(`/`, `/projects`, `/about`, `/blog`, `/contact`, `/work/*`)에는 인증 검사를 걸지 않는다.
5. 미인증 페이지 접근은 `/admin/login?from=`으로 리다이렉트, 미인증 `/api/admin/**`는 401 JSON.
6. proxy만 믿지 않는다: 모든 admin 데이터 읽기/쓰기 진입점(Route Handler 또는 Server Action, admin 페이지의 서버 컴포넌트 데이터 조회 포함)이 각자 서버에서 세션과 allowlist를 재검사한다. 검사 실패 시 401(미인증) 또는 403(비허용 계정, `HttpStatusCode` enum 사용).
7. 공통 가드 함수 1개(예: 세션+allowlist 검증)를 만들어 모든 진입점이 호출한다. 진입점마다 검사 로직을 복붙하지 않는다.
8. CSRF: 쿠키 인증을 쓰는 상태 변경 요청(POST/PUT/PATCH/DELETE)에 대해 Origin(또는 Host 일치) 검사를 적용한다. next-auth 쿠키는 SameSite=Lax 이상을 유지한다. Server Action은 프레임워크 기본 Origin 검사를 쓰고, Route Handler는 직접 검사한다.
9. 로그인 rate limit: GitHub OAuth에서는 앱이 비밀번호를 받지 않으므로 별도 DB rate limit 테이블을 만들지 않는다(필수 아님). Credentials로 바꾸면 필수 요건으로 승격한다.
10. admin 페이지 noindex: `/admin/**` 레이아웃의 metadata에 `robots: { index: false, follow: false }`, 응답 헤더 `X-Robots-Tag: noindex, nofollow`도 함께 적용. `/api/admin/**`에도 동일 헤더. 공개 sitemap/robots 파일은 현재 없으므로 admin 경로를 노출하는 링크를 공개 페이지(Navbar, Footer)에 두지 않는다.
11. admin 응답은 캐시되지 않아야 한다(`Cache-Control: no-store` 계열, 동적 렌더).
12. 에러 응답에 스택, SQL, 시크릿을 포함하지 않는다.

## 3. 기능 분해와 수용 기준

우선순위: P0 = 이번 사이클 필수, P1 = 같은 사이클 권장, P2 = 후속.

### F1. DB 스택 도입 (P0)

- Neon Postgres + Drizzle ORM(`neon-http`) + drizzle-kit 마이그레이션(`drizzle/`), candanta 구조를 따른다(`src/db/index.ts` 지연 초기화 패턴, `drizzle.config.ts`, `src/db/schema/portfolio.ts`).
- 수용 기준:
  1. `DATABASE_URL` 미설정 시 DB 접근 시점에 명확한 에러가 난다(빌드 시점 import만으로는 죽지 않음).
  2. 마이그레이션 파일이 `drizzle/`에 생성되어 커밋된다.
  3. `package.json`에 `db:generate`, `db:migrate`, `db:seed` 스크립트가 추가된다. `db:studio`와 `db:push`는 필요하지 않으면 추가하지 않는다.
  4. 도입 의존성은 7일 출시 대기 정책을 따르고, knip 통과(미사용 의존성 없음).
- Edge case: `neon-http` 드라이버는 interactive transaction을 지원하지 않는다고 알려져 있다. 프로젝트와 경험의 원자적 저장은 F4 수용 기준을 충족하는 수단(batch API 또는 다른 드라이버)을 개발자가 선택한다(검증 필요).

### F2. 공개 페이지 DB 조회 전환 (P0)

- 11개 사용처를 DB 조회로 바꾸고 `portfolio-data.ts`를 제거한다.
- 수용 기준:
  1. 공개 페이지 11곳이 `src/constants/portfolio-data.ts`를 더 이상 import하지 않고, 파일은 삭제된다(knip 통과).
  2. 같은 데이터를 쓰는 화면의 렌더 결과가 이전과 동일하다(seed 후 육안/e2e 비교).
  3. 조회는 서버 전용 서비스(`src/services/portfolio/portfolio-service.ts`, `import "server-only"`)에 모은다.
  4. props 전달 규칙: `profile`은 `layout.tsx`(서버)에서 조회해 `Navbar`와 `Footer`에 props로 넘긴다. `HeroSection`과 `AboutSection`은 `app/page.tsx`(서버)가 조회한 `profile`을 props로 받고, `about/page.tsx`가 같은 `AboutSection`을 쓰면 그 호출부도 `profile`을 넘긴다. `projects`와 `techTalks`는 각 `page.tsx`가 조회해 하위로 넘긴다. 클라이언트 컴포넌트가 서비스 모듈을 import하지 않는다.
  5. 프로젝트 카드 테마는 5절 규칙을 따른다.
  6. `/projects` 목록, 홈의 프로젝트 섹션, `/blog`(talks)는 DB의 정렬 순서(`sort_order`)대로 전체 항목을 표시한다. 홈이 일부만 보여주는 UI가 이미 있으면 "전체 N개 중 M개" 관계는 기존 표현을 유지하고 N은 DB 전체 개수 기준으로 계산한다(없으면 신규 추가하지 않는다).
- Edge case: 프로젝트 0개, talks 0개일 때 빈 상태 문구 표시(레이아웃 깨짐 없음). 실험(experience)이 0개인 프로젝트 상세는 섹션 없이 헤더만 표시. `thumbnail` 없는 프로젝트는 현재와 같은 대체 표현.

### F3. admin 인증/인가 (P0)

- 2절의 요건 전체. 수용 기준:
  1. 비로그인 상태로 `/admin`, `/api/admin/*` 접근 시 각각 로그인 리다이렉트, 401.
  2. allowlist 외 GitHub 계정은 로그인 불가.
  3. proxy를 우회하는 직접 호출(예: 내부 fetch, 직접 Server Action 호출)도 가드 함수에서 거부됨을 테스트로 증명.
  4. `/admin/**` 응답에 noindex 헤더/메타 존재.
  5. Origin이 다른 상태 변경 요청은 거부(403).

### F4. 프로젝트 CRUD + 경험(experience) 편집 (P0)

- 필드: slug, title, period, role, summary, link(선택), thumbnail(선택), techStack(문자열 목록), 노출 순서, experiences(여러 개; 각각 title, problem, solution, tradeoff 3필드, result, learning, links 0~N).
- 수용 기준:
  1. 목록, 생성, 수정, 삭제가 동작한다. 삭제는 확인 단계(확인 대화상자 등)를 거치고 하위 experiences도 함께 삭제된다.
  2. 입력은 서버에서 zod(`src/schemas/portfolio.schema.ts`)로 재검증한다(클라이언트 검증만 믿지 않음). 필수: slug, title, period, role, summary. 길이 상한을 두어 과도한 payload를 거부한다(권장: 단문 필드 200자, 긴 본문 필드 5000자, 목록 항목 수 상한 50. 정확한 값은 개발자가 상수로 확정).
  3. 프로젝트 저장 시 프로젝트와 experiences가 부분 반영되지 않는다(전부 저장 또는 전부 미저장). 중간 실패 시 이전 상태가 유지된다.
  4. 유일성: slug 유일성은 DB 유니크 제약으로 보장한다(서버 로직의 사전 조회는 보조일 뿐). 동시 요청으로 중복 생성되면 한 건은 409 + 사용자용 메시지로 응답한다.
  5. slug 형식은 소문자, 숫자, 하이픈(`^[a-z0-9]+(-[a-z0-9]+)*$`)이며 생성 후 변경 불가(URL 호환, 9절 참조).
  6. 링크 URL(`link`, experience `links[].url`)은 `http:` 또는 `https:`만 허용한다(`javascript:` 등 거부). 거부 시 필드 단위 에러 메시지.
  7. 텍스트 필드는 일반 텍스트로 저장/렌더되며 HTML/마크다운으로 해석하지 않는다(현재 `whitespace-pre-line`로 줄바꿈 유지, 리스트 `- ` 접두어도 일반 텍스트).
  8. 저장 성공 시 6절에 따라 공개 페이지가 갱신된다.
  9. 존재하지 않는 id/slug 수정 또는 삭제는 404. 성공 후 목록 화면에 반영된다.
- Edge case: tradeoff.rationale 등 빈 문자열은 허용(기존 `endo-report` 데이터에 빈 rationale 존재, 상세 페이지는 빈 항목을 숨김). experience 제목 중복 허용(현재 `key={experience.title}` 사용이 중복 시 문제이므로 렌더 key를 DB id로 바꿈). 저장 중 네트워크 오류 시 입력값이 화면에서 사라지지 않음.

### F5. 경험·기술스택 목록 편집 UX (P1)

- 순서 변경은 위/아래 이동 버튼(드래그앤드롭 라이브러리 추가 없음). 수용 기준: 순서 변경 후 저장하면 공개 페이지에 같은 순서로 노출. techStack/links/skills 항목의 추가, 삭제, 순서 변경 가능.

### F6. 프로필 편집 (P0)

- 대상: name, title, tagline, description, email, github, skills. 단일 레코드 수정만 있다(생성/삭제 없음).
- 수용 기준: 수정 시 서버 zod 검증(email 형식, github는 https URL), 저장 후 모든 공개 페이지(layout 메타데이터 포함)에 반영. tagline의 `\n` 줄바꿈이 보존됨.
- 프로필 레코드가 없으면(seed 전) 공개 페이지는 6절의 장애 규칙을 따른다.

### F7. 프로젝트/talk 표시 순서 (P0)

- 모든 목록은 `sort_order` 컬럼 오름차순. 신규 생성 시 맨 뒤. 순서 변경은 F5의 이동 버튼(프로젝트 목록, talks 목록 각각).
- 수용 기준: 동일 `sort_order`가 생겨도 결정적 순서(보조 정렬 키 `created_at`, `id`).

### F8. 기술 발표(tech talks) CRUD (P0)

- 필드: slug(id), title, date, venue, description, impact, link, 순서. 수용 기준은 F4와 동일 규칙(zod 서버 검증, slug 유니크 제약, link http/https만, 삭제 확인).
- `date`는 현재 `"2025.06"` 형식 문자열이다. 기본값: 문자열로 유지하되 `YYYY.MM` 형식 검증(날짜 타입 변환은 하지 않음).

### F9. 기존 데이터 seed 이전 (P0)

- 수용 기준:
  1. 현재 `profileData` 1건, `projects` 5건(experiences 합 9건: globber 2, dpm-core 1, semt 3, endo-admin 1, endo-report 2), `techTalks` 2건이 seed로 DB에 들어간다.
  2. seed는 멱등(slug 기준 upsert 또는 이미 데이터가 있으면 건너뜀)이라 여러 번 실행해도 중복이 생기지 않는다.
  3. seed 후 모든 공개 페이지가 이전과 동일하게 렌더된다. 문자열은 `\n` 포함 원문 그대로(`solution` 등의 줄바꿈 목록 보존).
  4. 기본 정렬(`sort_order`)은 현재 배열 순서이고, 프로젝트 순서는 `globber, dpm-core, semt, endo-admin, endo-report`.
  5. 환경(로컬, Preview 브랜치, Production)별 실행 방법이 문서화된다. 대상 DB를 오인하지 않도록 실행 전 접속 대상 호스트를 출력해 확인한다.
- 일회성 이전이므로 사이클 마지막에 seed 스크립트와 `portfolio-data.ts`를 함께 제거할지는 10절에서 확인한다. 기본값: Production seed 검증 후 후속 커밋에서 제거(knip이 미사용 파일로 잡기 전까지는 knip entry 또는 ignore 등록).

### F10. admin 로그아웃과 세션 만료 처리 (P1)

- 로그아웃 버튼, 세션 만료 시 저장 중이던 편집에서 401을 받으면 로그인 페이지로 이동하되 입력 내용 유실 경고. 수용 기준: 만료 후 저장 시도는 데이터를 쓰지 않음.

### F11. 변경 감사 로그 (P2)

- 누가 언제 무엇을 바꿨는지 기록. 소유자 1명이라 이번 사이클에서는 하지 않는다(11절).

## 4. DB 설계 초안

개발자가 최종 확정한다. 아래는 요구를 충족하는 최소 설계다.

### 테이블

| 테이블 | 컬럼 | 비고 |
| --- | --- | --- |
| `profile` | id(고정값 1, check 제약으로 단일 행 보장), name, title, tagline, description, email, github, skills text[], updated_at | 단일 행. skills는 순서 있는 문자열 배열 |
| `projects` | id(uuid, pk), slug(unique, not null), title, period, role, summary, link(null), thumbnail(null), tech_stack text[], sort_order int, created_at, updated_at | slug가 공개 URL 식별자 |
| `experiences` | id(uuid, pk), project_id(fk projects.id, on delete cascade), sort_order int, title, problem, solution, tradeoff_advantages, tradeoff_disadvantages, tradeoff_rationale, result, learning, links jsonb, created_at, updated_at | tradeoff 3필드는 평탄화(not null default ''). 인덱스: (project_id, sort_order) |
| `tech_talks` | id(uuid, pk), slug(unique, not null), title, date, venue, description, impact, link, sort_order int, created_at, updated_at | slug 초기값은 기존 id(`mcp-llm-talk` 등) |

### 저장 방식 결정과 근거

1. skills와 techStack: `text[]`. 항상 통째로 읽고 쓰며, 개별 조회/조인이 필요 없고, 배열 순서가 곧 표시 순서다. 별도 테이블은 YAGNI.
2. experience links: `jsonb`(`[{label, url}]`). experience에 종속되고 단독 조회가 없으며 순서가 있다. 쓰기 경계에서 zod로 형태를 검증하므로 DB에는 형태 제약을 두지 않는다. 통계/검색 요구가 생기면 테이블로 분리.
3. tradeoff: 별도 테이블 없이 컬럼 3개로 평탄화(1:1 관계).
4. 정렬: 각 목록 테이블에 `sort_order`. 정렬 순서가 데이터 의미이므로 id 순서에 의존하지 않는다.
5. 유일성: `projects.slug`, `tech_talks.slug`는 DB 유니크 제약. `profile`은 id=1 check 제약으로 단일 행을 DB에서 보장.
6. 삭제: 프로젝트 삭제는 experiences를 cascade로 삭제. 소프트 삭제 없음(P2, 복구는 백업/Neon 브랜치 복원에 의존).
7. 통화/단위 변수명 규칙은 해당 없음. 파일명은 kebab-case(`src/db/schema/portfolio.ts`, `src/schemas/portfolio.schema.ts`).

### 타입

- `Project`, `Experience`, `TechTalk`, profile 타입은 zod 스키마 또는 Drizzle 스키마에서 파생하거나 `src/types/portfolio.ts`에 유지하되 단일 원본을 정한다(중복 정의 금지). `Project.id`는 `string`(slug)이 된다(5절).

## 5. ProjectId와 URL 호환

1. `ProjectId` 리터럴 유니언을 폐기하고 프로젝트 식별자를 `slug: string`으로 둔다. 공개 URL의 `[id]` 세그먼트 값은 slug다.
2. 기존 `/work/globber`, `/work/dpm-core`, `/work/semt`, `/work/endo-admin`, `/work/endo-report`는 seed의 slug가 기존 id와 같아 URL이 그대로 유지된다. 라우트 경로는 `/work/[id]`를 바꾸지 않는다(리다이렉트 불필요).
3. slug는 생성 후 변경 불가. 변경이 필요하면 삭제 후 재생성이며, 이때 기존 URL은 404가 된다(리다이렉트 테이블은 범위 밖).
4. `/work/[id]`는 `dynamicParams`를 허용하고(동적 렌더 후 캐시) `generateStaticParams`는 DB의 slug 목록을 반환한다. 존재하지 않는 slug는 `notFound()`.
5. `generateMetadata`와 페이지 본문이 같은 요청 안에서 중복 조회하지 않도록 한다(요청 단위 dedupe는 개발자 선택).
6. `src/constants/project-card-theme.ts`의 `Record<ProjectId, ...>`는 동적 id를 지원하지 못한다. 기본값: 기존 5개 색상 조합을 순서 있는 팔레트 배열로 바꾸고, 프로젝트의 `sort_order` 순번(0부터)으로 팔레트를 순환 선택한다. 현재 5개 프로젝트는 현 순서에서 같은 색을 유지하고, 6번째 이후는 처음부터 순환한다. 프로젝트별 색상 저장 컬럼은 만들지 않는다(10절 확인 항목).
7. `ProjectCard`, `work/[id]/page.tsx`, `projects/page.tsx`, `page.tsx`의 `project.id` 사용은 `project.slug`로 바꾸며, 렌더 key는 DB id를 쓴다.

## 6. 공개 페이지 조회와 캐시

### 기본 전략: 정적 렌더 유지 + admin 수정 시 on-demand revalidate

- 근거: 공개 페이지는 방문 빈도에 비해 수정이 드물고(소유자 1명), 현재 정적 성능과 SEO 특성을 유지하며 DB 부하를 최소화한다. 매 요청 동적 조회는 Neon 콜드 스타트 지연을 방문자에게 그대로 노출한다.
- 수용 기준:
  1. admin의 모든 쓰기 성공 직후 영향받는 공개 경로가 무효화된다. 프로필은 layout 메타데이터와 Navbar/Footer에 쓰이므로 사이트 전체, 프로젝트는 홈, `/projects`, `/work/{slug}`, talks는 홈과 `/blog`. 단순함을 위해 모든 쓰기에서 사이트 전체 무효화로 구현해도 된다(쓰기 빈도가 낮아 비용 무시 가능).
  2. 무효화 호출은 쓰기 트랜잭션 성공 이후에만 실행한다(실패한 쓰기가 캐시를 비우지 않음).
  3. 트리거 주체: 소유자의 admin 저장/삭제 액션이 서버에서 직접 호출한다. 크론이나 외부 webhook은 필요 없다.
  4. 수정 후 새로고침 시 공개 페이지에 변경이 보인다(e2e로 검증).
  5. 최초 배포 시 빌드가 DB에 접근하므로 Preview/Production 빌드 환경에 `DATABASE_URL`이 필요하다(8절).
  6. 정확한 API(`revalidatePath`/`revalidateTag`, 캐시 컴포넌트 사용 여부)는 Next.js 16 문서를 확인해 개발자가 선택한다.

### DB 장애 시 공개 페이지 동작

1. 이미 생성되어 캐시된 페이지: 재검증 중 DB 조회가 실패하면 마지막 정상 페이지를 계속 제공한다(stale 허용).
2. 캐시 없는 최초 렌더(신규 slug 첫 방문, 신규 배포 직후)에서 DB 실패: 500 계열 에러 페이지(`error.tsx`)로 처리하고 에러는 서버 로그에 남긴다. 코드 내 하드코딩 fallback 데이터는 두지 않는다(데이터가 두 곳에 생겨 어긋나는 문제 방지).
3. 빌드 시점 DB 실패: `generateStaticParams`는 실패해도 빌드를 깨지 않도록 빈 배열로 폴백하고(해당 페이지는 첫 요청 시 렌더), 프로필 조회 실패로 layout을 정적 생성할 수 없는 경우 빌드가 실패해 잘못된 빈 사이트가 배포되는 일을 막는다(배포 실패가 낫다).
4. "존재하지 않음"(404)과 "조회 실패"(5xx)를 구분한다. DB 에러를 `notFound()`로 삼키지 않는다.
5. admin 화면은 DB 장애 시 사용자용 에러 메시지를 보여주고 쓰기는 실패로 응답한다.

## 7. 비기능 요구사항

- 보안: 2절 요건. 시크릿은 환경변수로만, 서버 전용 모듈에 `import "server-only"`. 서비스 계층이 쿼리를 파라미터 바인딩(Drizzle)으로만 수행(문자열 연결 SQL 금지).
- 입력 검증: 서버에서 zod가 신뢰 경계. 실패 시 400 + 필드별 에러.
- 접근성: admin 폼 필드에 label 연결, 에러 메시지는 필드에 연결(`aria-describedby` 등), 키보드만으로 CRUD 가능, 삭제 확인 대화상자 포커스 관리.
- 반응형: admin은 데스크톱 우선이며 모바일에서 깨지지 않는 수준(목록과 폼이 가로 스크롤 없이 사용 가능)이면 충분. 스타일은 `tailwind.md` 규칙(px spacing, `globals.css` 토큰)을 따른다.
- 성능: 공개 페이지는 캐시된 정적 응답이라 현재 성능을 유지한다. admin은 성능 기준을 두지 않는다.
- 이미지: `<img>` 금지, `<Image>`에 width/height 또는 fill 명시(`nextjs.md`). 썸네일이 외부 https URL이면 `next.config.ts`의 `images.remotePatterns`에 등록된 호스트만 허용하는 검증이 필요하다(미등록 호스트는 런타임에서 깨지므로 admin 저장 단계에서 거부).
- 하네스 준수: 코드 주석/문서에 em-dash 금지, 주석은 명사형 종결, 파일명 kebab-case, HTTP 상태는 `HttpStatusCode`, Route Handler GET에 DB write 금지, `knip`/`biome`/`harness-sync` 통과.
- 테스트: 가드 함수(미인증 401, 비허용 403, 허용 통과), zod 스키마(URL 스킴, slug 형식), slug 중복 409, seed 멱등성, 쓰기 후 revalidate 호출, 공개 페이지 e2e(seed 후 렌더 동일, admin 수정 후 반영).

## 8. 환경변수와 배포 경로

| 변수 | 용도 | 설정 위치 |
| --- | --- | --- |
| `DATABASE_URL` | Neon 연결 문자열. 빌드(정적 생성)와 런타임, 마이그레이션, seed 모두 필요 | Vercel Production/Preview, 로컬 `.env.local` |
| `NEXTAUTH_SECRET` | JWT 서명 키 | Vercel, 로컬 |
| `NEXTAUTH_URL` | 콜백 기준 URL | Vercel Production, 로컬 |
| `GITHUB_ID`, `GITHUB_SECRET` | GitHub OAuth App | Vercel, 로컬(환경별 OAuth App 분리) |
| `ADMIN_GITHUB_ID` | 허용할 GitHub 숫자 user id (복수면 쉼표 구분 허용) | Vercel, 로컬 |

- 환경 분리: Production은 Neon `main` 브랜치, Preview(develop)와 로컬은 별도 Neon 브랜치를 사용해 Production 데이터를 건드리지 않는다.
- GitHub OAuth App은 콜백 URL이 고정이어야 한다. Preview 배포 URL은 가변이므로 Preview에서는 admin 로그인을 지원하지 않고(공개 페이지 조회만), 로그인 검증은 로컬 OAuth App(localhost)과 Production에서 한다. 이 기본값은 10절에서 확인한다.
- 마이그레이션 적용 경로: 기본값은 소유자가 환경별로 `pnpm db:migrate`를 수동 실행한다(코드 배포 전에 선행). CI 자동 적용(candanta의 deploy.yml 방식)은 이번 사이클에서 만들지 않는다. 마이그레이션은 하위 호환(컬럼 추가 중심)을 유지해 배포 순서가 어긋나도 공개 페이지가 깨지지 않게 한다.
- 크론 등 능동 트리거는 필요 없다(알림/주기 생성 기능 없음, 6절 3번 참조).
- 외부 리소스 생성(Neon 프로젝트/브랜치, GitHub OAuth App, Vercel 환경변수)은 사용자 승인 후 진행하며, 에이전트는 시크릿 값을 파일이나 로그에 남기지 않는다.

## 9. 모호한 항목별 권장 기본값

| 모호한 항목 | 권장 기본값 | 근거 |
| --- | --- | --- |
| admin 사용자 수 | 소유자 1명 | 포트폴리오 주인 1명. users 테이블과 역할 모델 없음 |
| admin 로그인 방식 | GitHub OAuth + 숫자 id allowlist | 2절 비교. 비밀번호 저장/재설정/rate limit 불필요 |
| 이미지 업로드 | 범위 밖. 썸네일은 경로(`/images/...`) 또는 허용 호스트 https URL 입력만 | 업로드는 스토리지(Vercel Blob 등) 추가 인프라. 기존 정적 이미지는 저장소에 커밋해 사용 |
| 공개 페이지 렌더링 | 정적 + 수정 시 on-demand revalidate | 6절 |
| DB 프로비저닝 | 사용자가 Neon 프로젝트/브랜치, Vercel 환경변수, GitHub OAuth App 생성. 에이전트는 마이그레이션 SQL, 환경변수 목록, 절차 문서까지 제공 | 외부 리소스 생성은 사용자 승인 필요(`00-input.md`) |
| profileData 편집 대상 여부 | 대상. `profileData`, `projects`, `techTalks` 모두 DB 이전과 편집 | 요청이 파일 전체를 지목. profile은 단일 행 수정만 |
| 프로젝트 카드 색상 | 순서 기반 팔레트 순환 | 5절 6번 |
| slug 변경 | 불가 | URL 호환 |
| 동시 편집 | 마지막 저장 우선(소유자 1명). 충돌 감지는 P2 | 단일 편집자 |
| 삭제 | 하드 삭제 + 확인 단계 | 소프트 삭제는 과함 |

## 10. 사용자 확인 필요

반드시 확인이 필요한 항목이다. 확인 전에는 아래 기본값으로 진행하지 않고 T03(디자인) 시작 전 답을 받는다.

1. admin 아키텍처 A안(같은 프로젝트 `/admin`) 승인 여부 (2절).
2. admin 로그인 방식: GitHub OAuth + allowlist(권장) vs Credentials + bcrypt. 소유자의 GitHub 숫자 user id 제공 방법, OAuth App 생성 가능 여부.
3. 외부 리소스 생성 주체와 시점: Neon 프로젝트/브랜치(Production, Preview/개발), Vercel 환경변수 설정, GitHub OAuth App(로컬/Production). 에이전트가 Neon MCP로 직접 생성해도 되는지 여부 포함.
4. Preview(develop)에서 admin 로그인을 지원할지(고정 URL 필요) 아니면 로컬/Production에서만 할지.
5. 마이그레이션 적용 방식: 소유자 수동 `pnpm db:migrate`(권장) vs CI 자동 적용.
6. seed 실행 후 `portfolio-data.ts`와 seed 스크립트 제거 시점(권장: Production seed 검증 후 후속 커밋).
7. 이미지: 업로드 없이 경로/URL 입력만 하는 범위로 확정해도 되는지.
8. 기존 URL 외 slug 변경 시 리다이렉트가 필요한지(권장: 불필요, slug 불변).

## 11. 범위 밖

- 이미지 업로드와 스토리지 연동
- 다중 사용자, 역할/권한 모델, 초대, 이메일 인증, 비밀번호 재설정
- 모노레포 전환(B안) 및 admin 별도 앱 분리
- 변경 감사 로그, 버전 이력, 되돌리기, 소프트 삭제, 휴지통
- 드래그앤드롭 정렬, 리치 텍스트/마크다운 에디터, 미리보기 기능
- slug 변경 리다이렉트, 다국어, 콘텐츠 예약 발행
- 동시 편집 충돌 감지
- 블로그/기술 글 신규 콘텐츠 타입, 연락처 폼 백엔드(`contact` 페이지의 동작 변경)
- CI 마이그레이션 자동화, DB 백업 자동화
- Rate limit 인프라(GitHub OAuth 선택 시)
- 데이터 외 디자인 변경(공개 페이지의 시각 디자인은 현재와 동일 유지)

## 12. 검증 시 주의

- 공개 페이지는 seed 전후 렌더 비교로 회귀를 확인한다(문자열 줄바꿈, 빈 rationale, 썸네일 없는 프로젝트).
- 인증 우회 테스트는 proxy를 거치지 않는 호출 경로까지 포함해 가드 함수 단독으로 검증한다.
- 환경변수 누락(`DATABASE_URL`, `NEXTAUTH_SECRET`, `ADMIN_GITHUB_ID`) 시 admin이 열려버리는 fail-open이 없어야 한다: `ADMIN_GITHUB_ID`가 비어 있으면 모든 로그인 거부(fail-closed).
- 의존성 추가분은 7일 출시 대기 정책과 knip 결과를 확인한다.

## T02 게이트 사용자 결정 (2026-10-12)

- 아키텍처: A안(같은 Next.js 프로젝트의 `/admin` 라우트) 승인.
- 인증: next-auth v4 + GitHub OAuth + GitHub 숫자 user id allowlist 승인.
- 외부 리소스: Neon 프로젝트·DB는 에이전트가 Neon MCP로 생성하고 연결 문자열을 `.env.local`에 기록한다. GitHub OAuth App과 Vercel 환경변수는 사용자가 직접 설정한다.
- 브랜치: `feature/admin-portfolio-cms` (develop에서 분기).
- 기본값 수용: 이미지 업로드 제외(경로/URL 입력만), slug 불변, Preview admin 로그인 미지원, 마이그레이션은 소유자 수동 `pnpm db:migrate`, `portfolio-data.ts`와 seed 스크립트는 Production seed 검증 후 후속 커밋에서 제거.
