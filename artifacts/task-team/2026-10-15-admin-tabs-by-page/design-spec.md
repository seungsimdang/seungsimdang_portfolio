# 디자인 명세: admin 탭을 공개 Navbar 기준으로 재구성

- 입력: `requirements.md` (8장 사용자 확정이 최종), `00-input.md`
- 브랜치: `feature/admin-tabs-by-page`
- 표기: "확인"은 이번 T03에서 파일을 직접 읽은 사실, "미확인"은 읽지 않은 것
- 코드는 작성하지 않는다. 클래스명은 px 규칙(`--spacing: 1px`) 기준의 지시 수준으로만 적는다.

## 0. 확인한 사실과 미확인

확인한 파일: `admin-nav.tsx`, `admin-console-shell.tsx`, `sign-out-button.tsx`, `login-panel.tsx`, `profile-form.tsx`, `resume-entry-form.tsx`, `admin-button.tsx`, `form-parts.tsx`, `admin-page-header.tsx`, `sortable-list.tsx`, `use-admin-form.ts`, `use-leave-confirm.ts`, `(console)/page.tsx`, `(console)/layout.tsx`, `resume/page.tsx`, `resume/new/page.tsx`, `resume/[id]/page.tsx`, `profile/page.tsx`, `login/page.tsx`, `layout/navbar.tsx`, `globals.css`, `portfolio.schema.ts` 일부(124행 부근), `docs/agent-rules/tailwind.md`.

요구사항에 없던 추가 발견 (T05가 반드시 반영):

1. `sortable-list.tsx:71`이 행 링크를 `/admin/${kind}/${item.id}`로 조립한다. resume이면 `/admin/resume/{id}`가 되어 경로 이동 후 404가 된다. resume일 때 `/admin/about/resume/{id}`가 되도록 바꿔야 한다.
2. `globals.css`의 `.admin-header-navigation > a`, `> button` 규칙(31~69행)이 로그아웃 버튼을 투명 텍스트 링크로 덮어쓴다. 로그아웃을 테두리 버튼으로 바꾸려면 이 규칙의 영향을 받지 않아야 한다 (5장).
3. `useAdminForm`의 `listHref`는 저장 후 이동에 쓰이지 않는다. 404(대상 삭제됨) 알림의 "목록으로" 링크에만 쓰인다. 프로필 폼은 저장 후 이동 없이 같은 화면에 남는다 (확인: `onSaved: toDraft`).
4. `useLeaveConfirm`은 문서 전체의 `a[href]` 클릭을 가로챈다. 탭 링크와 로그아웃 이외의 `<a>`는 모두 가드 대상이다. 로그아웃은 `<button>`이라 가드를 거치지 않는다 (확인: 클릭 대상이 `a[href]`일 때만 가로챔). 5장에 영향 정리.
5. `login/page.tsx`의 `safeCallbackUrl`은 `from === "/admin"`일 때와 기본값에서 `/admin/projects`를 반환한다. D2 확정에 따라 두 곳 모두 `/admin`으로 바꾼다. 단 `from.includes("//")`, `"\\"` 차단 로직은 변경하지 않는다 (요청 6의 수용 기준 5).
6. `/admin/resume`, `/admin/profile`을 가리키는 다른 참조(`error.tsx`, `not-found.tsx`, `loading.tsx`, 토스트 링크, 테스트, `src/proxy.ts`)는 읽지 않아 미확인. T05는 삭제 후 전역 검색으로 잔존 참조 0건을 확인한다.

공통 컴포넌트 확인: `src/components/common/`에는 공개 화면용 섹션/카드(`hero-section`, `project-card`, `page-header`, `pagination` 등)만 있고 모달, 드롭다운, 스위치류가 없다. admin 전용 인터랙티브 부품은 `src/components/admin/`에 있으며 이번 범위에서 모두 재사용한다: `AdminButton`, `LeaveDialog`, `ConfirmDialog`, `ToastProvider`, `FormActionBar`, `TextField`/`TextAreaField`, `StringListEditor`, `SortableList`. 새 인터랙티브 컴포넌트는 만들지 않으므로 Radix primitive 신규 도입도 없다.

