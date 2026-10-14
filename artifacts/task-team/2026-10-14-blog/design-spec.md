# design-spec: 블로그 (공개 /blog, 상세, talks 이동, admin 블로그 탭) (T03)

- 작성일: 2026-10-14
- 입력: `requirements.md`(승인됨), `00-input.md`, 현재 `blog/page.tsx`(talks), `work/[id]/`, `navbar.tsx`, `footer.tsx`, `src/components/admin/*`, `tailwind.md`, 직전 사이클 `2026-10-13-about-resume/design-spec.md`
- 원칙: 새 색/폰트/아이콘/디자인 체계 없음(흑백 토큰, `white` 투명도 수식어만). 기존 컴포넌트 재사용 우선. 코드는 작성하지 않으며 클래스 값은 구현 지침(Tailwind spacing 1 = 1px)이다. 기술 구현 방식(렌더러, 강조 라이브러리)은 지정하지 않는다.

## 목차

- [1. 요약](#1-요약)
- [2. 공통 컴포넌트 확인 결과](#2-공통-컴포넌트-확인-결과)
- [3. 공개 /blog 목록](#3-공개-blog-목록)
- [4. 공개 /blog/slug 상세와 본문 타이포그래피](#4-공개-blogslug-상세와-본문-타이포그래피)
- [5. /talks 이동, navbar, footer](#5-talks-이동-navbar-footer)
- [6. admin 블로그 탭](#6-admin-블로그-탭)
- [7. 결과 피드백 위치](#7-결과-피드백-위치)
- [8. 컴포넌트 목록](#8-컴포넌트-목록)
- [9. 상태 정리](#9-상태-정리)
- [10. 접근성과 반응형](#10-접근성과-반응형)
- [11. 개발자에게 넘기는 확인점](#11-개발자에게-넘기는-확인점)

## 1. 요약

- 공개 `/blog`: 기존 `PageHeader title="blog"` + 기존 `.talks` 섹션과 같은 라벨 행(`.posts`) + 글 행 목록 + 페이지네이션 `nav`. 카드 그리드 없이 행 목록(제목/날짜/카테고리).
- 공개 `/blog/[slug]`: `h1`은 글 제목 하나, 메타(날짜, 카테고리, 태그), 본문 영역(`max-w-content` 안에서 읽기 폭 제한), 하단 "blog 목록으로" 링크.
- talks는 `/talks`로 이동(화면 내용 동일). navbar 라벨 `blog`, `talks` 둘 다 표시. footer는 `Blog`, `Talks`.
- admin: `admin-nav`에 "블로그" 탭, `/admin/blog` 목록, `/admin/blog/new`, `/admin/blog/[slug]` 편집. 폼은 `TalkForm` 패턴(`useAdminForm`, `TextField`, `FormActionBar`, `ConfirmDialog`)을 따르고, 본문 편집기만 신규.
- 신규 컴포넌트는 공개 3개(글 행, 페이지네이션, 본문 렌더 래퍼의 스타일 규칙)와 admin 3개(블로그 폼, 마크다운 편집기, 페이지네이션 링크 재사용)뿐이다. 8절 참조.

## 2. 공통 컴포넌트 확인 결과

`src/components/common/`에는 `word-cycler`, `external-link`, `project-card`, `talk-preview`, `about-section`, `hero-section`, `page-header`, `resume-section`만 있고, 모달/드롭다운/체크박스/스위치/툴팁 계열 공통 컴포넌트는 없다. `src/components/ui/`에는 `button.tsx`만 있다. 이 때문에 인터랙티브 요소별 처리는 다음과 같다.

| 요소 | 사용할 것 | 비고 |
| --- | --- | --- |
| 삭제 확인, .md 덮어쓰기 확인 | `src/components/admin/confirm-dialog.tsx` (`ConfirmDialog`) | 네이티브 `dialog` 기반, 기본 포커스는 취소. 새 모달 만들지 않음 |
| 공개 여부 선택 | 네이티브 `input type="checkbox"` + 기존 `label` 패턴 | 스위치/체크박스 공통 컴포넌트 없음. Radix `Checkbox`로도 구현 가능하나 폼 한 곳이라 네이티브로 충분 |
| 카테고리 필터(P1) | 링크 목록(`Link`), 선택 컴포넌트 아님 | 드롭다운 불필요 |
| 파일 선택(.md, 이미지) | 네이티브 `input type="file"` | `ThumbnailField` 선례. 숨김 input + `AdminButton`이 `click()` |
| 툴팁 | 사용 안 함 | 버튼 라벨과 `hint` 문구로 충분 |
| 버튼 | `AdminButton`(admin), `src/components/ui/button.tsx`(공개 필요 시) | 공개 페이지 링크는 대부분 텍스트 링크 |

Radix primitive 신규 도입은 필요 없다.

## 3. 공개 /blog 목록

### 3.1 구조

`PageHeader title="blog"`(h1) > 본문 `section`(`w-full max-w-content mx-auto container-padding py-40 md:py-48 lg:py-64`, 현재 talks 페이지와 동일) > 라벨 행(`h2.text-small` `.posts` + `h-px bg-white/25`) > (P1) 카테고리 필터 > 건수 문구 > 글 목록 `ul` > 페이지네이션.

### 3.2 글 행 (PostRow)

한 행은 `li` 전체가 하나의 `Link`(블록 링크)다.

- 데스크톱(`md` 이상): 2열 `md:grid-cols-[160px_1fr]`, `md:gap-32`. 왼쪽 날짜(`text-small text-white/50`, `YYYY.MM.DD`), 오른쪽 제목 + 카테고리. `[160px]`은 직전 사이클 about 항목 목록의 `[200px]` 선례와 같은 1회성 값이며 토큰화는 개발자 검토.
- 모바일: 1열, 날짜가 위, 제목이 아래, `gap-8`.
- 제목: `text-body font-medium break-keep`. 알고리즘 글 제목이 길고(예: `7339. 2xn 타일링 3`) 297개라서 `text-h3`(24~32px)는 쓰지 않는다. 두 줄까지 자연 줄바꿈, 말줄임 처리 없음(잘림 방지).
- 카테고리: 제목 아래 `text-small text-white/50`, 여러 개면 ` / `로 구분한 한 줄 텍스트. 없으면 줄 자체를 렌더링하지 않음. 필터 링크가 아닌 일반 텍스트(행 전체가 링크라 중첩 링크 금지).
- 행 사이: `ul`은 `divide-y divide-white/10`, 각 행 `py-20 md:py-24`. 직전 about 사이클은 구분선 없이 여백만 썼지만, 20개씩 이어지는 탐색용 목록은 스캔성을 위해 얇은 구분선을 쓴다(`border-white/10`은 footer에 이미 쓰는 값).
- hover: 제목 `underline underline-offset-8` 표시(admin-nav 선례), 행 전체 `opacity` 변화는 쓰지 않음. 포커스는 `focus-visible:outline-2 focus-visible:outline-white`(admin-nav 선례).

### 3.3 건수 문구

- 라벨 행 아래, 목록 위: `p.text-small text-white/50` "총 297개 중 1-20번째". 필터가 있으면 "{카테고리} 카테고리 총 N개 중 a-b번째".
- 페이지네이션 아래에도 반복하지 않는다(중복 낭독 방지).

### 3.4 카테고리 필터 (P1)

- 건수 문구 위에 가로 줄바꿈 링크 목록(`flex flex-wrap gap-x-16 gap-y-8 text-small`). 첫 항목 "전체"(`/blog`), 이어서 카테고리 링크(`/blog?category=...`).
- 활성 항목: `opacity-100 underline underline-offset-8` + `aria-current="page"`, 나머지 `opacity-50 hover:opacity-100`(navbar 선례와 동일한 방식). 선택 해제 수단은 "전체" 링크.
- 카테고리가 많아 줄이 길어지면 줄바꿈으로 흡수한다(스크롤/접기 없음). 카테고리 개수가 많아 화면 높이를 과하게 차지하면 T04 이후 확인 후 이 문서를 갱신한다(임의 판단 금지).
- 필터 변경 시 `page`는 1로 초기화(링크가 `page`를 포함하지 않음).

### 3.5 페이지네이션 (Pagination)

- `nav aria-label="블로그 페이지"` 안에 `이전` / 페이지 번호 / `다음`. 공개용 신규 컴포넌트 1개이며, admin 목록(50개/페이지)도 같은 컴포넌트를 `basePath`, `query` 지정으로 재사용한다.
- 레이아웃: `flex flex-wrap items-center justify-center gap-8 pt-40 md:pt-48`. 각 항목 최소 터치 영역 `min-h-44 min-w-44` (admin-nav의 `min-h-44` 선례).
- 번호 표시 규칙(297개 / 20 = 15페이지): 현재 페이지 앞뒤 1개 + 첫/마지막 + 생략 기호 `...`(텍스트, 비링크, `aria-hidden`). 모바일에서 15개가 모두 나열되면 넘치므로 이 규칙을 전 뷰포트에 동일 적용한다.
- 현재 페이지: `aria-current="page"` + `underline underline-offset-8 opacity-100`(링크 아님 처리 가능, 단 텍스트로만 구분하지 않고 `aria-current`가 필수). 나머지 `opacity-50 hover:opacity-100`.
- 이전/다음: 1페이지에서 `이전`, 마지막 페이지에서 `다음`은 링크가 아닌 `span aria-disabled="true"` + `opacity-25`(비활성). 숨기지 않아 레이아웃이 흔들리지 않게 한다.
- 링크는 모두 일반 `Link`(서버 렌더, JS 없이 동작). 필터가 있으면 `category`를 유지하고 `page`만 바꾼다.
- 페이지 이동 후 스크롤: 기본 동작(새 페이지 상단). 별도 포커스 이동 없음.
- 범위 밖 `page`(0, 음수, 비숫자, 초과) 처리: 1페이지로 보이게 하지 않고 마지막 페이지로 보내는 규칙은 요구사항 F4-2에서 개발자가 정한다. 화면은 어떤 경우에도 정상 목록 1벌을 보여주고 `aria-current`는 실제 표시 중인 페이지를 가리킨다.

### 3.6 상태

| 상태 | 표시 |
| --- | --- |
| 로딩 | 서버 렌더링이라 별도 스켈레톤 없음. `loading.tsx`는 두지 않음(기존 공개 페이지와 동일) |
| 빈 목록(글 0개) | 목록 영역에 `p.text-body text-white/50` "아직 작성한 글이 없습니다." 건수 문구와 페이지네이션 숨김 |
| 필터 결과 0개 | "이 카테고리에 글이 없습니다." + "전체 보기" 링크(`/blog`) |
| 데이터 로드 에러 | 기존 공개 페이지와 같이 Next 에러 경계에 위임. 새 에러 UI 만들지 않음 |

## 4. 공개 /blog/slug 상세와 본문 타이포그래피

### 4.1 페이지 구조

기존 `work/[id]/` 상세와 같은 배경(`bg-black text-white`)과 가로 패딩(`container-padding`)을 쓴다. `PageHeader`는 쓰지 않는다(`h1` 폰트가 `text-h1`이라 긴 한글 제목에 과대). 대신 상단에 직접 구성한다.

1. 상단 여백: navbar 아래 시작 위치를 `PageHeader`의 `section-spacing`과 맞춘다.
2. 뒤로 링크: `Link href="/blog"` "blog 목록으로" (`text-small text-white/50 hover:text-white`). 상세 상단에 한 번, 하단에 한 번(본문이 길기 때문).
3. `h1`: 글 제목. `text-h2`급 이하로 두기 위해 현재 토큰에서 `text-h1`보다 작은 것을 쓴다. 정확한 토큰은 `globals.css`의 `text-h*` 정의를 확인해 선택(새 크기 토큰 추가 금지, 없으면 `text-h3`). `break-keep`, `max-w-heading`.
4. 메타 줄: `mt-16 flex flex-wrap items-center gap-x-16 gap-y-8 text-small text-white/50`. 순서: 발행일(`time dateTime=ISO`), 카테고리(` / `로 구분), 태그(`#태그` 텍스트, 필터 링크 아님).
5. 구분선: `mt-32 h-px bg-white/25`.
6. 본문 컨테이너(`article`): `mt-32 md:mt-48 max-w-3xl`급 읽기 폭. 토큰에 읽기 폭이 없으면 `max-w-content` 안에서 `max-w-800`(1회성, 한글 한 줄 약 40자 기준) 사용을 허용하며 토큰화는 개발자 검토.
7. 하단: 본문 아래 `mt-64`, 뒤로 링크 반복.

`published=false`/없는 slug/디코딩 실패는 Next `notFound()`(기존 404 UI).

### 4.2 본문 타이포그래피 (모든 값은 구현 지침)

기준: 본문 `text-body`, `leading` 넉넉히(1.7 이상), `break-keep`는 일반 문단에만 적용하고 코드/표/URL 줄에는 적용하지 않는다. 블록 사이 기본 간격 `space-y-20`(블록 요소 사이), 제목 위는 더 크게.

| 요소 | 규칙 |
| --- | --- |
| 본문 `#` (h2로 강등) | `text-h3 font-medium mt-64 mb-20`. 본문 첫 요소면 `mt-0` |
| `##` (h3) | `text-body font-medium text-lg`급(기존 `text-xl` 선례 사용) `mt-48 mb-16` |
| `###` 이하 (h4~h6) | `text-body font-medium mt-32 mb-12`. h4 이하는 모두 같은 스타일(5단계 시각 구분 불필요) |
| 문단 | `text-body`, `leading-relaxed`, 문단 사이 20px |
| 강조 | `strong`은 `font-medium`(굵기 700은 흑백 배경에서 과해 기존 `font-medium` 선례), `em`은 기울임 |
| 링크 | `underline underline-offset-4 hover:opacity-70`. 외부 링크는 새 탭(`target=_blank`, `rel=noopener noreferrer`)이며 시각 아이콘은 추가하지 않음. 링크는 색만으로 구분하지 않고 밑줄 유지 |
| 인라인 코드 | `rounded-sm bg-white/10 px-6 py-2 text-small font-mono`(폰트 패밀리는 프로젝트에 정의된 mono 토큰이 있으면 사용, 없으면 브라우저 기본 monospace 스택. 새 폰트 도입 금지) |
| 코드 블록 | `pre`: `overflow-x-auto rounded-md border border-white/10 bg-white/5 p-16 text-small`. 줄바꿈하지 않고 가로 스크롤(`whitespace-pre`). 코드 안은 문법 강조 색이 필요하지만 새 색 토큰을 만들지 않는다: 강조는 흑백 계열 안에서 `white` 불투명도와 `font-medium`/`italic` 차이로만 표현(키워드 `opacity-100`, 주석/문자열 `opacity-50~75`)하는 것을 기본으로 한다. 컬러 테마가 꼭 필요하면 사용자 확인 후 `@theme` 토큰 추가(11절 확인점 1) |
| 코드 블록 언어 표시 | 표시하지 않음 |
| 인용(`blockquote`) | `border-l-2 border-white/25 pl-16 text-white/75`, 내부 문단 간격 `space-y-12` |
| 순서 없는 목록 | `ul.list-disc pl-24 space-y-8` (about 사이클의 `list-disc pl-20` 선례보다 본문용으로 4px 넓힘), 중첩은 `mt-8` + 같은 규칙 |
| 순서 있는 목록 | `ol.list-decimal pl-24 space-y-8` |
| 체크리스트(GFM) | 체크박스는 `disabled`(읽기 전용) 네이티브 input 그대로, 목록 스타일 제거(`list-none pl-0`), 항목은 `flex gap-8 items-baseline` |
| 표(GFM) | 래퍼 `overflow-x-auto`(모바일 가로 스크롤, 표 자체는 `min-w-full`). `th`: `text-left text-small font-medium border-b border-white/25 px-12 py-8`, `td`: `border-b border-white/10 px-12 py-8 text-small align-top`. 줄무늬/hover 없음. 표 캡션이 없으므로 스크롤 영역에 `tabindex=0`과 `role=region` + `aria-label="표"`(키보드 가로 스크롤 가능) |
| 이미지 | `max-w-full h-auto rounded-md`. 모바일에서 넘치지 않고 비율 유지. 애니메이션 gif도 동일(리사이즈/변환 금지). 이미지 위아래 간격 블록과 동일 20px. 캡션 없음. alt는 이관 규칙으로 보장되어 본문에서 그대로 사용 |
| 구분선(`hr`) | `h-px border-0 bg-white/25 my-40` |
| 취소선 | `line-through opacity-70` |
| 자동 링크/긴 URL | `break-all`로 줄바꿈해 가로 넘침 방지(링크 요소에만) |
| 출처 한 줄(tcpschool 이미지 아래 등) | 일반 문단과 동일. 별도 스타일 없음 |

- 잘못된 마크다운, 닫히지 않은 코드 펜스: 렌더 오류를 내지 않고 가능한 만큼 위 규칙대로 표시한다(오류 UI 없음).
- 본문이 비어 있으면 본문 컨테이너에 `p.text-white/50` "본문이 없습니다."를 표시한다.
- 가로 넘침 점검 기준: 375px 폭에서 페이지 전체 가로 스크롤이 생기지 않아야 한다. 스크롤은 `pre`와 표 래퍼 안에서만 허용한다.

### 4.3 상세 상태

| 상태 | 표시 |
| --- | --- |
| 로딩 | 서버 렌더링, 별도 UI 없음 |
| 이미지 로드 실패 | 브라우저 기본 broken image + alt 텍스트 노출. 별도 대체 UI 없음 |
| 404 | 기존 not-found UI |

## 5. /talks 이동, navbar, footer

- `/talks`: 현재 `blog/page.tsx`의 화면을 `src/app/(public)/talks/page.tsx`로 이동(내용 동일). `metadata.alternates.canonical`은 `/talks`.
- navbar 링크 순서: `home`, `projects`, `about`, `blog`, `talks`, `contact` (소문자 라벨은 기존 navbar 형식 유지). `blog`를 `talks` 앞에 두는 이유는 사이트 주력 콘텐츠를 앞에 두기 위함이며, 순서 선호가 있으면 확인점이다.
- 활성 판정: `blog`는 `pathname === "/blog" || pathname.startsWith("/blog/")`. `talks`는 `pathname === "/talks"`. `startsWith("/blog")`로 단순화하지 않는다(향후 `/blog-x` 오탐 방지).
- 모바일 폭: 링크 6개가 `gap-16 text-sm`로 한 줄에 들어가는지 320px, 375px에서 확인한다. 넘치면 `gap-12`로 줄이고 그래도 넘치면 줄바꿈 허용(`flex-wrap`)을 개발자가 적용하되 높이 89px 가정(본문 시작 위치 92px)이 깨지면 이 문서에 보고한다.
- footer `Navigation` 목록: `Home`, `Projects`, `About`, `Blog`(`/blog`), `Talks`(`/talks`), `Contact`. 활성 표시는 footer에 원래 없으므로 추가하지 않는다.
- 홈 섹션 등에서 talks로 가는 기존 `/blog` 링크는 모두 `/talks`로 갱신(요구사항 F6-3).

## 6. admin 블로그 탭

### 6.1 탭과 라우트

- `admin-nav` `LINKS`에 `{ href: "/admin/blog", label: "블로그" }` 추가. 순서: 프로젝트, 발표, 블로그, 이력, 프로필(콘텐츠 계열 뒤, 설정성 화면 앞). `startsWith("/admin/blog/")`로 `new`, 편집 화면에서도 탭이 활성화된다(기존 로직 그대로).
- 라우트: `/admin/blog`(목록), `/admin/blog/new`, `/admin/blog/[slug]`(편집, 한글 slug는 디코딩해서 사용).
- 각 페이지 `metadata.title`은 `{ absolute: "블로그 - admin" }` 형식을 따른다.

### 6.2 목록 (`/admin/blog`)

- `AdminPageHeader title="블로그"` + 자식 `AdminButton href="/admin/blog/new" variant="primary"` "새 글".
- 목록은 `SortableList`를 쓰지 않는다. 정렬은 날짜 고정이고 드래그 재정렬이 없기 때문이다(`SortableList`는 projects/talks/resume 전용 kind). 단순 `ul`로 새로 만들되 행 모양은 `SortableList`의 비정렬 행과 시각을 맞춘다(제목 링크 + 보조 텍스트). 구현 시 `SortableList` 행 마크업을 먼저 확인해 중복을 최소화한다.
- 행: 제목(편집 링크, `/admin/blog/{slug}`), 보조 텍스트 `YYYY.MM.DD · 공개` 또는 `YYYY.MM.DD · 비공개`. 비공개는 텍스트로 구분하며 색에 의존하지 않는다.
- 건수 문구: 목록 위 `p.text-small text-white/50` "총 297개 중 1-50번째". 페이지네이션은 3.5의 `Pagination`을 재사용(`aria-label="블로그 관리 페이지"`).
- 삭제 직후 메시지: 기존 `?deleted=1` 쿼리로 "삭제했습니다."를 목록 상단 `role=status` 영역에 표시(`SortableList`의 `initialMessage` 방식과 같은 위치/형태). 이 메시지는 목록 화면의 상단에 있지만 목록은 짧은 헤더 아래라 뷰포트 안에 있으므로 7절 위반이 아니다(폼이 아님).
- 빈 상태: "작성한 글이 없습니다." + 상단 "새 글" 버튼은 그대로 유지.

### 6.3 편집 폼 (`BlogForm`, 새 글/편집 공용)

`TalkForm`과 같은 골격: `<form noValidate aria-busy>` > 필드들 > `FormActionBar` > `ConfirmDialog`. 상단 `FormStatus`는 쓰지 않는다(7절).

필드 순서와 컴포넌트:

| 순서 | 필드 | 컴포넌트 | 비고 |
| --- | --- | --- | --- |
| 1 | (신규 글 전용) .md 가져오기 | 6.5 | 폼 최상단. 편집 화면에서는 렌더링하지 않음 |
| 2 | slug | `TextField` | 새 글: 입력 가능. 편집: `readOnly`(`inputClassName`의 `read-only:opacity-70` 적용), hint "글 주소는 만든 뒤 바꿀 수 없습니다." 새 글 hint "한글, 영문 소문자, 숫자, 하이픈(-)만 사용합니다. 예: 2024-10-06-제목" |
| 3 | 제목 | `TextField` | 필수 |
| 4 | 발행일 | `TextField type="text"` placeholder `2024.10.06`, hint "예: 2024.10.06" | 기존 `TextField`에 date 타입이 없으므로 talks 날짜 입력(`2025.06`)과 같은 텍스트 방식. 네이티브 `input type="date"`는 `TextField` 타입 확장이 필요해 개발자 선택 사항(11절) |
| 5 | 카테고리 | `StringListEditor`(`src/components/admin/string-list-editor.tsx`) | 프로필 skills 편집과 같은 방식 재사용. 줄 추가/삭제 |
| 6 | 태그 | `StringListEditor` | 위와 동일 |
| 7 | 공개 | 네이티브 `input type="checkbox"` + `label` "공개" | 기본 체크. hint "해제하면 공개 목록에서 즉시 사라집니다." |
| 8 | 본문 | `MarkdownEditor` (6.4) | 필수, 최대 1MB 안내 |
| 9 | (P1) 미리보기 | 6.4 | 에디터 내부 탭 |
| 10 | 액션 바 | `FormActionBar` | 저장, 취소, 삭제(편집만), 결과 notice (7절) |

- 삭제: `FormActionBar`의 `onDelete`, `deleteLabel="글 삭제"`. `ConfirmDialog` title "{제목}을 삭제할까요?", description "되돌릴 수 없습니다. 공개 글이면 공개 주소도 사라집니다." 성공 시 `/admin/blog?deleted=1`로 이동. 삭제 실패 오류는 `ConfirmDialog` 내부 오류 문구(기존 동작) + 7절의 액션 바 notice 양쪽 요구사항은 7절 참조.
- 새 글 저장 성공: 편집 화면 `/admin/blog/{slug}?saved=1`로 이동(talks와 동일). 편집 저장 성공은 현재 화면에 머무르고 notice 표시.
- 검증 오류: 필드 아래 `error`(기존 `TextField`) + 7절 notice.
- slug 중복(409): slug 필드 `error` "이미 사용 중인 slug입니다." + 액션 바 notice. 폼 입력은 모두 유지(덮어쓰기 없음).
- 저장 중: `FormActionBar`의 저장 버튼 `disabled` "저장 중..."(기존). 이미지 업로드 중에도 저장을 막는다(6.4).
- 이탈 보호: 미저장 변경이 있을 때 이탈 확인은 `SortableList`의 `useLeaveGuard` 선례가 있으나 `TalkForm`에는 없다. 본문이 긴 글을 잃지 않도록 `beforeunload` 경고 적용을 권장(개발자 검토, 11절).

### 6.4 MarkdownEditor

한 컴포넌트가 툴바 + 본문 영역 + (P1) 미리보기를 가진다.

- 레이아웃: 툴바 행(`flex flex-wrap items-center gap-8`) 아래에 입력 영역. 모바일 1열. 데스크톱에서도 좌우 분할은 하지 않고 "작성" / "미리보기" 두 탭으로 전환한다(좌우 분할은 긴 본문에서 스크롤 동기화 문제가 있어 새 체계가 됨. 탭 UI는 네이티브 `button` 2개 + `aria-pressed`로 가능, 별도 공통 컴포넌트 없음).
- 라벨: "본문 (필수)". `TextAreaField`의 라벨 규칙(`label htmlFor`, `aria-describedby`, 글자 수 `n/최대`)을 따라야 하나 `TextAreaField`는 `ref`와 `selectionStart` 접근 수단이 없다. 에디터는 `FieldShell`/`inputClassName` 스타일(`text-fields.tsx`)을 재사용하되 `textarea`에 `ref`를 노출하는 새 컴포넌트다(또는 `TextAreaField`에 `ref` 전달 추가. 개발자 선택, 기존 호출부 회귀 금지).
- textarea: `rows` 24(약 600px 이상), `font-mono`급 가독 폰트(8.의 mono 규칙), `resize-y`, `min-h-320`, `inputClassName` 재사용. 줄바꿈은 소프트 랩(코드가 많은 글은 가로 스크롤이 불편해서).
- 글자 수 표시: 1MB 상한 안내 `hint` "마크다운. 최대 1MB." `TextAreaField`의 counter 형식(`현재/최대`)을 따르되 최대는 문자 수가 아니라 바이트 상한이므로 문구는 "n자"만 표시하고 상한은 hint로 안내한다(정확한 단위 판정은 개발자).

툴바 버튼(모두 `AdminButton`, 키보드 조작 가능):

| 버튼 | 동작 | 상태 |
| --- | --- | --- |
| 이미지 삽입 | 숨김 `input type="file"`을 `click()`. 허용 `image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif` | 업로드 중 `disabled` + 라벨 "업로드 중...". 저장 중에도 `disabled` |
| 작성 / 미리보기 (P1) | 탭 전환 | `aria-pressed` |

이미지 삽입 인터랙션 (요구사항 F8-2~4):

1. 사용자가 textarea에 커서를 두거나 선택 영역을 잡은 상태에서 "이미지 삽입" 클릭. 이때 `selectionEnd`를 기억한다(버튼 클릭으로 포커스가 이동해도 위치를 잃지 않도록).
2. 파일 선택 즉시 클라이언트 검증(형식, 빈 파일, 4MB), 통과하면 업로드 시작. 업로드 중 textarea는 잠그지 않고(`readOnly`로 바꾸면 접근성 상 읽기 전용 안내가 필요), 대신 **삽입 위치는 완료 시점의 커서**로 한다. 완료 시점에 textarea가 포커스를 잃은 상태이면 마지막으로 기억한 위치, 위치가 없으면 본문 끝에 삽입한다(F8-4).
3. 삽입 텍스트: `![파일명(확장자 제외)](url)`. 앞뒤가 줄 중간이면 앞뒤에 줄바꿈을 한 번씩 보강해 문단을 깨지 않게 한다. alt의 `[`, `]`, URL의 `)`, 공백은 이스케이프(F8 edge case).
4. 삽입 후 커서는 삽입 텍스트 뒤로 이동, textarea에 포커스를 돌려준다. 폼 `draft.content`가 갱신되어 저장 시 포함된다.
5. 선택 영역이 있으면 선택 끝에 삽입(선택 텍스트 보존, F8-2).
6. 성공 notice: "이미지를 본문에 넣었습니다. alt 텍스트를 확인하세요." (`FormActionBar` notice, 7절).
7. 실패(형식/크기/인증/네트워크): 본문 변경 없음, 같은 notice 영역에 오류. 같은 파일 재선택이 가능하도록 선택 후 input 값을 초기화한다(`ThumbnailField` 선례).
8. 업로드 연속 클릭: 업로드 중에는 버튼 `disabled`라 불가.
9. 업로드 중에는 폼 저장 버튼을 비활성화한다(`ThumbnailField`의 `onUploadStateChange` 패턴 재사용).

미리보기(P1): 본문 렌더 규칙은 공개 상세와 같은 4.2 타이포그래피 + 같은 정화 정책을 쓴다. 컨테이너는 `rounded-md border border-white/25 p-16`, 높이는 입력 영역과 같은 최소 높이. 빈 본문이면 "미리볼 내용이 없습니다."

### 6.5 .md 가져오기 (새 글 전용)

- 위치: 폼 최상단 `fieldset`/그룹. 제목 `p.text-small` ".md 가져오기", 설명 hint "frontmatter(title, categories, tags, published)와 본문을 폼에 채웁니다. 저장은 직접 눌러야 합니다."
- 컨트롤: 숨김 `input type="file" accept=".md,.markdown,text/markdown"` + 보이는 `AdminButton` "파일 선택". 선택한 파일명은 `p.text-small text-white/70`로 표시.
- 흐름:
  1. 파일 선택 후 검증(확장자, 크기 1MB, UTF-8 텍스트). 위반 시 폼 불변, 7절 notice에 오류.
  2. 폼에 이미 입력된 값(본문 포함)이 있으면 `ConfirmDialog`로 "입력한 내용이 .md 파일 내용으로 바뀝니다. 계속할까요?" 확인(F8-10). 확인 버튼 라벨은 기존 컴포넌트 기본값 사용.
  3. 확인 후 slug(파일명 규칙으로 제안, 편집 가능), 제목, 발행일(파일명/frontmatter `date`, 없으면 오늘), 카테고리, 태그, 공개 여부, 본문을 채운다. 존재하지 않는 값은 비워 두고 기존 입력도 지우지 않는다는 규칙은 두지 않는다: 가져오기는 위 항목을 파일 기준으로 모두 덮어쓴다(확인을 이미 거쳤으므로).
  4. 성공 notice: "파일을 불러왔습니다. 내용을 확인하고 저장하세요."
  5. frontmatter 파싱 실패: 본문 전체를 본문으로 채우고 경고 notice "frontmatter를 읽지 못해 전체를 본문으로 불러왔습니다."(7절).
- import 후에도 이미지는 자동 변환되지 않음을 hint 한 줄로 안내: "본문 이미지는 자동으로 올라가지 않습니다. 필요하면 본문의 이미지 삽입을 사용하세요."

## 7. 결과 피드백 위치

Bug Team 피드백(`2026-10-13-admin-save-feedback`) 반영. **블로그 폼의 모든 결과 notice는 `FormActionBar`(저장/취소/삭제 행동 버튼과 같은 영역)에 표시한다.**

- 대상 notice: 저장 성공, 검증 실패, slug 중복(409), 삭제 실패, 이미지 업로드 성공/실패, .md import 성공/경고/실패. 모두 `useAdminForm`의 `notice`(또는 같은 `Notice` 타입)로 흘려 `FormActionBar`에 전달한다.
- 이유: 본문 textarea가 수천 줄이어도 `FormActionBar`는 `sticky bottom-0`이라 항상 화면에 보인다. 폼 맨 위의 `FormStatus`는 긴 본문을 스크롤하면 화면 밖이다. 블로그 폼은 `FormStatus`를 상단에 렌더링하지 않는다.
- 현재 `FormActionBar`는 notice를 `aria-hidden`의 짧은 요약("저장됨" / "저장 실패 (상세는 위 알림 참고)")으로만 보여 주고, 상세는 상단 `FormStatus`에 있다. 블로그는 상단 `FormStatus`가 없으므로 이 요약이 상세 메시지를 대신할 수 없다. 따라서 `FormActionBar`는 다음 중 하나를 만족해야 한다(구현 방식은 개발자, 기존 호출부 회귀 금지).
  - 블로그 폼에 한해 `notice.message`(완료/오류 접두어 포함)와 `link`, `signOut` 액션을 액션 바 영역에 전부 표시하고, 성공은 `role="status"`, 오류는 `role="alert"`로 낭독한다. "(상세는 위 알림 참고)" 문구는 블로그 폼에서 쓰지 않는다.
  - 기존 폼(project, talk, profile, resume)은 상단 `FormStatus`를 유지하므로 낭독 중복이 없도록 기본 동작(요약 `aria-hidden`)을 바꾸지 않는다.
- 배치: 액션 바 안에서 notice는 버튼과 같은 행(`flex-wrap`)에 두고, 폭이 좁으면 버튼 위 줄로 감는다. 액션 바 높이가 늘어도 본문 입력이 가려지지 않도록 sticky 배경 `bg-black`을 유지한다. notice는 `text-small`, 성공/오류는 `완료:` / `오류:` 접두어로 구분(색 의존 금지, 기존 `FormStatus` 규칙).
- 필드 단위 오류(예: slug 중복, 제목 필수)는 필드 아래 `error`로도 보이지만, 필드가 화면 밖일 수 있으므로 같은 요지가 액션 바 notice에도 반드시 나온다(예: "오류: 입력 내용을 확인하세요. 이미 사용 중인 slug입니다.").
- 삭제 실패: `ConfirmDialog` 내부 오류 문구(대화상자가 열려 있는 동안)에 더해, 대화상자를 닫은 뒤에도 액션 바 notice에 "오류: 삭제하지 못했습니다. 다시 시도하세요."를 남긴다.
- 목록 화면의 "삭제했습니다."(`?deleted=1`)는 폼이 아닌 목록 상단 메시지로 허용(6.2).
- 접근성: 업로드 진행 중 상태 문구("이미지 업로드 중...")도 같은 액션 바 영역에 `role="status"`로 표시한다(진행/결과가 상태 문구로 전달, 요구사항 4절).
- 테스트 가능 기준(code-review/QA 확인용): 본문에 3,000줄을 입력하고 맨 위로 스크롤한 상태에서 저장 실패를 일으켰을 때, 추가 스크롤 없이 notice가 화면에 보여야 한다.

## 8. 컴포넌트 목록

| 컴포넌트 | 구분 | 위치(제안) | 재사용/신규 | 비고 |
| --- | --- | --- | --- | --- |
| `PageHeader` | 공개 | `common/page-header.tsx` | 재사용 | `/blog` 목록의 `h1` |
| `PostRow` | 공개 | `common/` | 신규 | 3.2. 행 단위 링크 |
| `Pagination` | 공개/admin | `common/` | 신규 | 3.5. admin도 같은 컴포넌트 재사용(`basePath`, `query` 지정) |
| 카테고리 필터 | 공개 | `common/` 또는 목록 페이지 내부 | 신규(단순 링크 목록) | 3.4 (P1) |
| 글 본문 래퍼 | 공개/admin | `common/` | 신규 | 4.2 타이포그래피를 한 곳에 모은 스타일 래퍼. 공개 상세와 admin 미리보기가 같은 것을 사용 |
| `TalkPreview` | 공개 | `common/talk-preview.tsx` | 재사용 | `/talks` 페이지에서 그대로 |
| `Navbar`, `Footer` | 공개 | `layout/` | 수정 | 5절 |
| `AdminNav` | admin | `admin/admin-nav.tsx` | 수정 | 탭 1개 추가 |
| `AdminPageHeader`, `AdminButton` | admin | `admin/` | 재사용 | 목록 헤더, 새 글, 툴바 버튼 |
| 블로그 목록 행 | admin | `admin/` | 신규(단순) | `SortableList` 미사용(6.2) |
| `BlogForm` | admin | `admin/` | 신규 | `TalkForm` 패턴 |
| `MarkdownEditor` | admin | `admin/` | 신규 | 6.4. `inputClassName`, 필드 셸 스타일 재사용 |
| `TextField`, `StringListEditor` | admin | `admin/` | 재사용 | slug, 제목, 발행일, 카테고리, 태그 |
| `FormActionBar`, `FormStatus` | admin | `admin/form-parts.tsx` | `FormActionBar` 확장 필요(7절), `FormStatus`는 블로그 폼에서 미사용 | 기존 폼 동작 불변 |
| `ConfirmDialog` | admin | `admin/confirm-dialog.tsx` | 재사용 | 글 삭제, .md 덮어쓰기 확인 |
| `ThumbnailField` | admin | `admin/thumbnail-field.tsx` | 참조만 | 업로드 상태/오류 처리 패턴과 `onUploadStateChange`를 따름 |

## 9. 상태 정리

| 화면 | 로딩 | 빈 | 에러 | 성공 |
| --- | --- | --- | --- | --- |
| 공개 /blog | 서버 렌더, 별도 UI 없음 | "아직 작성한 글이 없습니다." | Next 에러 경계 | 목록 + 건수 문구 + 페이지네이션 |
| 공개 /blog (필터) | 동일 | "이 카테고리에 글이 없습니다." + 전체 보기 | 동일 | 필터된 목록 |
| 공개 /blog/[slug] | 서버 렌더 | 본문 없음 문구 | 404 | 본문 |
| admin 목록 | 서버 렌더 | "작성한 글이 없습니다." + 새 글 버튼 | 인증 실패는 기존 admin 처리 | 목록, 삭제 후 "삭제했습니다." |
| admin 폼 저장 | 버튼 "저장 중..." 비활성, `aria-busy` | - | 액션 바 notice(7절) | 액션 바 notice |
| 이미지 업로드 | 버튼 "업로드 중...", 상태 문구 | - | 액션 바 notice | 본문에 삽입 + 액션 바 notice |
| .md import | - | - | 액션 바 notice, 폼 불변 | 폼 채움 + 액션 바 notice |
| 편집 대상 없음(404) | - | - | 액션 바 notice "글을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다." + 목록 링크(`notice.link`) | - |

## 10. 접근성과 반응형

접근성

- 페이지당 `h1` 하나: 목록은 `PageHeader`의 "blog", 상세는 글 제목. 본문 `#`는 `h2`로 강등되므로 제목 위계가 건너뛰지 않는다(`h2` > `h3` ...). 본문에서 `h1`이 나오지 않는다.
- 목록 행은 `li` 안의 단일 `Link`, 링크 텍스트에 날짜가 아닌 제목이 의미를 가지도록 DOM 순서는 제목 다음에 날짜가 오게 하고(시각 순서만 `order`로 날짜를 앞에 둠), 대안으로 날짜를 `time`으로 마크업하고 낭독 순서를 허용한다. 어느 쪽이든 링크 이름이 중복·과다하지 않게 한다.
- 페이지네이션: `nav` + `aria-label`, 현재 페이지 `aria-current="page"`, 비활성 이전/다음은 `aria-disabled`, 생략 기호 `aria-hidden`. 전부 키보드 포커스 가능한 링크, 포커스 링 `focus-visible:outline-2 focus-visible:outline-white`.
- 카테고리 필터: `nav aria-label="카테고리"`, 활성 `aria-current="page"`.
- 이미지: 모든 `img`에 의미 있는 alt(이관 규칙). admin 이미지 삽입 후 alt 확인 안내 notice 제공.
- 코드/표: 가로 스크롤 영역은 `tabindex=0`으로 키보드 스크롤 가능, 표에는 `scope` 사용(`th`).
- 색 대비: 본문 `text-white`(검정 배경), 보조 텍스트 최소 `text-white/50`은 날짜/메타에만 사용(기존 사이트 선례). 중요한 정보(오류 등)는 색이 아닌 접두어(`오류:`)로 구분.
- admin: 모든 입력에 `label`, 오류는 `aria-invalid` + `aria-describedby`(기존 `TextField`), 업로드/import/저장 결과는 `role=status`/`alert`(7절). 숨김 파일 input은 보이는 버튼으로 대체하되 버튼이 키보드/스크린리더로 조작 가능해야 한다(`ThumbnailField` 선례).
- `ConfirmDialog`의 기본 포커스는 취소(기존).
- 모션: 새 애니메이션 없음(`transition-opacity`만 기존과 동일).

반응형

| 요소 | 모바일(기본) | md(768px) 이상 |
| --- | --- | --- |
| 글 행 | 1열(날짜 위, 제목 아래) | 2열 `[160px_1fr]` |
| 본문 폭 | 전체 폭, 가로 패딩 `container-padding` | 읽기 폭 제한 |
| 코드 블록/표 | 가로 스크롤(블록 내부) | 동일 |
| 페이지네이션 | 번호 압축(앞뒤 1 + 처음/마지막), 줄바꿈 허용 | 동일 |
| navbar | 이름/링크 두 줄 구조 유지, 링크 6개 폭 확인 | 한 줄 |
| admin 폼 | 1열, 액션 바 sticky 하단, notice 줄바꿈 | 동일 |
| 에디터 | 작성/미리보기 탭, textarea 전체 폭 | 동일(분할 없음) |

## 11. 개발자에게 넘기는 확인점

1. 코드 문법 강조의 색: 기본안은 흑백 계열(불투명도, 굵기, 기울임)만 쓰는 것이다. 컬러 테마가 필요하다고 판단되면 임의 결정하지 말고 orchestrator를 통해 사용자 확인 후 `@theme` 토큰으로 추가한다. 이 사이클에서 확정된 색은 없다.
2. `FormActionBar`의 notice 전체 표시(7절): 기존 4개 폼의 낭독/표시가 바뀌지 않게 옵션 방식으로 확장한다. 기존 폼의 상단 `FormStatus` 제거는 이번 사이클 범위 밖(`feature/admin-form-feedback-guard` 대상).
3. `TextAreaField`에 `ref` 전달을 추가할지, 별도 에디터 컴포넌트를 둘지는 개발자 선택이다. 기존 `TextAreaField` 호출부 회귀 금지.
4. 발행일 입력을 텍스트(`YYYY.MM.DD`)로 할지 네이티브 `date`로 할지: 기본안은 기존 talks와 같은 텍스트 입력, 파싱/포맷은 서비스 규칙에 맞춘다. 네이티브 `date`로 바꾸면 `TextField` 타입 확장이 필요.
5. 본문 읽기 폭 `max-w-800` 및 목록 날짜 열 `160px`은 1회성 값이다. 토큰화 여부를 `tailwind.md` 기준으로 검토.
6. navbar 링크 6개의 320px/375px 폭 확인과 `blog`/`talks` 순서 확인.
7. 상세 `h1`에 쓸 크기 토큰은 `globals.css`의 `text-h*` 정의를 확인해 정한다(새 크기 토큰 추가 금지).
8. 업로드 중 삽입 위치는 "완료 시점의 커서, 없으면 마지막 기억 위치, 없으면 끝"으로 설계했다. 다른 방식(업로드 중 textarea 잠금)을 택하면 구현 문서에 사유를 남긴다(요구사항 F8 edge case).
9. 이탈 보호(`beforeunload`)는 권장이며 필수가 아니다. 적용 시 기존 `useLeaveGuard` 재사용 가능 여부를 먼저 확인한다.
10. 공개 목록 구분선(`divide-white/10`)과 이전/다음 비활성 표현은 이 문서의 결정이며 기존 about 사이클에는 없던 패턴이다. 문제가 있으면 이 문서를 갱신하고 임의 변경하지 않는다.
