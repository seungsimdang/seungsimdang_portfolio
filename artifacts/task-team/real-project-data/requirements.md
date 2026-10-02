# 요구사항 정의서: 실제 포트폴리오 데이터 반영

- 브랜치: `feature/real-project-data`
- 입력: `artifacts/task-team/real-project-data/00-input.md`
- 데이터 원본: `/Users/leeseunghyun/Documents/GitHub/seungsimdang_portfolio_temp/lib/portfolio-data.ts`
- 원칙: 원본에 없는 데이터는 만들지 않는다. 대응 데이터가 없는 목데이터는 삭제한다.

## 1. 범위

| # | 요청 | 우선순위 |
|---|------|----------|
| R1 | 프로젝트 데이터 공용 모듈 추출 + 실제 5개 프로젝트로 교체 | P0 |
| R5 | 목데이터 전면 삭제 (대체 또는 삭제) | P0 |
| R4 | about, hero, contact 문구를 `profileData` 기준으로 교체 | P0 |
| R3 | `/work/[id]` 프로젝트 상세 페이지 | P1 |
| R2 | projects 페이지 clients 섹션 삭제 및 영어 소개 문구 교체 | P1 (R5에 흡수) |

R2는 R5의 부분집합이므로 R5 목록에서 함께 처리한다. 구현 순서는 R1 -> R5/R4/R2 -> R3.

범위 밖: 원본 9개 중 제외된 4개(KBHC, Waymed Cough, 기억해봄, Yanabada), `techTalks`(확인 필요 U3 결정에 따라 달라짐), 다국어(i18n) 시스템, 연락 폼 백엔드.

## 2. 공용 데이터 모듈 (R1)

위치는 `docs/agent-rules/project-structure.md` 기준.

- 데이터: `src/constants/portfolio-data.ts` (공용 상수. `"use client"` 없는 순수 모듈이라 Server/Client 양쪽에서 import 가능)
- 타입: `src/types/portfolio.ts` (`Project`, `Experience`). 원본 인터페이스 구조 유지.
- 파일명 kebab-case, 주석은 명사형 종결(규칙 6), em-dash 금지.
- knip이 미사용 export를 차단하므로 실제로 import되는 export만 둔다. `techTalks`와 `TechTalk` 타입은 U3에서 사용 결정이 나기 전에는 이식하지 않는다.
- 이식 대상: `profileData`(name, title, tagline, description, email, github, skills), 5개 프로젝트(globber, dpm-core, semt, endo-admin, endo-report)의 필드 전체(`experiences` 포함). 원본 문자열은 임의로 고치지 않는다(오탈자 U8 참고).
- 5개 선정 기준은 사용자가 확인한 "원본 최신순 상위 5개". 원본 배열 순서(globber, dpm-core, semt, endo-admin, endo-report)를 그대로 유지한다.

### 수용 기준

- `src/app/page.tsx`, `src/app/projects/page.tsx`에 프로젝트 배열 리터럴이 남지 않고 공용 모듈을 import한다.
- 두 페이지의 카드 목록이 동일한 소스에서 나오며 개수는 5개다.
- 각 카드는 `/work/{id}`로 연결된다(id는 원본 id).
- 원본에 없는 필드(`category`, 가짜 연도 "2023")는 데이터에 추가하지 않는다.

### 카드 표시 (U1, U2 권장안 반영)

- 카드 메타 줄: 기존 `category` 자리에 `role`, `year` 자리에 `period`를 표시한다. `ProjectCard` props는 `category`/`year`를 `role`/`period`로 바꾼다. 호출부는 `page.tsx`와 `projects/page.tsx` 두 곳이며 둘 다 공용 데이터의 `project.role`, `project.period`, `project.title`, `` `/work/${project.id}` ``를 넘긴다.
- projects 페이지 우측 설명 영역은 `project.summary`를 표시한다(기존 `description` 대체).
- 썸네일: Globber만 이미지가 있다.
  - 원본 `public/images/projects/globber/thumbnail.png`를 이 저장소 `public/images/projects/globber/thumbnail.png`로 복사한다.
  - `thumbnail`이 있는 카드는 이미지를 카드 배경으로 표시하고, 없는 카드는 단색 배경을 쓴다.
  - 이미지는 `<Image>` 사용(`fill` 또는 width/height 명시, `<img>` 금지). 제목 텍스트 가독성 확보는 디자이너 영역.
  - 단색 배경의 색(`bgColor`/`textColor`)은 데이터가 아니라 프레젠테이션 설정이다. 5개 프로젝트용 색 값은 디자이너가 정하고, 기존 가짜 브랜드(bizz buzz 등)의 색 지정은 이식하지 않는다.
  - 원본에 없는 나머지 4개 썸네일 이미지는 만들지 않는다. 제외된 3개 프로젝트의 썸네일(gibom, waymed-cough, yanabada)은 복사하지 않는다.

