# design-spec: admin·블로그 UX 개선 (F1~F11) (T03)

- 작성일: 2026-10-15
- 입력: `requirements.md`(7절 사용자 확정 포함), `00-input.md`, 선행 `2026-10-14-blog/design-spec.md`, `docs/agent-rules/tailwind.md`, `project-structure.md`
- 직접 확인한 소스: `navbar.tsx`, `public-shell.tsx`, `globals.css`, 공개 `blog/page.tsx`, `blog/[slug]/page.tsx`, `admin-nav.tsx`, `sign-out-button.tsx`, `admin-console-shell.tsx`, `admin-page-header.tsx`, `admin/(console)/layout.tsx`, `blog/page.tsx`(admin), `resume/page.tsx`, `profile/page.tsx`, `blog-form.tsx`, `markdown-editor.tsx`, `form-parts.tsx`, `confirm-dialog.tsx`, `use-admin-form.ts`, `sortable-list.tsx`, `admin-button.tsx`, `text-fields.tsx`, `pagination.tsx`
- 원칙: 새 색/폰트/아이콘 없음. 흑백 + `white` 투명도 + 기존 토큰(`danger`)만 사용. Tailwind spacing 1 = 1px. 코드는 쓰지 않고 클래스는 구현 지침이다. 모든 값은 아래에서 결정하며 개발자 선택으로 남기지 않는다(단, 브라우저 실측으로만 확인 가능한 항목은 "검증 규칙"을 함께 적었다).

## 목차

