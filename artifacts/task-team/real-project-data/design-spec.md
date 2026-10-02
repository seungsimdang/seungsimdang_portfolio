# 디자인 명세: 실제 포트폴리오 데이터 반영

- 브랜치: `feature/real-project-data`
- 입력: `requirements.md` (10장 승인 게이트 결정 우선: blog는 techTalks로 대체, hero는 WordCycler 유지 + skills 순환)
- 원칙: 기존 디자인 언어(검은 배경, 큰 타이포, 원형 장식, 스티키 카드, `.label` + 가는 선 섹션 머리)를 유지한다. 새 디자인 토큰은 정의하지 않는다.
- 공통 컴포넌트 확인 결과: `src/components/common/`에는 `about-section`, `word-cycler`, `project-card`, `blog-preview`, `hero-section`, `page-header`만 있고 모달, 드롭다운, 체크박스, 스위치, 툴팁 같은 인터랙티브 primitive는 없다. 이번 범위에는 해당 인터랙션이 없어 Radix UI도 필요 없다(링크와 정적 텍스트만 사용).

## 1. 핵심 UX 흐름

1. 홈 진입 -> hero(이름·직함·skills 순환) -> 프로젝트 카드 5장(스티키 스택) -> about 요약 -> tech talks 요약 -> CTA.
2. 카드 클릭 -> `/work/{id}` 상세 -> 상단 "projects" 링크 또는 하단 버튼으로 `/projects` 복귀 또는 contact 이동.
3. nav의 blog -> `/blog`(tech talks 전체) -> 각 talk의 외부 링크는 새 탭.
4. nav의 contact -> `/contact`: 폼 없이 이메일(mailto), GitHub 두 개의 연락 카드.

## 2. 컴포넌트 목록

| 구분 | 컴포넌트 | 위치 | 비고 |
|------|----------|------|------|
| 변경 | `ProjectCard` | `components/common/project-card.tsx` | props 교체, 썸네일 배경 지원 |
| 변경 | `HeroSection` | `components/common/hero-section.tsx` | 문구 교체, 초록 점·available 삭제 |
| 변경 | `AboutSection` | `components/common/about-section.tsx` | 프로필 이미지 삭제, 단일 칼럼 |
| 변경 | `BlogPreview` | `components/common/blog-preview.tsx` | 이름 유지, techTalk 필드를 받는 카드로 확장 |
| 변경 | `Button` | `components/ui/button.tsx` | `external?: boolean` 추가 |
| 변경 | `Navbar` | `components/layout/navbar.tsx` | 로고 `profileData.name`, `/work/*`에서 projects 활성 표시 |
| 변경 | `WordCycler` | `components/common/word-cycler.tsx` | 코드 변경 없음, 호출부만 skills로 교체 |
| 신규 | `ExternalLink` | `components/common/external-link.tsx` | 텍스트형 외부 링크(새 탭, rel, 아이콘, sr-only 안내) |
| 신규 | `ProjectDetail` 구성 | `app/work/[id]/page.tsx` (Server Component) | 아래 4장. 헤더와 experience 블록은 페이지 내부 JSX 또는 `components/common/` 분리는 구현자 재량 |
| 삭제 | 없음 | - | 요구사항 10장으로 blog-preview, word-cycler 모두 유지 |

페이지 변경: `app/page.tsx`, `app/projects/page.tsx`(clients 삭제), `app/about/page.tsx`(통계, 이미지, 경력 삭제), `app/contact/page.tsx`(폼 삭제), `app/blog/page.tsx`(techTalks), 신규 `app/work/[id]/page.tsx`.

### 2.1 ProjectCard props

| prop | 타입 | 설명 |
|------|------|------|
| `title` | string | h3 |
| `role` | string | 메타 줄 1 |
| `period` | string | 메타 줄 2 |
| `href` | string | `/work/{id}` |
| `bgColor` | string | 단색 배경(썸네일 없을 때 사용, 썸네일 있어도 로딩 전 폴백) |
| `textColor` | string | 단색 카드 글자색 |
| `thumbnail` | string, 선택 | 있으면 배경 이미지 |
| `className` | string, 선택 | 기존 유지 |