## 3. 목데이터 전수 목록과 분류 (R5, R2)

현재 사이트를 모두 열어 확인한 결과다. 분류 기준: 원본에 대응 데이터가 있으면 "대체", 없으면 "삭제".

### 3.1 홈 `src/app/page.tsx`

| 위치 | 내용 | 분류 | 근거 |
|------|------|------|------|
| `projects` 배열 (10-51행) | bizz buzz, aquaflow, snackify, zengo, roverride (가짜 category, year 2023, 브랜드 색) | 대체 | R1. 실제 5개 프로젝트 |
| 블로그 섹션 (70-97행) | ".three latest notes", 글 "Starting and Growing a Career in Web Design" | 삭제 (U3 권장) | 원본에 블로그 글 없음. `techTalks`는 글이 아님 |
| CTA (100-107행) | "Let's work together" / "Get in touch" | 유지 | 데이터가 아닌 범용 UI 문구. 연락 페이지로 연결 |

### 3.2 히어로 `src/components/common/hero-section.tsx`

| 위치 | 내용 | 분류 | 근거 |
|------|------|------|------|
| 11행 | "Hey, I'm Nick" | 대체 | `profileData.name` (이승현) |
| 18행 | "available for new projects" + 초록 점 | 삭제 | 구직/수주 가능 여부는 원본에 없음 |
| 26-37행 | "a product design partner with focus on" + WordCycler 단어 3개(no-code websites 등) | 대체 | `profileData.tagline`(2줄, `\n`)과 `title`. WordCycler 처리는 U4 |

### 3.3 홈 about 섹션 `src/components/common/about-section.tsx`

| 위치 | 내용 | 분류 | 근거 |
|------|------|------|------|
| 16-21행 | "my craft is building experiences..." | 대체 | `profileData.description` |
| 28-36행 | "Profile Image" 회색 그라디언트 플레이스홀더 | 삭제 | 원본에 프로필 이미지 없음 |

### 3.4 projects 페이지 `src/app/projects/page.tsx`

| 위치 | 내용 | 분류 | 근거 |
|------|------|------|------|
| 8-55행 | 가짜 프로젝트 5개 + 영어 description | 대체 | R1, `summary` 사용 |
| 57-66행, 83-115행 | clients 배열(Google, Meta, Apple, Amazon, Microsoft, Netflix, Spotify, Uber)과 ".clients" 섹션 전체 | 삭제 | 가짜 고객사. 원본에 고객사 없음. R2 |
| 76-79행 | "I help startups and series A-D teams..." | 대체 | `profileData.description` 또는 삭제. 원본에 대응 문구가 없는 영어 소개이므로 `description`으로 교체 |

### 3.5 about 페이지 `src/app/about/page.tsx`

| 위치 | 내용 | 분류 | 근거 |
|------|------|------|------|
| 65-68행 | "i'm a designer, maker, nomad, and coffee lover..." | 대체 | `profileData.tagline`(U4와 같은 값 재사용) |
| 73-99행 | 통계: ".experience 12 years", ".location Palo Alto (PST)", ".freelance Available" | 삭제 | 원본에 연차, 위치, 프리랜서 여부 없음. 프로젝트 기간에서 연차를 추정하는 것도 지어내기이므로 하지 않음 |
| 106-111행 | "Profile Image" 플레이스홀더 | 삭제 | 3.3과 동일 |
| 123-128행 | ".hello" 문단 "my craft is building..." | 대체 | `profileData.description` |
| 7-43행, 145-175행 | experience 5건(LMN Technologies, EFG Solutions, PQR Innovations, XYZ Design Studio, ABC Corporation)과 ".work experience" 섹션 | 삭제 (U5 권장) | 가짜 회사 경력. 원본에 회사 경력 목록 없음. 프로젝트 기간은 이미 projects/상세에 표시되므로 대체 섹션도 만들지 않음 |
| 45-55행, 177-197행 | tools 9개(Framer, Procreate, Figma, Notion, PSN, Zapier, SoundCloud, Swift, Mailchimp)와 category | 대체 | `profileData.skills` 9개(이름만). category는 원본에 없어 제거. ".stack" 섹션 유지 |