- [1. 요약과 핵심 결정](#1-요약과-핵심-결정)
- [2. 공통 컴포넌트 확인 결과](#2-공통-컴포넌트-확인-결과)
- [3. 결과 피드백 위치](#3-결과-피드백-위치)
- [4. F9 토스트 상세](#4-f9-토스트-상세)
- [5. F10 ConfirmDialog 일반화](#5-f10-confirmdialog-일반화)
- [6. F1 공개 Navbar 모바일 간격](#6-f1-공개-navbar-모바일-간격)
- [7. F2 공개 카테고리 탭 행간과 F5 admin 카테고리 탭](#7-f2-공개-카테고리-탭-행간과-f5-admin-카테고리-탭)
- [8. F3 글 하단 정리와 이전/다음 글](#8-f3-글-하단-정리와-이전다음-글)
- [9. F4 admin 탭과 제목 영어화](#9-f4-admin-탭과-제목-영어화)
- [10. F6 공개 여부 UI 제거](#10-f6-공개-여부-ui-제거)
- [11. F7 작성/미리보기 탭](#11-f7-작성미리보기-탭)
- [12. F8 글자 수 표시](#12-f8-글자-수-표시)
- [13. F11 저장 후 이동과 토스트](#13-f11-저장-후-이동과-토스트)
- [14. 컴포넌트 목록](#14-컴포넌트-목록)
- [15. 상태 정리](#15-상태-정리)
- [16. 뷰포트별 확인표](#16-뷰포트별-확인표)

## 1. 요약과 핵심 결정

| # | 결정 | 근거 |
| --- | --- | --- |
| F1 | 모바일 Navbar 이름-링크 간격 `gap-8` -> `gap-16`, 높이 89 -> 97px, 모바일 본문 시작 오프셋 새 토큰 `--spacing-header-mobile: 112px`(md 이상은 기존 92px) | md 이상의 "Navbar 77px + 여유 15px" 비율을 모바일에도 적용(97 + 15 = 112) |
| F2/F5 | 카테고리 탭을 공용 컴포넌트 1개로 만들어 공개/admin이 공유. 링크 `min-h-44`(모바일), 행 간격 `gap-y-4`, 열 간격 `gap-x-16` | admin-nav의 `min-h-44` + `gap-y-4` 선례. 두 곳이 같은 컴포넌트라 간격이 구조적으로 일치 |
| F3 | 본문 아래 `nav` 안에 이전/다음 카드 2개. 모바일 1열 세로 쌓기(이전 글 먼저), `md` 이상 2열 | 4절의 상세 |
| F4 | 라벨 소문자 영어, 로그아웃 버튼 라벨 `logout`. 외형 변경 없음 | requirements 2.2 |
| F7 | `role="tablist"` + 텍스트 밑줄 방식(admin-nav와 동일 클래스). 자동 활성화(방향키 이동 = 선택) | 전환 비용 없고 비파괴라 자동 활성화 |
| F8 | `3,700 / 300,000자` | requirements F8 |
| F9 | 토스트는 뷰포트 고정 하단(저장바 바로 위), `AdminConsoleShell`(console `layout.tsx`가 렌더, 라우트 이동에도 유지)에 provider. 성공 6초 자동 소멸, 오류/경고는 닫을 때까지 유지, 최대 3개 | 3, 4절 |
| F10 | `ConfirmDialog`에 `confirmLabel`/`busyLabel`/`cancelLabel`/`variant` 추가, 기본값은 현행 | 5절 |
| F11 | 이동 동작 변경 없음. 토스트는 이동 전 출발 화면에서 띄워 provider에 유지(`?saved=1`/`?deleted=1` 쿼리 불필요) | 4.7 |

## 2. 공통 컴포넌트 확인 결과

`src/components/common/`: `word-cycler`, `external-link`, `project-card`, `talk-preview`, `about-section`, `hero-section`, `page-header`, `resume-section`, `markdown-body`, `pagination`, `post-row`. 모달/드롭다운/체크박스/스위치/툴팁/탭/토스트 공통 컴포넌트 없음. `src/components/admin/`에 `confirm-dialog.tsx`, `admin-button.tsx`, `text-fields.tsx` 존재. `radix-ui`와 `@radix-ui/react-tabs`는 `node_modules`에 설치되어 있지 않다(확인함). 신규 의존성 금지이므로 Radix를 쓰지 않는다.

| 요소 | 사용할 것 | 비고 |
| --- | --- | --- |
| 모달(이탈 경고, slug 확인, 덮어쓰기, 삭제) | `src/components/admin/confirm-dialog.tsx`의 `ConfirmDialog`(일반화) | 새 모달 만들지 않음 |
| 탭(작성/미리보기) | 네이티브 `button role="tab"` 직접 구현 | 공통 탭 없음, Radix 미설치. 단일 사용처라 `markdown-editor.tsx` 내부 |
| 카테고리 탭 | 링크 목록(`Link`) 신규 공용 `category-tabs.tsx`(`components/common/`) | 선택 컴포넌트 아님, 서버 컴포넌트로 사용 가능 |
| 토스트 | 신규 `components/admin/toast-provider.tsx`(provider + 표시 영역 + `useToast`) | 외부 라이브러리 금지. 공통 토스트 없음 |
| 버튼 | `AdminButton`(admin). 탭 요소는 `AdminButton`이 `role`, `aria-selected`를 받지 못하고 pill 모양이라 일반 `button` | |
| 툴팁/드롭다운/체크박스 | 사용 안 함(체크박스는 F6으로 삭제) | |

## 3. 결과 피드백 위치

Bug Team 포스트모텀(`2026-10-13-admin-save-feedback`) 기준: "행동 버튼이 고정 영역에 있으면 결과 피드백도 같은 영역에 둔다. 다른 위치면 이유를 적는다."

결정: 결과는 하단 `FormActionBar` 안이 아니라 뷰포트 고정 토스트에 표시한다. 위치는 저장바 바로 위다.

근거:

1. 행동 버튼(저장/취소/삭제)은 `FormActionBar`의 `sticky bottom-0`(높이 77px: `py-16` 32 + 버튼 `min-h-44` 44 + `border-t` 1)이라 항상 뷰포트 하단에 있다. 토스트도 `position: fixed`라 스크롤 위치와 무관하게 항상 같은 뷰포트 하단에 있고, 저장바 바로 위(`bottom-96`)에 붙는다. 시선이 저장 버튼에 있는 채로 결과가 보인다. 즉 "같은 영역"(뷰포트 하단 고정)이며 "다른 위치" 예외 조항에 기대지 않는다.
2. 원 버그(결과가 문서 상단이라 본문이 길면 화면 밖)는 구조적으로 재발하지 않는다. 검증 기준: 본문 3,000줄 입력 후 맨 위로 스크롤한 상태에서 저장 실패를 일으켜도 스크롤 없이 오류 토스트가 보인다.
3. 저장바와 겹치지 않는다. 저장바 한 줄 높이 77px, 줄바꿈으로 두 줄이 된 경우(busyMessage "이미지 업로드 중..."이 320px 폭에서 둘째 줄) 최대 약 129px이며 이때 버튼 행은 하단에서 약 44~88px 구간이다. 토스트 하단 오프셋 96px이 버튼 행 위에 있으므로 버튼을 가리지 않는다. 한 줄일 때 저장바와 토스트 사이 간격은 19px.
4. 상단 고정 헤더(`z-50`, 모바일 줄바꿈 시 최대 약 125px)와도 겹치지 않도록 토스트를 하단에 둔다. 상단 배치는 헤더 높이가 가변이라 겹침 계산이 불안정하다.
5. 목록 화면처럼 저장바가 없는 화면에서도 같은 위치를 쓴다(화면마다 위치가 달라지지 않게 함). 이 경우 하단에서 96px 위에 뜨며 허용한다.

code-review 확인 항목: (a) 3,000줄 본문 + 상단 스크롤 상태에서 오류 토스트 가시성, (b) 375px에서 저장 직후 토스트와 저장/취소/삭제 버튼 비겹침, (c) 320px 업로드 중 줄바꿈된 저장바와 비겹침, (d) 성공 토스트가 `FormActionBar`의 기존 요약 문구("저장됨" 등) 없이 단독 표시됨.

## 4. F9 토스트 상세

### 4.1 구조와 위치

- provider는 `AdminConsoleShell`이 children을 감싸는 위치에 둔다(`(console)/layout.tsx`가 shell을 렌더하며 라우트 전환 시 이 레이아웃은 언마운트되지 않으므로 `router.push`/`router.replace` 후에도 토스트가 유지된다). `/admin/login`은 shell 밖이므로 토스트 없음(범위 밖).
- 표시 영역은 shell의 `main` 뒤(DOM 마지막)에 렌더. 이유는 4.6 키보드 도달.
- 영역 컨테이너: `fixed inset-x-16 bottom-96 z-40 flex flex-col gap-8 pointer-events-none md:left-auto md:right-24 md:w-full md:max-w-480`. 개별 토스트는 `pointer-events-auto`. 새 토스트가 아래(저장바에 가까운 쪽)에 쌓인다(컨테이너 하단 기준, DOM 순서 = 생성 순서).
- 모바일: 320px 288px 폭, 375px 343px, 390px 358px(양쪽 16px 여백). 데스크톱(`md` 768px 이상): 우측 하단 24px 여백, 폭 최대 480px(`max-w-480`, 기존 토큰). 모달은 top layer(`showModal`)라 토스트 위에 뜨며 모달 포커스 흐름과 충돌하지 않는다.
- 컨테이너 자체에는 `role`을 주지 않고 `aria-label="알림"`을 가진 `section`(region)으로 둔다. 비어 있을 때도 마운트하되 높이 0.
- 애니메이션 없음(등장/퇴장 즉시). `prefers-reduced-motion` 고려 불필요.

### 4.2 토스트 한 개

- 외형: `flex items-start gap-8 rounded-md border bg-black py-8 pl-16 pr-4 text-small`. 배경은 불투명 `bg-black`(뒤 본문과 글자가 겹쳐 읽히지 않는 문제 방지).
  - 성공: `border-white/25`
  - 경고: `border-white`
  - 오류: `border-danger` (`--danger`는 오류 지시색으로 정의된 의미 그대로 사용)
- 본문 블록 `min-w-0 flex-1 py-8 break-words`: 문구 한 줄 `{접두어}{message}`. 접두어 `완료: `(성공), `주의: `(경고), `오류: `(오류)는 색에 의존하지 않기 위해 유지.
- 행동 줄(있을 때만) `mt-8 flex flex-wrap items-center gap-12`: 링크는 `underline underline-offset-4`(기존 `NoticeMessage`와 동일), 버튼은 `AdminButton`(`logout`은 `SignOutButton`, `새로고침`은 `AdminButton` 기본 secondary).
- 닫기 버튼: `AdminButton variant="icon"`(44x44 터치 영역, `min-h-44 min-w-44`), 내용 `×`(`aria-hidden`), `aria-label="알림 닫기"`. 항상 오른쪽 끝.
- 포커스 표시: 기존 `AdminButton`/링크의 `focus-visible:outline-2 focus-visible:outline-white`.

### 4.3 톤과 role

| tone | role | 자동 소멸 | 접두어 | 사용처 |
| --- | --- | --- | --- | --- |
| `success` | `status` | 6초 | 완료: | 저장 성공, 순서 저장, 삭제 완료, 이미지 삽입, 파일 불러오기 |
| `warning`(신규) | `status` | 없음, 닫을 때까지 | 주의: | `published: false` .md 가져오기 안내 |
| `error` | `alert` | 없음, 닫을 때까지 | 오류: | 저장 실패, 검증 요약, 업로드 실패, 삭제 실패, 세션 만료 등 |

`warning`을 추가하는 이유: 사용자 확정(requirements 7-4)의 안내는 오류가 아니지만 6초 만에 사라지면 놓칠 수 있고, 오류 톤은 "오류:"라는 틀린 접두어와 `role="alert"` 중단 낭독을 만든다. 기존 `Notice` 타입에 `warning` 톤을 추가한다.

### 4.4 자동 소멸 시간

- 성공 6초. 근거: 대표 문구 "완료: 저장했습니다. 공개 페이지에 반영되었습니다."(약 30자)를 읽는 데 4초 안팎이 걸리고, W3C Understanding SC 2.2.1이 예시로 든 5초는 최소 기준에 가까워 여유를 1초 더 둔다. 일시정지와 닫기 버튼이 있어 시간 제한 위험을 추가로 줄인다. 이미지 삽입 성공처럼 "alt 텍스트를 확인하세요"라는 행동 안내가 붙은 문구(약 30자)도 6초로 같다.
- 포인터가 토스트 위에 있는 동안(`pointerenter` ~ `pointerleave`)과 토스트 안에 키보드 포커스가 있는 동안(`focusin` ~ `focusout`) 타이머 정지. 해제되면 6초를 처음부터 다시 시작(남은 시간 이어가기보다 단순하고 읽을 시간을 보장).
- 터치 기기에서는 hover가 없으므로 닫기 버튼이 보장 수단이다.
- 오류/경고는 타이머 없음.

### 4.5 누적 상한, 중복, 정리 규칙

- 최대 3개 동시 표시. 4번째가 생기면 가장 오래된 성공 토스트를 먼저 제거, 성공이 없으면 가장 오래된 토스트를 제거.
- 중복: `tone + message + 행동(링크 href/label, signOut)`이 같은 토스트가 이미 있으면 새로 쌓지 않고 그 토스트를 새 key로 다시 렌더(스크린리더가 다시 낭독, 성공이면 타이머 재시작). 카운트 배지는 두지 않는다.
- 폼 그룹 정리: 토스트는 선택적 `group` 식별자(폼 인스턴스)를 가진다. 같은 group에서 (a) 저장 제출을 시작할 때, (b) 새 성공 토스트가 생길 때 해당 group의 이전 오류/경고 토스트를 치운다(requirements 2.1의 "다음 시도에서 치움").
- 이전 결과가 편집 화면에 남아 오해를 주지 않도록, 기존 "dirty가 되면 성공 알림 숨김" 동작은 쓰지 않는다. 대신 성공은 6초 자동 소멸에 맡긴다(requirements F9-5).
- 필드별 오류(`TextField` error 등)와 진행 문구("저장 중...", "이미지 업로드 중...", "썸네일 업로드 중...")는 기존 위치 유지.

### 4.6 키보드와 포커스

- 토스트는 포커스를 가로채지 않는다. 검증 실패 시 첫 오류 필드로 이동하는 기존 `focusTick` 동작 유지.
- 도달 방식: 표시 영역이 DOM 마지막(`main` 뒤)이므로 Tab 순서에서 `FormActionBar`(main의 마지막 포커스 요소) 바로 다음이 토스트의 행동 링크/버튼과 닫기 버튼이다. 저장바에서 Tab 한 번으로 도달한다. 목록 화면은 목록 다음.
- 토스트 안에서 `Esc`: 그 토스트를 닫는다. 닫은 뒤 포커스는 같은 영역의 다음 토스트의 닫기 버튼, 없으면 `#admin-main`(`tabIndex=-1`, `preventScroll`).
- 오류 토스트가 `role="alert"`로 낭독되므로 별도 포커스 이동은 하지 않는다.

### 4.7 라우트 이동과 쿼리 플래그

- 생성 저장 성공: 출발 화면(새 글 폼)에서 `toast.success("저장했습니다. 공개 페이지에 반영되었습니다.")`를 먼저 호출한 뒤 `router.push(편집 화면)`. provider가 레이아웃에 있어 도착 화면에서도 토스트가 보이며 중복 생성이 없다.
- 삭제 성공: 폼에서 `toast.success("삭제했습니다.")` 후 `router.push(목록)`. 목록 4곳의 `?deleted=1`/`?deleted=kind` 쿼리, `initialMessage`, `initialSaved`, `?saved=1`은 모두 불필요하므로 제거한다. 새로고침/뒤로가기로 토스트가 다시 뜨는 문제(P1)가 구조적으로 사라진다.
- slug 변경 후 `router.replace`(project·talk)도 같은 방식: 토스트를 먼저 띄운 뒤 replace.
- 이동 대상이 404이거나 이동이 실패해도 토스트는 사라지지 않는다(성공 6초 규칙을 따름).
- 토스트 안의 `다시 로그인` 링크는 `/admin/login?reason=expired&from=...`로 shell 밖으로 이동하며 이동 시 provider도 사라진다(의도).
- 생성 후 `router.push`가 `onSaved`에서 이루어지고 `savingRef`로 중복 제출 방지하는 기존 동작 유지.

### 4.8 사용처별 문구와 톤 매핑

| 위치 | 이벤트 | tone | 문구(접두어 제외) | 행동 |
| --- | --- | --- | --- | --- |
| useAdminForm | 저장 성공 | success | 저장했습니다. 공개 페이지에 반영되었습니다. | 없음 |
| useAdminForm | 검증 실패 | error | N개 항목을 확인하세요. | 없음 |
| useAdminForm | 401 | error | 세션이 만료되었습니다. 입력한 내용은 저장되지 않았습니다. | 링크 `다시 로그인` |
| useAdminForm | 403 | error | 권한이 없습니다. (출처 거부는 요청 출처가 허용되지 않습니다.) | 버튼 `logout`(출처 거부 제외) |
| useAdminForm | 404 | error | 대상이 이미 삭제되었습니다. | 링크 `목록으로` |
| 블로그 폼 | 이미지 삽입 성공 | success | 이미지를 본문에 넣었습니다. alt 텍스트를 확인하세요. | 없음 |
| 블로그 폼 | 업로드/가져오기 오류 | error | 기존 문구 | 없음 |
| 블로그 폼 | .md 불러오기 성공 | success | 파일을 불러왔습니다. 내용을 확인하고 저장하세요. | 없음 |
| 블로그 폼 | `published: false` 파일 | warning | 파일을 불러왔습니다. 이 파일은 비공개(published: false)였지만 저장하면 공개 글이 됩니다. 내용을 확인하고 저장하세요. | 없음 |
| 블로그 폼 | frontmatter 파싱 실패 | error | frontmatter를 읽지 못해 전체를 본문으로 불러왔습니다. 내용을 확인하고 저장하세요. | 없음 |
| SortableList | 순서 저장 성공 | success | 순서를 저장했습니다. | 없음 |
| SortableList | 삭제 성공 | success | {제목}을 삭제했습니다. | 없음 |
| SortableList | 충돌(ORDER_MISMATCH) | error | 다른 곳에서 목록이 변경되었습니다. 새로고침한 뒤 다시 시도하세요. | 버튼 `새로고침` |
| SortableList | 순서 저장 일반 오류 | error | 순서를 저장하지 못했습니다. 잠시 후 다시 시도하세요. | 없음 |
| 삭제 실패(모달 내) | 삭제 실패 | 모달 내 `role="alert"` 유지 | 변경 없음 | 없음 |

`published: false` 안내는 파일 선택 직후이며, 키가 없거나 `true`면 일반 success 토스트만 나온다.

### 4.9 기존 UI 정리 대상

- `FormStatus` 컴포넌트 삭제(사용처가 없어짐).
- `FormActionBar`: `notice`, `detailed` props 삭제. `busyMessage`는 유지하되 `detailed` 조건 없이 표시(`role="status"`, `text-small`). 저장 중 상태는 버튼 문구 "저장 중..."으로 유지. "저장됨"/"저장 실패" 요약 문구 삭제.
- `NoticeMessage`의 내용 렌더 로직(링크, signOut)은 토스트 컴포넌트로 이동.
- `SortableList`: `error` 영역(`SortableError`), 삭제/저장 결과 메시지는 토스트로. 이동 안내 `aria-live` 문단("n번째로 이동했습니다.")과 "순서가 변경되었습니다. 저장해야 반영됩니다." 배너는 유지. 삭제 후 `message`에 삭제 문구를 넣지 않는다(토스트와 중복 낭독 방지).
- 목록 화면의 `role="status"` "삭제했습니다." 문단 삭제.

## 5. F10 ConfirmDialog 일반화

### 5.1 props

| prop | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `open` | boolean | 필수 | 현행 |
| `title` | string | 필수 | 현행, `h2`, `aria-labelledby` |
| `description` | ReactNode | 필수 | 현행, `aria-describedby` |
| `onConfirm` | `() => Promise<string \| null>` | 필수 | 현행. 성공 `null`, 실패 오류 문구. 동기 동작(이동 허용)은 `async () => { ...; return null; }` |
| `onClose` | `() => void` | 필수 | 현행. 취소, Esc 모두 호출 |
| `confirmLabel` | string | `"삭제"` | 확인 버튼 라벨 |
| `busyLabel` | string | `"삭제 중..."` | 확인 진행 중 라벨 |
| `cancelLabel` | string | `"취소"` | 취소 버튼 라벨 |
| `variant` | `"danger" \| "primary"` | `"danger"` | 확인 버튼 `AdminButton` variant |

기본 포커스는 취소 버튼(현행 유지, 파괴적 동작이 아닌 쪽). 진행 중 두 버튼 `disabled`, Esc 무시(현행). 오류는 `role="alert"` 문단(현행). 닫을 때 포커스는 네이티브 `dialog.close()`가 트리거로 복귀(이탈 경고의 트리거는 클릭했던 링크).

레이아웃 보강: 버튼 줄 `flex flex-wrap justify-end gap-8`(현행 `flex justify-end gap-8`에 `flex-wrap`만 추가해 320px에서 긴 라벨이 넘치지 않게 함). 다이얼로그 폭은 현행(`w-full max-w-480`, UA 기본 최대 폭 제한)으로 320px에서도 좌우 여백이 남는다.

### 5.2 사용처별 문구

| 사용처 | title | description | confirmLabel | cancelLabel | variant | onConfirm 동작 |
| --- | --- | --- | --- | --- | --- | --- |
| 폼 링크 이탈(`use-admin-form.ts`, 5개 폼) | 이 페이지를 떠날까요? | 저장하지 않은 변경 사항이 사라집니다. 이동할까요? | 이동 | 머무르기 | danger | 클릭했던 링크 목적지로 이동, `null` 반환 |
| SortableList 링크 이탈 | 이 페이지를 떠날까요? | 저장하지 않은 순서 변경이 있습니다. 변경을 버리고 이동할까요? | 이동 | 머무르기 | danger | 링크 이동 |
| SortableList 뒤로가기 | 이 페이지를 떠날까요? | 위와 같음 | 이동 | 머무르기 | danger | 사용자가 의도한 뒤로가기 수행 |
| project 폼 slug 변경 | 주소를 바꿀까요? | 기존 `/work/{이전} -> /work/{새}` 변경 안내문 유지 | 저장 | 취소 | primary | 저장 제출 진행 후 즉시 `null`(모달 닫힘, 저장 중/결과는 버튼 문구와 토스트) |
| talk 폼 slug 변경 | 주소를 바꿀까요? | 기존 안내문 유지 | 저장 | 취소 | primary | 위와 같음 |
| blog .md 덮어쓰기 | .md 파일로 덮어쓸까요? | 입력한 내용이 .md 파일 내용으로 바뀝니다. 계속할까요? | 덮어쓰기 | 취소 | danger | 보관한 파일 내용을 폼에 한 번 반영, `null` |
| blog 글 삭제(기존) | `{제목}을 삭제할까요?` | 되돌릴 수 없습니다. 글 주소도 함께 사라집니다. | 삭제(기본) | 취소(기본) | danger(기본) | 기존 삭제 흐름 |
| project/talk/resume/SortableList 삭제(기존) | 현행 | 현행 | 기본값 | 기본값 | 기본값 | 현행 |

결정 근거:

- 이탈 경고 취소 라벨을 "머무르기"로 한 이유: "취소"는 "이동을 취소"인지 "편집을 취소"인지 모호해 오조작 위험이 있다. 확인 "이동"과 짝이 되는 "머무르기"가 의미가 분명하다.
- 이탈/덮어쓰기를 `danger`로 한 이유: 입력값 손실이라는 파괴적 결과이고, 삭제 모달과 같은 시각 규칙(파괴적 확인 = danger 텍스트)을 따른다. slug 저장은 파괴적이지 않아 `primary`.
- 글 삭제 설명에서 "공개 글이면" 분기 표현 삭제(F6). "글 주소도 함께 사라집니다"는 사실로 유지.

### 5.3 동작 규칙(화면 측)

- 한 화면에서 모달은 한 번에 하나만 연다. 이미 열려 있으면 추가 링크 클릭은 무시한다(연속 클릭으로 두 번 요청 방지).
- 이탈 모달이 열린 동안 현재 화면/입력값/URL은 이탈 전 상태 그대로다. 취소/Esc/바깥 닫기 모두 아무 변화 없음.
- 확인 후 이동 시 `beforeunload` 기본 창이 한 번 더 뜨지 않는다(`sortable-list`의 `leavingRef` 선례).
- popstate는 위험이 크다(requirements F10-5). 안정화에 실패하면 `window.confirm` 임의 잔존 금지, orchestrator 보고.
- `beforeunload`(새로고침/탭 닫기)는 브라우저 기본 창 유지.

## 6. F1 공개 Navbar 모바일 간격

현행 높이 계산: `py-16` 32 + 이름(`text-xl` 줄 높이 28) + `gap-8` 8 + 링크 줄(`text-sm` 줄 높이 20) + 구분선 1 = 89px, 본문 시작 `--spacing-header` 92px.

결정:

- 모바일 `gap-8` -> `gap-16`. 높이 = 32 + 28 + 16 + 20 + 1 = 97px. md 이상은 `md:flex-row md:py-24` 그대로이며 시각 변화 없음.
- 모바일 본문 시작 오프셋: `globals.css` `@theme inline`에 `--spacing-header-mobile: 112px` 추가. md 이상 `--spacing-header: 92px`는 그대로(97 + 15 = 112, md의 77 + 15 = 92와 같은 15px 여유).
- `public-shell.tsx`의 `main`: `pt-header` -> `pt-header-mobile md:pt-header`.
- 개발자가 `h-header`/`pt-header`/`scroll-mt` 등 `header` 토큰 사용처를 전수 검색해 Navbar 높이에 기대는 곳(예: sticky 오프셋)이 모바일에서 어긋나지 않는지 확인하고 결과를 기록한다. 다른 곳이 `--spacing-header`를 쓰면 같은 방식(모바일 토큰 쌍)으로 바꾼다.
- Navbar 주석(89px)을 97px로 수정.
- 링크 줄 폭: 6개 링크 `text-sm`의 추정 폭 합이 약 241px이다. 현행 `gap-16`(80px 합)이면 320px 화면의 가용 폭 272px(좌우 `container-padding` 24px씩)을 넘을 수 있다. 결정: 링크 줄에 `max-[359px]:gap-8 max-[359px]:text-xs`를 적용한다(359px 이하에서만. 12px 글자 폭 합 약 207 + 간격 40 = 247px로 272px 안). 360px 이상은 기존 `gap-16`/`text-sm`. 검증 규칙: 320px 실측에서 `scrollWidth <= clientWidth`이고 한 줄이어야 하며, 실측이 어긋나면 이 임계(359px)를 올린다(임의 줄바꿈 허용 금지, 줄바꿈이 생기면 Navbar 높이가 97px를 넘어 본문을 가림).
- 접근성: 링크 터치 영역 확대는 이번 범위가 아님(요청 1은 간격). 키보드/`aria-current` 변경 없음.
- 확인: 320/375/390에서 이름 줄과 링크 줄 사이 16px, Navbar 하단과 본문 첫 요소 사이 15px, 스크롤 후에도 가려지지 않음, 768px 이상 불변.

## 7. F2 공개 카테고리 탭 행간과 F5 admin 카테고리 탭

### 7.1 공용 컴포넌트 `category-tabs.tsx` (components/common/)

공개 `/blog`와 admin `/admin/blog`가 같은 컴포넌트를 쓴다(서버 컴포넌트 가능, 상태 없음). 입력: `basePath`(`/blog` 또는 `/admin/blog`), `categories`(이름 목록), `current`(선택된 이름 또는 없음), `prefetch`(공개 `false`, admin 기본). 링크 href는 "전체" = `basePath`, 그 외 `basePath?category={encodeURIComponent(name)}`(`page` 없음 = 1페이지 초기화).

마크업/클래스:

- `nav aria-label="카테고리"` + `className="flex flex-wrap gap-x-16 gap-y-4 text-small md:gap-y-8"`.
- 링크 공통: `inline-flex min-h-44 items-center underline-offset-8 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white md:min-h-0`.
- 활성: `aria-current="page"` + `underline opacity-100`. 비활성: `opacity-50`.
- 첫 항목 "전체", 이어서 카테고리. 카테고리가 0개면 `nav` 자체를 렌더링하지 않음.

수치 근거: 현행 행 높이 약 20px(줄 높이 1.4 x 14) + `gap-y-8` = 28px 피치로 줄바꿈 시 붙어 보인다. 모바일(`md` 미만)에서 링크 `min-h-44` + `gap-y-4`로 피치 48px, 링크 간 시각 여백 약 28px. admin-nav의 `min-h-44` + `gap-y-4` 선례와 같고 페이지네이션 항목(`min-h-44`)과 터치 영역이 같다. `md` 이상은 `min-h-0`, `gap-y-8`로 현행과 동일하므로 데스크톱 레이아웃은 변하지 않는다. 열 간격 `gap-x-16`, 활성 표시(밑줄/`aria-current`)도 현행 그대로.

### 7.2 공개 `/blog`

- `blog/page.tsx`의 인라인 nav를 `CategoryTabs`로 교체. 나머지(`.posts` 라벨 행, `space-y-32 md:space-y-40`) 불변.
- `filterLinkClassName` 상수 삭제(컴포넌트로 이동).

### 7.3 admin `/admin/blog` (F5)

- 위치: `AdminPageHeader`(`mb-32`) 바로 아래, 건수 문구 위. 래퍼 `mb-32`(공개 모바일 `space-y-32`와 같은 값).
- 쿼리: 공개와 같은 `?category=` 단일 값. 페이지네이션 `query={category ? { category } : undefined}`로 `category` 유지, `label="블로그 관리 페이지"`.
- 건수 문구(`mb-8 text-small text-white/50`): 필터 시 "{카테고리} 카테고리 총 N개 중 a-b번째", 비필터 시 "총 N개 중 a-b번째".
- 행: 제목 `Link` + 날짜 한 줄(`text-small opacity-70`, "{날짜}" 만. "공개/비공개" 및 구분점 삭제).
- 빈 상태: 글 0개 "작성한 글이 없습니다."(현행). 필터 결과 0개 "이 카테고리에 글이 없습니다." + 아래 `mt-12` 링크 "전체 보기"(`text-small underline`, `/admin/blog`).
- 삭제 토스트는 4절 규칙(쿼리 없음).
- 모바일: 탭이 줄바꿈되어 여러 줄이 되어도 7.1 간격이 그대로 적용. 카테고리가 매우 많으면 줄바꿈으로 흡수(스크롤/접기 없음, 공개와 동일).

## 8. F3 글 하단 정리와 이전/다음 글

`blog/[slug]/page.tsx` 변경:

- 하단 "blog 목록으로" 블록(`mt-64` 래퍼)을 삭제. 상단 링크(`backLinkClassName`)는 유지.
- 본문 영역 아래 `nav` 추가: `nav aria-label="이전·다음 글"` `className="mt-64 grid gap-16 border-t border-white/10 pt-32 md:grid-cols-2 md:gap-32"`. 이웃 글이 둘 다 없으면 렌더링하지 않음. 한쪽만 있으면 존재하는 쪽만 렌더링하되 `md` 이상에서 위치 고정: 이전 글은 1열(왼쪽), 다음 글은 2열(오른쪽, `md:col-start-2`).
- 링크 카드(둘 다 동일): `Link prefetch={false}` `className="flex flex-col gap-4 rounded-md border border-white/10 p-16 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-white"`. `hover:bg-white/5`는 admin 목록 행의 hover 선례.
  - 방향 라벨: `span.text-small text-white/50` "이전 글" 또는 "다음 글".
  - 제목: `span.text-body font-medium break-keep break-words`. 말줄임/line-clamp 없음(긴 제목은 줄바꿈).
  - 다음 글 카드는 `md:text-right`(데스크톱에서 오른쪽 정렬로 방향 구분), 모바일은 둘 다 왼쪽 정렬.
- 모바일(320/375/390): 1열 세로 쌓기. 순서는 이전 글(더 오래된 글)이 위, 다음 글(더 최신 글)이 아래. 카드 폭은 컨테이너 폭 전체이고 긴 제목은 줄바꿈되어 가로 넘침 없음. 카드 최소 높이는 내용 + `p-16`로 44px 이상이라 터치 영역 충분.
- 접근성: 링크 이름은 "이전 글 {제목}" 순서로 낭독(라벨 span과 제목 span이 한 링크 안). `nav`는 `aria-label`로 구분. 키보드 포커스 표시 있음.
- 빈 본문 글("본문이 없습니다.")에서도 같은 nav 표시. 글이 1개뿐이면 nav 없음.
- 위치 의도: 본문을 다 읽은 지점에서 다음 행동 제공(NICE Design System), 목록으로 가는 수단은 상단 링크 하나(GOV.UK).

## 9. F4 admin 탭과 제목 영어화

| 대상 | 변경 |
| --- | --- |
| `admin-nav.tsx` `LINKS` 라벨 | `projects`, `talks`, `blog`, `resume`, `profile` (순서/href/활성 로직 불변) |
| `sign-out-button.tsx` 라벨 | `logout` (헤더와 오류 토스트의 행동 버튼 공통) |
| 목록 화면 `AdminPageHeader title` | `projects`, `talks`, `blog`, `resume`, `profile` |
| 목록 `metadata.title.absolute` | `projects - admin`, `talks - admin`, `blog - admin`, `resume - admin`, `profile - admin` |
| 이력 화면 안내 링크 텍스트 | "프로필" -> `profile`("스킬과 툴은 `profile`에서 편집합니다.") |
| 하위 화면 제목(새/편집)과 그 metadata, 버튼, 안내, 폼 라벨, `aria-label="관리자"` | 불변 |

외형/반응형:

- 탭 외형 불변: `flex min-h-44 items-center text-sm underline-offset-8 ...` 활성 `underline opacity-100`.
- 영어 라벨은 한글보다 폭이 넓다. 추정 폭(`text-sm`): projects 56 + talks 34 + blog 28 + resume 46 + profile 38 = 202px + 열 간격 16px x 4 = 64 -> 266px(320px 화면 가용 272px에 겨우 맞음). 375/390에서는 `logout` pill(약 78px)이 헤더 한 줄에 들어가지 못하고 `admin-header-navigation`의 `flex-wrap`으로 다음 줄로 내려간다(현행 구조가 이미 줄바꿈을 허용). 줄바꿈은 허용하며 가로 넘침은 없어야 한다. `AdminConsoleShell`의 `ResizeObserver`가 헤더 높이를 측정해 본문 `paddingTop`을 갱신하므로 본문을 가리지 않는다. 320px에서 탭 줄 자체가 272px를 넘으면 `admin-nav`의 기존 `flex-wrap`으로 줄바꿈된다.
- 활성 밑줄은 텍스트 폭에만 그려지므로(`underline`) 영어 라벨 폭에 자동으로 맞는다.
- `logout`은 탭이 아니라 pill 버튼 외형(`AdminButton` secondary) 유지.

## 10. F6 공개 여부 UI 제거

- `blog-form.tsx`: "공개" 체크박스 블록(`space-y-8` 래퍼 전체)과 `post-published-hint` 삭제. 카테고리/태그 편집기 다음에 바로 본문 편집기가 오며 `space-y-24` 간격 유지. draft/`toInput`의 `published` 삭제.
- `.md 가져오기` 안내문: "frontmatter(title, categories, tags)와 본문을 폼에 채웁니다. 저장은 직접 눌러야 합니다. 본문 이미지는 자동으로 올라가지 않으니 필요하면 본문의 이미지 삽입을 사용하세요."(`published` 언급 삭제).
- admin 목록 행에서 공개/비공개 표시 삭제(7.3).
- 삭제 모달 설명 정리(5.2). `published: false` 파일 경고는 warning 토스트(4.8).

## 11. F7 작성/미리보기 탭

### 11.1 구조

`MarkdownEditor` 내부, `FieldShell`(label "본문") 안에서:

1. 툴바 행: `flex flex-wrap items-center justify-between gap-x-16 gap-y-8`
   - 왼쪽: `div role="tablist" aria-label="본문 편집 방식"` `className="flex gap-16"`, 탭 2개(작성, 미리보기).
   - 오른쪽: `이미지 삽입` `AdminButton`(탭 목록 밖, 숨김 file input 포함, 현행). 업로드 중 문구 "업로드 중...", `disabled={uploading || saving}` 현행.
2. 패널 영역:
   - 작성 패널 `div role="tabpanel" id="{id}-panel-write" aria-labelledby="{id}-tab-write"`: textarea 포함, 비활성 시 `hidden`(언마운트하지 않음, 값/커서/스크롤 보존). textarea의 `hidden` 속성은 제거하고 패널에 `hidden`.
   - 미리보기 패널 `div role="tabpanel" id="{id}-panel-preview" aria-labelledby="{id}-tab-preview" tabIndex={0}`: 비활성 시 `hidden`, 활성 시 렌더 결과(현행 `min-h-320 rounded-md border border-white/25 p-16`). 마크다운 변환은 활성일 때만 렌더. 빈 본문 "미리볼 내용이 없습니다."(`text-small opacity-70`) 현행. `tabIndex=0`은 내용에 포커스 가능 요소가 없을 때 키보드로 패널에 닿게 하기 위함이며 `focus-visible:outline-2 focus-visible:outline-white`.
   - `FieldShell`의 label `htmlFor`는 textarea를 가리키는 현행 유지.

### 11.2 시각 스타일(admin-nav와 일관)

탭 한 개 `button type="button" role="tab"`:

- 공통: `flex min-h-44 items-center text-sm underline-offset-8 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white` (admin-nav 링크와 동일 클래스).
- 선택됨: `underline opacity-100`, `aria-selected="true"`, `tabIndex=0`.
- 선택 안 됨: `opacity-50`, `aria-selected="false"`, `tabIndex=-1`.
- 라벨 한글 "작성", "미리보기". `aria-pressed`와 `AdminButton` pill 모양 사용 제거. 새 색 없음. 선택 표시는 색이 아니라 밑줄(형태) + 불투명도.
- 탭 목록과 패널 사이 `mt-8`(현행 `FieldShell`의 `space-y-8`이 처리).

### 11.3 키보드와 활성화

- 자동 활성화: 방향키(좌/우) 이동 = 포커스 이동 + 선택 동시. 2개라 순환(작성에서 우 -> 미리보기, 미리보기에서 우 -> 작성). `Home`은 작성, `End`는 미리보기. 근거: 전환이 비파괴이고 비용이 없으며(패널을 언마운트하지 않음) 탭이 2개뿐이다.
- 선택된 탭만 Tab 순서에 들어간다(roving tabindex). 선택된 탭에서 Tab -> 활성 패널(작성은 textarea, 미리보기는 패널 자체).
- 탭 클릭은 textarea로 포커스를 옮기지 않는다.
- 이미지 업로드 완료 시 포커스 복귀(`textarea.focus()`)는 작성 패널이 보이는 경우에만 수행한다. 미리보기 상태에서는 포커스를 옮기지 않고 토스트(성공)와 미리보기 반영만 한다.
- 탭 전환 중에도 업로드 진행 상태/저장 중 상태는 유지(툴바의 버튼 문구/disabled는 탭과 무관).

### 11.4 반응형

- 탭 목록 폭: 작성 약 28px + 미리보기 약 46px + 간격 16px = 약 90px, `이미지 삽입` pill 약 100px. 320px(가용 272px)에서도 한 줄. 폭이 부족한 경우 `flex-wrap`으로 이미지 삽입이 다음 줄로 내려가며 겹침 없음.
- 데스크톱(`md` 이상): 같은 구조, 양 끝 정렬.

## 12. F8 글자 수 표시

- 형식: `{현재} / {상한}자`, 천 단위 쉼표(`toLocaleString("ko-KR")`, 항상 `,`). 예: `0 / 300,000자`, `3,700 / 300,000자`, `300,001 / 300,000자`. 상한은 `POST_CONTENT_MAX`를 prop(`maxLength`)으로 받아 사용, 숫자 하드코딩 없음. 현재 값은 `value.length`(서버 `z.string().max()`와 같은 단위).
- 표시 위치/외형: 현행 `FieldShell`의 counter 자리(textarea 아래, `p.text-small opacity-50`). hint 문구가 사라지므로 textarea 바로 아래에 counter만 오고, 오류가 있으면 그 아래에 오류 문단(현행 순서).
- 상한 초과: 숫자는 그대로, counter 문단에 `text-danger opacity-100`(오류 지시 용도의 기존 토큰 사용, 색 외에 필드 오류 문구가 함께 나옴). 입력 자체는 막지 않음(현행). `FieldShell`에 `counterOver?: boolean` 같은 상태 prop을 추가한다. `TextAreaField`의 `현재/최대` counter(다른 폼)는 변경하지 않으므로 이 prop은 `MarkdownEditor`만 사용한다.
- counter는 라이브 영역이 아님(낭독 없음).
- 본문 hint 제거: `MarkdownEditor`의 `hint` prop 삭제, `blog-form.tsx` 호출부에서 `maxLength={POST_CONTENT_MAX}` 전달. `aria-describedby`는 오류 id만 연결(`describedBy`가 hint 없이 동작).

## 13. F11 저장 후 이동과 토스트

| 시나리오 | 동작 |
| --- | --- |
| 편집 화면 저장 성공 | 같은 화면 유지, 하단 토스트 "완료: 저장했습니다. 공개 페이지에 반영되었습니다." 6초 |
| 생성 저장 성공 | 토스트를 먼저 띄우고 `router.push`로 편집 화면 이동, 토스트는 이동 후에도 유지 |
| 삭제 성공(상세) | 토스트 "완료: 삭제했습니다." 후 목록 이동, 목록에서 유지 |
| 삭제 성공(목록 SortableList) | 토스트 "완료: {제목}을 삭제했습니다." |
| 저장 실패 | 이동 없음, 입력값 유지, 오류 토스트(유지) + 필드 오류 + 첫 오류 필드 포커스 |
| profile | 단일 화면, 이동 없음 |

## 14. 컴포넌트 목록

| 컴포넌트 | 위치 | 종류 | 변경 요약 |
| --- | --- | --- | --- |
| `Navbar` | `layout/navbar.tsx` | 수정 | 모바일 `gap-16`, 링크 줄 359px 이하 `gap-8 text-xs`, 주석 97px |
| `PublicShell` | `layout/public-shell.tsx` | 수정 | `pt-header-mobile md:pt-header` |
| `globals.css` | `app/globals.css` | 수정 | `--spacing-header-mobile: 112px` |
| `CategoryTabs` | `common/category-tabs.tsx` | 신규 | 7.1 |
| 공개 `blog/page.tsx` | `app/(public)/blog` | 수정 | `CategoryTabs` 교체 |
| 공개 `blog/[slug]/page.tsx` | `app/(public)/blog/[slug]` | 수정 | 하단 링크 삭제, 이전/다음 nav |
| `AdminNav` | `admin/admin-nav.tsx` | 수정 | 영어 라벨 |
| `SignOutButton` | `admin/sign-out-button.tsx` | 수정 | `logout` |
| admin 목록 `page.tsx` x5 + `AdminPageHeader` 사용 | `app/admin/(console)/*` | 수정 | 제목/metadata 영어, `resume`의 링크 텍스트 |
| admin `blog/page.tsx` | | 수정 | `CategoryTabs`, 건수 문구, 행에서 공개 표시 삭제, 빈 상태 |
| `ToastProvider` + `useToast` + 표시 영역 | `admin/toast-provider.tsx` | 신규 | 4절. `AdminConsoleShell`이 children을 감쌈 |
| `AdminConsoleShell` | `admin/admin-console-shell.tsx` | 수정 | provider/표시 영역 배치 |
| `FormActionBar` | `admin/form-parts.tsx` | 수정 | `notice`, `detailed` 삭제, `busyMessage`만 |
| `FormStatus` | `admin/form-parts.tsx` | 삭제 | |
| `useAdminForm` | `lib/admin-client/use-admin-form.ts` | 수정 | notice를 토스트로, `window.confirm` -> `ConfirmDialog`, `initialSaved` 제거 |
| `ConfirmDialog` | `admin/confirm-dialog.tsx` | 수정 | 5.1 |
| `SortableList` | `admin/sortable-list.tsx` | 수정 | 결과 토스트, 이탈 모달 |
| `BlogForm` | `admin/blog-form.tsx` | 수정 | 공개 삭제, 덮어쓰기 모달, 토스트, `maxLength` 전달 |
| `MarkdownEditor` | `admin/markdown-editor.tsx` | 수정 | 탭, counter, hint 삭제 |
| `FieldShell` | `admin/text-fields.tsx` | 수정 | `counterOver` |
| project/talk 폼 | `admin/*-form.tsx` | 수정 | slug 변경 확인 모달 |

## 15. 상태 정리

| 대상 | 정상 | 빈 | 오류 | 진행 중 |
| --- | --- | --- | --- | --- |
| 토스트 영역 | 최대 3개 | 높이 0 | 닫을 때까지 유지 | 해당 없음 |
| 카테고리 탭(공개/admin) | 활성 밑줄 + `aria-current` | 카테고리 0개: nav 없음 | 존재하지 않는 category: 빈 결과 문구 + 전체 보기 | 해당 없음(서버 렌더) |
| admin 블로그 목록 | 제목 + 날짜 | "작성한 글이 없습니다." / "이 카테고리에 글이 없습니다." | 서버 오류는 기존 처리 | 해당 없음 |
| 이전/다음 글 | 카드 1~2개 | 이웃 없음: nav 미렌더 | 해당 없음 | 해당 없음 |
| 작성/미리보기 탭 | 선택 밑줄 | 미리보기 빈 본문 문구 | 본문 필드 오류는 입력란 아래 | 업로드 중: 이미지 삽입 버튼 "업로드 중..." |
| counter | `n / max자` | `0 / 300,000자` | 초과: `text-danger` + 필드 오류 | 해당 없음 |
| ConfirmDialog | 확인/취소 | 해당 없음 | 모달 내 `role="alert"` 문단 | 확인 버튼 `busyLabel`, 두 버튼 disabled |
| 저장바 | 저장/취소(/삭제) | | 오류는 토스트 | "저장 중..." 버튼 문구, `busyMessage`(업로드 중) |

## 16. 뷰포트별 확인표

| 항목 | 320 | 375 | 390 | 768 이상 |
| --- | --- | --- | --- | --- |
| Navbar (F1) | 링크 줄 `text-xs`, 한 줄, 높이 97px | `text-sm`, 한 줄 | 동일 | 불변(77px, 한 줄) |
| 본문 시작 오프셋 (F1) | 112px | 112px | 112px | 92px |
| 카테고리 탭 (F2/F5) | 줄바꿈 시 피치 48px | 동일 | 동일 | `gap-y-8`, 높이 불변 |
| 이전/다음 (F3) | 1열 세로 | 1열 세로 | 1열 세로 | 2열 |
| admin 헤더 (F4) | `logout`이 다음 줄일 수 있음(허용, 넘침 없음) | `logout` 다음 줄 | 동일 | 한 줄 |
| 탭+이미지 삽입 (F7) | 한 줄(약 190px) | 한 줄 | 한 줄 | 양 끝 정렬 |
| 토스트 (F9) | 폭 288px, 하단 96px | 343px | 358px | 우측 하단 24px, 폭 최대 480px |
| 모달 (F10) | 버튼 줄 `flex-wrap`, 넘침 없음 | | | 폭 480px |
| 저장바와 토스트 | 업로드 중 2줄 저장바와 비겹침 확인 | 저장 직후 같은 시야 | | |