- `category`, `year` 제거. `<h3>` 요소 유지(홈과 projects 모두 `h2` 아래).
- 색 값은 데이터가 아닌 프레젠테이션 설정이므로 프로젝트 id별 매핑 상수로 둔다(예: `constants/project-card-theme.ts`). 인라인 `style`로 전달하는 기존 방식 유지(동적 값이라 토큰화 대상 아님).

### 2.2 Button 변경

- `external` true면 새 탭 + `rel="noopener noreferrer"`로 열고, 시각적 텍스트 뒤에 `↗`(aria-hidden), 스크린리더용 `(opens in a new tab)` sr-only 텍스트를 붙인다.
- 상세 헤더의 프로젝트 링크 버튼(variant secondary)에 사용.

### 2.3 ExternalLink props

| prop | 타입 | 설명 |
|------|------|------|
| `href` | string | 외부 URL |
| `children` | ReactNode | 링크 텍스트 |
| `className` | string, 선택 | 추가 스타일 |

- 렌더: 밑줄 텍스트 링크, 우측 `↗`(aria-hidden), sr-only `(opens in a new tab)`, `target="_blank" rel="noopener noreferrer"`.
- 사용처: experience.links, techTalk link, contact GitHub 카드(카드형은 별도 래퍼 허용).

## 3. 프로젝트 카드 (홈, projects 공통)

### 3.1 색상(WCAG AA, 일반 텍스트 4.5:1 기준, 제목은 큰 글자라 3:1이나 모두 4.5:1 이상)

| 순서 | id | 배경 | bgColor | textColor | 대비비 |
|------|----|------|---------|-----------|--------|
| 1 | globber | 썸네일 이미지 | `rgb(17, 17, 17)` (이미지 로딩 전 폴백) | `rgb(255, 255, 255)` | 오버레이 하단 70% 검정 기준 최저 약 8.9:1 |
| 2 | dpm-core | 흰색 | `rgb(255, 255, 255)` | `rgb(0, 0, 0)` | 21:1 |
| 3 | semt | 민트 | `rgb(179, 255, 203)` | `rgb(0, 0, 0)` | 약 18:1 |
| 4 | endo-admin | 슬레이트 | `rgb(46, 53, 56)` | `rgb(255, 255, 255)` | 약 12.5:1 |
| 5 | endo-report | 노랑 | `rgb(255, 221, 0)` | `rgb(0, 0, 0)` | 약 15.6:1 |

- 민트는 기존 `--green`(hsl 148) 계열 색조로 사이트 톤과 맞춘다. 기존 가짜 브랜드 색 조합(주황/검정, 파랑/흰색 등)은 재사용하지 않는다.
- 스티키 스택에서 인접 카드(흰 -> 민트 -> 슬레이트 -> 노랑)가 서로 구분되도록 명도를 번갈아 배치했다.

### 3.2 Globber 이미지 카드

- `<Image fill sizes="(min-width: 1024px) 60vw, 100vw" alt="Globber 프로젝트 썸네일" className="object-cover">`를 카드 최하단 레이어로 둔다. alt는 `${title} 프로젝트 썸네일` 형식, 장식이 아니므로 비워 두지 않는다.
- 그 위에 하단 그라데이션 오버레이(아래에서 위로 검정 70% -> 투명, 카드 높이 하단 약 50% 구간은 70% 유지)를 깔아 텍스트 영역의 대비를 보장한다. 텍스트는 오버레이 위(z-10)에 흰색으로 표시.
- 상단 이미지는 첫 카드이므로 `priority`는 사용하지 않는다(hero가 먼저 보임). 두 번째 화면부터 노출.

### 3.3 메타 표시

