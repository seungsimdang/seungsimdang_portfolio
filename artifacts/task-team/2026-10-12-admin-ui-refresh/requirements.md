# requirements: admin UI 개선 및 썸네일 업로드

- 작성일: 2026-10-12 (사용자 결정 Q1-Q13, A1-A5 반영 개정)
- 작성자: Project Manager (T02)
- 입력: `00-input.md`(7개 항목과 추가 사용자 결정), 직전 사이클 `artifacts/task-team/2026-10-12-admin-portfolio-cms/`(기준선), 사용자 Q1-Q13, A1-A5 답변
- 브랜치: `feature/admin-ui-refresh` (기준 커밋 `6fb558e`)
- 상태: T02 완료, 사용자 승인 게이트 대기(orchestrator 보류 지시). 진행 상태는 `summary.md` 참조

## 목차

- [1. 목적과 범위](#1-목적과-범위)
- [2. 현재 코드 근거](#2-현재-코드-근거)
- [3. 기능 요구사항](#3-기능-요구사항)
- [4. 비기능 요구사항과 제약](#4-비기능-요구사항과-제약)
- [5. 사용자 결정](#5-사용자-결정)
- [6. 사용자 작업](#6-사용자-작업)
- [7. 범위 밖](#7-범위-밖)
- [8. 완료 기준](#8-완료-기준)

## 1. 목적과 범위

- 직전 사이클의 admin CMS가 설계 의도(직전 design-spec 2, 3절)와 어긋난 부분과 UX 문제를 고친다.
- 썸네일을 텍스트 경로 입력 대신 파일 업로드(Vercel Blob, public)로 바꾸고, 기존 `/images` 썸네일은 Blob으로 일괄 이전한 뒤 `/images` 경로와 원본 파일을 같은 사이클 안에서 제거한다.
- 직전 사이클 후속 항목인 slug 변경 허용과 빌드 시 마이그레이션 자동 적용도 이번 사이클에 포함한다(사용자 결정). 마이그레이션 자동 적용은 Preview 전용 DB를 분리한 뒤 모든 빌드에서 적용한다.
- 공개 페이지의 URL, 시각 구성은 바꾸지 않는다. 단 DB 프로필 이름 값은 "SeungHyun Lee"로 바뀌므로 공개 헤더, 히어로, 푸터, 페이지 제목 메타데이터의 표시 이름이 함께 바뀐다.

## 2. 현재 코드 근거

| 사실 | 근거 경로 |
| --- | --- |
| 루트 레이아웃이 모든 경로에 Navbar, `main.pt-header`, Footer를 렌더함 | `src/app/layout.tsx` |
| `<html>`/`<body>`와 `generateMetadata`(profile.name 기반 title 템플릿)도 루트 레이아웃에 있음 | `src/app/layout.tsx` |
| `/admin` 레이아웃은 noindex 메타만 두고 children을 그대로 반환함 | `src/app/admin/layout.tsx` |
| 콘솔 레이아웃은 `requireAdminPage()` 후 헤더(둘째 줄 내비, sticky 아님, `session.user.name` 표시)와 본문을 렌더함 | `src/app/admin/(console)/layout.tsx` |
| 대시보드 페이지는 프로필, 프로젝트, 발표 3카드와 공개 `Button`을 씀 | `src/app/admin/(console)/page.tsx` |
| 공개 Navbar는 `fixed top-0 z-50 bg-black/50 backdrop-blur-md`, `py-24`, `max-w-content`, 하단 1px 구분선(`bg-white/25`), 링크 `text-sm`, 현재 100%/나머지 50% 불투명도 | `src/components/layout/navbar.tsx` |
| 공개 `Button`은 `px-32 py-16 text-base`, `AdminButton`은 `min-h-44 px-20 text-small`이며 variant가 primary, secondary, danger | `src/components/ui/button.tsx`, `src/components/admin/admin-button.tsx` |
| 목록 헤더 "새 프로젝트"/"새 발표"는 공개 `Button`을 씀 | `src/app/admin/(console)/projects/page.tsx`, `talks/page.tsx` |
| `SortableList`는 이동마다 `PUT /api/admin/{project-order,talk-order}`를 보냄, 실패 시 이전 상태 복원, 빈 목록의 생성 버튼도 공개 `Button` | `src/components/admin/sortable-list.tsx` |
| 순서 API는 성공 시 `revalidatePath("/", "layout")`로 사이트 전체 revalidate | `src/app/api/admin/project-order/route.ts` |
| 모든 이동, 삭제 버튼이 `AdminButton`(같은 pill 모양, 위로/아래로/편집/삭제 텍스트) | `sortable-list.tsx`, `list-editor.tsx`, `experience-list-editor.tsx` |
| `list-editor`는 기술 스택(`string-list-editor`), 링크(`link-list-editor`) 및 프로필 스킬이 공유하며, 삭제도 `variant` 없는 같은 버튼 | `list-editor.tsx`, `string-list-editor.tsx`, `link-list-editor.tsx` |
| 경험 카드의 위/아래/삭제는 카드 상단 한 줄에 같은 버튼 | `experience-list-editor.tsx` |
| 썸네일 폼은 텍스트 입력(라벨 "썸네일 경로", 힌트 "/images/... 만")이고 서버 검증은 `^/images/[A-Za-z0-9._/-]+$` + `..` 금지, 빈 문자열은 null 저장 | `src/components/admin/project-form.tsx`(197-204행), `src/schemas/portfolio.schema.ts`(`THUMBNAIL_PATTERN`, `isValidThumbnail`, `thumbnail`) |
| `isValidThumbnail`은 쓰기 검증과 공개 읽기 필터가 공유함 | `src/schemas/portfolio.schema.ts` |
| 프로젝트/발표 수정 스키마는 `slug`를 받지 않고(strictObject), 생성 스키마만 `slug`를 추가함. slug는 DB `unique` + 형식 check 제약 | `src/schemas/portfolio.schema.ts`, `src/db/schema/portfolio.ts` |
| DB `projects.thumbnail`은 nullable text 컬럼 하나 | `src/db/schema/portfolio.ts` |
| `next.config.ts`에 `images.remotePatterns`가 없음 | `next.config.ts` |
| 루트에 `not-found.tsx`, `error.tsx`, `global-error.tsx`가 있고 `not-found`는 `min-h-screen` 전체 화면 구성 | `src/app/not-found.tsx` 외 |
| admin 전용 `error.tsx`, `loading.tsx`, `not-found.tsx`가 콘솔 그룹 안에 이미 있음 | `src/app/admin/(console)/` |
| `AdminNav`의 첫 링크가 `/admin`(대시보드, exact) | `src/components/admin/admin-nav.tsx` |
| `build` 스크립트는 `next build`뿐이며 마이그레이션 단계가 없음. 마이그레이션은 수동 `db:migrate`(drizzle-kit) | `package.json` |
| CI는 `pnpm build`와 `pnpm test:e2e`에 `DATABASE_URL: secrets.E2E_DATABASE_URL`을 줌. 그 외 단계(knip, check, type-check)에는 환경변수 없음 | `.github/workflows/ci.yml` |
| 로컬 e2e 스크립트는 `.env.local`의 `E2E_DATABASE_URL`로 `DATABASE_URL`만 덮어써 build와 test:e2e를 실행함 | `scripts/run-e2e-local.sh` |
| e2e fixture가 `/images/...` 썸네일 경로를 씀 | `tests/e2e/fixtures/portfolio.ts` |

## 3. 기능 요구사항

우선순위: P0 = 이번 사이클 필수, P1 = 필수이나 P0 이후 순서로 진행 가능.

| ID | 기능 | 우선순위 | 원 항목 |
| --- | --- | --- | --- |
| F1 | admin 전용 레이아웃 분리(공개 Navbar/Footer 제거) | P0 | 1 |
| F2 | admin 헤더 재구성(공개 Navbar 틀, profile.name) | P0 | 2, 추가 결정 |
| F3 | 대시보드 제거와 `/admin` 리다이렉트 | P0 | 3 |
| F4 | admin 버튼 크기 통일 | P0 | 4 |
| F5 | 버튼 위계 분리(이동 아이콘, 편집 링크, 삭제 텍스트) | P0 | 5 |
| F6 | 목록 순서 변경을 draft + 저장 버튼 일괄 저장으로 전환 | P0 | 6 |
| F7 | 썸네일 파일 업로드(Vercel Blob public, Blob URL만 허용) | P0 | 7, A1 |
| F8 | DB 프로필 이름을 "SeungHyun Lee"로 변경 | P0 | 추가 결정, Q10, A4 |
| F9 | slug 변경 허용(프로젝트, 발표) | P1 | Q11 |
| F10 | 빌드 시 마이그레이션 자동 적용(Preview 전용 DB 분리, 모든 빌드) | P1 | Q12, A3 |
| F11 | 기존 `/images` 썸네일의 Blob 일괄 이전과 원본 삭제 | P1 | Q5, A2, A4 |

### F1. admin 전용 레이아웃 분리

- 목적: `/admin/**`(로그인 포함) 화면에 공개 Navbar, Footer, `pt-header` 래퍼가 렌더되지 않게 한다.
- 수용 기준
  - AC1: `/admin/login`, `/admin/projects` 등 모든 `/admin/**` 화면의 DOM에 공개 Navbar(`nav` 링크 home/projects/about/talks/contact)와 Footer가 없다.
  - AC2: 공개 경로(`/`, `/projects`, `/about`, `/blog`, `/contact`, `/work/[slug]`)의 URL, 렌더 결과(Navbar, Footer, `pt-header`)는 변경 전과 동일하다.
  - AC3: 라우트 그룹을 쓰더라도 URL 세그먼트는 변하지 않는다(그룹명은 URL에 포함되지 않음). 공개 URL이 하나도 바뀌지 않음을 e2e 또는 라우트 스냅샷으로 확인한다.
  - AC4: `<html lang="ko">`, `<body className="antialiased bg-black text-white">`, 전역 CSS와 폰트(pretendard) import는 공개/admin 양쪽에 동일하게 적용된다.
  - AC5: admin 화면의 noindex 메타(`robots: index false`)가 유지된다.
  - AC6: 공개 페이지의 title 템플릿(`%s | {profile.name}`)과 기본 메타데이터가 유지된다. admin 페이지는 기존처럼 `title.absolute`를 쓴다.
- 루트 파일 영향
  - `src/app/layout.tsx`는 현재 `<html>`/`<body>`와 Navbar/Footer를 한 파일에서 렌더한다. Next.js에서 `<html>`/`<body>`는 루트 레이아웃(들) 중 하나가 반드시 렌더해야 하므로 "루트에는 html/body만, 공개 쉘은 공개 라우트 그룹 레이아웃으로 이동" 또는 "여러 루트 레이아웃(그룹별 html/body)" 중 하나가 필요하다. 구현 방식은 개발자 선택이며, 공개 URL 불변과 AC4를 만족해야 한다.
  - `src/app/not-found.tsx`는 루트 not-found다. 미존재 URL(예: `/foo`)은 어느 그룹에도 속하지 않으므로 공개 쉘(Navbar/Footer) 유무가 변경 전과 같은지 확인해야 한다. 변경 전은 Navbar/Footer가 있는 상태다. 이 동작을 유지한다.
  - `src/app/error.tsx`와 `global-error.tsx`는 위치 이동 시 동작이 바뀔 수 있으므로 공개 페이지 오류 시 기존과 같은 화면이 나오는지 확인한다. admin 하위 오류는 기존 `admin/(console)/error.tsx`가 처리한다.
  - `src/proxy.ts`의 matcher와 인증 흐름은 변경하지 않는다.
- Edge case
  - 미인증 사용자가 `/admin/projects`로 접근하면 기존처럼 로그인으로 이동하며, 그 로그인 화면에도 공개 Navbar/Footer가 없다.
  - admin 하위 미존재 slug(`/admin/projects/없는슬러그`)의 404는 admin 쉘 안에서 표시된다(기존 `(console)/not-found.tsx`).
  - `/admin/없는경로`(그룹 어디에도 없는 경로)가 어떤 not-found를 쓰는지는 변경 전과 같은 결과를 우선한다. 달라지면 보고한다.

### F2. admin 헤더 재구성

- 목적: admin 헤더의 틀을 공개 Navbar와 동일하게 맞추고, 내용만 다르게 한다(사용자 결정).
- 수용 기준
  - AC1: 헤더는 `fixed top-0 left-0 right-0 z-50`, `bg-black/50 backdrop-blur-md`, 내부 `max-w-content mx-auto container-padding`, `py-24`, 하단 1px 구분선(`bg-white/25`)을 공개 Navbar와 같은 값으로 갖는다. 본문은 헤더 높이만큼 상단 여백을 둬 겹치지 않는다(공개 `pt-header`와 동일한 토큰 재사용 권장).
  - AC2: 810px 이상에서 한 줄(좌측 이름, 우측 링크군). 링크는 `text-sm`, 현재 페이지 불투명도 100%, 나머지 50%, hover 100%. 링크 간격은 공개와 같은 `gap-16 md:gap-48`.
  - AC3: 좌측 이름은 공개 Navbar와 같은 스타일(`text-xl font-medium`)이며 값은 DB 프로필 `profile.name`이다. GitHub 표시 이름(`session.user.name`)은 쓰지 않는다. 이름 링크의 대상은 `/admin/projects`다(사용자 결정 Q9).
  - AC4: 링크군은 admin 링크(프로필, 프로젝트, 발표), "사이트 보기"(새 탭 `/`), "로그아웃"이다. 대시보드 링크는 F3에 따라 제거한다.
  - AC5: 809px 이하에서 가로 스크롤이 생기지 않는다(`flex-wrap`으로 링크군이 아래 줄로 내려가는 것 허용). 모든 링크 터치 대상은 44px 이상을 유지한다.
  - AC6: `aria-current="page"`, "본문으로 건너뛰기" 링크, 키보드 포커스 표시는 유지된다.
  - AC7: 로그아웃은 기존 `SignOutButton` 동작을 유지한다. 공개 Navbar에는 admin 링크를 추가하지 않는다.
- Edge case
  - `getProfile()` 실패(프로필 미seed, DB 장애) 시 헤더가 깨지지 않는다. 이름을 못 읽으면 대체 문구("admin")로 표시하고 본문 오류 처리(기존 error.tsx)는 막지 않는다. 대체 문구는 개발자 제안 후 Designer 확정.
  - 이름이 긴 경우 `whitespace-nowrap shrink-0`로 줄바꿈되지 않고 링크군이 줄어든다(공개와 동일 규칙).
  - 로그인 화면(`/admin/login`)은 세션이 없으므로 로그아웃 링크를 표시하지 않는다. 로그인 화면 헤더 형태는 Designer 제안을 따른다(Q13).

### F3. 대시보드 제거

- 수용 기준
  - AC1: `/admin` 요청은 `/admin/projects`로 이동한다(서버 리다이렉트). 미인증이면 기존 인증 흐름이 우선한다(로그인으로 이동 후 `from` 보존 규칙은 기존과 동일).
  - AC2: `AdminNav`에서 대시보드 링크와 `exact` 분기가 제거된다.
  - AC3: 대시보드 전용 코드(페이지 본문의 3카드, 대시보드 메타)가 제거되고 knip(미사용 export 검사)을 통과한다.
  - AC4: 로그인 성공 후 기본 이동 목적지와 `/admin` 직접 진입 모두 최종적으로 `/admin/projects`에 도착한다.
- Edge case
  - 북마크된 `/admin` 접근, 로그인 후 `from=/admin` 복귀 모두 `/admin/projects`에 도착해야 한다.
  - 프로필 미seed 안내(직전 대시보드가 하던 "seed를 먼저 실행하세요" 안내)는 프로필 화면(`/admin/profile`)에서 이미 처리되는지 개발자가 확인하고, 처리되지 않으면 프로필 화면에서 같은 안내를 유지한다. 새 기능 추가가 아니라 기존 안내의 소실 방지다.
  - 직전 사이클 e2e와 테스트 중 대시보드를 가정한 것은 갱신한다.

### F4. admin 버튼 크기 통일

- 수용 기준
  - AC1: `src/app/admin/**`와 `src/components/admin/**`에서 공개 `src/components/ui/button.tsx`의 `Button`을 쓰지 않는다. 대상은 최소 목록 헤더 "새 프로젝트"/"새 발표"와 `SortableList` 빈 목록의 "새 {프로젝트|발표} 만들기"다. 로그인 화면과 not-found 등 다른 사용처가 있으면 같은 기준으로 확인한다.
  - AC2: 해당 버튼은 `AdminButton`의 크기(`min-h-44 px-20 text-small`)를 쓴다.
  - AC3: 공개 `Button`은 공개 페이지에서 변함없이 쓰인다(수정 금지).
  - AC4: 목록 헤더의 생성 버튼 위계(primary/secondary)는 Designer가 정한다. 현재는 secondary다.
- Edge case
  - `AdminButton`이 `href`를 받는 링크형이므로 생성 버튼도 링크로 유지한다.

### F5. 버튼 위계 분리

- 대상 범위(전부): 프로젝트/발표 목록(`sortable-list.tsx`), 프로젝트 편집의 경험 카드(`experience-list-editor.tsx`), `list-editor.tsx` 계열(기술 스택 `string-list-editor`, 링크 `link-list-editor`, 프로필 스킬).
- 수용 기준
  - AC1: 순서 이동은 작은 아이콘 버튼(↑ ↓)이다. 시각은 아이콘이지만 접근 가능한 이름(`aria-label`, 예: "{제목} 위로 이동")은 기존과 같은 정보량을 유지한다.
  - AC2: 아이콘 버튼의 터치 대상은 44x44px 이상이다(시각 크기가 작아도 히트 영역 확보).
  - AC3: 목록 행에서 편집은 별도 버튼이 아니라 행 제목을 편집 화면으로 가는 링크로 한다. 링크에는 제목 텍스트가 접근 가능한 이름이 된다.
  - AC4: 삭제는 빨간 텍스트 버튼이다. 색은 디자인 토큰만 사용한다(`docs/agent-rules/tailwind.md`). `--danger` 계열이 현재 어두운 배경에서 쓸 수 있는 토큰인지 Designer가 확인하고, 없으면 토큰을 `globals.css`에 추가한다(임의 값 금지). 색만으로 의미를 전달하지 않도록 "삭제" 텍스트를 유지한다.
  - AC5: 첫 항목의 위, 마지막 항목의 아래 버튼은 기존처럼 비활성이다.
  - AC6: 기존 확인 대화상자(목록 삭제), 포커스 이동, `aria-live` 안내 메시지 동작은 유지된다.
  - AC7: `list-editor` 계열의 항목 삭제(기술, 링크, 스킬)는 위계상 삭제 스타일을 따른다. 이 목록들은 이미 폼 저장 전까지 로컬 상태이므로 확인 대화상자 신설은 범위 밖이다.
- Edge case
  - 경험 카드의 이동/삭제 버튼 위치는 카드 헤더 영역에서 제목 줄과 정렬된다(Designer 확정). 모바일에서 가로 스크롤이 생기지 않는다.
  - 항목이 1개뿐이면 위/아래 모두 비활성이다.

### F6. 목록 순서 변경: draft + 저장 버튼

대상은 프로젝트 목록과 발표 목록이다(`sortable-list.tsx`). 경험 카드와 `list-editor` 계열은 이미 폼 저장 시점에 반영되는 로컬 draft이므로 변경 없다.

- 수용 기준
  - AC1: 위/아래 이동은 로컬 draft 상태만 바꾸고 네트워크 요청을 보내지 않는다.
  - AC2: draft 순서가 서버 저장 순서와 다르면 "저장" 버튼이 활성화되고, "순서가 변경되었습니다. 저장해야 반영됩니다" 류의 상태 안내를 표시한다. 같으면 저장 버튼은 비활성이다(이동 후 원위치로 돌려놓은 경우 포함).
  - AC3: "저장"을 누르면 한 번의 `PUT /api/admin/{project-order,talk-order}`로 현재 draft의 전체 slug 배열을 보낸다. 요청 중에는 저장 버튼과 이동/삭제 버튼을 비활성화하고 `aria-busy`를 표시한다.
  - AC4: 저장 성공 시 서버 기준 순서를 draft로 확정하고(변경 없음 상태), "순서를 저장했습니다" 안내를 `aria-live`로 알린다. 사이트 전체 revalidate는 저장 1회당 1번만 발생한다.
  - AC5: 저장 실패(네트워크, 5xx) 시 draft 순서는 사용자가 만든 상태를 유지하고(롤백하지 않음, 사용자 결정 Q8) 오류 문구와 재시도 가능한 저장 버튼을 보인다.
  - AC6: 인증 실패(401/403)는 기존 `describeAuthFailure` 문구로 안내한다.
  - AC7: 동시 변경(`ORDER_MISMATCH`, 서버에 있는 slug 집합과 요청 slug 집합이 다름): 오류 문구 "다른 곳에서 목록이 변경되었습니다. 새로고침한 뒤 다시 시도하세요."를 표시하고, "새로고침" 동작을 제공한다. 새로고침 시 draft는 버려지고 서버 기준 목록과 순서로 다시 불러온다. 자동 병합은 하지 않는다.
  - AC8: draft에 미저장 변경이 있을 때 삭제 확인을 통과해 항목을 삭제하면, 삭제된 항목은 draft에서 제거되고 나머지 draft 순서는 유지된다. 이후 저장 시 보내는 slug 집합은 서버의 현재 집합과 일치해야 한다(삭제는 즉시 서버 반영되므로).
  - AC9: 미저장 변경이 있을 때 이탈(다른 admin 링크 클릭, 헤더 링크, 새로고침, 탭 닫기, 뒤로 가기)을 시도하면 경고한다. 브라우저 이탈(새로고침/탭 닫기)은 `beforeunload` 경고, 앱 내 링크 이동은 확인 안내가 필요하다. 구체 UX(대화상자 vs 브라우저 기본 경고)는 Designer와 개발자가 정하되, 아무 경고 없이 draft가 사라지는 동작은 허용하지 않는다. 앱 내 링크 이동 가로채기는 Next App Router 제약이 있어 개발자가 가능 범위를 보고한다.
  - AC10: 항목이 0개 또는 1개이면 저장 버튼은 활성화될 수 없다(변경 불가). 0개 빈 목록 UI는 기존대로.
- Edge case
  - 저장 버튼을 연타해도 요청은 1건만 나간다.
  - 저장 중 이탈 시도 시에도 경고 대상으로 본다.
  - 저장 응답 성공 직후 서버 기준과 draft가 동일해야 하며, 그 직후 이탈 경고가 뜨지 않는다.
  - 같은 목록을 두 탭에서 편집해 한쪽이 먼저 저장한 뒤 다른 쪽이 저장하면, slug 집합이 같으면 마지막 저장이 이긴다(서버 로직이 slug 집합만 비교). 이 마지막 저장 우선 동작은 알려진 한계로 둔다. 집합이 다르면 AC7.
  - F9로 slug가 바뀐 직후 다른 탭의 오래된 목록에서 저장하면 slug 집합이 달라 AC7(ORDER_MISMATCH)로 처리된다.
  - 서버 API 계약(`orderInputSchema`, `ORDER_MISMATCH`)은 변경하지 않는다. 클라이언트 전환이다.
- 유일성/동시성: 순서 저장은 단일 PUT 전체 교체이며 정합성은 서버의 slug 집합 일치 검사(기존)로 보장한다. DB 제약 신설은 없다.

### F7. 썸네일 파일 업로드(Vercel Blob public, Blob URL만 허용)

- 목적: admin 프로젝트 폼에서 이미지 파일을 선택해 업로드하고, 결과 URL이 `projects.thumbnail`에 저장되게 한다.
- 확정된 결정: 스토어는 public(Q1), 형식 png/jpg/webp(Q2), 최대 4MB이며 서버(Route Handler) 경유 업로드(Q2), DB 반영은 프로젝트 "저장" 시점(Q7), 저장 성공 후 이전 Blob 삭제 best effort(Q3), 프로젝트 삭제 시 Blob 삭제 best effort(Q4), 쓰기 검증은 Blob URL만 허용(A1).
- 수용 기준
  - AC1: 프로젝트 생성/편집 폼의 "썸네일 경로" 텍스트 입력이 파일 선택 UI로 대체된다. 현재 썸네일이 있으면 미리보기와 "삭제"(썸네일 제거) 동작을 제공한다. 파일 입력에는 `label`이 연결된다.
  - AC2: 업로드는 admin 인증이 확인된 경우에만 가능하다. 업로드 엔드포인트가 세션 없는 요청을 거부한다(401/403). Origin/CSRF 검사 등 기존 `adminRoute` 보호 수준을 유지한다.
  - AC3: 서버는 허용 형식(png, jpg, webp)과 크기 상한(4MB)을 검증한다. 클라이언트 검증은 UX용이며 서버 검증이 신뢰 경계다. 확장자뿐 아니라 실제 콘텐츠(MIME 또는 시그니처)를 확인한다. 위반 시 필드 오류 문구를 표시한다(예: "PNG, JPG, WebP 파일만 올릴 수 있습니다", "4MB 이하만 올릴 수 있습니다").
  - AC4: 업로드 중에는 진행 상태를 표시하고 폼 저장 버튼을 비활성화한다(업로드 완료 전에 저장되어 빈 썸네일이 저장되는 것 방지). 업로드 실패 시 오류 문구와 재시도를 제공한다. 기존 썸네일 값은 변경되지 않는다.
  - AC5: 업로드가 끝나면 URL이 폼 draft의 `thumbnail`로 들어가고, 프로젝트 "저장" 시점에 DB에 반영된다. 업로드만 하고 저장하지 않고 이탈하면 DB의 `thumbnail`은 바뀌지 않는다(고아 Blob 파일은 범위 밖, 7절).
  - AC6: `thumbnail` 쓰기 검증(`portfolio.schema.ts`의 `thumbnail`)은 "우리 Blob 스토어의 https URL(호스트 고정)" 또는 빈 값(null 저장)만 허용한다. `/images/...` 경로, 임의 외부 URL, `javascript:`/`data:` 등은 거부한다(사용자 결정 A1). 오류 문구도 Blob URL 기준으로 바꾼다.
  - AC7: 공개 읽기 경로는 쓰기 검증과 분리한다. 현재는 `isValidThumbnail`을 쓰기 검증과 공개 읽기 필터가 공유하므로, 쓰기를 Blob 전용으로 좁히면 DB에 남은 기존 `/images/...` 값을 읽기 필터가 걸러 낼 수 있다. 읽기 경로는 기존 `/images/...` 값과 Blob URL을 모두 그대로 렌더하며 값을 검증해서 숨기지 않는다(A1 요구). 읽기 측 안전 처리(예: 값이 이상하면 썸네일만 생략)는 개발자가 설계한다.
  - AC8: 공개 페이지가 Blob URL 썸네일을 정상 표시한다. `next.config.ts`에 `images.remotePatterns`가 없으므로 `next/image`로 Blob 이미지를 쓰려면 Blob 호스트 허용이 필요하다(`<img>` 직접 사용은 프로젝트 규칙상 금지). 공개 렌더링 경로의 실제 썸네일 사용처는 T04 설계에서 확인한다.
  - AC9: 파일 이름은 사용자가 정한 이름을 그대로 신뢰하지 않는다(경로 조작, 덮어쓰기 방지). 저장 키 생성 방식은 개발자 결정이며 충돌 시 덮어쓰기가 일어나지 않아야 한다.
  - AC10: 프로젝트 저장 성공 후 바뀌기 전 썸네일이 우리 Blob URL이면 해당 파일을 삭제한다(best effort). 삭제 실패는 저장 성공 응답을 바꾸지 않고 로그만 남긴다(토큰, 개인정보 제외). `/images/...` 경로 값은 삭제 대상이 아니다.
  - AC11: 프로젝트 삭제 성공 후 그 프로젝트의 썸네일이 우리 Blob URL이면 파일을 삭제한다(best effort, AC10과 같은 규칙).
  - AC12: 환경변수 `BLOB_READ_WRITE_TOKEN`은 서버에서만 읽고 클라이언트 번들과 로그에 노출되지 않는다(`NEXT_PUBLIC_` 접두 금지).
  - AC13: 토큰이 없으면 빌드 또는 실행이 실패한다(사용자 결정 Q6). 실패 메시지는 누락된 변수명을 알려야 한다(값은 출력하지 않음). 검사 위치(빌드 시점 vs 서버 기동/요청 시점)는 개발자가 정하되, `knip`, `check`, `type-check`, `harness:*` 단계처럼 앱을 빌드하지 않는 CI 단계는 토큰 없이도 통과해야 한다(직전에 knip이 환경변수 없는 환경에서 실패한 사례가 있음, 커밋 `6fb558e`).
- 토큰 필수화의 환경별 영향 (모두 사용자 작업 또는 개발자 반영 필요)
  - Vercel Production: `BLOB_READ_WRITE_TOKEN` 필요(사용자 작업).
  - Vercel Preview: 빌드가 토큰 없으면 실패하므로 Preview 환경에도 변수가 있어야 한다. Preview에서는 admin 로그인이 없어 실제 업로드는 못 하지만 빌드는 통과해야 한다(사용자 작업: Blob 스토어 연결 시 Preview 환경 포함 확인).
  - GitHub Actions CI(`.github/workflows/ci.yml`의 `pnpm build`, `pnpm test:e2e` 단계): `BLOB_READ_WRITE_TOKEN`에 더미 값을 워크플로 env에 직접 넣는다(사용자 결정 A5). GitHub Secret 등록은 필요 없다. 더미 값은 실제 토큰 형식을 흉내 내지 않아도 되며 비밀이 아님을 코드 리뷰에서 확인한다.
  - CI e2e는 실제 Blob 업로드를 하지 않는다(사용자 결정 A5). 업로드 엔드포인트의 호출 자체를 e2e에서 검증하지 않거나 호출 전 단계(인증 거부, 형식/크기 검증 등 Blob에 도달하기 전 검증)까지만 테스트한다. 더미 토큰으로 Blob에 도달하는 경로는 테스트하지 않는다.
  - 로컬 개발 `pnpm dev`: `.env.local`에 토큰이 없으면 실행 실패(사용자 작업: 토큰 추가).
  - 로컬 e2e(`scripts/run-e2e-local.sh`): `DATABASE_URL`만 덮어쓰고 나머지는 `.env.local`을 읽으므로 `.env.local`에 토큰(실제 또는 더미)이 있으면 동작한다. 스크립트 수정 필요 여부는 개발자가 확인한다. 로컬 e2e도 실제 업로드를 하지 않는다는 전제로 api-spec에서 확정한다.
  - 실제 Blob 업로드 동작 검증은 토큰이 있는 로컬과 Production에서만 가능하다.
- 배포 자동화/크론: 없다. 업로드는 사용자 액션이 트리거 주체다.
- Vercel Blob 문서 사실(WebSearch 확인, 구현 시 T04에서 공식 문서로 재검증)
  - 서버(Route Handler/Server Action)를 거치는 업로드는 함수 요청 본문 4.5MB 제한이 걸리고 초과 시 413(FUNCTION_PAYLOAD_TOO_LARGE)이다. 4MB 상한은 이 제한 안쪽이다. 멀티파트 오버헤드로 4MB 파일이 4.5MB를 넘지 않는지 T04에서 확인한다.
  - 4.5MB를 넘는 파일은 client upload(`upload()` + `handleUpload()`)가 필요하나 이번에는 쓰지 않는다. 상한을 4MB 초과로 올리려면 구조 변경이 필요하다.
  - 접근 방식(public/private)은 스토어 생성 시 정해지고 SDK 호출의 `access` 옵션으로 지정한다.
  - `next/image`로 Blob URL을 직접 쓰는 방식은 public 스토어에서만 동작하며 `remotePatterns`에 스토어 호스트를 허용해야 한다.
  - 참고 문서: https://vercel.com/docs/vercel-blob/server-upload, https://vercel.com/docs/vercel-blob/client-upload, https://vercel.com/docs/vercel-blob/private-storage, https://vercel.com/docs/vercel-blob/using-blob-sdk
- Edge case
  - 같은 프로젝트에서 업로드를 여러 번 시도하면 마지막 성공 업로드만 draft에 반영한다. 저장 전에 교체된 중간 업로드 파일은 고아가 된다(7절).
  - 용량 초과, 지원하지 않는 형식, 확장자와 MIME 불일치, 0바이트 파일은 거부한다.
  - 프로젝트 생성 화면(slug 미확정 상태)에서도 업로드가 가능해야 한다(저장 키가 slug에 의존하지 않거나 임시 키를 쓴다). 이 점은 F9(slug 변경)과도 맞아야 한다: slug가 바뀌어도 썸네일 URL은 유효해야 한다.
  - 같은 Blob 파일을 여러 프로젝트가 참조하는 경우는 없는 것을 전제로 한다(업로드마다 새 키). 이 전제가 깨지면 삭제가 다른 프로젝트 썸네일을 지울 수 있으므로 삭제 전 DB 참조 여부 확인이 필요한지 개발자가 판단한다.
  - Blob 삭제는 DB 변경이 커밋된 뒤에만 실행한다(DB 실패 시 파일이 먼저 지워져 깨진 참조가 생기는 것 방지).
  - 프로젝트 삭제나 썸네일 교체를 e2e에서 검증할 때 Blob 삭제 호출이 더미 토큰으로 실패해도 DB 변경의 성공 응답은 그대로여야 한다(best effort). e2e가 Blob 삭제 성공에 의존하면 안 된다.
  - 배포 직후부터 F11 실행 전까지 기존 DB 값은 `/images/...`다. 이 구간에 공개 페이지는 읽기 경로가 값을 검증하지 않으므로 기존 이미지를 그대로 렌더하며 깨지지 않아야 한다(AC7). `public/images` 원본은 F11 완료 확인 전까지 삭제하지 않는다.
  - 같은 구간에 admin에서 `/images/...` 썸네일을 가진 프로젝트를 편집 저장하면, 쓰기 검증이 `/images`를 거부하므로 저장이 실패한다. 썸네일을 건드리지 않은 저장이 막히지 않도록 "변경하지 않은 기존 값은 서버가 그대로 유지" 또는 "폼이 기존 값을 보내지 않음" 중 하나를 개발자가 api-spec에서 정한다. 이 구간은 짧을 것으로 예상되나 요구사항상 막힘이 없어야 한다.
  - 미결정(T04 api-spec에서 확정 필수): 위 방식 선택. T04 완료 시 api-spec에 선택한 방식과 근거를 적고, QA는 "썸네일 미변경 저장이 `/images` 값으로도 성공"을 검증한다.
  - e2e fixture(`tests/e2e/fixtures/portfolio.ts`)의 썸네일 값은 `/images/...`에서 고정 Blob 호스트 형식 https URL로 바꾼다(쓰기 검증과 맞추기 위해). 이 URL은 실제 이미지가 아닐 수 있다.
  - e2e 빌드/실행에서 `next/image`가 그 URL을 실제로 가져오지 못해도(네트워크 차단, 존재하지 않는 파일) 공개 페이지 렌더는 깨지지 않아야 한다(서버 렌더 오류나 빌드 실패 금지, 이미지 영역만 비거나 대체 처리). e2e 기대값이 이미지 로드 성공에 의존하면 안 된다. 호스트 허용(`remotePatterns`)이 fixture URL 호스트와도 맞아야 하므로 fixture 호스트는 실제 허용 호스트로 정한다.
  - Blob 호스트 이름은 스토어 생성 후에 알 수 있으므로 `remotePatterns`와 검증의 고정 호스트 값의 출처(환경변수 또는 상수)는 개발자가 정한다. 환경변수로 두면 CI, Preview 빌드에도 값이 필요해지므로 영향을 api-spec에 적는다.

### F8. DB 프로필 이름 변경

- 수용 기준
  - AC1: DB `profile.name` 값을 "이승현"에서 "SeungHyun Lee"로 바꾼다. orchestrator(Claude)가 Production DB에서 UPDATE를 수행한다(사용자 결정 Q10). 코드에 이름을 하드코딩하지 않는다.
  - AC2: 공개 헤더, 히어로, 푸터, 페이지 제목 메타데이터가 "SeungHyun Lee"로 표시된다.
  - AC3: seed 데이터와 테스트 fixture가 실제 콘텐츠 사본을 두지 않는다는 직전 결정(`a1286f6`)을 따른다. e2e는 테스트 전용 fixture를 쓰므로 이름 변경이 e2e 기대값을 깨는지 확인한다.
  - AC4: UPDATE는 `profile` 단일 행(id=1)의 `name` 컬럼만 바꾸는 단일 문장이며, 실행 전 현재 값을 조회해 기록하고 실행 후 값을 확인한다. 되돌리는 방법(이전 값 "이승현")을 사용자에게 알린다.
  - AC5: 실행 시점은 코드가 Production에 배포된 직후이며(사용자 결정 A4), 실행 전에 대상 값(현재 값, 새 값)을 사용자에게 보여 주고 승인을 받은 뒤 실행한다.
- Edge case
  - 프로필 이름의 다른 출처(예: 코드 내 하드코딩된 "이승현" 문자열)가 남아 있으면 찾아서 보고한다.
  - 이름 변경 뒤 공개 페이지에 반영되려면 revalidate가 필요하다. 직접 SQL UPDATE는 앱의 revalidate를 거치지 않으므로, 반영 방법(admin 프로필 화면 저장 1회 또는 재배포/수동 revalidate)을 개발자가 정해 실행 절차에 포함한다.

### F9. slug 변경 허용 (프로젝트, 발표)

- 목적: 프로젝트와 발표 편집 화면에서 slug를 수정할 수 있게 한다. 현재는 수정 스키마가 slug를 받지 않고 편집 화면에서 읽기 전용이다.
- 수용 기준
  - AC1: 프로젝트 편집(`/admin/projects/[slug]`)과 발표 편집(`/admin/talks/[slug]`)의 slug 입력이 편집 가능해진다. 초기값은 현재 slug다.
  - AC2: 형식 검증은 생성과 같다(영문 소문자, 숫자, 하이픈, 최대 64자, 예약어 `new` 금지). 클라이언트와 서버 양쪽에서 검증하고 서버가 신뢰 경계다.
  - AC3: 중복 검사: 바꾸려는 slug가 같은 종류의 다른 항목과 겹치면 저장이 거부되고 slug 필드에 "이미 사용 중인 주소입니다" 오류를 표시한다. 유일성 보장은 DB `unique` 제약이며, 서버 사전 조회는 UX용이다. 동시에 같은 slug로 바꾸는 두 요청은 DB 제약으로 하나만 성공하고 다른 하나는 충돌 오류로 매핑된다(500이 아니라 409류).
  - AC4: 저장 전에 slug가 바뀌었으면 공개 주소 변경 경고를 보여 주고 확인을 받는다. 경고에는 이전 주소(예: `/work/{old}`)가 더 이상 열리지 않고 리다이렉트가 없다는 점이 들어간다. 발표는 공개 상세 주소가 없으면(발표의 공개 URL 존재 여부는 T04에서 확인) 해당 경고를 생략하거나 문구를 맞춘다.
  - AC5: 저장 성공 후 이전 주소는 404가 된다(리다이렉트 없음). 새 주소는 열린다.
  - AC6: 저장 성공 후 편집 화면 URL은 새 slug로 교체된다(히스토리에 이전 slug 편집 URL이 남아 뒤로 가기로 404가 나오지 않도록 replace 이동). 폼의 다른 draft 값은 저장된 값과 일치한다.
  - AC7: revalidate: 기존 쓰기와 같은 사이트 전체 revalidate를 쓴다. 이전 `/work/{old}`와 새 `/work/{new}`, 목록 화면, 홈이 모두 갱신되어야 한다.
  - AC8: 순서는 slug가 아닌 `sortOrder`로 유지되므로 slug를 바꿔도 목록 내 위치는 그대로다. 프로젝트의 경험(experiences)은 `project_id`(uuid)로 연결되어 있어 slug 변경의 영향을 받지 않는다.
  - AC9: 변경 없는 slug로 저장하면 기존과 같이 동작한다(중복 검사에서 자기 자신은 제외).
  - AC10: 기존 수정 API 계약 변경이 필요하면(요청 본문에 slug 추가) 프로젝트 생성/수정 스키마 간 차이를 api-spec에 명시한다. 기존 클라이언트(편집 폼)와 동시에 배포되므로 호환 이행은 필요 없다.
- Edge case
  - 편집 중 다른 곳에서 같은 항목의 slug가 바뀌거나 삭제되면 저장 시 404가 난다. 기존 not-found 처리 문구를 쓰고 목록으로 돌아가는 링크를 제공한다.
  - 목록 화면에 미저장 순서 draft(F6)가 있는 채로 편집 화면으로 이동하면 F6 AC9의 이탈 경고가 먼저 적용된다. slug 변경 후 목록으로 돌아오면 서버 기준 목록이 새로 로드되어 draft는 없다.
  - 다른 탭에서 열려 있던 목록은 오래된 slug를 가진다. 그 탭에서 편집 링크 클릭 시 404, 순서 저장 시 ORDER_MISMATCH(F6 AC7)가 된다.
  - 삭제 확인 대화상자의 공개 주소 안내(`/work/{slug}`)는 현재 slug를 쓴다.
  - 외부에서 공유된 이전 `/work/{old}` 링크는 끊긴다. 이는 직전 사이클에서 사용자가 "리다이렉트 없음"으로 정한 사항이다.
  - slug를 이전 값으로 되돌리면 이전 주소가 다시 열린다. 이전에 삭제된 항목의 slug 재사용도 허용된다.

### F10. 빌드 시 마이그레이션 자동 적용 (Preview 전용 DB, 모든 빌드)

- 목적: 배포 빌드 과정에서 DB 마이그레이션이 자동으로 적용되게 한다(현재는 수동 `db:migrate`). Preview 빌드가 Production DB를 건드리지 않도록 Preview 전용 DB를 분리한다(사용자 결정 A3).
- 수용 기준
  - AC1: 마이그레이션은 Production, Preview, CI e2e 빌드 모두에서 `next build` 전에 실행된다(`drizzle-kit migrate` 또는 동등한 적용 절차). 구현 방식(package.json 스크립트, `vercel.json`, 프로젝트 설정)은 개발자 선택이며 배포 경로를 api-spec에 명시한다.
  - AC2: 이미 적용된 마이그레이션은 다시 실행되지 않는다(드리즐 마이그레이션 이력 테이블 기준). 적용할 마이그레이션이 없으면 빌드가 정상 통과한다.
  - AC3: 마이그레이션 실패 시 빌드는 실패한다(배포 중단). 실패해도 이전 배포가 계속 서비스되는 것은 Vercel의 기본 동작이다.
  - AC4: 각 환경의 마이그레이션 대상 DB는 그 환경의 `DATABASE_URL`이다. Production은 Production DB, Preview는 Preview 전용 DB(Neon 브랜치), CI e2e는 `E2E_DATABASE_URL` DB다. Production DB의 연결 문자열이 Preview 환경변수에 남아 있지 않아야 한다. 값은 로그에 출력하지 않는다.
  - AC5: 로컬 `scripts/run-e2e-local.sh`의 `pnpm build`도 `DATABASE_URL`을 E2E DB로 덮어쓰므로 E2E DB에 적용된다. 빌드 스크립트에 마이그레이션을 넣으면 CI와 로컬 e2e 경로 모두에 영향이 있으므로 e2e 시드/fixture 순서와 충돌하지 않는지 확인한다.
  - AC6: 이번 사이클의 코드 변경은 DB 스키마 변경이 없다(thumbnail은 기존 text 컬럼, slug도 기존 컬럼). 따라서 이번 사이클에서 새로 적용될 마이그레이션은 없어야 하며, 자동 적용 기능 자체의 동작은 "적용할 것이 없을 때 통과"와 "적용할 것이 있을 때 적용"을 별도로 확인한다(후자는 Production이 아닌 E2E/테스트 DB에서 검증).
- 사전 작업 (Preview 전용 DB 분리)
  - 완료(2026-10-12, orchestrator): Neon 프로젝트 `dawn-rice-73098836`에 `main`에서 분기한 `preview` 브랜치(`br-winter-frost-b8ysl2y3`, 엔드포인트 `ep-snowy-dew-b88kcy4t`, DB `neondb`)를 만들었다.
  - 완료(2026-10-12, orchestrator, 사용자 지시 "직접 ㄱㄱ"): Vercel Preview 환경의 `DATABASE_URL`을 위 브랜치의 pooler 연결 문자열로 교체했다(`vercel env update DATABASE_URL preview`, 결과 `✓ Updated`). Secret 타입이라 값을 다시 읽어 확인하지는 못했다. 다음 Preview 배포의 빌드 로그나 DB 접속 호스트로 `ep-snowy-dew-b88kcy4t` 사용을 확인한다(미확인).
  - 교체 이전에 만들어진 Preview 배포는 계속 Production DB를 쓴다. 마이그레이션 자동 적용이 들어간 코드는 새 Preview 배포에서만 실행되므로 교체 후 푸시 순서 조건은 충족됐다.
- Edge case (중요)
  - Preview DB는 Neon 브랜치 생성 시점의 Production 사본이다. 이후 Production에서 일어난 데이터 변경(프로젝트 추가, 순서, 썸네일 이전 등)은 Preview DB에 반영되지 않아 데이터가 Production과 어긋난다. 필요하면 브랜치를 다시 만드는 것이 갱신 방법이다. 이번 사이클의 F8, F11은 Production에만 적용되고 Preview DB에는 적용되지 않는다(Preview 화면은 옛 값을 보여 줄 수 있음).
  - Preview DB는 Production 데이터를 복사한 것이므로 접근 권한과 연결 문자열을 Production과 같은 수준으로 취급한다.
  - Preview 환경의 `DATABASE_URL`이 교체되기 전의 Preview 배포나 환경변수 교체를 빠뜨린 경우 Production DB가 마이그레이션 대상이 된다. 이 경우를 막으려는 장치(예: 빌드 시 대상 DB가 Preview 브랜치인지 호스트 확인)가 필요한지는 개발자가 검토한다. 요구사항은 방식을 정하지 않는다.
  - Production 빌드는 새 코드가 배포되기 전에 Production DB 스키마를 먼저 바꾼다. 이전 코드와 호환되지 않는 파괴적 마이그레이션은 이 구조에서 순간적인 장애를 만들 수 있으므로 additive 마이그레이션을 원칙으로 한다(권장, 확정 아님).
  - 같은 Preview DB를 여러 Preview 빌드(브랜치)가 공유하므로 동시 빌드가 마이그레이션을 동시에 시도할 수 있다. 드리즐 이력 테이블의 동시 실행 안전성은 T04에서 확인한다.
  - 빌드 환경에서 `DATABASE_URL`이 없으면(예: knip 단계, 일부 환경) 마이그레이션 단계가 실패하지 않도록 `build` 스크립트가 아닌 별도 단계로 분리할지 검토한다(직전에 knip이 drizzle 설정을 읽다 실패한 사례, 커밋 `6fb558e`).

### F11. 기존 `/images` 썸네일 Blob 일괄 이전과 원본 삭제

- 목적: DB에 `/images/...` 경로로 저장된 기존 썸네일 5개를 Blob으로 올리고 `projects.thumbnail`을 새 URL로 갱신한 뒤, 같은 사이클 안에서 이전된 원본 이미지와 스크립트를 삭제한다(Q5, A2).
- 수용 기준
  - AC1: 스크립트는 `projects.thumbnail`이 `/images/`로 시작하는 행을 찾아 `public/` 아래 해당 파일을 읽어 Blob에 올리고, 업로드 성공 후 해당 행의 `thumbnail`을 Blob URL로 갱신한다.
  - AC2: 대상 DB와 Blob 스토어는 환경변수로 정한다(`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`). 기본 모드는 dry-run(대상 행과 파일 목록, 크기, 형식 검증 결과만 출력)이며 실제 실행은 명시적 플래그가 있을 때만 한다.
  - AC3: 멱등이다. 이미 Blob URL인 행은 건드리지 않고, 중간에 실패해도 다시 실행하면 남은 행만 처리한다. 한 행의 실패가 다른 행의 처리를 막지 않으며 실패 목록을 출력한다.
  - AC4: 각 파일에 F7의 형식(png, jpg, webp)과 크기(4MB) 규칙을 적용하고, 위반 파일은 건너뛰고 보고한다.
  - AC5: 갱신 후 이전 `/images` 값 목록을 출력해 되돌릴 수 있게 한다(롤백 근거).
  - AC6: DB 갱신은 업로드가 성공한 뒤에 한다(업로드 실패 시 DB 값은 그대로).
  - AC7: Production 실행은 코드가 Production에 배포된 직후이며(A4), orchestrator가 dry-run 결과를 사용자에게 보여 주고 승인을 받은 뒤 실행한다.
  - AC8: 실행 순서는 코드 배포, F11 Production 실행, 공개 페이지에서 이전된 썸네일 표시 확인, 원본 이미지와 F11 스크립트 삭제 커밋 순이다(A2). 모두 같은 사이클 안에서 끝낸다.
  - AC9: 삭제 대상은 이전된 프로젝트 썸네일 파일에 한한다. `public/images` 아래 다른 자산(히어로, 소개 이미지 등)은 코드에서 사용처를 확인한 뒤에만 판단하며, 사용 중이면 삭제하지 않는다. 삭제 후 knip, 빌드, e2e가 통과한다.
  - AC10: 스크립트는 `scripts/`에 두고 `tsx`로 실행하며 knip, biome, 주석 규칙, em-dash 금지 규칙을 통과한다. 스크립트 삭제 시 `package.json`에 추가한 관련 스크립트 항목도 함께 제거한다.
- Edge case
  - 이전 확인 전에 원본을 먼저 삭제하면 스크립트가 읽을 파일이 없고 롤백도 불가능하다. 삭제 커밋은 반드시 Production 확인 이후다.
  - `public/images`에 파일이 없는 경로가 DB에 있으면 건너뛰고 보고한다.
  - 같은 `/images` 파일을 여러 프로젝트가 가리키면 프로젝트마다 별도 업로드를 권장한다(F7의 삭제 로직이 다른 프로젝트 참조를 깨뜨리지 않도록).
  - 이전 후 공개 사이트 반영을 위해 revalidate가 필요하다(F8과 같은 이슈). 스크립트가 직접 revalidate를 못 하므로 실행 절차에 반영 방법을 포함한다.
  - 원본 삭제 커밋이 `main`에 반영되기 전에 Production이 옛 코드 기준으로 재배포되어도 DB는 이미 Blob URL이므로 문제없다. 반대로 원본 삭제가 먼저 배포되고 이전이 늦어지면 공개 페이지에서 이미지가 깨진다(순서 위반).
  - Preview DB(F10)는 이전 이전의 사본이라 `/images` 값을 그대로 갖는다. 원본 삭제 후 Preview 화면의 썸네일이 깨질 수 있으며, 페이지 렌더 자체는 깨지지 않아야 한다(F7 edge case).

## 4. 비기능 요구사항과 제약

- 접근성: 아이콘 버튼은 `aria-label`, 터치 대상 44px, 포커스 표시 유지, 상태 변화(저장 성공/실패, 업로드 진행)는 `aria-live` 또는 `role="alert"`로 알린다.
- 스타일: `docs/agent-rules/tailwind.md` 준수(px spacing, 토큰만 사용, 임의 값 금지, `cn` 사용 기준).
- 파일/코드 규칙: `docs/agent-rules/project-structure.md`(kebab-case, 서버 전용 모듈 `server-only`, HTTP 상태 코드 enum, 죽은 코드 금지, 주석 규칙, em-dash 금지). 새 서버 모듈이 생기면 `import "server-only"`.
- 보안: 업로드는 admin 세션 필수, 서버 측 형식/크기 검증, 토큰 비노출, 허용 호스트 고정(F7 AC6). `X-Frame-Options`, CSP 등 기존 헤더 유지. `/admin/**` CSP가 업로드 요청과 미리보기 이미지 로드를 막지 않는지 확인한다(`next.config.ts`는 현재 `connect-src`, `img-src`를 제한하지 않음). CI 워크플로의 더미 토큰은 비밀이 아닌 값이어야 하며 실제 토큰을 저장소에 커밋하지 않는다.
- 성능: 순서 저장은 1회 PUT, revalidate 1회. 목록 이동은 서버 요청 0건.
- 호환: 공개 페이지 URL(slug 변경으로 바뀐 항목 제외), 데이터 모델은 변경하지 않는다. 기존 API 계약 중 프로젝트/발표 수정(F9)과 thumbnail 쓰기 검증(F7)은 바뀐다. thumbnail 읽기 경로는 기존 `/images` 값과 Blob URL을 모두 렌더한다.
- 데이터 변경 안전: 이번 사이클의 Production 쓰기는 F8(UPDATE), F11(thumbnail 갱신), F10(Production 빌드 마이그레이션)이다. F8, F11은 실행 직전 dry-run/대상 값을 사용자에게 보여 주고 승인 후 실행한다. Preview 쪽은 별도 DB로 분리한다.
- 테스트: 변경된 동작은 직전 사이클 단위 테스트와 e2e에서 대시보드, 즉시 저장 순서 변경, 썸네일 텍스트 입력, slug 읽기 전용을 가정한 부분을 갱신한다. e2e fixture 썸네일은 Blob 호스트 형식 URL로 바꾸고 이미지 로드 성공에 의존하는 기대값을 두지 않는다. CI e2e는 실제 Blob 업로드를 하지 않는다. Preview는 admin 로그인이 없으므로 e2e는 로컬과 테스트 DB fixture 기준이다.
- 컴포넌트 props: 새 데이터 전달이 필요한 곳을 명시한다.
  - admin 헤더에 `profile.name`: 콘솔 레이아웃(서버)에서 `getProfile()`으로 읽어 헤더 컴포넌트 props `name`으로 전달한다(공개 `Navbar name={profile.name}` 패턴과 동일).
  - `SortableList`에 서버 기준 순서: 기존 `items`(페이지에서 전달) 유지. 저장 성공 시 클라이언트가 기준 순서를 갱신한다.
  - 프로젝트/발표 폼에 현재 slug: 기존 페이지에서 전달하는 `project`/`talk` 객체의 slug를 편집 가능 필드 초기값과 "원래 slug" 비교값으로 쓴다(변경 감지와 경고용).

## 5. 사용자 결정

모든 질문(Q1-Q13, A1-A5)에 사용자 결정이 완료되었다. 남은 확인 항목은 없다.

### 5-1. 1차 결정 (Q1-Q13)

| # | 항목 | 권장안 | 사용자 결정 | 반영 위치 |
| --- | --- | --- | --- | --- |
| Q1 | Blob 공개 범위 | public | public | F7 |
| Q2 | 형식과 최대 크기 | png/jpg/webp, 4MB | png/jpg/webp, 최대 4MB, 서버 경유 업로드 | F7 AC3, 문서 사실 |
| Q3 | 교체 시 이전 Blob | 저장 성공 후 best effort 삭제 | 저장 성공 후 이전 Blob 삭제(best effort) | F7 AC10 |
| Q4 | 프로젝트 삭제 시 Blob | 삭제 | Blob 파일도 함께 삭제(best effort) | F7 AC11 |
| Q5 | 기존 `/images` 썸네일 | 두 형식 공존 | 이번에 Blob으로 일괄 이전(스크립트로 이미지 업로드 + DB thumbnail 갱신) | F11 |
| Q6 | 토큰 없는 환경 | 업로드 UI 비활성 | 토큰 없으면 빌드/실행 실패 | F7 AC13, 6절 |
| Q7 | DB 반영 시점 | 프로젝트 저장 시점 | 프로젝트 '저장' 시점 | F7 AC5 |
| Q8 | 순서 저장 실패 | draft 유지 | draft 유지 + 오류 표시 | F6 AC5 |
| Q9 | admin 헤더 이름 링크 | `/admin/projects` | `/admin/projects` | F2 AC3 |
| Q10 | 프로필 이름 변경 방법 | 사용자가 admin에서 저장 | 사이클 중 orchestrator가 Production DB에서 UPDATE(실행 직전 사용자 재확인) | F8 |
| Q11 | slug 변경 허용 | 미포함 | 이번에 포함 | F9 |
| Q12 | 빌드 시 마이그레이션 자동 적용 | 미포함 | 이번에 포함 | F10 |
| Q13 | 로그인 화면 헤더 | Designer 제안 | Designer 제안대로 | F2 Edge case |

### 5-2. 2차 결정 (A1-A5)

| # | 항목 | 권장안 | 사용자 결정 | 반영 위치 |
| --- | --- | --- | --- | --- |
| A1 | Blob 이전 후 `/images` 경로 허용 유지 여부 | 유지 | Blob URL만 허용(thumbnail 쓰기 검증은 고정 Blob 호스트 https URL 또는 null만, `/images` 경로 거부). 공개 읽기 경로는 기존 DB 값을 검증하지 않고 렌더. e2e fixture 썸네일은 Blob 호스트 형식 URL로 변경 | F7 AC6, AC7, edge case, 4절 |
| A2 | `public/images` 원본과 F11 스크립트 삭제 시점 | Production 확인 후 별도 커밋에서 삭제 | 이번 사이클에서 바로 삭제. 순서: 코드 배포, F11 Production 실행, 공개 페이지 확인, 원본 이미지와 F11 스크립트 삭제 커밋(같은 사이클). 삭제 대상은 이전된 프로젝트 썸네일 파일만이고 다른 `public/images` 자산은 사용처 확인 후 판단 | F11 AC8, AC9 |
| A3 | F10 Preview 빌드가 Production DB에 마이그레이션을 적용하는 위험 완화 | main 빌드에서만 적용 | Preview에 별도 DB를 두고 모든 빌드에서 적용. Neon에 Preview용 브랜치를 만들고 Vercel Preview의 `DATABASE_URL`을 그 브랜치로 교체한 뒤 Production, Preview, CI e2e DB 모두 마이그레이션 적용 | F10, 6절 |
| A4 | F8 이름 변경과 F11 이전을 Production에 실행할 시점 | 코드 배포 직후 | 코드가 배포된 직후. dry-run 결과(또는 대상 값)를 보여 주고 승인 후 실행 | F8 AC5, F11 AC7 |
| A5 | CI e2e의 Blob 토큰 값 | 더미 값 | 더미 값. `ci.yml`의 build/e2e 단계 env에 `BLOB_READ_WRITE_TOKEN` 더미 값을 직접 넣고, CI e2e는 실제 업로드를 하지 않음. GitHub Secret 등록 작업 없음 | F7 환경별 영향, 4절 테스트, 6절 |

## 6. 사용자 작업

구현은 코드만 만든다. 아래는 사용자가 직접 하거나 orchestrator가 사용자 확인 후 수행한다. 구현 에이전트는 Vercel 계정/프로젝트 설정을 변경하지 않는다(5번은 사용자 지시로 orchestrator가 수행 완료).

1. Vercel 대시보드에서 이 프로젝트에 Blob 스토어를 public으로 생성한다(Q1).
   - https://vercel.com/seungguridangdang/seungsimdang-portfolio 에서 상단 `Storage` 탭을 연다.
   - `Create Database`(또는 `Create`)에서 `Blob`을 고르고 이름(예: `portfolio-thumbnails`)을 넣는다.
   - 접근 방식을 고르는 항목이 있으면 `Public`을 고른다. 이 값은 생성 후 바꿀 수 없을 수 있으므로 생성 전에 확인한다.
   - 화면 문구는 Vercel 개편에 따라 다를 수 있다. 다르면 "Blob 스토어 생성, Public, 이 프로젝트 연결" 세 가지만 맞추면 된다.
2. 스토어를 프로젝트에 연결하고 `BLOB_READ_WRITE_TOKEN`이 Production과 Preview(및 Development) 환경에 모두 생성되는지 확인한다. 토큰이 없으면 빌드가 실패하므로 Preview에도 필요하다(Q6).
   - 생성 직후 나오는 `Connect Project` 단계에서 이 프로젝트를 고르고 환경 체크박스 `Production`, `Preview`, `Development`를 모두 켠다.
   - 확인: 프로젝트 `Settings` → `Environment Variables`에 `BLOB_READ_WRITE_TOKEN`이 세 환경으로 보이면 된다.
3. 로컬 개발과 로컬 e2e를 위해 `.env.local`에 `BLOB_READ_WRITE_TOKEN`을 추가한다(저장소에 커밋하지 않는다).
   - `Storage` 탭에서 만든 스토어를 열고 `.env.local` 탭(또는 `Quickstart`)에 보이는 `BLOB_READ_WRITE_TOKEN="..."` 줄을 복사해 `.env.local` 맨 아래에 붙인다. 값은 따옴표 없이 넣어도 된다.
   - `vercel env pull`은 쓰지 않는다. `.env.local` 전체를 덮어써 `DATABASE_URL`, `E2E_DATABASE_URL`, `NEXTAUTH_*` 등 기존 값이 사라질 수 있다.
4. GitHub Actions CI는 더미 토큰 값을 `ci.yml`에 직접 넣으므로 GitHub Secret 등록 작업은 없다(A5). 사용자는 코드 리뷰에서 더미 값이 비밀이 아닌지만 확인한다.
5. 완료: Preview 전용 DB 분리(A3). orchestrator가 Neon `preview` 브랜치 생성과 Vercel Preview `DATABASE_URL` 교체를 마쳤다(F10 사전 작업 참조). 남은 확인은 다음 Preview 배포가 `ep-snowy-dew-b88kcy4t`에 접속하는지 여부다.
6. Production 배포 후, orchestrator가 F8 UPDATE와 F11 이전 스크립트의 dry-run 결과(대상 값, 대상 행, 파일 목록)를 사용자에게 보여 주고 사용자가 승인한 뒤에 실행한다(Q5, Q10, A4).
7. Production에서 이전된 썸네일 표시, 새 업로드, slug 변경, 프로필 이름이 실제로 동작하는지 확인한 뒤 원본 이미지와 F11 스크립트를 삭제하는 커밋을 승인한다(A2). Preview는 admin 로그인 미지원이라 업로드와 편집 확인은 Production에서만 가능하다.

## 7. 범위 밖

- 이미지 편집(자르기, 리사이즈), 드래그앤드롭, 다중 이미지, 갤러리.
- 4MB 초과 업로드(client upload 구조).
- 고아 Blob 파일 정리 기능(업로드만 하고 저장하지 않은 파일, 저장 전 교체된 중간 파일). Q3, Q4의 삭제는 저장/삭제 시점의 기존 썸네일에 한한다.
- 이전 slug 주소의 리다이렉트(F9, 직전 사이클 결정 유지).
- 경험 카드와 `list-editor` 계열의 순서 변경 서버 즉시 저장 전환(원래 로컬 draft).
- 공개 페이지 디자인 변경, 공개 `Button` 변경.
- 프로필 화면 필드 변경(이름 값만 데이터 변경).
- Preview DB를 Production과 주기적으로 동기화하는 기능(브랜치 재생성은 수동).
- CI e2e에서의 실제 Blob 업로드 검증(A5).
- 이번 사이클 코드 변경에 따른 DB 스키마 변경(없음 전제, F10 AC6).

## 8. 완료 기준

- F1-F11의 수용 기준이 충족된다.
- 공개 페이지 URL과 렌더 결과가 변경 전과 같다(이름 값, slug를 바꾼 항목, 썸네일 이전 제외).
- 배포 직후부터 F11 실행 전까지 공개 페이지가 기존 `/images` 썸네일로 깨지지 않고 렌더된다.
- `/admin` 접속 시 `/admin/projects`로 도착한다.
- 토큰이 없는 환경에서 빌드/실행 실패가 의도대로 발생하고, 토큰(또는 CI의 더미 값)이 설정된 CI, 로컬 e2e, Vercel Preview/Production 빌드는 통과한다.
- Production, Preview, CI e2e 빌드가 각자의 DB에만 마이그레이션을 적용하고, Preview 환경에 Production 연결 문자열이 남아 있지 않다.
- 단위 테스트, 린트, 타입 검사, knip, e2e(로컬, 테스트 DB)가 통과한다. 갱신이 필요한 기존 테스트와 e2e fixture는 갱신한다.
- 사용자 작업(6절) 완료 후 Production에서 이전된 썸네일 표시, 새 업로드, slug 변경, 프로필 이름이 확인되고, 이후 원본 이미지와 F11 스크립트가 삭제된다.