## 1. 탭 6개

| 순서 | 라벨 | 경로 | 활성 판정 |
|------|------|------|-----------|
| 1 | home | `/admin` | `pathname === "/admin"` 정확 일치만 |
| 2 | projects | `/admin/projects` | 일치 또는 `/admin/projects/` 하위 (`new`, `[slug]`) |
| 3 | about | `/admin/about` | 일치 또는 `/admin/about/` 하위 (`resume/new`, `resume/[id]`) |
| 4 | blog | `/admin/blog` | 일치 또는 `/admin/blog/` 하위 |
| 5 | talks | `/admin/talks` | 일치 또는 `/admin/talks/` 하위 |
| 6 | contact | `/admin/contact` | 일치 또는 `/admin/contact/` 하위 |

- 순서와 소문자 라벨은 공개 `navbar.tsx`의 `links`와 같다 (확인).
- home은 `startsWith`를 쓰면 모든 탭에서 활성이 되므로 정확 일치만 쓴다. 나머지는 현재 `AdminNav`와 같은 규칙(일치 또는 `href + "/"` 하위)을 쓴다. about의 하위 경로가 이 규칙으로 포함되므로 별도 예외가 필요 없다.
- 활성 표시는 현재 방식 유지: `aria-current="page"`, 밑줄, 불투명도 100%. 비활성은 불투명도 50%, hover 시 100%. 공개 Navbar의 `max-[359px]` 글자 축소 규칙은 admin에 가져오지 않는다 (admin은 줄바꿈 허용, 4장 참조).
- `<nav aria-label="관리자">`는 탭 링크 6개만 포함한다.
- 헤더 이름 링크(`AdminConsoleShell`)의 `href`는 `/admin`.

## 2. 페이지 구성

### 2.1 라우트와 파일

| 경로 | 파일 | 내용 | 조치 |
|------|------|------|------|
| `/admin` | `src/app/admin/(console)/page.tsx` | home 탭. `AdminPageHeader title="home"` + `ProfileForm section="home"`. redirect 제거 | 수정 |
| `/admin/about` | `src/app/admin/(console)/about/page.tsx` | resume kind별 목록 + 추가 버튼 + skills/tools 폼 | 신규 |
| `/admin/about/resume/new` | `src/app/admin/(console)/about/resume/new/page.tsx` | `resume/new/page.tsx` 내용 이동 (`?kind=` 유지) | 이동 |
| `/admin/about/resume/[id]` | `src/app/admin/(console)/about/resume/[id]/page.tsx` | `resume/[id]/page.tsx` 내용 이동 | 이동 |
| `/admin/contact` | `src/app/admin/(console)/contact/page.tsx` | `AdminPageHeader title="contact"` + `ProfileForm section="contact"` | 신규 |
| `/admin/resume`, `/admin/resume/*` | `src/app/admin/(console)/resume/` 폴더 전체 | D1에 따라 404 | 삭제 |
| `/admin/profile` | `src/app/admin/(console)/profile/` 폴더 전체 | D1에 따라 404 | 삭제 |

- 모든 신규/이동 페이지는 첫 줄에서 `requireAdminPage()`를 호출한다 (확인: 기존 페이지 관례).
- `metadata`: `{ title: { absolute: "home - admin" } }`, `"about - admin"`, `"contact - admin"` 형식. 이동한 resume 페이지의 기존 제목("새 이력 - admin", "이력 편집 - admin")은 유지. `/admin` 페이지는 현재 metadata가 없으므로 추가한다.
- 각 서버 페이지가 `getProfile(true)`로 읽은 `profile`을 폼에 전달한다 (요구사항 3장 props 전달). about 페이지는 `getResumeByKind()`와 `getProfile(true)`를 함께 호출한다.
- `/admin/about/resume`(하위 목록 경로)은 만들지 않는다. 404.