- 제목(h3, 기존 크기) 아래 한 줄: `{role} · {period}`. 구분 점은 `aria-hidden`.
- 기존 `flex items-center gap-16 text-sm md:text-base opacity-80`를 `flex-wrap gap-x-16 gap-y-4`로 바꿔 모바일에서 `프론트엔드 개발 · 2025.08 ~ 현재`가 넘치면 줄바꿈.
- 단색 카드는 `opacity-80`이 대비를 낮추므로 가장 약한 조합(민트/검정 18:1 -> 80% 혼합 후에도 AA 이상)에서도 문제 없음을 확인했다. 이미지 카드는 opacity 대신 흰색 100% 사용.
- 호버: 기존 `hover:scale-[1.02]` 유지, `motion-reduce:transition-none motion-reduce:hover:scale-100` 추가. 키보드 포커스 시 `focus-visible` 흰색 2px 링 추가(링크 카드).

### 3.4 projects 페이지 우측 설명

- `project.summary`(원본 문자열) 를 `text-small opacity-70` 그대로 표시. 기존 원형 장식 유지.
- 페이지 소개 문구(`text-h2 center w-3/4`)는 `profileData.description`으로 교체. 긴 한국어이므로 `text-h2`를 유지하되 `w-3/4`는 `md:w-3/4 w-full`, 말줄임 없음, `break-keep` 적용. 너무 크게 느껴지면 `text-h3`로 낮출 수 있으나 기본은 기존 크기.
- clients 섹션과 그 위 `.clients` 머리 삭제. 소개 문구 아래 바로 프로젝트 섹션이 오도록 section-spacing만 유지.

## 4. 상세 페이지 `/work/[id]`

### 4.1 구조(위에서 아래로)

```
<main>
  [뒤로가기]  <- projects        (text-small, Link, 헤더 위)
  [헤더 section]
    h1  title                    (text-h1)
    meta row: period · role      (text-small opacity-70)
    p   summary                  (text-h3, break-keep)
    techStack chips              (ul, 가로 wrap)
    link button (있을 때만)       (Button secondary external)
  [experience section] x N  (h2 title 마다)
  [CTA section]  "Let's work together" + "Get in touch"  (기존 패턴 재사용)
</main>
```

- 헤더는 `PageHeader`를 재사용하지 않는다. PageHeader는 h1 하나뿐이고 우측 장식 원형이 meta와 겹치므로, 같은 클래스 패턴(`max-w-content container-padding section-spacing`)으로 상세 전용 헤더를 직접 구성한다. 원형 장식은 헤더 우측 하단에 `PageHeader`와 같은 크기(36px, opacity-50)로 유지한다.
- 각 섹션 상하 여백은 `section-spacing`, 섹션 머리 라벨은 기존 `.label` + `flex-1 h-px bg-white/25` 패턴을 사용한다(라벨 요소는 아래 heading 규칙).

### 4.2 헤더 상세

- period · role: 한 줄, 모바일에서 `flex-wrap gap-x-16`. 구분 점 aria-hidden.
- techStack: `ul` + 각 `li`가 `border border-white/25 rounded-full px-16 py-4 text-small`. `flex flex-wrap gap-8`로 8~9개도 자동 줄바꿈. 칩은 상호작용이 없으므로 hover 효과 없음.
- link: 있을 때만 `Button variant="secondary" external`, 텍스트는 "visit project"(고정 UI 라벨은 영어, U7). 없으면 버튼 영역 자체를 렌더하지 않아 빈 여백이 생기지 않게 한다.
- thumbnail은 상세 헤더에 표시하지 않는다(요구사항 상세에 이미지 요구가 없고 Globber만 있어 페이지 간 일관성이 깨짐).

### 4.3 experience 섹션

`experiences`는 배열 순서대로 `section` 반복. 각 experience:

- 섹션 머리: `h2` = `experience.title`(`text-h2`보다 작은 `text-h3` 크기 사용, 긴 제목 줄바꿈 허용, `break-keep`). 위에 `.01` 같은 번호 라벨은 만들지 않는다(원본에 없는 정보는 추가하지 않음).
- 본문은 행(row) 목록. 데스크톱(`lg`)은 12칼럼 그리드, 왼쪽 3칼럼 = 라벨, 오른쪽 9칼럼 = 내용. 모바일/태블릿은 라벨이 위, 내용이 아래의 1칼럼. 행 사이는 `border-b border-white/10 pb-32` 구분선(기존 about 경력 행 패턴).
- 행 순서와 라벨(영문 고정 UI 라벨, `text-small opacity-50`, 접두 점 포함 `.problem` 형식):

