# requirements: about 페이지 이력서 기반 재구성 (DB + admin 편집)

- 작성일: 2026-10-13 (T02 게이트 사용자 결정 최종 반영판)
- 작성자: Project Manager (T02)
- 입력: `00-input.md`, 기준 커밋 `ceb7b70` (develop)
- 브랜치: `feature/about-resume` (`develop`에서 분기, `docs/agent-rules/branch-strategy.md`)
- 참고한 현재 코드: `src/app/(public)/about/page.tsx`, `src/db/schema/portfolio.ts`, `src/services/portfolio/portfolio-service.ts`, `src/components/admin/profile-form.tsx`, `src/components/admin/sortable-list.tsx`, `src/app/api/admin/talk-order/route.ts`, `src/components/common/hero-section.tsx`

## 목차

- [1. 목적과 현재 상태](#1-목적과-현재-상태)
- [2. 확정된 사용자 결정](#2-확정된-사용자-결정)
- [3. 기능 분해와 수용 기준](#3-기능-분해와-수용-기준)
- [4. DB 설계 방향](#4-db-설계-방향)
- [5. 비기능 요구사항](#5-비기능-요구사항)
- [6. 배포와 운영 데이터](#6-배포와-운영-데이터)
- [7. 사용자 확인 필요](#7-사용자-확인-필요)
- [8. 범위 밖](#8-범위-밖)

## 1. 목적과 현재 상태

- 목적: about 페이지를 소개 문구 중심에서 이력서 기반 이력 화면으로 바꾸고, 이력 데이터를 DB에 두어 소유자 1명이 admin에서 추가/수정/삭제/정렬한다.
- 현재 about: `profile.tagline` 큰 문구, `.hello`(`profile.description`) + 장식 원, `.stack`(`profile.skills` 카드 그리드), CTA.
- `profile.skills`는 about의 `.stack`뿐 아니라 홈 히어로 순환 단어(`WordCycler`)와 스크린리더 문구에도 쓰인다(`hero-section.tsx`). 사용자가 홈 히어로 단어 변경을 허용했다.
- `tagline`은 홈 히어로, `description`은 홈 `about-section`에서도 쓰이므로 about에서만 제거하고 컬럼과 프로필 폼은 유지한다.
- 기존 `experiences` 테이블은 프로젝트 상세(problem/solution/result)용이다. 이번 이력 테이블과 코드 식별자, 라우트, UI 문구에서 겹치지 않아야 한다.
- 정적 상수 버전(scratchpad `about-page-static.tsx`)은 데이터 전사와 섹션 구성(`ResumeSection`, `ResumeList`, `TagList`)의 참고용으로만 쓴다. 최종은 DB 기반이다.

## 2. 확정된 사용자 결정

1. 데이터 모델: 테이블 1개 `resume_entries` + `kind` 구분. Tools는 `profile` 배열 컬럼에 두고 프로필 폼에서 편집한다.
2. 기간은 **텍스트 필드 하나**(`period`)로 저장하고 입력값을 그대로 표시한다. 예: "2024.07 - 2026.07", "2026.08 - 현재", "졸업 2024.08", "2024". 날짜 컬럼, 날짜 check 제약, 기간 변환 함수는 두지 않는다. 기간이 없는 항목(수상)은 빈 값을 허용하고, 빈 값이면 기간 칸을 표시하지 않는다.
3. 정렬은 **수동 정렬**이다. `kind`별 `sort_order`, 정렬 API, 위/아래 이동 UI를 기존 `project-order`/`talk-order` 방식(`ORDER_MISMATCH` 처리 포함)으로 둔다.
4. 홈 히어로 순환 단어가 `profile.skills` 변경으로 함께 바뀌어도 된다. "React / Vue.js", "Emotion / TailwindCSS"처럼 묶인 항목은 한 항목씩 분리해 저장한다.
5. 학점은 비공개(학력 항목에 학점을 넣지 않는다). 연락처는 contact 페이지에 있으므로 about에는 넣지 않는다.
6. 섹션은 이력서처럼 각각 분리한다(수상, 자격, 어학도 별도 섹션). 섹션 순서와 `.xxx` 라벨 스타일은 3절 F5의 안으로 확정한다.
7. 운영 DB 마이그레이션, 시드, `profile.skills` 갱신은 사용자 승인 완료. 단 다른 세션이 DB 작업 중이므로 **적용 직전에 orchestrator가 그 세션과 메시지로 조율한 뒤 orchestrator가 직접 실행**한다(6절).

## 3. 기능 분해와 수용 기준

우선순위: P0 = 이번 사이클 필수, P1 = 같은 사이클 권장, P2 = 후속.

### F1. 이력 스키마와 마이그레이션 (P0)

- 방향: 4절. `resume_entries` 테이블 신설 + `profile.tools` 컬럼 추가.
- 수용 기준:
  1. drizzle 마이그레이션 파일이 `drizzle/`에 생성되어 커밋된다.
  2. `kind`는 허용 6개 값(work, education, activity, award, certification, language)만 DB check 제약으로 허용한다.
  3. 기존 `experiences`, `projects`, `tech_talks`, `profile` 기존 컬럼은 변경 없음(추가만).
  4. 코드 식별자, 타입명, 라우트, 한국어 UI 문구에서 "experience"를 이력 항목 이름으로 쓰지 않는다(기존 `Experience`, `ExperienceLink`, `experience-list-editor`와 구분).
- Edge case: `profile.tools` 신규 컬럼은 기본값 빈 배열이어서 기존 행이 깨지지 않는다.

### F2. 서비스와 타입 (P0)

- 수용 기준:
  1. 읽기는 `portfolio-service.ts`와 같은 서버 전용 서비스에 둔다(`import "server-only"`, `cache` 패턴 유지). `kind`별 `sort_order, created_at, id` 순.
  2. 공개 페이지는 Route Handler를 거치지 않고 서비스를 직접 호출한다.
  3. 쓰기 로직(생성/수정/삭제/정렬)은 기존 `portfolio-admin-service.ts` 패턴을 따른다. 정렬 요청이 해당 `kind`의 현재 전체 id 집합과 다르면 기존 `ORDER_MISMATCH`와 같은 방식으로 거부한다.
  4. 새 항목은 해당 `kind`의 마지막 순서에 붙는다.
  5. Zod 스키마는 `src/schemas/portfolio.schema.ts`의 기존 패턴으로 추가한다(`kind` enum, `period` 선택 문자열과 길이 상한, `title` 필수, `subtitle` 선택, `details` 항목 수/길이 상한).
- 확인 필요(개발자): 이력 항목은 slug가 없어 id(uuid)로 식별한다. 기존 `SortableList`(slug 키 전제)를 id 키로 일반화할지 얇게 분리할지는 기존 컴포넌트 재사용 우선으로 결정한다. 요구사항은 "정렬/삭제/편집 이동 동작이 projects/talks와 동등"까지다.

### F3. admin 이력 관리 화면 (P0)

- 기존 projects/talks 패턴을 재사용한다: 목록 페이지 + 새 항목 + 편집 + 삭제 확인 + 위/아래 정렬 저장.
- 수용 기준:
  1. admin 내비게이션에서 이력 화면에 진입할 수 있다. 화면은 `requireAdminPage()`로 보호된다.
  2. 목록은 `kind`(섹션)별로 구분되어 표시되고, 각 섹션에서 항목 추가/편집/삭제/위아래 이동이 된다.
  3. 항목 폼 필드: 구분(kind, 생성 시 선택), 기간(period, 선택 텍스트), 제목(title), 부제(subtitle, 선택), 세부 목록(details, 0개 이상, 기존 `StringListEditor` 재사용). 학점 필드는 없다.
  4. 저장/삭제/정렬 후 공개 about가 갱신된다(캐시 무효화는 기존 `revalidatePath("/", "layout")` 방식과 동일).
  5. Tools 편집은 기존 프로필 폼에 `StringListEditor` 한 개를 추가한다(별도 화면 없음). 프로필 폼 저장 시 `profile.tools`가 함께 저장된다.
  6. 삭제는 기존 `ConfirmDialog` 확인을 거치고, 오류/인증 실패 메시지는 기존 `describeAuthFailure` 흐름을 따른다.
- Edge case:
  - 같은 섹션이 0개면 admin 목록에 빈 상태 문구와 "새 항목" 진입점이 보인다.
  - 두 탭에서 동시에 정렬/삭제하면 `ORDER_MISMATCH`로 새로고침 안내(기존 동작과 동일).
  - 존재하지 않는 id의 수정/삭제는 404 처리(기존 slug 라우트와 동일).
  - 중복 생성(더블 클릭): 유일성 키가 없으므로 DB 유일성 제약을 두지 않고, 저장 중 버튼 비활성(기존 `useAdminForm`의 saving 처리)으로 막는다. 동일 내용 항목 2개는 허용한다.
  - 동시 생성으로 `sort_order`가 같아지면 `created_at, id` 타이브레이커로 항상 같은 결과가 나온다.

### F4. admin API (P0)

- 기존 `src/app/api/admin/*` 구조를 따른다. 응답 형태(`ok`/`fail`, `CustomData<T>`)와 `adminRoute`, `parseJsonBody`를 쓴다.
- 수용 기준:
  1. 생성, 수정, 삭제, 정렬 엔드포인트가 모두 `adminRoute`로 감싸이고 미인증 401/비허용 계정 403이 기존과 동일하다.
  2. 입력은 Zod로 검증하고 실패 시 기존 오류 응답 형식을 쓴다.
  3. HTTP 상태 코드는 `HttpStatusCode` enum을 쓴다.
  4. 정렬 API는 기존 `talk-order`와 같은 형태로 `kind`별 id 목록을 받는다(경로/본문 세부는 개발자가 기존 규칙과 맞춘다).
  5. 프로필 API(`PUT /api/admin/profile`)는 `tools`(빈 배열 허용)와 분리 저장된 `skills`를 받아 저장한다.
- 트리거 주체: 모든 쓰기는 admin 사용자 액션(폼 저장, 삭제, 정렬 저장)이다. 크론이나 자동 생성은 없다.

### F5. 공개 about 페이지 재구성 (P0)

- 수용 기준:
  1. about에서 `profile.tagline` 문구, `.hello` 섹션(`profile.description`), 장식 원을 제거한다. 홈 등 다른 화면의 tagline/description 사용은 그대로다.
  2. 섹션 순서와 라벨(확정): `.experience`(work), `.stack`(profile.skills), `.tools`(profile.tools), `.education`, `.activities`, `.award`, `.certification`, `.language`, 마지막에 CTA. 수상, 자격, 어학은 각자 섹션이다.
  3. Skills는 `profile.skills`, Tools는 `profile.tools`, 나머지는 `resume_entries`의 `kind`별 조회 결과를 렌더한다.
  4. 항목이 0개인 섹션은 제목(라벨)째 숨긴다. 모든 섹션이 비어도 페이지는 깨지지 않고 CTA는 유지된다.
  5. `period`는 입력값 그대로 표시한다(변환/포맷 없음). 빈 값이면 기간 칸을 표시하지 않는다.
  6. 학력 항목에 학점이 표시되지 않는다. 전화번호/이메일도 about에 표시되지 않는다.
  7. 섹션 사이 간격을 현재보다 촘촘하게 조정한다. 구체 값은 디자이너(T03)가 정하되 Tailwind 규칙(px 환산, 토큰 사용)을 지킨다.
  8. 긴 제목/세부 항목은 `break-keep`로 줄바꿈되고 모바일에서 가로 스크롤이 생기지 않는다.
  9. 현재 `getProfile`이 던지는 `PortfolioNotSeededError` 동작은 유지한다.
- 시드 직후 기대 렌더(전사 확인용): 경력 3건, 학력 1건(학점 없음), 활동 7건, 수상 1건(기간 없음), 자격 1건, 어학 1건. 원문은 `00-input.md`와 같다.

### F6. 시드와 데이터 반영 (P0)

- 수용 기준:
  1. `db:seed`에 이력서 데이터(경력 3, 학력 1, 활동 7, 수상 1, 자격 1, 어학 1)와 `profile.tools`(Git/Github, Jira, Slack, Notion, Figma)를 추가한다. 학력의 학점은 넣지 않는다. `period`는 이력서 원문 표기 그대로 저장한다(예: "졸업 2024.08", "2024"). 항목의 `sort_order`는 이력서 표기 순서(위에서 아래)로 부여한다.
  2. 시드는 재실행해도 항목이 중복되지 않는다. 이미 admin에서 편집한 운영 데이터를 덮어쓰지 않는다.
  3. `profile.skills`는 한 항목씩 분리한 이력서 목록으로 갱신한다: React, Vue.js, TypeScript, Next.js, Vite, Tanstack Query, Emotion, TailwindCSS, Zustand, Playwright (10개). 홈 히어로 순환 단어가 이 순서로 바뀐다. 갱신은 시드와 분리된 데이터 변경이다.
  4. 운영 DB(Neon) 적용(마이그레이션, 시드, skills 갱신)은 사용자 승인 완료 상태다. 적용 직전에 orchestrator가 DB 작업 중인 다른 세션과 메시지로 조율한 뒤 orchestrator가 직접 실행한다. 구현자 subagent는 운영 DB에 직접 적용하지 않는다.
- Edge case: skills가 10개로 늘면 홈 히어로 순환 시간과 스크린리더 문구("title: a, b, ...")가 길어진다. 레이아웃이 깨지지 않는지 T07/T09에서 확인한다.

### F7. 검증 (P0)

- 수용 기준:
  1. 단위/통합 테스트: 이력 서비스(정렬 정합, `ORDER_MISMATCH`, 삭제, 빈 kind, 새 항목이 kind 마지막에 붙음), Zod 스키마(허용 kind 외 거부, 길이 상한, `period` 빈 값 허용).
  2. e2e 또는 컴포넌트 수준: admin에서 항목 추가 후 about에 표시, 순서 변경 반영, 삭제 반영, 빈 섹션 숨김, `period` 빈 항목의 기간 칸 미표시.
  3. 기존 `pnpm verify` 체인(lint, knip, 주석 규칙, em-dash 금지 포함) 통과. 신규 export는 모두 사용된다.
  4. 기존 projects/talks/profile admin 동작과 홈 히어로 렌더에 회귀가 없다(skills 변경에 따른 단어 변화는 예외).

## 4. DB 설계 방향

세부 컬럼 타입은 T03/T04에서 확정하되 방향은 아래와 같다.

- 테이블명 `resume_entries` (기존 `experiences`와 이름이 겹치지 않음).
- 컬럼 방향: `id`(uuid), `kind`(text + check), `sort_order`(integer), `period`(text, 빈 문자열 허용 또는 nullable), `title`(text), `subtitle`(text, nullable), `details`(text[] 기본 빈 배열), `created_at`, `updated_at`. 기존 `projects`/`tech_talks` 컬럼 스타일을 따른다.
- 정렬 인덱스는 기존 `*_order_idx` 방식으로 `(kind, sort_order, created_at, id)`.
- `profile.tools`: `text[]` not null 기본 빈 배열, 기존 `skills`와 같은 모양.
- 코드 명명: 타입 `ResumeEntry`, `ResumeKind`, 서비스 함수 `listResumeEntries` 계열, admin 경로 `/admin/resume`, API `/api/admin/resume-entries`(및 정렬 라우트)를 권장한다. 최종 경로는 개발자가 기존 규칙(`talks`, `talk-order`)과 맞춘다.
- 유일성 보장: 항목 식별은 uuid PK(DB 제약)이며 그 외 유일성 요구는 없다. 정렬 값 충돌은 타이브레이커로 처리한다.

## 5. 비기능 요구사항

- 보안: 모든 admin 쓰기는 `adminRoute`(세션+allowlist+Origin 검사)를 거친다. 공개 렌더에 raw HTML을 쓰지 않는다. 이력 텍스트에 링크 필드를 두지 않아 URL 검증 범위가 늘지 않는다.
- 접근성: 섹션 제목은 `h2`, 항목 제목은 `h3`. 기간은 텍스트로 제공하며 색 대비는 기존 흑백 토큰 규칙(`text-white/50` 이상)을 따른다.
- 성능: about는 서버 컴포넌트에서 서비스 직접 호출. 조회는 `kind`별 쿼리 N회가 아니라 한 번에 가져와 메모리에서 묶는 방식을 권장한다.
- 코딩 규칙: kebab-case 파일명, `server-only`, 클라이언트 캐시 라이브러리 미사용, Tailwind spacing=px 및 토큰만 사용, 주석 규칙(em-dash 금지, 명사형 종결) 준수.
- 과설계 금지: 버전 이력, 다국어, 공개/비공개 토글, 드래그 앤 드롭, 마크다운 에디터, 첨부 PDF, 날짜 컬럼/선택 라이브러리는 만들지 않는다.

## 6. 배포와 운영 데이터

- 배포 경로: 기존과 같다(`feature/about-resume` -> `develop` Preview -> 사용자 지시 후 `main` Production). 크론 없음, 신규 환경변수 없음.
- 순서 제약: 마이그레이션이 먼저 적용되지 않은 환경에 새 코드를 배포하면 about가 깨진다. Preview와 Production이 같은 DB일 수 있으므로 적용 시점과 배포 순서를 orchestrator가 관리한다.
- 데이터 순서: 마이그레이션 적용 -> 시드 + skills 갱신 -> 배포. 빈 `resume_entries`로 배포해도 about는 깨지지 않아야 한다(F5-4).
- 실행 주체와 조율: 사용자 승인은 완료되었다. 다른 세션이 DB 작업 중이므로 적용 직전에 orchestrator가 그 세션과 메시지로 조율(대상, 시점, 순서 합의)한 뒤 orchestrator가 실행한다.

## 7. 사용자 확인 필요

없음. 이전 확인 항목(정렬 방식, 기간 저장 방식, 섹션 순서/라벨, 수상 날짜, 운영 반영 주체)은 모두 결정되었다.

## 8. 범위 밖

- 이력서 PDF 다운로드/업로드, PDF 생성
- 홈의 `about-section`, 히어로 레이아웃 변경(skills 값 변경으로 인한 단어 변화 외)
- 기술 스택별 로고/아이콘, 숙련도 표시
- 이력 항목의 공개/비공개 토글, 다국어, 버전 관리
- 기존 `experiences`(프로젝트 경험) 테이블/화면 변경 또는 개명
- 연락처, 학점 필드 추가
- 새 인증/권한 체계(기존 admin 인증 그대로)