### 3.6 contact 페이지 `src/app/contact/page.tsx`

| 위치 | 내용 | 분류 | 근거 |
|------|------|------|------|
| 43-46행 | "let's collaborate... follow me on social networks" | 대체 | 원본에 대응 문구 없음. 연락처(email, github)를 안내하는 짧은 문구로 교체(문구 확정은 디자이너/사용자). social networks 언급은 삭제 |
| 28-33행, 117-141행 | socialLinks: twitter, instagram, tiktok, youtube 모두 `@stfnco` | 대체 | 가짜 핸들. 원본의 `github`, `email`만 사용. 나머지 삭제 |
| 13-17행, 55-110행 | 연락 폼(console.log만 하는 목 제출) | 삭제 (U6 권장) | 전송 대상이 없는 동작 없는 폼. email(mailto)과 GitHub 링크로 대체 |

### 3.7 blog 페이지 `src/app/blog/page.tsx`, `src/components/common/blog-preview.tsx`

| 위치 | 내용 | 분류 | 근거 |
|------|------|------|------|
| 8-40행 | 글 6개(전부 영어, 2022년) | 삭제 (U3 권장) | 원본에 글 없음. 링크 대상 `/blog/*` 상세 페이지도 존재하지 않음 |
| 파일 전체 | `blog-preview.tsx` | 삭제 | blog에서만 쓰이므로 knip 위반 방지 위해 함께 삭제 |

U3에서 `techTalks` 대체를 선택하면 이 행은 "대체"로 바뀌고 범위가 커진다.

### 3.8 레이아웃 `src/components/layout/navbar.tsx`, `footer.tsx`, `src/app/layout.tsx`

| 위치 | 내용 | 분류 | 근거 |
|------|------|------|------|
| navbar 25행 | 로고 "Nick" | 대체 | `profileData.name` |
| navbar 13행 | `/blog` 링크 | 삭제 | U3 권장안 적용 시 |
| footer 28행, 74행 | "Nick", "© year Nick" | 대체 | `profileData.name` |
| footer 29-32행 | "Product design partner focused on..." | 대체 | `profileData.title` 또는 tagline 일부 |
| footer 8-13행 | socialLinks Twitter/Instagram/LinkedIn/GitHub(`stfnco`) | 대체/삭제 | GitHub만 `profileData.github`로 대체, 나머지 3개 삭제. email 링크 추가 가능 |
| footer 19행 | `/blog` 링크 | 삭제 | U3 권장안 적용 시 |
| layout 7-10행 | metadata "Nick - Product Design Partner" 및 영어 description | 대체 | `profileData.name`, `title`, `description` |
| layout 18행 | `<html lang="en">` | 대체 | 본문이 한국어이므로 `ko` (U7) |

### 3.9 기타

| 위치 | 내용 | 분류 | 근거 |
|------|------|------|------|
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | create-next-app 기본 에셋 | 삭제 (U9) | 읽은 `src/` 파일에서 참조 없음. 삭제 전 developer가 `button.tsx`, `globals.css` 포함 전체 grep으로 미참조 확인 |
| `src/components/common/word-cycler.tsx` | 목 단어 순환용 컴포넌트 | U4 결정에 따름 | 사용처가 없어지면 삭제(knip) |
| `tests/e2e/navigation.spec.ts` | 목 문구에 의존하는 단언 | 수정 | 아래 6절 |
| `not-found.tsx` | "The page you're looking for doesn't exist" | 유지 | 범용 UI 문구. 데이터 아님 |
| `page-header.tsx`, 장식용 원형 SVG | 디자인 장식 | 유지 | 목데이터 아님 |
| `button.tsx`, `globals.css` | 미열람 | developer 확인 | 목 문구/에셋 포함 여부만 점검 |

### 수용 기준 (R5)

- 사이트 전체 소스에서 다음 문자열이 검색되지 않는다: bizz buzz, aquaflow, snackify, zengo, roverride, Google/Meta/Apple 등 clients 배열, LMN/EFG/PQR/XYZ/ABC, Palo Alto, `stfnco`, `Nick`, Framer/Procreate/PSN/Zapier/SoundCloud/Mailchimp, "Profile Image", "12 years", 영어 가짜 블로그 제목.
- 원본에 없는 내용을 대신 채워 넣은 곳이 없다(연차, 위치, 가용 여부, 고객사, 회사, SNS 계정, 프로필 사진).
- 삭제로 사용처가 사라진 컴포넌트, export, 에셋은 함께 삭제되어 knip을 통과한다.
- 삭제된 페이지로 향하는 링크(nav, footer, 홈 버튼)가 남지 않는다.