| 순서 | 라벨 | 데이터 | 표현 |
|------|------|--------|------|
| 1 | `.problem` | `problem` | 본문 단락 |
| 2 | `.solution` | `solution` | 본문 단락 |
| 3 | `.tradeoff` | `tradeoff.advantages`, `disadvantages`, `rationale` | 아래 4.4 |
| 4 | `.result` | `result` | 본문 단락 |
| 5 | `.learning` | `learning` | 본문 단락 |
| 6 | `.links` | `links` | 링크 목록, 있을 때만 |

- 본문 텍스트: `text-body`(16px/1.75) 기준, 데스크톱 `text-lg`까지 키울 수 있으나 기본은 `text-body`. 색은 흰색 100%(긴 문단 가독성). 라벨만 `opacity-50`.
- 모든 행 위/아래 간격은 `space-y-24 md:space-y-32`.

### 4.4 tradeoff 3항목

- `dl` 구조: `dt`(소라벨 `장점` 아닌 영문 `advantages` / `disadvantages` / `rationale`, `text-small opacity-50`) + `dd`(본문).
- 순서는 advantages, disadvantages, rationale. 세 항목 모두 같은 세로 스택(`space-y-16`), 장단점 비교 목적이므로 가로 2단 분할은 하지 않는다(모바일 일관성, 줄바꿈 길이 차이).
- `rationale === ""`(Endo Report 2번째)면 해당 `dt`/`dd` 쌍 전체를 렌더하지 않는다.
- 세 항목이 모두 비면 `.tradeoff` 행 전체 숨김.

### 4.5 빈 값 숨김 규칙(공통)

문자열은 `trim()` 후 빈 값이면 그 항목(라벨 포함)을 렌더하지 않는다. 배열은 길이 0이면 숨긴다.

| 항목 | 규칙 |
|------|------|
| `link` | 없으면 버튼 없음 |
| `thumbnail` | 없으면 단색 카드, 이미지 요소 자체 미렌더(깨진 이미지 없음) |
| `techStack` | 비면 칩 영역 숨김 |
| `experience.links` | 없거나 빈 배열이면 `.links` 행 숨김 |
| `problem/solution/result/learning` | 빈 문자열이면 해당 행 숨김 |
| `tradeoff.*` | 항목별 개별 숨김, 전부 비면 행 숨김 |

### 4.6 `\n`과 "- " 목록 줄바꿈 표현

- 모든 본문 문자열 요소에 `whitespace-pre-line` 적용: `\n`이 줄바꿈으로 보이고, 연속 공백은 접힘.
- "- "로 시작하는 줄은 마크다운 파싱 없이 **원문 그대로** 줄바꿈된 텍스트로 표시한다(불릿 변환, 들여쓰기 처리 없음). 줄 간격은 `text-body`의 line-height 1.75로 충분하다.
- 한국어 가독성을 위해 `break-keep`, 긴 영문/URL 방어를 위해 `break-words`를 함께 적용(모바일 가로 오버플로 방지).
- 텍스트를 `<p>` 하나로 감싼다. 목록처럼 보이지만 의미상 단락이다. 스크린리더는 줄바꿈 단위로 읽는다.

### 4.7 experience.links

- 행 라벨 `.links`, 내용은 `ul`, 각 `li`에 `ExternalLink`(label을 링크 텍스트로). 항목 사이 `space-y-8`.
- url은 원본 상수만 사용(사용자 입력 아님).

### 4.8 이전/다음 프로젝트 이동

필요 없음. 5개뿐이고 홈, projects에서 한 번에 전체 목록을 볼 수 있으며 요구사항에도 없다. 상단 "projects" 뒤로가기 링크와 하단 CTA(contact)만 둔다. 이전/다음을 추가하면 새 컴포넌트와 순서 규칙이 늘어난다.