### 2.2 home 탭 (`/admin`)

```
AdminPageHeader: home
이름        [TextField]            필수
직함        [TextField]            필수
tagline     [TextAreaField]        필수, 힌트 "줄바꿈이 그대로 저장됩니다."
소개        [TextAreaField]        필수 (공개 메타 설명으로 노출, D8)
[FormActionBar: 저장 | 취소]
```

- 필드, 라벨, `maxLength`, id(`profile-name` 등)는 현재 `ProfileForm`과 동일하게 옮긴다. 시각 변경 없음.

### 2.3 about 탭 (`/admin/about`)

```
AdminPageHeader: about
(안내 문구 "스킬과 툴은 profile에서 편집합니다." 삭제)
section.space-y-48
  resume kind별 section x3   <- 현재 resume/page.tsx 마크업 그대로
    h2(noun) + AdminButton primary "{noun} 추가" -> /admin/about/resume/new?kind={kind}
    SortableList(kind="resume")
  section.space-y-16  (skills, tools)
    h2.text-body "스킬과 툴"   <- 다른 h2와 같은 위계
    ProfileForm section="about"
      StringListEditor 스킬
      StringListEditor 툴
      FormActionBar: 저장 | 취소
```

- 순서: 이력 목록이 위, 스킬/툴 폼이 아래. 공개 `/about`이 이력 다음에 stack, tools를 보여 주는 순서와 맞추려는 의도이나, 공개 화면 순서는 `about/page.tsx` 미확인이므로 근거 약함. 확인 불가 시 위 순서 유지.
- 한 페이지에 `SortableList`(순서 가드)와 폼(`LeaveDialog`)이 공존한다. 둘 다 `useLeaveConfirm`을 쓰며 resume 3개 섹션이 이미 한 페이지에 3개의 `SortableList`를 두는 구조라 중복 가드는 기존 동작과 같다 (확인).
- 스킬/툴 폼의 sticky 액션 바는 폼 영역 안에서만 하단 고정된다. 이력 목록이 길어도 폼에 도달하기 전에는 바가 보이지 않는 것이 의도.
- 레이블 문구: 스킬 legend "스킬 (순서가 첫 화면 순환 단어 순서이며 about의 .stack에도 표시됩니다)", 툴 legend "툴 (공개 about의 .tools에 표시됩니다)"는 현재 문구에 profile 탭을 가리키는 표현이 없으므로 그대로 유지 (요구사항 수용 기준 11 충족).

### 2.4 contact 탭 (`/admin/contact`)

```
AdminPageHeader: contact
이메일          [TextField type=email] 필수
GitHub 주소     [TextField type=url]   필수
[FormActionBar: 저장 | 취소]
```

### 2.5 폼 공유 방식 (새 컴포넌트 최소화)

검토 결과: 세 탭의 폼은 draft 구성, `useAdminForm` 연결, 저장 후 draft 갱신, `FormActionBar`, `LeaveDialog`가 모두 같고 달라지는 것은 필드 집합뿐이다. 따라서 새 컴포넌트를 만들지 않고 기존 `profile-form.tsx`의 `ProfileForm`을 유지하며 `section` 값(`"home" | "about" | "contact"`)을 받게 한다.

| section | 필드 | 취소 링크 / `listHref` |
|---------|------|------------------------|
| home | name, title, tagline, description | `/admin` |
| about | skills, tools | `/admin/about` |
| contact | email, github | `/admin/contact` |