## 4. 상세 페이지 `/work/[id]` (R3)

데이터는 공용 모듈의 `experiences` 사용. 라우트 `src/app/work/[id]/page.tsx`, Server Component, `params`는 `Promise`로 `await`(nextjs.md 규칙 2). 클라이언트 상호작용이 필요 없으면 `"use client"` 파일을 만들지 않는다.

### 기능

- 헤더: title, period, role, techStack(전체), summary, `link`가 있으면 외부 링크 버튼.
- 경험(experience)마다 title과 5개 블록(problem, solution, tradeoff, result, learning)을 표시한다. tradeoff는 advantages, disadvantages, rationale 세 항목.
- `experience.links`가 있으면 label과 url로 링크 표시.
- 페이지 메타데이터(title, description)를 프로젝트별로 설정한다.
- 정적 경로는 5개 id만 생성한다(`generateStaticParams`). 목록에 없는 id는 `notFound()`로 404.
- 상세에서 목록(`/projects`)으로 돌아가는 링크 제공.

### 수용 기준

- `/work/globber`, `/work/dpm-core`, `/work/semt`, `/work/endo-admin`, `/work/endo-report`가 200이고 h1이 해당 프로젝트 title이다.
- 홈과 projects의 모든 카드가 위 5개 페이지 중 하나로 이동한다.
- SEMT는 experience 3개, Globber, Endo Report는 2개, DPM Core, Endo Admin은 1개가 모두 표시된다.
- `/work/unknown`, 제외된 `/work/kbhc`는 404(기존 not-found 화면).

### Edge case

- `rationale`이 빈 문자열인 경우(Endo Report 2번째 experience): 라벨만 있는 빈 블록을 렌더하지 않는다. 빈 문자열이면 해당 항목 숨김.
- `thumbnail`, `link`, `experience.links`가 없는 프로젝트가 대부분이다. 값이 없을 때 깨진 이미지나 빈 버튼이 없어야 한다.
- 텍스트에 `\n`과 "- " 목록이 들어 있다(Endo Admin 등). 줄바꿈이 보존되어야 한다(줄바꿈 보존 표시). 별도 마크다운 파서는 도입하지 않는다.
- 긴 문단(SEMT problem/solution)이 모바일 폭에서 넘치지 않는다.
- techStack이 8~9개일 때 줄바꿈 처리.
- 외부 링크는 새 탭 + `rel="noopener noreferrer"`.
- 동시 요청/중복 생성/크론/알림 해당 없음(정적 데이터, 사용자 입력 없음).

## 5. 홈, about, contact, projects 문구 (R4, R2) 수용 기준

- 히어로: 이름은 `profileData.name`, h1은 `tagline` 기반(2줄 `\n` 보존: `whitespace-pre-line` 또는 줄 분리). "available" 문구 없음.
- about: 설명은 `description`, stack은 `skills` 9개 전부 표시, 통계/프로필 이미지/경력 섹션 없음. 개수는 `skills.length`와 일치(고정 숫자 문구 없음).
- contact: email은 `mailto:`, GitHub은 `profileData.github`로 연결하고 새 탭에서 연다.
- projects: 설명 문구는 `profileData.description`, clients 섹션 없음, 카드 5개, 우측에 `summary`.
- 목록의 일부만 보여주는 UI는 없다(홈도 5개 전체 표시). 따라서 "N개 중 M개" 문구는 필요 없다.
- 프로필 이미지가 없으므로 이미지 영역은 레이아웃에서 제거하고, 남은 텍스트가 한 칼럼으로 자연스럽게 보이도록 디자이너가 조정한다.

## 6. 테스트 영향 (`tests/e2e/navigation.spec.ts`)

- 첫 화면 h1 기대값(`a product design partner with focus on`)을 새 h1로 교체.
- blog 삭제 시 `/blog` 경로 제거(U3 권장안), 이에 따라 "notes" 항목 삭제. `/blog`가 404가 되는지는 선택.
- 문의 페이지 테스트의 Name/Email/Message 라벨 단언은 폼 삭제 시(U6 권장안) 이메일/GitHub 링크 단언으로 교체.
- 단어 순환 테스트는 WordCycler 삭제 시(U4 권장안) 제거. 유지 시 새 단어 목록으로 교체.
- 신규: `/work/{id}` 5개 200 + h1 확인, `/work/unknown` 404.
- 404 단언 `oops…`는 변경 없음.