### 4.9 메타와 404

- `generateMetadata`로 title = `{title} | {name}`, description = `summary`.
- 알 수 없는 id는 `notFound()` -> 기존 not-found 화면.

## 5. Hero

- 상단 메타(기존 위치, `text-small`): `{profileData.name}` `·` `{profileData.title}` (예: `이승현 · Frontend Developer`). 초록 점 원과 "available for new projects" 삭제. 가운데 구분점은 aria-hidden. 모바일은 기존처럼 가운데 정렬, 데스크톱은 좌측 정렬.
- h1(`text-h1`): WordCycler 한 줄이 h1의 시각적 본문. `words = profileData.skills`(9개), `interval=2`, `animationDuration=0.3` 유지, 클래스 `text-h1 block`.
  - h1 안에 `<span className="sr-only">{title}: {skills.join(", ")}</span>`를 두고 시각 WordCycler 부분은 `aria-hidden="true"`로 감싼다. 순환 단어가 스크린리더에서 반복 낭독되지 않고, h1이 직함과 전체 skills를 한 번에 전달한다.
  - 모션 감소: `prefers-reduced-motion`에서는 WordCycler 숨기고(`motion-reduce:hidden`) 정적 skills 나열(`hidden motion-reduce:block`, 쉼표 구분)을 같은 자리에 표시한다. 이를 위해 WordCycler 코드는 수정하지 않고 감싸는 요소로 처리한다.
  - 가장 긴 단어는 `TanStack Query`(14자), `Tailwind CSS`(12자). 모바일 390px에서 `text-h1`(3rem=48px)로 한 줄에 못 들어가면 WordCycler가 최대 높이를 측정하므로 2줄 높이를 확보한다(기존 측정 로직 활용). 구현 후 360px 폭에서 줄바꿈과 높이 확인 필요(QA 항목).
- h1 아래: `profileData.tagline`을 `<p className="text-h3 whitespace-pre-line break-keep">`로 표시(2줄 `\n` 보존), `md:max-w-heading`. 모바일은 center, 데스크톱 left. 위 간격은 기존 `gap-48 md:gap-80 lg:gap-160` 체계 안에서 hero의 세 번째 블록으로 추가.
- 우하단 원형 장식(`hidden md:block`, aria-hidden)은 유지.

## 6. 홈 about 섹션

- 프로필 이미지 영역 삭제. 텍스트가 한 칼럼이므로 그리드를 단순화: `.about` 라벨 + 선, 아래 `profileData.description`을 `text-h3 break-keep`로. 데스크톱 `lg:col-span-8`, 나머지 여백.
- 이미지 삭제로 남는 우측 빈 공간에는 about 페이지와 같은 원형 장식(36px, opacity-50, aria-hidden)을 텍스트 블록 하단 우측에 둬 기존 디자인 언어를 유지한다.
- "about me" 버튼 행은 유지. 라벨 요소는 `h2`로 변경하되 시각 스타일(`text-small`)은 유지.

## 7. about 페이지

순서: `PageHeader title="about"` -> 설명 -> `.hello` -> `.stack` -> CTA.

- 설명 문단(`text-h2 text-center`): `profileData.tagline`, `whitespace-pre-line break-keep`. 2줄 `\n`을 중앙 정렬로 보존. `w-3/4`는 모바일에서 `w-full`.
- 통계 섹션(.experience, .location, .freelance) 전체 삭제.
- `.hello`: 이미지 칼럼 삭제, `.hello` 라벨 + 선, 아래 `profileData.description`(`text-h3`), 1칼럼 `lg:col-span-8`, 하단 우측에 기존 원형 장식. 설명 문구는 tagline과 중복되지 않도록 description을 쓴다.
- `.work experience` 섹션 삭제(U5).
- `.stack`: `profileData.skills` 전부(9개). `ul` > `li` 카드, `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-32 md:gap-48`. 카드는 기존 `border border-white/10 rounded-lg hover:border-white/30`에서 이름만 표시(`text-xl font-medium`), category 줄 삭제. 카드는 링크가 아니므로 hover 효과는 장식일 뿐이라 제거해도 무방하나 기존 톤 유지를 위해 유지한다. 개수 문구 없음.
- 섹션 라벨은 `h2`.