- 섹션별 필드 정의(어떤 필드를 그릴지, 어떤 키를 전송할지)는 `profile-form.tsx` 한 곳에 둔다. 3개 파일로 쪼개지 않는 이유: 쪼개면 `toDraft`/`toInput`/`useAdminForm` 배선이 3번 복제된다.
- `ProfileForm` props: `profile: Profile`, `section`. 전체 `Profile`을 받되 draft와 전송 입력에는 해당 section의 항목만 담는다.
- 검증은 해당 section 항목만 대상으로 한다 (수용 기준 8). 항목별 스키마를 어떻게 노출할지는 T04의 부분 저장 스키마 계약을 따른다. 규칙을 클라이언트에서 재정의하지 않는다 (수용 기준 2의 "중복 정의 없음").
- 취소 링크가 현재 페이지와 같은 경로인 점(home, about, contact 모두 폼이 있는 같은 탭)은 요구사항 7번을 그대로 따른 결과다. 같은 경로 이동이라 미저장 상태에서는 `LeaveDialog`가 먼저 뜨고, 확인해도 폼 내용은 리셋되지 않는 한계가 있다. 개선하려면 취소를 "기준 draft로 되돌리기"로 바꿔야 하며 이는 `FormActionBar` 동작 변경이라 이번 범위 밖이다. QA가 이 동작을 알고 확인하도록 남겨 둔다.

### 2.6 삭제 파일

- `src/app/admin/(console)/resume/` 폴더 전체 (`page.tsx`, `new/page.tsx`, `[id]/page.tsx`)
- `src/app/admin/(console)/profile/` 폴더 전체 (`page.tsx`)
- `src/components/common/about-section.tsx`
- `src/app/(public)/page.tsx`에서 `AboutSection` import와 `{/* About Section */}` 렌더 제거. Hero, Projects, Talks와 간격(`section-spacing`)은 변경하지 않는다 (요청 1 수용 기준 3).
- `profile-form.tsx`는 삭제하지 않고 2.5의 방식으로 수정한다 (분리 파일 없음).

## 3. 저장 흐름

| 폼 | 전송 항목 (부분 저장 엔드포인트, 메서드는 T04) | 저장 후 | 취소 | 가드 |
|----|-----------------------------------------------|---------|------|------|
| ProfileForm home | name, title, tagline, description | 같은 화면에 남음. 응답 `Profile`에서 해당 항목으로 draft와 기준값 갱신. 성공 토스트("저장했습니다. 공개 페이지에 반영되었습니다.") | `/admin` | `LeaveDialog` + `useAdminForm.leaveGuard` 유지 |
| ProfileForm about | skills, tools | 위와 같음 | `/admin/about` | 유지 |
| ProfileForm contact | email, github | 위와 같음 | `/admin/contact` | 유지 |

- 전송 본문에는 다른 section 항목을 절대 포함하지 않는다. 한 탭의 저장이 다른 탭 항목을 덮어쓰지 않는 것이 이 기능의 전제다 (D5: 같은 항목은 마지막 저장 우선, 낙관적 잠금 없음).
- 빈 객체 요청은 서버가 400으로 거부한다 (D4). 각 폼은 항상 1개 이상의 항목을 보내므로 UI에서는 발생하지 않는다.
- 실패 처리(401, 403, 404, 429, 400, NOT_SEEDED)는 `useAdminForm`의 `describeFailure`를 그대로 사용한다. 새 오류 문구를 만들지 않는다.
- 헤더의 이름(`profile.name`)은 `(console)/layout.tsx`가 서버에서 읽는다. home 탭에서 이름을 저장하면 헤더의 이름은 다음 이동 또는 새로고침 전까지 이전 값일 수 있다. 현재 profile 폼도 같은 동작이므로 이번 범위에서 바꾸지 않는다 (확인 못 한 부분: 저장 후 `router.refresh()` 사용 여부 현재 코드에 없음).

## 4. ResumeEntryForm 저장 후 이동 경로 (D9 확정)

현재 코드 확인: 생성 후 `router.push("/admin/resume/{saved.id}")`, 삭제 후 `router.push("/admin/resume")`, `listHref`와 `cancelHref`는 `/admin/resume`.

확정:

| 위치 | 변경 전 | 변경 후 |
|------|---------|---------|
| 생성 성공 후 이동 (`onSaved`) | `/admin/resume/{id}` | `/admin/about/resume/{id}` (생성 후 편집 화면으로 이동하는 현재 동작 유지) |
| 삭제 성공 후 이동 (`remove`) | `/admin/resume` | `/admin/about` |
| `listHref` | `/admin/resume` | `/admin/about` |
| `cancelHref` | `/admin/resume` | `/admin/about` |
| 편집 저장 후 | 같은 화면 유지 | 변경 없음 |

- 목록으로 돌아가는 `/admin/about`에서 해당 kind 위치로 스크롤하는 앵커는 두지 않는다. 현재도 없고 요구사항에 없다.
- `resume/page.tsx`의 추가 버튼 링크는 `/admin/about/resume/new?kind={kind}`로 바꾼다.
- `SortableList`의 행 링크는 resume일 때 `/admin/about/resume/{id}` (0장 1번).

## 5. 로그아웃 분리 (요청 4, 5)

### 5.1 구조

```
header (fixed, 높이 77px)
  div.container (max-w-content, container-padding)
    div.header-content  py-16, 한 줄 (lg 이상)
      Link  name -> /admin
      div.right-cluster  (flex, items-center)
        nav[aria-label="관리자"]   <- 탭 링크 6개만
        span.divider  aria-hidden  <- 세로 구분선
        SignOutButton              <- nav 밖 형제
    div.h-px.bg-white/25   (하단 구분선, 현재 유지)
```

- 로그아웃 버튼은 `<nav>` 안에 두지 않는다 (수용 기준 2). DOM 순서는 이름 링크, 탭 6개, 구분선, 로그아웃이며 이 순서가 키보드 포커스 순서다. 구분선은 `aria-hidden`이라 포커스/읽기 대상이 아니다.
- 오른쪽 끝: `right-cluster`는 이름 링크 반대편(오른쪽)에 붙고, 로그아웃은 그 클러스터의 마지막 요소다.
- 세로 구분선: 폭 1px, 높이 24px, 색 `bg-white/25` (헤더 하단선과 같은 토큰). 탭 묶음과 로그아웃 사이 좌우 여백은 탭 간격과 같은 값 사용.
- 로그아웃 버튼: `AdminButton` `variant="secondary"` (테두리 `border-white/25`, 둥근 pill, `min-h-44`, 좌우 20px). 현재의 투명 텍스트 스타일 오버라이드는 쓰지 않는다. 라벨은 `logout` 유지.
- `globals.css`의 `.admin-header-navigation > a`, `> button` 규칙은 새 구조에서 로그아웃에 닿으면 안 된다. 탭 링크는 자체 클래스로 이미 같은 스타일을 갖고 있으므로 이 규칙들은 삭제하거나 로그아웃과 무관한 선택자로 한정한다. 삭제 후 다른 사용처가 없는지는 T05가 확인 (미확인).

### 5.2 치수와 반응형

- 데스크톱: `py-16` + 44px 요소 + 1px 구분선 = 77px. 이 합이 유지되도록 로그아웃 버튼 높이를 44px(`min-h-44`)에서 키우지 않는다.
- 이름 링크 `text-xl`, 탭 `text-sm`: 현재 유지.
- 탭 간격: 767px 이하 16px, 768 ~ 1023px 24px, 1024px 이상 48px. 현재는 768px 이상 48px 고정이라 탭이 6개 + 구분선 + 로그아웃이 되면 768 ~ 1023px에서 넘칠 수 있다 (추정, 실측 안 함). T05가 768, 810, 1024px에서 가로 넘침 여부를 확인하고 필요하면 간격을 더 줄인다.
- 줄바꿈: 1023px 이하에서는 클러스터가 `flex-wrap`으로 줄바꿈 가능, 1024px 이상은 한 줄 `nowrap`.
- 767px 이하 배치: 이름 링크 한 줄, 그 아래 탭 6개(필요 시 두 줄), 그 아래 로그아웃 버튼 한 줄(왼쪽 정렬). 세로 구분선은 줄바꿈 환경에서 위치가 어긋나므로 767px 이하에서는 숨긴다(`hidden md:block` 수준). 이 폭에서 탭과 로그아웃의 시각 분리는 줄 분리와 버튼 테두리로 충족한다.
- 헤더 높이 변화는 기존 `ResizeObserver`가 본문 `paddingTop`(높이 + 48px)에 반영한다. 초기값 77은 유지.
- 360px: 컨테이너 안쪽 폭은 312px(좌우 24px 제외). 탭 6개는 한 줄에 들어가지 않을 수 있으며(추정) 줄바꿈으로 가로 넘침 없이 처리한다. 탭 줄 간격은 현재처럼 세로 4px.