## 7. 비기능 요구사항

- 접근성: 이미지 `alt`(Globber 썸네일은 프로젝트명 기반 alt), 외부 링크 식별 가능한 텍스트, 카드 링크는 키보드 포커스 가능(기존 Link 유지), 장식 SVG는 `aria-hidden` 유지.
- 성능: 정적 생성(데이터가 빌드 시점 상수). 외부 요청, DB, 환경변수, 크론 없음.
- 보안: 외부 URL은 데이터 상수에서만 오며 사용자 입력을 URL로 쓰지 않음. 연락 폼 삭제 시 입력 처리 표면 없음.
- 규칙: kebab-case, 신규 주석 명사형 종결, em-dash 금지, `<img>` 금지, 컨벤션은 `docs/agent-rules/tailwind.md` 참조.
- 품질 게이트: pre-commit(knip, 주석 검사), 빌드 성공.

## 8. 모호한 항목별 권장 결정과 사용자 확인 필요

| ID | 항목 | 권장 결정 | 확인 |
|----|------|-----------|------|
| U1 | 카드 category 필드 | 필드 폐지. 카드 메타 줄을 `role`과 `period`로 표시 | 불필요 |
| U2 | 썸네일 표현 | Globber는 이미지 배경, 나머지 4개는 디자이너가 정한 단색 배경. 없는 이미지는 만들지 않음 | 불필요(디자이너 결정) |
| U3 | blog 페이지와 blog-preview, `techTalks` | blog 페이지, blog-preview, 홈 블로그 섹션, nav/footer 블로그 링크 모두 삭제. `techTalks`는 이번 사이클 요청 범위(1~5) 밖이라 이식하지 않음 | **사용자 확인 필요.** 대안은 `techTalks` 2건으로 /blog를 대체하는 것(범위 확대) |
| U4 | WordCycler와 히어로 h1 | h1 = `tagline`, WordCycler 삭제(단어 목록의 원본 대응 데이터 없음), 단어 순환 e2e 삭제 | **사용자 확인 필요.** 대안은 `skills`를 순환시키는 유지안 |
| U5 | about 경력 섹션 | 섹션 삭제. 프로젝트 기간 대체 섹션도 만들지 않음 | **사용자 확인 필요.** 대안은 5개 프로젝트의 period 목록 |
| U6 | contact 폼 | 폼 삭제, email(mailto)과 GitHub 링크 표시 | **사용자 확인 필요.** 폼은 현재 서버 전송이 없어 동작하지 않음. 유지하려면 전송 백엔드가 별도 범위 |
| U7 | 사이트 언어 | 콘텐츠(데이터, 소개 문구)는 한국어, 네비게이션, 섹션 라벨, 버튼 등 고정 UI는 현행 영어 유지. `<html lang="ko">` | **사용자 확인 필요.** 전체 한국어화는 라벨까지 번역하고 e2e 문구도 바꿔야 함 |
| U8 | 원본 데이터 오탈자 | DPM Core summary "활동을지원하는"은 "활동을 지원하는"으로 띄어쓰기만 수정. 그 외 원본 문자열은 유지 | 확인 필요(경미) |
| U9 | "목데이터 관련 내용" 범위 | 데이터 배열 + 그것만을 위한 컴포넌트, 섹션, 에셋(blog-preview, 미참조 `public/*.svg`)까지 포함. 디자인 장식(원형 SVG, PageHeader)은 유지 | **사용자 확인 필요**(삭제 범위 확정) |
| U10 | 홈/projects 카드 색 | 5개 프로젝트의 배경, 글자색은 디자이너가 새로 정함(기존 가짜 브랜드 색 재사용 안 함) | 불필요 |

U3~U7, U9는 사이트 구조를 바꾸는 삭제이므로 구현 전 승인 게이트에서 한 번에 확인받는다. 권장안대로 진행해도 데이터 모듈, 카드, 상세 페이지(R1, R3)는 영향이 없으므로 병행 가능하다.

## 9. 완료 기준

- 2절~5절 수용 기준 전부 충족, 3절 목록의 모든 항목이 대체/삭제/유지 중 하나로 처리됨.
- 5개 프로젝트가 홈, projects, `/work/{id}`에서 일관된 데이터로 표시됨.
- 사이트에 원본에 없는 사실 주장이 남지 않음.
- 갱신된 e2e와 pre-commit 검사(knip 포함), 빌드가 통과함.