## 8. contact 페이지

- `PageHeader title="say hello"`.
- 소개 문구(`text-h2 center`): 제안 문구 **"함께 일하고 싶으시다면 이메일이나 GitHub로 편하게 연락 주세요."** (원본에 대응 문구가 없어 사용자 확정 필요. social networks 언급과 SNS는 제거.)
- 폼 삭제. 연락 카드 2개를 기존 소셜 카드 스타일(`border border-white/10 rounded-lg p-24`, 좌측 라벨 + 값, 우측 화살표)로 표시한다.
  - 카드 1: 라벨 `email`, 값 `profileData.email`, `href="mailto:{email}"`, 같은 탭, 화살표 `→`. 값 `text-lg md:text-2xl`, 긴 주소 대비 `break-all`.
  - 카드 2: 라벨 `github`, 값은 `profileData.github`에서 `https://` 제거한 표시(`github.com/seungsimdang`), 새 탭, `rel="noopener noreferrer"`, 화살표 `↗`, sr-only `(opens in a new tab)`.
- 레이아웃: 데스크톱 `md:grid-cols-2 gap-32`, 모바일 1칼럼. 기존 7+1+4 그리드와 폼 칼럼이 없어졌으므로 단순 2열로 한다. 원형 장식은 카드 아래 우측에 유지.
- 카드 전체가 `<a>`이고 `focus-visible` 링을 가진다. 화살표 문자는 aria-hidden.
- 폼용 `useState`가 사라지므로 페이지는 `"use client"`가 필요 없어진다.

## 9. blog 페이지와 홈 blog 섹션 (techTalks)

### 9.1 BlogPreview(카드형 항목) props

| prop | 타입 | 설명 |
|------|------|------|
| `title` | string | h3 |
| `date` | string | 원본 문자열 그대로 표시 |
| `venue` | string | 메타 줄 |
| `description` | string | 본문 |
| `impact` | string, 선택 | 있고 `detailed`일 때만 |
| `link` | string | 외부 링크 |
| `detailed` | boolean, 선택 | blog 페이지에서만 true |
| `className` | string, 선택 | 기존 유지 |

- 외부 링크이므로 전체 카드를 `Link`로 감싸지 않는다. 카드 안에 링크가 하나만 있는 구조로 `article` + 하단 `ExternalLink`(텍스트 "view details")를 둔다. 제목은 링크가 아닌 `h3`.
- 구성(위에서 아래): `h3 title`(`text-2xl md:text-3xl font-medium`) -> 메타 줄 `{date} · {venue}`(`text-small opacity-50`, 날짜는 `time` 요소로 감쌀 수 있으면 `dateTime` 포함, 형식이 ISO가 아니면 일반 `span`) -> `description`(`text-body whitespace-pre-line break-keep`) -> (detailed) `.impact` 라벨 + `impact` 본문(`whitespace-pre-line`) -> `ExternalLink`.
- 항목 구분: 기존 `border-b border-white/10 pb-24`. 모바일 카드 안 간격 `space-y-12`, 데스크톱 `space-y-16`.
- 빈 값(`impact === ""`)이면 `.impact` 블록 숨김.

### 9.2 홈 섹션

- 라벨 `.three latest notes` -> `.tech talks`(h2). 2건 전체를 `detailed=false`로 나열(`space-y-24 md:space-y-32`). "visit blog" 버튼 유지(블로그 링크는 유지 결정).

### 9.3 /blog 페이지

- `PageHeader title="tech talks"`. (nav 라벨은 `blog` 유지. h1과 nav 불일치가 거슬리면 `blog`로 통일 가능, 사용자 결정 필요. e2e 단언은 선택된 값으로 갱신.)
- `.latest` / `.all posts` 분할 삭제. 2건뿐이므로 `.talks` 한 섹션으로 `detailed=true`로 전체 목록 표시.
- 데스크톱에서 카드를 2열 그리드로 두지 않고 1열(세로 스택)로 유지한다. 본문이 길 수 있어 가독성 우선.
- CTA 섹션 유지.