### 5.3 상호작용과 접근성

- 포커스 표시: 탭 링크와 로그아웃 모두 `focus-visible` 2px 흰 외곽선 (`AdminButton`과 탭 링크가 이미 갖고 있음).
- 터치 영역 44px 이상: 탭 링크 `min-h-44` 유지, 로그아웃 `min-h-44`.
- `SignOutButton`의 `callbackUrl`은 `/`. `LoginPanel`의 forbidden 상태도 같은 컴포넌트를 쓰므로 동일 (D6).
- `SignOutButton`은 로그인 화면(전체 폭 버튼)에서도 쓰이므로 선택적 `className` 전달을 허용한다. 헤더에서는 전달하지 않는다.
- 로그아웃 버튼 클릭은 `useLeaveConfirm`의 `a[href]` 가로채기 대상이 아니다 (0장 4번). 미저장 변경이 있는 상태에서 로그아웃하면 `LeaveDialog` 없이 `signOut`이 실행되며 `beforeunload` 브라우저 기본 경고만 뜰 수 있다. 현재 동작과 같고 이번 범위에서 바꾸지 않는다. QA 확인 항목으로만 남긴다.

## 6. 로그인 화면 리디자인 (P3)

### 6.1 결정 근거 (requirements.md 6장)

- 입력 필드가 없는 GitHub 단일 버튼 구성 유지 (수용 기준 1, NN/g 모바일 로그인 점검 항목 방향과 일치).
- 홈(`/`)으로 가는 링크 추가 (수용 기준 2, 막다른 화면 방지).
- 버튼 높이 44px 이상 (프로젝트 admin 규칙, WCAG 2.5.8 최소 24px 충족).
- `role="alert"` 의미 유지, 오류 문구 대비 4.5:1 이상.
- 6장에서 공신력 있는 출처를 못 찾은 항목(GitHub OAuth 단일 버튼 best practice 등)은 근거로 쓰지 않는다. 아래 위계 결정은 근거가 아니라 현재 구성 요소를 재배치한 디자이너 판단이다.

### 6.2 레이아웃과 위계

변경 요점: 화면 세로 중앙 정렬, 카드 안에서 정보 순서를 "제목 > 안내 > 상태 알림 > 주 동작 > 보조 이동"으로 고정, 버튼을 카드 폭에 맞춰 키움, 홈 링크를 구분선 아래 보조 동작으로 추가.

```
360px 폭 (바깥 좌우 24px, 카드 안쪽 24px)
+------------------------------------+
|                                    |
|  +------------------------------+  |
|  | admin 로그인           (h1)  |  |
|  |                              |  |
|  | 허용된 GitHub 계정으로만     |  |
|  | 로그인할 수 있습니다. (small)|  |
|  |                              |  |
|  | | 오류: 로그인할 수 없습니다.|  |  <- 알림이 있을 때만, role=alert
|  | | 허용된 계정인지 확인하세요.|  |     왼쪽 2px 선 + 12px 안쪽 여백
|  |                              |  |
|  | [      GitHub로 로그인      ]|  |  <- primary, 카드 폭 가득, 44px
|  |                              |  |
|  | ---------------------------- |  |  <- 1px 구분선 white/25
|  |   홈으로 돌아가기            |  |  <- 텍스트 링크, 44px 터치 영역
|  +------------------------------+  |
|                                    |
+------------------------------------+

forbidden 상태
+------------------------------+
| admin 로그인                 |
|                              |
| | 오류: 접근 권한이 없습니다.|   <- role=alert
|                              |
| [          logout          ] |   <- SignOutButton secondary, 카드 폭 가득
| ---------------------------- |
|   홈으로 돌아가기            |
+------------------------------+
```

