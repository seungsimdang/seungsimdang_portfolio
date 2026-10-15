# 요구사항: admin 탭을 공개 Navbar 기준으로 재구성

- 입력: `00-input.md` (사용자 승인 범위 6건)
- 브랜치: `feature/admin-tabs-by-page`
- 표기: "확인"은 이번 T02에서 코드를 직접 읽어 본 사실, "미확인"은 읽지 않았거나 근거를 찾지 못한 것

## 1. 확인한 현재 상태

| 대상 | 확인 내용 |
|------|-----------|
| `src/components/layout/navbar.tsx` | 공개 Navbar 순서는 home, projects, about, blog, talks, contact (6개). `/projects` 활성은 `/work/` 하위 포함, blog는 하위 경로 포함 |
| `src/components/admin/admin-nav.tsx` | `LINKS`는 projects, talks, blog, resume, profile 5개. 활성 판정은 `pathname === href` 또는 `startsWith(href + "/")` |
| `src/components/admin/admin-console-shell.tsx` | 이름 링크는 `/admin/projects` 고정. `.admin-header-navigation` 안에 `AdminNav`와 `SignOutButton`이 같이 있음. 헤더 높이는 ResizeObserver로 측정해 본문 `paddingTop`에 반영 (초기값 77) |
| `src/components/admin/sign-out-button.tsx` | `signOut({ callbackUrl: "/admin/login" })`, 라벨 `logout`, `AdminButton` 사용 |
| `src/components/admin/login-panel.tsx` | 480px 폭 카드, h1 "admin 로그인", 안내 문구, GitHub 로그인 버튼 하나. `forbidden`이면 오류 문구와 `SignOutButton` (이 경우도 로그아웃 후 이동 경로 변경의 영향을 받음) |
| `src/app/admin/login/page.tsx` | `from` 쿼리를 `/admin` 하위 경로만 허용(`//`, `\` 차단), 기본값 `/admin/projects`. 이미 인증된 관리자는 `callbackUrl`로 redirect |
| `src/app/admin/(console)/page.tsx` | `/admin` 접근 시 `/admin/projects`로 redirect |
| `src/app/admin/(console)/resume/page.tsx` | 경력 등 kind별 `SortableList`와 추가 버튼(`/admin/resume/new?kind=`). 상단에 "스킬과 툴은 profile에서 편집합니다." 안내와 `/admin/profile` 링크 |
| `resume/new/page.tsx`, `resume/[id]/page.tsx` | `ResumeEntryForm`을 렌더. `resume-entry-form.tsx` 내부 이동 경로(저장 후 목록 등)는 미확인 |
| `src/components/admin/profile-form.tsx` | 8개 항목(name, title, tagline, description, email, github, skills, tools)을 한 폼으로 검증(`profileInputSchema`)하고 `PUT /api/admin/profile` 전송. `listHref`와 취소 링크가 `/admin` |
| `src/app/api/admin/profile/route.ts` | PUT에서 `profileInputSchema`로 검사 후 `updateProfile`, `revalidatePath("/", "layout")` |
| `src/schemas/portfolio.schema.ts:124` | `profileInputSchema`는 `z.strictObject`이고 8개 항목 모두 필수 |
| `src/services/portfolio/portfolio-admin-service.ts:121` | `updateProfile`이 `db.update(profile).set({ ...input, updatedAt })` 실행. id=1 행이 없으면 `PortfolioNotSeededError` |
| `src/app/(public)/page.tsx` | `<AboutSection profile={profile} />`. orchestrator 전역 검색 결과 다른 사용처 없음 |
| `src/components/common/about-section.tsx` | `profile.description`을 `.about` 제목 아래 표시하는 컴포넌트 |
| `src/app/(public)/about/page.tsx` | resume 항목(.experience 등), skills(`.stack`), tools(`.tools`)를 표시. `description`은 사용하지 않음 |
| admin 테스트 | `tests/e2e/`에는 `navigation`, `real-project-data`, `blog` spec과 fixtures만 있고 `*admin*` 파일 없음. admin-nav, sign-out, login-panel, profile-form을 대상으로 하는 단위 테스트 파일도 이름 검색에서 발견되지 않음(내용 기반 참조는 미확인) |

## 2. 기능 분해와 우선순위

우선순위는 P1(먼저) 에서 P3(마지막) 순서. 로그인 리디자인(요청 6)은 P3로 마지막.

| 순위 | 요청 | 기능 |
|------|------|------|
| P1 | 3 | 프로필 부분 저장 API (탭 분리의 선행 조건) |
| P1 | 2 | admin 탭 6개 구성과 home, about, contact 편집 화면 |
| P1 | 1 | 공개 홈 `.about` 섹션과 `about-section.tsx` 삭제 |
| P2 | 4 | 로그아웃 버튼을 탭과 시각적으로 분리 |
| P2 | 5 | 로그아웃 후 이동 경로를 `/`로 변경 |
| P3 | 6 | 로그인 화면 리디자인 |

의존 관계: 요청 2의 화면은 요청 3의 부분 저장이 있어야 탭별 폼이 서로 덮어쓰지 않는다. 요청 1은 요청 2의 home 탭 항목 정의와 독립이지만 같은 사이클에서 처리한다.

### 요청 3. 프로필 부분 저장 API (P1)

설명: `PUT /api/admin/profile`이 8개 중 보낸 항목만 갱신한다.

수용 기준
1. 8개 항목 중 일부만 담은 요청이 성공하고, 보내지 않은 항목은 DB 값이 바뀌지 않는다.
2. 보낸 항목은 기존과 동일한 검증 규칙(`shortText`, `longText`, 이메일, https 주소, `stringList`)을 적용한다. 규칙 중복 정의 없이 기존 항목 스키마를 재사용한다.
3. 알 수 없는 키는 기존처럼 거부한다(`strictObject` 동작 유지).
4. 응답은 갱신 후 전체 프로필(`Profile`)을 기존과 같은 `CustomData<T>` 형태로 반환한다.
5. `revalidatePath("/", "layout")` 호출을 유지한다.
6. 갱신 대상 행이 없을 때 기존 `PortfolioNotSeededError` 동작을 유지한다.
7. 상태 코드는 `HttpStatusCode`를 사용한다.

Edge case
- 빈 객체 `{}` 요청.
- 항목 값이 `undefined`로 직렬화되어 누락되는 경우와 `null`을 보내는 경우(`null`은 거부).
- 인증 실패(401/403)와 Origin 검사는 `adminRoute`가 그대로 처리.

유일성/동시성: 별도 생성 로직이 없는 단일 행(id=1) 갱신이므로 유일성 보장은 해당 없음. 동시 저장 동작은 4장 결정 D5 참조.

### 요청 2. admin 탭 재구성 (P1)

설명: 탭을 `home · projects · about · blog · talks · contact` 6개로 하고 순서와 라벨은 공개 Navbar와 같게 한다. resume, profile 탭은 제거한다.

수용 기준
1. `AdminNav`가 6개 탭을 위 순서로 렌더한다. 라벨은 공개 Navbar와 동일한 소문자 영문.
2. 각 탭 경로는 `/admin`(home), `/admin/projects`, `/admin/about`, `/admin/blog`, `/admin/talks`, `/admin/contact`이다 (결정 D1, D2).
3. home 탭은 name, title, tagline, description 4개 항목을 편집하고 부분 저장으로 해당 4개만 전송한다.
4. about 탭은 resume 항목 목록(기존 `resume/page.tsx`의 kind별 `SortableList`와 추가 버튼)과 skills, tools 편집을 함께 제공한다. skills, tools는 about 탭에서 해당 2개 항목만 부분 저장한다.
5. contact 탭은 email, github 2개 항목을 편집하고 부분 저장으로 해당 2개만 전송한다.
6. "스킬과 툴은 profile에서 편집합니다." 안내 문구와 `/admin/profile` 링크를 삭제한다.
7. `profile-form.tsx`의 단일 폼은 탭별 폼으로 분리되어 더 이상 8개 항목을 한 번에 다루지 않는다. 저장 후 이동하는 `listHref`와 취소 링크 `/admin`은 해당 탭 경로로 맞춘다.
8. 클라이언트 검증은 해당 탭 항목만 검사한다(전체 `profileInputSchema` 대신 항목별 스키마).
9. 탭 활성 표시(`aria-current="page"`)가 새 경로와 하위 경로에서 정확히 동작한다. home은 `/admin` 정확 일치만 활성이고 다른 탭 하위 경로에서 활성이 되지 않는다.
10. 각 페이지 `metadata` 제목은 `"{탭} - admin"` 형식을 유지한다.
11. skills 레이블의 설명 문구("첫 화면 순환 단어 순서이며 about의 .stack에도 표시")와 tools 레이블은 about 탭 맥락에 맞게 유지하되 profile 탭을 가리키는 표현이 남지 않는다.

Edge case
- 모바일 폭에서 6개 탭이 줄바꿈될 때 헤더 높이 변화가 본문 `paddingTop`에 반영된다(기존 ResizeObserver 동작 유지).
- 편집 중 미저장 변경이 있을 때 탭 이동 시 기존 `LeaveDialog` 가드가 동작한다(`useAdminForm`의 `leaveGuard`, 가드 범위 세부는 미확인).
- 공개 Navbar와 달리 admin의 `/admin/projects`는 `/admin/projects/new`, `/admin/projects/[slug]`를 하위로 포함한다. about 탭도 `/admin/about/resume/...` 등 하위 경로를 가질 경우 활성 판정에 포함해야 한다 (결정 D1).

### 요청 1. 홈 `.about` 섹션 삭제 (P1)

수용 기준
1. `src/app/(public)/page.tsx`에서 `AboutSection` import와 `{/* About Section */}` 렌더를 제거한다.
2. `src/components/common/about-section.tsx`를 삭제한다. 삭제 전 다른 사용처가 없는지 전역 검색으로 확인한다(미확인 항목).
3. 홈 나머지 구성(Hero, Projects, Talks)은 변경하지 않는다. 섹션 간 간격은 `section-spacing` 클래스 기준으로 About 제거 후에도 Projects와 Talks 사이가 기존 값과 동일한 한 번의 간격을 유지한다.
4. `/about` 페이지는 변경하지 않는다.
5. `knip`(미사용 export 검사)과 타입 검사가 통과한다.
6. `description`을 쓰는 곳이 이후 없어지는지 확인한다. 홈 `.about` 삭제 후 `description`의 공개 화면 사용처는 이번 확인 범위에서 `about-section.tsx` 외에 발견하지 못했다(metadata, 다른 컴포넌트 사용 여부는 미확인). home 탭에서 편집하게 한 근거는 사용자 지시이며, 사용처가 없다면 저장 값의 노출 위치가 없는 상태가 되므로 결정 D8에서 사용자 확인을 요청한다.

### 요청 4. 로그아웃 버튼 분리 (P2)

수용 기준
1. 로그아웃은 탭 묶음과 시각적으로 구분되는 별도 요소다: 탭 묶음 오른쪽 끝, 세로 구분선, 테두리 버튼 형태(대화 제안 그대로, 결정 D7).
2. 탭 링크와 로그아웃 버튼의 DOM 구조가 분리되어 `<nav aria-label="관리자">` 안에는 탭 링크만 있다.
3. 터치 영역 44px 이상(현재 `min-h-44` 유지)과 헤더 총 높이 77px(데스크톱 기준, `py-16` + 44px 터치 영역 + 구분선)를 유지한다.
4. 탭 6개와 로그아웃이 모바일 폭에서 가로 넘침 없이 줄바꿈된다.
5. 키보드 포커스 순서는 탭들 다음에 로그아웃이며 포커스 표시가 보인다.

### 요청 5. 로그아웃 후 이동 경로 (P2)

수용 기준
1. `SignOutButton`의 `callbackUrl`을 `/`로 변경한다.
2. 로그아웃 후 `/`가 표시되고 `/admin` 접근은 `src/proxy.ts`에 따라 `/admin/login?from=`로 리다이렉트된다.
3. `LoginPanel`의 `forbidden` 상태에서 쓰이는 `SignOutButton`도 같은 경로를 따른다. 이 경우 허용되지 않은 계정이 로그아웃 후 홈으로 가는 것이 의도임을 사용자 확인 항목(D6)으로 둔다.

### 요청 6. 로그인 화면 리디자인 (P3, 마지막)

현재 화면(확인): 480px 카드 안에 h1 "admin 로그인", 안내문 1줄, GitHub 로그인 버튼 1개. 오류, 안내, 접근 권한 없음 상태 문구는 `role="alert"` 사용. 홈으로 가는 링크 없음.

웹 서치 근거 (이번 턴에 확인한 출처만)
1. NN/g "Login Walls Stop Users in Their Tracks": 로그인은 사용자가 자격 증명을 기억해야 하는 상호작용 비용이 크므로 필요할 때만 요구한다. 이 admin은 관리자 전용이라 로그인이 필수이며, 대신 공개 사이트로 돌아가는 경로를 제공해 막다른 화면을 만들지 않는다 (근거는 이 문서의 해석이며 NN/g가 admin 화면을 직접 다룬 것은 아님). https://www.nngroup.com/articles/login-walls/
2. NN/g "A Checklist for Registration and Login Forms on Mobile": 모바일에서 로그인 입력을 최소화한다는 점검 항목이 있음. 이 화면은 입력 필드가 없는 단일 버튼 구성이라 이 방향과 일치한다. https://www.nngroup.com/articles/checklist-registration-login/
3. W3C WCAG 2.2, 3.3.8 Accessible Authentication (Minimum, AA): 인증 단계에서 비밀번호 기억 같은 인지 기능 시험을 요구하려면 대안이 있어야 함. 외부 OAuth 단일 버튼은 비밀번호 입력이 없다(허용 대안 목록 상세는 이번 검색에서 잘려 미확인). https://www.w3.org/TR/WCAG22/
4. W3C WCAG 2.2, 2.5.8 Target Size (Minimum, AA): 포인터 대상은 24x24 CSS px 이상. 현재 `AdminButton` 높이는 미확인이므로 구현 시 44px 터치 영역 기준(본 프로젝트 admin 컨벤션)에 맞춘다. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
5. GOV.UK 계열 오류 메시지 컴포넌트 가이드: 오류 메시지는 입력과 `aria-describedby`로 연결하고 대비는 4.5:1 초과 권장. https://components.publishing.service.gov.uk/component-guide/error_message 이 화면에는 입력 필드가 없으므로 해당 연결은 해당 없음이고, 오류 문구의 대비(4.5:1)와 `role="alert"` 유지가 적용 범위다.
6. 미확인: GitHub Primer, GOV.UK 공식 sign-in 패턴 문서는 이번 검색에서 찾지 못했다. "GitHub OAuth 단일 버튼 로그인이 best practice"라는 공신력 있는 출처는 확보하지 못했으므로 요구사항 근거로 쓰지 않는다. 이 화면의 단일 버튼 구성 유지는 현재 인증 방식(GitHub allowlist, `login-panel.tsx`)에서 유래한 제약이다.

수용 기준
1. 입력 필드 없이 GitHub 로그인 버튼 하나를 주 동작으로 유지한다(인증 방식은 변경하지 않음).
2. 홈(`/`)으로 가는 링크를 화면에 포함한다(사용자 승인 사항).
3. 화면 제목, 허용 계정 안내, 오류, 세션 만료 안내, 접근 권한 없음 상태를 모두 유지하고 `role="alert"` 의미를 잃지 않는다.
4. 로그인 중(`loading`) 버튼 비활성과 "이동 중..." 표시를 유지한다.
5. `safeCallbackUrl` 로직(open redirect 방지)은 변경하지 않는다.
6. 색은 흑백 팔레트와 정의된 토큰만, spacing은 px 규칙을 따른다. 오류 표시에 `danger` 토큰을 쓰려면 정의된 의미(오류 지시)에 부합할 때만 쓴다.
7. 360px 폭에서 가로 넘침이 없다.
8. 구체 시각 형태(레이아웃, 위계)는 designer(T03)가 위 근거로 결정한다. T02는 형태를 확정하지 않는다.

## 3. 비기능 요구사항

- 접근성: 탭 `nav`의 `aria-label`, `aria-current`, 키보드 포커스, 44px 터치 영역 유지. 본문으로 건너뛰기 링크 유지.
- 보안: 부분 저장 API도 `adminRoute`(인증, allowlist, Origin 검사)로 감싼 상태를 유지. 로그인 `from` 검증 유지. 새 admin 페이지는 `requireAdminPage()`를 호출한다.
- 성능: 변경 없음 요구.
- 컨벤션: kebab-case 파일명, `HttpStatusCode` 사용, 서버 전용 모듈 `server-only`, 주석은 명사형 종결과 em-dash 금지, 죽은 코드 금지(`knip`).
- 보존: 기존 Framer 디자인, 브레이크포인트, 애니메이션, 공개 Navbar 높이 77px과 admin 헤더 정렬.
- props 전달: 탭별 폼 컴포넌트가 필요로 하는 `profile` 값은 각 admin 서버 페이지의 `getProfile(true)` 호출 결과를 그 페이지에서 전달한다. 새 컴포넌트에 필요한 props는 T03 설계에서 확정한다.
- 배포 자동화, 크론, 능동 트리거, 목록 일부 표시 UI는 이번 범위에 없음(해당 없음).

## 4. 모호한 항목별 권장 결정

| ID | 항목 | 권장 결정 | 근거 |
|----|------|-----------|------|
| D1 | `/admin/resume`, `/admin/profile` URL | 두 경로를 삭제(404)한다. resume 하위 경로는 about 탭 아래로 이동한다(`/admin/about/resume/new?kind=`, `/admin/about/resume/[id]`). 단일 관리자가 쓰는 비공개 화면이라 외부 북마크 호환 요구가 없다(사용자 확인 필요) | `proxy.ts` matcher가 `/admin/:path*` 인증 전용이고 공개 링크가 없음. 공개 페이지에서 `/admin/resume` 링크는 이번 확인 범위에서 발견되지 않음 |
| D2 | `/admin` 기본 이동 대상 | `/admin`을 home 탭 화면으로 직접 렌더한다(현재 `/admin/projects` redirect 제거). 헤더 이름 링크 대상은 `/admin`(공개 Navbar의 이름 링크가 `/`로 home인 것과 대응) | `(console)/page.tsx`가 현재 redirect만 함. 공개 `navbar.tsx` 이름 링크가 `/`. `ProfileForm`의 `listHref`가 이미 `/admin`. 단 `login/page.tsx`의 `safeCallbackUrl` 기본값 `/admin/projects`는 로그인 후 첫 화면 문제라 별도 판단이 필요: 홈 탭으로 일치시키는 것을 권장 |
| D3 | home 탭에 projects, talks 목록 편집 포함 | 포함하지 않는다. home 탭은 name, title, tagline, description만 | 00-input 대화 설명과 요청 2 항목 정의. 각 목록은 projects, talks 탭에서 편집 |
| D4 | 부분 저장 시 빈 객체 요청 | 400으로 거부한다(검증 실패, 변경할 항목 없음). DB 갱신과 `updatedAt` 변경을 하지 않는다 | `updateProfile`이 `updatedAt`을 항상 갱신하므로 빈 `set` 호출은 의미 없는 쓰기가 됨. 400 코드는 `HttpStatusCode.BadRequest`. 사용자 확인 필요(성공 no-op 대안) |
| D5 | 다른 탭에서 동시에 저장 | 서로 다른 항목 집합이므로 항목 단위 갱신으로 충돌하지 않는다(탭 A의 name 저장이 탭 B의 email을 덮어쓰지 않음). 같은 항목을 두 탭 브라우저가 동시에 저장하면 마지막 요청이 이긴다. 낙관적 잠금은 도입하지 않는다 | 현재 단일 관리자 전제, 현재 구현은 전체 덮어쓰기라 오히려 더 넓은 충돌이 있음. 낙관적 잠금 필요 여부는 사용자 확인 필요 |
| D6 | forbidden 상태 로그아웃 이동 | 홈 `/`로 이동(요청 5와 동일) | `login-panel.tsx`가 같은 `SignOutButton` 재사용 |
| D7 | 로그아웃 시각 형태 | 탭 묶음 오른쪽 끝, 세로 구분선, 테두리 버튼. 구체 치수와 모바일 배치는 designer 결정 | 00-input 대화 제안, `admin-console-shell.tsx`의 `.admin-header-navigation` 구조 |
| D8 | home 탭 `description`의 공개 노출처 | home 탭에서 유지한다. 홈 `.about` 삭제 후에도 공개 사이트 메타 설명(`description`, Open Graph `description`)으로 노출된다 | orchestrator 확인: `src/app/(public)/layout.tsx:22`, `:25`에서 `profile.description` 사용. `about-section.tsx` 외 컴포넌트 사용처 없음(전역 검색) |
| D9 | `ResumeEntryForm` 저장 후 이동 경로 | 새 about 탭 경로로 맞춘다. 현재 코드 위치와 값은 미확인이므로 T03에서 `resume-entry-form.tsx`를 읽고 확정 | 해당 파일 미열람 |
| D10 | 로그인 리디자인 구체 형태 | designer 결정. 이 문서는 수용 기준만 제공 | 00-input |

## 5. 확인 필요 (사용자 질문 후보)

1. D1: `/admin/resume`, `/admin/profile`을 삭제(404)할지, 새 경로로 redirect를 남길지.
2. D2: 로그인 후 기본 이동(`safeCallbackUrl` 기본값)을 `/admin/projects`에서 `/admin`(home 탭)으로 바꿀지.
3. D4: 빈 객체 요청을 400으로 거부할지, 성공 no-op으로 처리할지.
4. D5: 낙관적 잠금 없이 마지막 저장 우선으로 둘지.
5. D8: 해소(메타 설명으로 노출되므로 home 탭에서 유지).
6. 정적 상수 vs DB 편집 구분: 이번 변경은 모두 기존 DB 편집 항목(profile, resume)의 화면 재배치이며 새 데이터 소스 결정은 없음.

## 6. 범위 제외

- 인증 방식 변경(GitHub 외 제공자, 비밀번호 로그인).
- 홈 projects, talks 목록의 home 탭 편집.
- 공개 `/about`, 공개 Navbar 변경.
- DB 스키마와 마이그레이션 변경(없음).

## 7. 완료 기준

1. 요청 1~6 각각의 수용 기준 충족.
2. `pnpm` 기준 타입 검사, 린트, `knip`, 기존 테스트 통과(명령 실행은 T05 이후 단계).
3. 삭제된 경로와 컴포넌트에 대한 잔존 참조가 없음.
4. 부분 저장 API에 대한 테스트(일부 항목, 빈 객체, 잘못된 값, 알 수 없는 키)가 추가됨. 테스트 제목은 한글.
5. 로그아웃 후 홈 이동과 탭 6개 렌더는 e2e 또는 컴포넌트 테스트로 검증(admin e2e 기존 spec이 없으므로 신규 작성 범위는 T03 설계에서 확정).

## 8. 사용자 확정 (2026-10-15 T02 게이트)

- D1: `/admin/resume`, `/admin/profile` 삭제(404). resume 하위 화면은 `/admin/about/resume/new?kind=`, `/admin/about/resume/[id]`로 이동.
- D2: `/admin`이 home 탭을 직접 렌더. 헤더 이름 링크와 로그인 후 기본 이동(`safeCallbackUrl` 기본값)도 `/admin`.
- D4: 빈 객체 `{}`는 400(`HttpStatusCode.BadRequest`)으로 거부, DB 쓰기 없음.
- D5: 낙관적 잠금 없음, 같은 항목은 마지막 저장 우선.
- D8: description은 home 탭에서 유지(공개 메타 설명으로 노출).
- 요구사항 승인, T03·T04 진행.