## 10. 승인 게이트 사용자 결정 (orchestrator 기록)

아래 결정은 8장의 권장안보다 우선한다.

- U3 blog: **techTalks로 대체**. 원본 `techTalks` 2건을 공용 데이터 모듈로 옮겨 `/blog` 페이지와 홈 blog-preview에 표시한다. 가짜 블로그 글은 삭제한다. nav·footer의 blog 링크는 유지한다. 각 항목의 외부 `link`는 `rel="noopener noreferrer"`로 새 탭에서 연다.
- U4 hero: **skills 순환**. WordCycler 컴포넌트와 순환 동작을 유지하고, 순환 단어를 `profileData.skills`로 교체한다. 가짜 문구("Hey, I'm Nick", "available for new projects", "a product design partner with focus on")는 `profileData`(name, title) 기반 문구로 교체한다. 순환 e2e는 삭제하지 않고 새 단어 기준으로 갱신한다.
- U5 about 경력 섹션: 삭제 (권장안 유지, "목데이터 모두 삭제" 요청 근거)
- U6 contact: 폼 삭제, 이메일(mailto)·GitHub 링크로 대체 (권장안)
- U7 언어: 콘텐츠 한국어, nav·섹션 라벨·버튼 영어, `<html lang="ko">` (권장안)
- U8: 띄어쓰기만 수정 (권장안)
- U9 삭제 범위: 목데이터 전용 컴포넌트·섹션·에셋까지 포함 (권장안 유지)
- T03 이후 추가 결정:
  - blog 명칭: nav 메뉴·footer 링크·`/blog` 페이지 h1·홈 섹션 라벨을 모두 "talks"로 통일. 경로 `/blog`는 유지.
  - contact 소개 문구: "채용이나 협업 제안은 이메일로 보내 주세요. 작업 기록은 GitHub에서 확인하실 수 있습니다." (웹 검색 사례 기준: 짧고 직접적, 연락 목적과 채널 명시, 미확인 응답 시간 약속 없음)
  - hero: skills 순환 유지 (사용자 재확인)
  - techTalks `date`("2025.06" 형식)는 문자열 그대로 표시, `time` 요소 미사용
  - Navbar: `/work/*`에서 projects 활성 표시

## 11. R6 spacing 1px 회귀 방지 (사이클 중 추가 요청)

요청 원문: "`@theme inline { --spacing: 1px;` 적용되면서 ui 깨지는 부분들 모두 파악하고 기존과 동일한 spacing이 적용될 수 있도록 수정해"

orchestrator 조사 결과 (2026-10-02):
- `--spacing: 1px`는 c8ba525에서 도입됐고, 같은 커밋에서 모든 spacing 클래스 숫자를 4배로 변환했다 (예: `gap-12` -> `gap-48`, `px-8` -> `px-32`).
- 도입 전 커밋 573dbe9와 현재 HEAD 7c6beb9를 각각 dev 서버로 띄워 6개 경로(`/`, `/projects`, `/about`, `/blog`, `/contact`, 404) × 4개 폭(390, 810, 1024, 1440)에서 모든 요소의 margin·padding·gap·width·height·위치·line-height·transform computed style과 박스 크기를 비교했다. **차이 0건.** 매칭이 안 된 23개 요소는 em dash(—)가 하이픈(-)으로 바뀐 텍스트 차이뿐이고 스타일 값은 동일했다.
- 조건부 클래스(hover 등)는 정적 토큰 대조로 확인했고 누락된 변환이 없었다. 모바일 메뉴 같은 상태 전환 UI는 없다.
- 결론: 현재 코드에는 수정할 spacing 깨짐이 없다.

이번 사이클 요구사항:
- 신규·변경 코드의 spacing 클래스는 모두 1px 스케일로 쓴다 (`docs/agent-rules/tailwind.md`). Tailwind 기본 스케일 감각으로 `p-4`(=4px), `gap-2`(=2px)처럼 쓰지 않는다. design-spec.md의 값은 이미 px 기준이다.
- 이번 변경이 건드리지 않는 기존 섹션(레이아웃, nav, footer, 카드 스택, CTA, PageHeader)의 spacing은 변경 전과 동일해야 한다. QA(T09)가 변경 전후 computed style을 비교해 확인한다.