- 화면 컨테이너: 현재 `container-padding py-96`의 가운데 정렬 카드를 유지하되 뷰포트 높이 전체를 사용해 세로 중앙(`min-h-screen`, flex 중앙 정렬)에 둔다. 위아래 최소 여백 48px (짧은 뷰포트에서 잘리지 않게).
- 카드: 폭 `max-w-480` 유지, 테두리 `border-white/25`, `rounded-lg`. 안쪽 여백은 `p-24` (360px 대응) 에서 sm(640px) 이상 `p-32`. 요소 사이 간격은 현재 `space-y-16`을 유지하고, 버튼과 구분선 사이에만 24px을 둔다.
- 제목: `h1.text-h3` "admin 로그인" 유지 (수용 기준 3).
- 안내문: `text-small opacity-70`, 한글 줄바꿈이 단어 단위가 되도록 `break-keep`.
- 알림 박스 (denied, expired, forbidden): 기존 `<p role="alert">`를 유지하고 왼쪽에 2px 실선(`border-l-2`)과 12px 안쪽 여백을 줘 안내문과 구분한다. 접두 "오류:", "안내:" 텍스트는 유지해 색에 의존하지 않는 구분을 보장한다. 색: 오류(denied, forbidden)는 `text-danger`와 `border-danger`(정의된 의미인 오류 지시에 부합), 안내(expired)는 흰색 `border-white`. `--danger`(#ff6b6b)의 검정 배경 대비는 4.5:1 이상으로 보이나 계산은 이번에 하지 않았음(미확인). T05가 확인하고 미달이면 `text-danger`를 쓰지 않고 흰색 + 접두 텍스트로 대체한다.
- 알림 위치: 안내문 아래, 버튼 위. 버튼을 누르기 직전에 읽히는 위치다.
- 주 동작: `AdminButton variant="primary"`, 카드 폭 가득(`w-full`), `min-h-44`. 로딩 중 `disabled`, 라벨 "이동 중..." 유지. 로딩이 시작되면 `aria-busy`를 버튼 영역에 둬도 되나 필수 아님.
- 보조 이동: 버튼 아래 24px, 1px 구분선(`bg-white/25`), 그 아래 "홈으로 돌아가기" 텍스트 링크. `href="/"`, `text-small`, `min-h-44` 터치 영역, 가운데 정렬, `underline-offset-4`, hover 시 밑줄, `focus-visible` 2px 흰 외곽선. 링크 색 흰색(불투명도 70%, hover 100%).
- forbidden 상태: 안내문과 GitHub 버튼 대신 오류 알림과 `SignOutButton`(카드 폭 가득)을 보여 주고, 홈 링크는 두 상태 모두에 둔다 (로그아웃 후 `/`로 이동하므로 링크가 중복처럼 보여도 이동하지 않고 홈만 보고 싶은 경우를 위해 유지).
- 포커스 순서: h1 이후 알림(비인터랙티브) > GitHub 로그인 버튼(또는 logout) > 홈으로 돌아가기.
- 색은 흑백 팔레트, `danger` 토큰, 투명도 수식어만 사용. 새 토큰 추가 없음. 모든 간격은 px 값(`p-24`, `space-y-16`, `gap-12` 등) 사용.

### 6.3 반응형과 접근성

- 360px: 카드 바깥 24px, 안쪽 24px이면 콘텐츠 폭 264px. 가로 넘침 없음. 버튼이 폭 가득이라 긴 한글 라벨도 한 줄이다. 알림 문구는 줄바꿈 허용.
- 640px 이상: 카드 안쪽 여백 32px, 폭 480px 고정.
- `role="alert"` 유지. 알림 문구가 3개 상태(denied, expired, forbidden) 모두 동일하게 읽힌다.
- 입력 필드가 없으므로 `aria-describedby` 연결은 해당 없음.
- `LoginPanel`의 props(`callbackUrl`, `notice`, `forbidden`) 시그니처는 변경하지 않는다.

## 7. T05 / T06 파일 경계

### T05 (frontend) 범위

수정:
- `src/components/admin/admin-nav.tsx`: 탭 6개, home 정확 일치 판정, 상단 주석 갱신
- `src/components/admin/admin-console-shell.tsx`: 이름 링크 `/admin`, 로그아웃을 `nav` 밖 형제로 분리, 구분선 추가, 반응형 클래스
- `src/components/admin/sign-out-button.tsx`: `callbackUrl` `/`, 선택적 `className`
- `src/components/admin/login-panel.tsx`: 6장 레이아웃, 홈 링크
- `src/components/admin/profile-form.tsx`: `section` prop, 섹션별 필드와 전송 항목, 취소/`listHref`
- `src/components/admin/resume-entry-form.tsx`: 4장 경로 5곳
- `src/components/admin/sortable-list.tsx`: resume 행 링크 경로
- `src/app/globals.css`: `.admin-header-navigation`, `.admin-nav-links` 관련 규칙 정리 (5.1)
- `src/app/admin/(console)/page.tsx`: home 탭 렌더, redirect 제거, metadata
- `src/app/admin/login/page.tsx`: `safeCallbackUrl` 기본값과 `from === "/admin"` 분기를 `/admin`으로 (검증 로직 변경 없음)
- `src/app/(public)/page.tsx`: `AboutSection` 제거

신규:
- `src/app/admin/(console)/about/page.tsx`
- `src/app/admin/(console)/about/resume/new/page.tsx`
- `src/app/admin/(console)/about/resume/[id]/page.tsx`
- `src/app/admin/(console)/contact/page.tsx`

삭제:
- `src/app/admin/(console)/resume/` 전체, `src/app/admin/(console)/profile/` 전체, `src/components/common/about-section.tsx`

테스트(T05 담당): `admin-nav` 활성 판정 단위 테스트(home 정확 일치, about 하위 포함), 로그아웃 후 `/` 이동 확인(e2e 또는 컴포넌트), 삭제된 경로 404 확인. 테스트 제목은 한글.

### T06 (backend) 범위, T05가 건드리지 않음

- `src/app/api/admin/profile/route.ts`
- `src/schemas/portfolio.schema.ts` (부분 저장 스키마)
- `src/services/portfolio/portfolio-admin-service.ts` (`updateProfile`)
- 부분 저장 API 테스트

### 연결 계약

- T05는 T04가 확정하는 "부분 저장 엔드포인트"의 메서드/경로와 항목별 검증 스키마 노출 방식을 따른다. 그 전까지 `ProfileForm`은 `adminRequest("PUT", "/api/admin/profile", 입력)` 호출부의 한 줄만 바꾸면 되도록 호출 위치를 한 곳에 둔다.
- 겹치는 파일은 없다: `portfolio.schema.ts`는 T06만, 컴포넌트와 페이지는 T05만 수정한다.

## 8. 사용자 확인이 필요한 항목

요구사항 8장에서 확정되지 않았고 UX 결정이 걸린 것은 없다. 아래는 확인 없이 이 명세에서 결정한 사항이므로 이의가 있으면 알려야 한다.

1. 로그아웃 클릭 시 `LeaveDialog`가 뜨지 않음 (현재 동작 유지, 5.3).
2. 취소 링크가 같은 탭 경로를 가리켜 폼을 리셋하지 않음 (2.5, 요구사항 7번을 그대로 따른 결과).
3. 로그인 화면의 `danger` 색 사용은 대비 확인 후 확정 (6.2).
