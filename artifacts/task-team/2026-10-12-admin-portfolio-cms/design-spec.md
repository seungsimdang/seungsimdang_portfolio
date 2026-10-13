# design-spec: admin 포트폴리오 CMS

- 작성일: 2026-10-12
- 작성자: Designer (T03)
- 입력: `requirements.md`(T02 게이트 결정 포함), `00-input.md`, 기존 `src/components/`, `src/app/globals.css`, `docs/agent-rules/tailwind.md`

## 목차

- [1. 전제와 디자인 원칙](#1-전제와-디자인-원칙)
- [2. 화면 목록과 라우트](#2-화면-목록과-라우트)
- [3. 공통 레이아웃과 반응형](#3-공통-레이아웃과-반응형)
- [4. 화면별 명세](#4-화면별-명세)
- [5. 컴포넌트 목록과 서버/클라이언트 경계](#5-컴포넌트-목록과-서버클라이언트-경계)
- [6. 공통 컴포넌트 재사용 현황](#6-공통-컴포넌트-재사용-현황)
- [7. 폼 필드와 클라이언트 검증](#7-폼-필드와-클라이언트-검증)
- [8. 상태 명세](#8-상태-명세)
- [9. 접근성](#9-접근성)
- [10. 공개 컴포넌트 props 인터페이스](#10-공개-컴포넌트-props-인터페이스)
- [11. 디자인 토큰과 확인 필요 항목](#11-디자인-토큰과-확인-필요-항목)

## 1. 전제와 디자인 원칙

- 소유자 1명 전용 단순 관리 화면이다. 공개 사이트의 어두운 배경(`--background` 검정), Pretendard, 흰색 투명도 기반 테두리/텍스트 톤을 그대로 쓴다.
- 새 UI 라이브러리를 전제하지 않는다. 폼 요소는 네이티브 `input`, `textarea`, `button`, `dialog`로 구성한다.
- 공개 페이지의 시각 변경은 없다. 공개 컴포넌트는 데이터 출처만 props로 바뀐다(10절).
- admin은 공개 Navbar/Footer를 쓰지 않는다. 공개 `layout.tsx`와 분리하기 위해 admin 전용 레이아웃(라우트 그룹 또는 중첩 레이아웃)을 둔다. 공개 쪽 Navbar/Footer가 admin 레이아웃에 렌더되지 않아야 한다(구현 방식은 개발자 선택).
- 공개 페이지(Navbar, Footer 포함)에 admin으로 가는 링크를 두지 않는다(requirements 2절 10번).
- 이미지 업로드 UI는 없다. 썸네일은 텍스트 입력(경로 또는 허용 호스트 https URL)만 둔다.
- 드래그앤드롭, 리치 텍스트, 미리보기는 없다.

## 2. 화면 목록과 라우트

| 화면 | 라우트 | 인증 | 비고 |
| --- | --- | --- | --- |
| 로그인 | `/admin/login` | 불필요 | GitHub 로그인 버튼 1개. `from` 쿼리 보존 |
| 비인가 안내 | `/admin/login?error=...` 로 같은 화면에 표시 | 불필요 | allowlist 거부는 사유를 구체화하지 않는 한 가지 문구 |
| 대시보드 | `/admin` | 필요 | profile, projects, talks 3개 섹션 요약과 진입 링크 |
| 프로필 편집 | `/admin/profile` | 필요 | 단일 레코드 수정 |
| 프로젝트 목록 | `/admin/projects` | 필요 | 순서 위/아래, 삭제, 신규 진입 |
| 프로젝트 생성 | `/admin/projects/new` | 필요 | slug 입력 가능 |
| 프로젝트 편집 | `/admin/projects/[slug]` | 필요 | slug 읽기 전용, experiences 중첩 편집 |
| 발표 목록 | `/admin/talks` | 필요 | 순서 위/아래, 삭제, 신규 진입 |
| 발표 생성 | `/admin/talks/new` | 필요 | slug 입력 가능 |
| 발표 편집 | `/admin/talks/[slug]` | 필요 | slug 읽기 전용 |
| 404 | admin 하위 미존재 slug | 필요 | "항목을 찾을 수 없음" + 목록으로 링크 |
| 오류 | admin 하위 `error.tsx` | 필요 | DB 장애 등 사용자용 문구, 재시도 버튼 |

- 대시보드와 목록을 분리하는 이유는 프로젝트와 발표 목록이 각각 순서 변경 기능을 갖기 때문이다. 대시보드는 건수와 링크만 보여주는 얇은 화면이다.
- 로그인한 사용자가 `/admin/login`에 오면 `/admin`으로 이동한다.
- 모든 admin 화면은 noindex 메타를 갖고 동적 렌더된다(requirements 2절).

## 3. 공통 레이아웃과 반응형

### 구조

- 상단 헤더 바(`AdminHeader`): 좌측 "admin" 제목 + 로그인 계정 표시(GitHub 로그인 이름), 우측 "사이트 보기"(새 탭, 공개 `/` 링크)와 "로그아웃" 버튼.
- 내비게이션(`AdminNav`): 대시보드, 프로필, 프로젝트, 발표 4개 링크. 현재 위치에 `aria-current="page"`.
- 본문 영역: 최대 너비 960px 중앙 정렬, 좌우 패딩은 기존 `container-padding` 재사용. 폼은 1열 세로 배치.
- 헤더는 `sticky top-0`이며 공개 Navbar의 `bg-black/50 backdrop-blur-md` 톤을 따른다.

### 반응형

| 폭 | 동작 |
| --- | --- |
| 810px 이상 | 헤더 한 줄(제목, 내비게이션, 우측 액션). 목록은 행 안에 액션 버튼을 우측 정렬 |
| 809px 이하 | 헤더는 제목/액션 한 줄 + 내비게이션 줄바꿈 아래 줄(가로 스크롤 없음, `flex-wrap`). 목록 행은 제목 아래에 액션 버튼을 세로 배치 |
| 공통 | 가로 스크롤이 생기지 않는다. 입력 요소는 `w-full`. 터치 대상 최소 높이 44px(`min-h-44`) |

- 폼 하단 저장 버튼 바는 `sticky bottom-0`로 두어 긴 폼(experiences 다수)에서 저장 버튼에 항상 접근 가능하게 한다. 모바일 포함.
- experience 카드는 모바일에서 카드 안 패딩만 줄이고 구조는 동일하다.
- 기존 breakpoint(810, 1024, 1440)는 `container-padding`이 이미 처리하므로 admin 전용 breakpoint를 추가하지 않는다. Tailwind `md:`는 기존 코드와 동일하게 사용한다.

## 4. 화면별 명세

### 4-1. 로그인 `/admin/login`

- 중앙 카드: 제목 "admin 로그인", 보조 문구 1줄, "GitHub로 로그인" 버튼 1개.
- 로그인 버튼은 폼 제출(클라이언트 상호작용 필요)이며 클릭 시 로딩(버튼 비활성 + "이동 중...").
- 오류 표시: 로그인 거부 시 카드 상단에 `role="alert"` 영역으로 "로그인할 수 없습니다. 허용된 계정인지 확인하세요." 한 가지 문구만 표시한다. 계정 존재 여부, allowlist 사유를 구분하지 않는다.
- 세션 만료로 이동해 온 경우(`reason=expired`): 같은 영역에 "세션이 만료되었습니다. 다시 로그인하세요." 안내를 표시한다.
- 로그인 성공 시 `from`이 `/admin`으로 시작하는 경로면 그곳으로, 아니면 `/admin`으로 이동한다(외부 URL 이동 금지).

### 4-2. 대시보드 `/admin`

- 3개 카드: 프로필(이름, 직함 요약, "편집" 링크), 프로젝트(건수, "목록 보기", "새 프로젝트"), 발표(건수, "목록 보기", "새 발표").
- 데이터 조회 실패 시 해당 카드 대신 오류 문구(8절 오류 상태).
- 프로필 레코드가 없으면(seed 전) 프로필 카드에 "프로필이 없습니다. seed를 먼저 실행하세요." 안내만 표시하고 편집 링크는 숨긴다.

### 4-3. 프로필 편집 `/admin/profile`

- 폼 1개, 저장 버튼 1개. 생성/삭제 없음.
- 필드는 7절 참조. skills는 순서 있는 문자열 목록 편집기(`StringListEditor`).
- tagline은 `textarea`이며 줄바꿈이 그대로 저장된다는 안내 텍스트 1줄을 필드 아래에 표시한다.
- 저장 성공: 성공 메시지(`role="status"`) "저장했습니다. 공개 페이지에 반영되었습니다." 폼은 그대로 유지.

### 4-4. 프로젝트 목록 `/admin/projects`

- 상단: 제목 "프로젝트", 우측 "새 프로젝트" 링크(버튼 모양).
- 행(`SortableListRow`): 순번, 제목, slug(보조 텍스트), 기간. 우측 액션: 위로, 아래로, 편집(링크), 삭제.
- 첫 행의 위로, 마지막 행의 아래로는 `disabled`.
- 순서 변경: 위/아래 버튼 클릭 시 즉시 서버에 저장한다(목록 화면에는 별도 저장 버튼이 없다). 처리 중에는 해당 목록의 이동 버튼을 모두 비활성화하고 행에 `aria-busy`를 둔다. 성공 시 목록이 새 순서로 갱신, 실패 시 이전 순서로 되돌리고 오류 메시지 표시.
- 순서 변경 결과를 스크린리더에 알리기 위해 `aria-live="polite"` 영역에 "{제목}을 {n}번째로 이동했습니다."를 출력한다.
- 삭제: 삭제 확인 대화상자(`ConfirmDialog`, 8절 참조) 후 삭제.
- 빈 상태: "등록된 프로젝트가 없습니다." + "새 프로젝트 만들기" 버튼.

### 4-5. 프로젝트 생성/편집 `/admin/projects/new`, `/admin/projects/[slug]`

- 폼 구성 순서: 기본 정보 섹션, techStack 목록 편집기, experiences 섹션, 하단 sticky 액션 바.
- 기본 정보: slug, title, period, role, summary, link, thumbnail (7절).
- slug: 생성 화면에서만 입력 가능. 편집 화면에서는 `readOnly` 표시와 "slug는 변경할 수 없습니다." 보조 문구. 공개 URL 미리 보기 텍스트 `/work/{slug}`를 필드 아래에 표시(링크 아님).
- techStack: `StringListEditor`(항목 추가, 삭제, 위/아래).
- experiences 섹션(`ExperienceListEditor`):
  - 섹션 제목 "경험" + 건수 + "경험 추가" 버튼. 추가는 목록 맨 뒤에 빈 카드를 붙이고 새 카드의 제목 입력으로 포커스 이동.
  - 카드(`ExperienceCard`) 하나는 경험 1개이다. 카드 헤더: "경험 {n}: {제목 또는 '제목 없음'}", 우측에 위로, 아래로, 삭제 버튼.
  - 카드 내부 필드 순서: title, problem, solution, tradeoff(장점, 단점, 근거 3개), result, learning, links(`LinkListEditor`).
  - 카드는 `<fieldset>` + `<legend>`로 묶는다.
  - 카드 삭제는 확인 대화상자 없이 폼 로컬 상태에서 제거한다(저장 전에는 DB에 반영되지 않음). 대신 제거 직후 "경험 {n}을 삭제했습니다. 저장해야 반영됩니다." 상태 메시지를 표시하고, 포커스는 "경험 추가" 버튼으로 이동한다. 되돌리기는 제공하지 않는다(범위 밖).
  - 경험이 0개이면 "등록된 경험이 없습니다. 상세 페이지에는 경험 섹션이 표시되지 않습니다." 안내.
  - 카드는 기본 펼침 상태이다. 접기/펼치기 UI는 두지 않는다(단순화, 긴 폼은 스크롤).
- 편집 화면 하단 sticky 액션 바: "저장"(주 버튼), "취소"(목록으로 링크), 편집 화면에서만 "프로젝트 삭제"(위험 버튼, 바 좌측 분리).
- 미저장 변경이 있는 상태에서 취소/내비게이션/탭 닫기 시 브라우저 기본 이탈 경고(`beforeunload`)와 앱 내 링크 클릭 시 `confirm` 수준의 경고를 표시한다(표현은 네이티브 대화상자 허용).
- 저장 성공(생성): 편집 화면(`/admin/projects/{slug}`)으로 이동하고 성공 메시지 표시. 저장 성공(편집): 현재 화면 유지, 성공 메시지, 폼의 기준값(dirty 비교 기준)을 저장된 값으로 갱신.
- 저장 실패: 입력값을 그대로 유지하고 오류를 표시(8절).

### 4-6. 발표 목록 `/admin/talks`

- 4-4와 동일 구조. 행 표시: 순번, 제목, 날짜, 장소. 빈 상태 문구 "등록된 발표가 없습니다."

### 4-7. 발표 생성/편집 `/admin/talks/new`, `/admin/talks/[slug]`

- 필드는 7절. 구조와 액션 바는 4-5의 기본 정보 부분과 동일하다(경험 섹션 없음).
- date 입력은 `YYYY.MM` 형식 문자열이며 placeholder `2025.06`, 보조 문구 "예: 2025.06".

## 5. 컴포넌트 목록과 서버/클라이언트 경계

경계 원칙: `page.tsx`(서버)는 가드 함수 호출과 데이터 조회 후 클라이언트 폼을 렌더하는 얇은 셸이다(`nextjs.md` 1번). 서비스 모듈은 클라이언트 컴포넌트에서 import하지 않는다. 파일명은 kebab-case, 위치는 `src/app/admin/**` 또는 admin 전용 하위로 두어 분리 경계를 유지한다(requirements 2절 트레이드오프).

| 컴포넌트 | 경계 | 책임 |
| --- | --- | --- |
| `admin-layout` (layout.tsx) | 서버 | noindex metadata, 세션 재검사, `AdminHeader`/`AdminNav` 배치 |
| `AdminHeader` | 서버 | 제목, 계정 표시, 사이트 보기 링크, `SignOutButton` 배치 |
| `AdminNav` | 클라이언트 | `usePathname`으로 `aria-current` 처리 |
| `SignOutButton` | 클라이언트 | 로그아웃 호출 |
| `LoginPanel` | 클라이언트 | GitHub 로그인 버튼, 로딩, 오류/만료 알림 표시 |
| `DashboardSummaryCard` | 서버 | 건수/요약 표시, 링크 |
| `AdminPageHeader` | 서버 | 페이지 제목 + 우측 액션 슬롯 |
| `SortableList` / `SortableListRow` | 클라이언트 | 목록, 위/아래 이동, 삭제 진입, 라이브 영역 |
| `ConfirmDialog` | 클라이언트 | 삭제 확인(6절 참조) |
| `ProfileForm` | 클라이언트 | profile 폼 상태, 검증, 저장 |
| `ProjectForm` | 클라이언트 | project 폼 상태, 검증, 저장, 삭제, dirty 경고 |
| `ExperienceListEditor` | 클라이언트 | experiences 추가/삭제/이동 |
| `ExperienceCard` | 클라이언트 | experience 필드 묶음 |
| `TalkForm` | 클라이언트 | talk 폼 상태, 검증, 저장, 삭제 |
| `StringListEditor` | 클라이언트 | skills, techStack 문자열 목록 편집(추가, 삭제, 위/아래) |
| `LinkListEditor` | 클라이언트 | experience links의 label/url 쌍 목록 편집 |
| `FormField` | 클라이언트 | label, 입력 슬롯, 보조 문구, 에러 문구를 `id`/`aria-describedby`로 연결 |
| `TextInput`, `TextArea` | 클라이언트 | 네이티브 입력 래퍼(오류 시 `aria-invalid`) |
| `FormStatus` | 클라이언트 | 저장 성공/실패 메시지 영역(`role="status"`, `role="alert"`) |
| `FormActionBar` | 클라이언트 | sticky 저장/취소/삭제 액션 바 |
| `AdminButton` | 클라이언트 | 버튼 요소(primary, secondary, danger, icon-text 이동 버튼) |
| `admin-error` (error.tsx) | 클라이언트 | 오류 경계, 재시도 |
| `admin-not-found` (not-found.tsx) | 서버 | 항목 없음 안내 |

- 서버 데이터 읽기(목록, 단건)는 서버 컴포넌트에서 가드 함수를 거친 서비스 호출로 수행하고 결과를 props로 폼에 넘긴다.
- 폼의 저장/삭제/순서 변경 호출은 서버 쪽 쓰기 진입점(Server Action 또는 Route Handler)을 부른다. 선택은 개발자에게 위임하되, 두 경우 모두 응답 형태는 아래 오류 계약을 따른다.
- 클라이언트가 받는 오류 계약(UI 관점): 필드별 오류 맵, 폼 전체 오류 메시지, 상태 구분(검증 400, 미인증 401, 비허용 403, 없음 404, 중복 409, 서버 오류 5xx).

## 6. 공통 컴포넌트 재사용 현황

`src/components/common/`에 확인한 파일: `page-header`, `about-section`, `external-link`, `hero-section`, `project-card`, `talk-preview`, `word-cycler`. `src/components/ui/`: `button.tsx`. `src/components/layout/`: `footer`, `navbar`.

| 필요 요소 | 기존 공통 컴포넌트 | 결정 |
| --- | --- | --- |
| 모달/확인 대화상자 | 없음 | 네이티브 `<dialog>` + `showModal()`로 구현(의존성 없음, 포커스 트랩과 Esc 닫기 제공). `radix-ui` 패키지는 현재 의존성에 없으므로(`next`, `react`, `react-dom`, `pretendard`뿐) 도입하지 않는다. Radix AlertDialog로도 구현 가능하나 새 의존성이므로 네이티브 우선 |
| 드롭다운/선택 입력 | 없음 | 필요 없음(선택형 필드 없음) |
| 체크박스/스위치 | 없음 | 필요 없음 |
| 툴팁 | 없음 | 필요 없음(보조 문구는 상시 텍스트) |
| 버튼 | `ui/button.tsx`의 `Button` | `Button`은 `Link` 전용(`href` 필수)이라 제출/액션 버튼에는 쓸 수 없다. 링크 형태 이동(새 프로젝트, 편집, 취소, 사이트 보기)에는 `Button`을 재사용한다. 제출/액션용 `<button>`은 `AdminButton`을 신규 작성하되 `Button`의 pill 형태 기본 스타일(rounded-full, border white/25)을 따른다. `Button`에 `href` 없는 분기를 추가하는 방안은 공개 컴포넌트 변경이라 하지 않는다 |
| 외부 링크 표시 | `common/external-link.tsx`의 `ExternalLink` | "사이트 보기"에 재사용(구체 props는 개발자가 확인) |
| 페이지 제목 | `common/page-header.tsx`의 `PageHeader` | 공개용 대형 제목(`text-h*`)일 가능성이 높아 admin에 그대로 쓰기 어렵다. 개발자가 파일을 확인해 재사용 가능하면 사용, 아니면 `AdminPageHeader` 신규 |

- 신규 `AdminButton`, `ConfirmDialog` 등은 admin 전용이라 `src/app/admin/_components/`(또는 개발자가 정한 admin 하위)에 둔다. `src/components/common/`에는 공개 사이트 공용만 둔다.

## 7. 폼 필드와 클라이언트 검증

클라이언트 검증은 즉시 피드백용 보조이며 서버 zod가 신뢰 경계이다. 한도 수치는 requirements 권장값(단문 200자, 긴 본문 5000자, 목록 항목 수 50)을 쓰되 개발자가 확정하는 상수와 동일하게 맞춘다.

### 검증 표시 규칙

- 필드 검증 시점: 해당 필드 blur 시, 그리고 저장 시도 시 전체 필드.
- 오류가 있는 필드: `aria-invalid="true"`, 필드 아래 오류 문구, `aria-describedby`로 연결. 오류 표시는 색에만 의존하지 않고 문구를 항상 동반한다.
- 저장 시도에서 오류가 하나라도 있으면 저장 호출을 하지 않고, 폼 상단 `role="alert"` 요약 "{n}개 항목을 확인하세요."를 표시하며 첫 오류 필드로 포커스를 이동한다.
- 서버가 필드별 오류를 반환하면 같은 방식으로 필드에 매핑해 표시한다. 어느 필드에도 매핑되지 않는 오류는 폼 상단 알림에 표시한다.
- 글자 수 상한이 있는 `textarea`는 입력 중 "{현재}/{상한}" 카운터를 보조 텍스트로 보여준다(상한 초과 시 오류).

### 프로필 폼

| 필드 | 입력 | 필수 | 클라이언트 검증 | 비고 |
| --- | --- | --- | --- | --- |
| name | text | 예 | 비어 있지 않음, 200자 이하 | |
| title | text | 예 | 비어 있지 않음, 200자 이하 | |
| tagline | textarea | 예 | 비어 있지 않음, 5000자 이하 | 줄바꿈 보존 안내 |
| description | textarea | 예 | 비어 있지 않음, 5000자 이하 | |
| email | text(type=email) | 예 | 이메일 형식 | |
| github | text(type=url) | 예 | `https:` URL | |
| skills | StringListEditor | 예 | 항목 1개 이상, 각 항목 비어 있지 않음, 50개 이하 | 순서가 곧 hero 순환 단어 순서 |

### 프로젝트 폼

| 필드 | 입력 | 필수 | 클라이언트 검증 | 비고 |
| --- | --- | --- | --- | --- |
| slug | text | 예(생성) | `^[a-z0-9]+(-[a-z0-9]+)*$`, 비어 있지 않음 | 편집에서는 읽기 전용. 중복은 서버 409로 slug 필드에 "이미 사용 중인 slug입니다." 표시 |
| title | text | 예 | 비어 있지 않음, 200자 이하 | |
| period | text | 예 | 비어 있지 않음, 200자 이하 | |
| role | text | 예 | 비어 있지 않음, 200자 이하 | |
| summary | textarea | 예 | 비어 있지 않음, 5000자 이하 | |
| link | text(type=url) | 아니오 | 비어 있거나 `http:`/`https:` | |
| thumbnail | text | 아니오 | 비어 있거나 `/`로 시작하는 경로 또는 https URL | 허용 호스트 여부는 서버가 검사, 실패 시 "허용되지 않은 이미지 호스트입니다." 필드 오류. 입력 아래에 "저장소에 있는 이미지 경로(/images/...) 또는 허용된 https 주소" 보조 문구 |
| techStack | StringListEditor | 아니오 | 각 항목 비어 있지 않음, 50개 이하 | |
| experiences | ExperienceListEditor | 아니오 | 50개 이하 | |

### experience 카드

| 필드 | 입력 | 필수 | 클라이언트 검증 |
| --- | --- | --- | --- |
| title | text | 예 | 비어 있지 않음, 200자 이하(중복 허용) |
| problem | textarea | 예 | 비어 있지 않음, 5000자 이하 |
| solution | textarea | 예 | 비어 있지 않음, 5000자 이하 |
| tradeoff 장점 | textarea | 아니오 | 5000자 이하 |
| tradeoff 단점 | textarea | 아니오 | 5000자 이하 |
| tradeoff 근거 | textarea | 아니오 | 5000자 이하, 빈 값 허용(공개 페이지는 빈 항목 숨김) |
| result | textarea | 예 | 비어 있지 않음, 5000자 이하 |
| learning | textarea | 예 | 비어 있지 않음, 5000자 이하 |
| links | LinkListEditor | 아니오 | 각 항목 label 비어 있지 않음, url은 `http:`/`https:`, 50개 이하 |

- 필수 여부 중 tradeoff 외 experience 필드의 필수성은 requirements에 명시되지 않았다(필수는 slug, title, period, role, summary만). 위 표의 "예"는 현재 `Experience` 타입에서 optional이 아닌 필드를 기준으로 한 디자인 기본값이며, 서버 zod 규칙과 어긋나면 서버 규칙을 따라 표를 정정한다. 이 항목은 PM 확인 대상이다(11절).
- 오류가 experience 카드 내부에 있으면 카드 헤더에 "오류 {n}개"를 텍스트로 표시해 접힌 상태가 없어도 위치를 찾기 쉽게 한다.
- 필드 id는 카드 단위로 고유해야 한다(예: 카드 인덱스 또는 임시 id 기반). label 연결이 중복 id로 깨지지 않게 한다.

### 발표 폼

| 필드 | 입력 | 필수 | 클라이언트 검증 |
| --- | --- | --- | --- |
| slug | text | 예(생성) | 프로젝트와 동일 규칙, 편집에서는 읽기 전용 |
| title | text | 예 | 비어 있지 않음, 200자 이하 |
| date | text | 예 | `^\d{4}\.(0[1-9]|1[0-2])$` |
| venue | text | 예 | 비어 있지 않음, 200자 이하 |
| description | textarea | 예 | 비어 있지 않음, 5000자 이하 |
| impact | textarea | 예 | 비어 있지 않음, 5000자 이하 |
| link | text(type=url) | 예 | `http:`/`https:` |

- 발표 필드의 필수성도 현재 `TechTalk` 타입(전부 필수) 기준 디자인 기본값이다.

### 목록 편집기(StringListEditor, LinkListEditor) 동작

- 각 항목은 입력 1개(links는 label+url 2개) + 위로, 아래로, 삭제 버튼 한 행이다.
- 하단 "항목 추가" 버튼. 추가 시 새 항목 입력으로 포커스 이동.
- 삭제 시 포커스는 다음 항목(없으면 이전 항목, 둘 다 없으면 "항목 추가" 버튼)으로 이동한다.
- 첫 항목의 위로, 마지막 항목의 아래로는 `disabled`.
- 이동 버튼의 접근 가능한 이름은 "{항목명} 위로 이동"처럼 대상을 포함한다.
- 항목 수가 상한(50)에 도달하면 추가 버튼을 비활성화하고 "최대 50개" 보조 문구를 표시한다.
- Enter 키로 항목 추가가 폼 제출로 이어지지 않아야 한다(단일 행 입력 Enter는 폼 제출 대신 "항목 추가"로 연결하거나 무시. 구체 선택은 개발자).

## 8. 상태 명세

### 저장

| 상태 | 표시 |
| --- | --- |
| 기본 | 저장 버튼 활성(변경 없음이어도 활성 허용) |
| 저장 중 | 저장 버튼 비활성 + 텍스트 "저장 중...", 모든 입력은 읽기 가능 상태 유지(`aria-busy` 폼), 이중 제출 방지 |
| 성공 | `FormStatus` `role="status"`에 "저장했습니다." (생성은 이동 후 표시). 약 5초 후 또는 다음 편집 시 숨김 |
| 검증 실패(클라이언트) | 7절 규칙 |
| 서버 400 | 필드별 오류 매핑 + 상단 요약 |
| 서버 409 | slug 필드에 "이미 사용 중인 slug입니다." 필드 오류 + 상단 요약 |
| 서버 404 | 상단 알림 "대상이 이미 삭제되었습니다." + 목록으로 링크. 입력값은 유지 |
| 서버 5xx / 네트워크 오류 | 상단 `role="alert"`에 "저장하지 못했습니다. 잠시 후 다시 시도하세요." 입력값 유지, 저장 버튼 재활성 |
| 401(세션 만료) | 알림 "세션이 만료되었습니다. 입력한 내용은 저장되지 않았습니다." + "다시 로그인" 링크(`/admin/login?reason=expired&from=현재경로`). 로그인 이동 전 입력 유실 경고를 포함하며, 입력값은 화면에서 지우지 않는다 |
| 403 | 알림 "권한이 없습니다." + 로그아웃 버튼 |

- 공개 페이지 갱신(revalidate)은 서버 쓰기 성공 후 서버가 수행한다. 성공 메시지는 쓰기 성공을 기준으로 하며, revalidate 실패는 사용자 화면에는 별도 표시하지 않는다(서버 로그로 처리).

### 삭제 확인 대화상자(`ConfirmDialog`)

- 트리거: 목록의 삭제 버튼, 프로젝트/발표 편집 화면의 삭제 버튼.
- 제목: "{제목}을 삭제할까요?" 본문: 프로젝트는 "연결된 경험 {n}개도 함께 삭제되며 되돌릴 수 없습니다." 발표는 "되돌릴 수 없습니다." 프로젝트는 추가로 "공개 주소 /work/{slug}가 더 이상 열리지 않습니다." 를 표시한다.
- 버튼 2개: "취소"(기본 포커스), "삭제"(danger). 파괴적 동작이 기본 포커스가 되지 않도록 한다.
- 삭제 중: "삭제" 버튼 비활성 + "삭제 중...", 취소 비활성, Esc/배경 클릭으로 닫히지 않음.
- 삭제 성공: 대화상자 닫기, 목록 화면이면 목록 갱신 + 라이브 영역에 "{제목}을 삭제했습니다." 편집 화면에서 삭제했으면 목록 화면으로 이동하고 같은 메시지를 표시한다.
- 삭제 실패: 대화상자 안에 `role="alert"` 오류 문구 "삭제하지 못했습니다. 다시 시도하세요." 대화상자는 열린 상태 유지. 404면 "이미 삭제된 항목입니다."로 표시 후 닫을 때 목록 갱신.
- 닫힘 시 포커스: 목록 삭제는 다음 행의 삭제 버튼이 아니라 행 목록 제목으로 이동(행이 사라지므로), 취소로 닫으면 호출한 삭제 버튼으로 복귀.

### 목록 화면

- 로딩: 서버 렌더이므로 라우트 전환 중 `loading.tsx`로 행 형태의 스켈레톤 3개(텍스트 대체 "불러오는 중..." 시각 숨김 텍스트 포함)를 표시한다.
- 빈 상태: 4-4, 4-6 문구와 생성 버튼.
- 오류: 목록 조회 실패 시 `error.tsx`가 "목록을 불러오지 못했습니다." + "다시 시도" 버튼(`reset`)을 표시한다. 상세 오류 정보는 노출하지 않는다.

### 폼 로딩(편집 진입)

- 서버 렌더 후 폼이 열리므로 별도 로딩 폼 상태는 없다. 라우트 전환 로딩은 `loading.tsx`가 처리한다.

### 비인가 접근

| 상황 | 화면 동작 |
| --- | --- |
| 미인증으로 `/admin/**` 접근 | `/admin/login?from=`로 리다이렉트. 로그인 화면은 별도 안내 없이 로그인 버튼만 표시 |
| 미인증으로 `/api/admin/**` 호출 | 401 JSON(화면 없음) |
| allowlist 외 계정 로그인 시도 | 로그인 화면에 4-1의 단일 거부 문구. 세션 없음 |
| 세션 있지만 allowlist에서 빠진 계정이 admin 진입(드문 경우, 서버 재검사 403) | admin 화면 대신 "접근 권한이 없습니다." 전용 화면(`role="alert"`) + 로그아웃 버튼. 데이터는 렌더하지 않는다 |
| 세션 만료 후 저장 | 저장 상태 표의 401 행 |
| 환경변수 누락(`ADMIN_GITHUB_ID` 비어 있음) | 모든 로그인 거부(fail-closed). 화면은 일반 거부 문구와 같음 |

## 9. 접근성

- 모든 입력은 보이는 `<label>`과 `htmlFor`/`id`로 연결한다. placeholder를 label 대용으로 쓰지 않는다.
- 필수 필드는 label에 "(필수)" 텍스트를 붙이고 `required`/`aria-required`를 설정한다. 색만으로 구분하지 않는다. 클라이언트 검증 메시지를 직접 제어하기 위해 `<form noValidate>`를 사용한다(브라우저 기본 말풍선 대신 앱 메시지 사용).
- 오류 문구는 `id`를 가지고 해당 입력의 `aria-describedby`에 보조 문구와 함께 연결한다.
- 제출 오류 요약은 `role="alert"`, 성공 메시지는 `role="status"`로 읽힌다.
- 키보드: 모든 기능(목록 이동, 삭제, 경험/항목 추가·삭제·이동, 저장)이 Tab, Shift+Tab, Enter, Space만으로 가능해야 한다. 포커스 순서는 시각 순서와 동일하다.
- 포커스 표시: 모든 인터랙티브 요소에 `focus-visible` 링 표시(흰색 계열, 배경 대비 확보). 기본 outline 제거 시 대체 링 필수.
- `ConfirmDialog`: 네이티브 `<dialog>` `showModal()` 사용, `aria-labelledby`(제목)와 `aria-describedby`(본문) 연결, 열릴 때 "취소" 버튼에 포커스, 포커스 트랩, Esc로 닫기(삭제 중 제외), 닫을 때 호출 요소로 포커스 복귀(8절 예외 참조).
- 아이콘 전용 버튼을 쓰지 않는다. 이동 버튼은 "위로"/"아래로" 텍스트(또는 화살표 문자 + 대상 포함 `aria-label`)를 갖는다. 장식 문자는 `aria-hidden`.
- 순서 이동, 경험/항목 삭제 결과는 `aria-live="polite"` 영역에 알린다.
- `AdminNav`는 `<nav aria-label="admin">`, 현재 페이지에 `aria-current="page"`.
- 대비: 본문 텍스트는 흰색 또는 `white/70` 이상, 비활성 요소만 `white/50` 허용. 오류/성공 구분은 색 + 문구 + (선택) 접두 기호 병행.
- `prefers-reduced-motion`: 새 애니메이션을 추가하지 않으며, 로딩 스켈레톤의 pulse가 필요하면 `motion-reduce:` 로 정지한다.
- 스킵 링크: admin 본문 영역 `id="admin-main"`으로 이동하는 "본문으로 건너뛰기" 링크를 헤더 앞에 둔다(포커스 시에만 표시).
- 페이지마다 고유한 `<h1>`(화면 제목)을 하나만 둔다. `<title>`은 "{화면 이름} - admin" 형식.
- 터치 대상 최소 44px, 인접 버튼 간격 8px 이상.

## 10. 공개 컴포넌트 props 인터페이스

공개 페이지의 마크업과 스타일은 바꾸지 않는다. 아래 props 추가만 한다. 타입 이름은 `src/types/portfolio.ts`에서 유지되는 단일 원본 `Profile`을 가정한다(requirements 4절 "타입" 단일 원본 규칙; 이름은 개발자 확정).

| 컴포넌트 | 경계 | 추가되는 props | 변경 요약 |
| --- | --- | --- | --- |
| `Navbar` | 클라이언트 유지 | `name: string` | 좌측 로고 텍스트를 `profileData.name` 대신 props로 표시. 링크 목록, 스타일, `usePathname` 로직 변경 없음 |
| `Footer` | 현재 `"use client"`로 `profileData` import | `profile`: `Pick<Profile, ...>` 중 footer가 쓰는 필드(구현 시 현재 사용 필드를 확인해 최소 집합만 받음) | 데이터 출처만 props로 변경 |
| `HeroSection` | 클라이언트 유지 | `profile: Pick<Profile, "name" | "title" | "tagline" | "skills">` | 모듈 상단 `const skills = profileData.skills.join(", ")`를 컴포넌트 안에서 `props.skills`로 계산하도록 이동. 마크업/클래스/`WordCycler` 인자 불변 |
| `AboutSection` | 클라이언트 유지 | `profile`: 현재 사용 필드(예: `description`, `skills`, `name` 등)의 `Pick<Profile, ...>` | 데이터 출처만 변경. `/`와 `/about` 두 호출부가 모두 같은 props를 넘김 |

- 서버 호출부: `layout.tsx`가 profile을 조회해 `Navbar name`, `Footer profile`에 전달. `app/page.tsx`가 `HeroSection`, `AboutSection`에 전달. `about/page.tsx`도 `AboutSection`에 전달.
- 그 외 서버 페이지(`projects`, `blog`, `work/[id]`, `contact`)는 시각 변경 없이 데이터 조회처만 바뀐다.
- `ProjectCard`는 `project.slug`로 링크하고 카드 색상은 순번 기반 팔레트(requirements 5절 6번)에서 받도록 props가 추가된다(예: 색상 인덱스 또는 테마 객체). 카드의 외형은 현재 5개 프로젝트에서 동일해야 한다. 구체 prop 형태는 개발자가 `ProjectCard` 확인 후 확정한다.
- 이 4개 컴포넌트에 서비스 모듈 import, 데이터 fetch, admin 의존을 추가하지 않는다.

## 11. 디자인 토큰과 확인 필요 항목

### 토큰 현황

- `src/app/globals.css`에 정의된 색 토큰은 `--background`, `--foreground`, `--green`, `--white-25`, `--white-50`뿐이다. `tailwind.md`가 언급하는 `bg-surface`, `text-text-2`, `text-brand`, `bg-danger-soft` 등은 현재 `globals.css`에 존재하지 않는다(다른 프로젝트 규칙 문서에서 온 것으로 보이며 이 저장소에서 확인되지 않음). 공개 컴포넌트는 `bg-white/25`, `border-white/25`, `text-white`, `opacity-50` 같은 흰색 투명도 표기를 쓴다.
- 따라서 admin 기본 톤은 공개 컴포넌트와 같은 흰색 투명도 표기(`border-white/25`, `bg-white/5`, `bg-white/10`, `text-white`, `text-white/70`, `opacity-50`)와 `rounded-full`(버튼), 폼 입력은 `rounded` 계열 사각 테두리를 쓴다. spacing은 px 환산(`p-16` = 16px)을 따른다.
- 타이포는 기존 `.text-small`, `.text-body`, `.text-h3`를 재사용한다. admin 제목은 공개용 `.text-h1`/`.text-h2`보다 작게 쓴다(`text-h3` 또는 `text-xl font-medium`).
- 임의 값(`[]`)은 쓰지 않는다. `min-h-44`, `max-w-*` 중 필요한 새 값은 `@theme` 토큰으로 추가한다(예: admin 본문 최대 너비 960px는 `--container-admin` 신규 후보).

### 확인 필요(사용자 또는 PM)

1. 오류/위험 색상: 현재 오류(danger)와 성공(ok) 지시색 토큰이 없다. 임의 색을 정하지 않는다. 사용자가 색 값을 지정하거나 `@theme`에 `danger`, `ok` 토큰 추가를 승인하기 전까지는 흰색 계열 + 문구 + 접두 기호("오류:", "완료:")로만 구분한다. 승인되면 토큰을 `globals.css`에 추가하고 오류 텍스트/테두리/danger 버튼에 적용한다.
2. 프로젝트 experience와 발표 필드의 필수 여부(7절 주석): 서버 zod 규칙과 일치시킬 기준 확정.
3. `PageHeader`, `ExternalLink`의 재사용 가능 여부는 개발자가 두 파일을 열어 확인(본 명세는 시그니처를 확인하지 않음).
4. 순서 변경을 즉시 저장으로 둘지(본 명세 기본값), 목록에서도 "순서 저장" 버튼으로 일괄 저장할지. 기본값은 즉시 저장(requirements F7 "이동 버튼"과 부합, 구현이 단순).
5. admin 헤더의 계정 표시 항목(GitHub 로그인 이름)을 세션에서 가져올 수 있는지는 개발자가 next-auth 세션 구성으로 확인.