## 10. 반응형

기존 토큰(`container-padding`, `section-spacing`, `max-w-content`) 그대로 사용. 새 브레이크포인트 없음.

| 영역 | 모바일(<810) | 태블릿~랩톱 | 데스크톱(>=1024) |
|------|--------------|-------------|------------------|
| hero | 중앙 정렬, h1 3rem, tagline 중앙 | 좌측 정렬 | 좌측 정렬, 원형 장식 |
| 카드 | `h-[90vh]`(홈), `h-[60vh]`(projects), 패딩 32 | 패딩 48 | 패딩 64, projects는 7+1+4 그리드 |
| 상세 헤더 | 1칼럼, 칩 wrap | 1칼럼 | 1칼럼(좌측 정렬), 원형 장식 우하단 |
| experience 행 | 라벨 위, 내용 아래 | 동일 | 3 + 9칼럼 |
| contact 카드 | 1열 | 2열 | 2열 |
| stack | 1열(sm 2열) | 3열 | 3열 |

- 긴 문단 오버플로 방지: 본문 `break-keep break-words`, 컨테이너 `min-w-0`, 칩과 링크는 `wrap` 허용.
- 카드 높이 `90vh`는 모바일 가로 뷰에서 과도할 수 있으므로 현행 유지(요청 범위 밖).

## 11. 접근성

- heading 계층: 모든 페이지 h1 하나(홈 hero, 각 페이지 `PageHeader`, 상세 title). 섹션 라벨(`.about`, `.stack`, `.tech talks` 등)은 `h2`(스타일은 `text-small` 유지). 카드 제목은 `h3`. 상세에서는 h1 title -> h2 experience title -> h3 행 라벨(`.problem` 등, 시각은 `text-small`). tradeoff 하위 `dt`는 heading이 아님.
- 외부 링크: `target="_blank"` + `rel="noopener noreferrer"` + 시각 `↗` + sr-only "(opens in a new tab)". mailto 링크는 새 탭 아님.
- 이미지: Globber 썸네일 alt `Globber 프로젝트 썸네일`(`${title} 프로젝트 썸네일`). 장식 원형 SVG는 모두 `aria-hidden`.
- 색 대비: 3.1의 카드 조합, 흰색 50% 보조 텍스트(검정 배경 대비 약 5.3:1) 모두 AA 충족. 이미지 카드는 오버레이로 보장.
- 포커스: 카드, 연락 카드, 링크, 버튼에 `focus-visible` 흰색 링(검정 배경). 카드 `Link`의 기본 키보드 포커스 유지.
- 모션: 카드 hover 스케일과 WordCycler는 `prefers-reduced-motion`에서 정지 또는 정적 대체(5장).
- 언어: `<html lang="ko">`. 영어 고정 라벨 구간은 짧아 별도 `lang` 지정 안 함.
- `time` 요소는 날짜 형식이 유효할 때만 `dateTime`을 쓴다.

## 12. 구현자 확인 필요 항목

1. 3.1 색 조합 5개는 이 문서가 확정안(요구사항 U10에서 디자이너 위임).
2. 8장 contact 소개 문구와 9.3장 blog 페이지 h1(`tech talks`) 표기는 사용자 확인 권장.
3. Navbar 활성 표시: `/work/*`에서 `projects`를 활성으로 표시(경로가 `pathname.startsWith("/work/")` 인 경우). 현재 코드는 완전 일치라 상세에서 모든 항목이 흐려진다.
4. techTalks 원본 필드(`date` 형식)는 미확인이므로 `time` 요소 처리는 구현 시 데이터를 보고 결정.
5. 테스트: 홈 첫 h1 단언은 sr-only 텍스트 때문에 `Frontend Developer` 포함 여부로 단언, 순환 e2e는 skills 기준으로 갱신(`blog` -> `/blog` 존재 유지, h1은 `tech talks`).
