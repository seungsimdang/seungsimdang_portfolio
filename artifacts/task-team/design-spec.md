# design-spec: 블로그 포스트 검색 (T03)

- 입력: `artifacts/task-team/requirements.md` (0장 확정 결정, AC1~AC37)
- 작업 브랜치: `feature/blog-search`
- 표기: [사실] 기존 코드에서 확인, [제안] 이 문서의 설계 판단, [추측] 코드로 확인하지 못한 값이라 구현 시 검증 필요, [확인 필요] 사용자 결정 항목
- 이 문서는 UX/UI 명세다. 데이터 패칭 방식(react-query, 새 GET API 경로)은 T04 설계 범위이며 여기서는 화면 동작만 정의한다.

## 1. 기존 UI에서 확인한 사실

- [사실] 공개 `/blog` 구조: `PageHeader` 다음 `section.w-full.max-w-content.mx-auto.container-padding.py-40.md:py-48.lg:py-64` 안에 `div.space-y-32.md:space-y-40`. 순서는 `.posts` 헤딩 행(`text-small`, `h-px bg-white/25`), `CategoryTabs`, 목록 또는 빈 상태.
- [사실] 빈 상태(공개): `div.space-y-12` 안에 `p.text-body.text-white/50` + `Link.text-small.underline`("전체 보기", `prefetch={false}`). 관리자는 `p.text-body.opacity-70` + `Link.text-small.underline`.
- [사실] 개수 줄(공개): `p.text-small.text-white/50`, 목록은 그 아래 `ul.mt-16.divide-y.divide-white/10`. 관리자는 `p.mb-8.text-small.text-white/50`, `ul.divide-y.divide-white/10.border-y.border-white/10`.
- [사실] 입력 스타일 선례: `src/components/admin/text-fields.tsx`의 `inputClassName` = `min-h-44 w-full rounded-md border border-white/25 bg-transparent px-12 py-8 text-body text-white focus-visible:outline-2 focus-visible:outline-white ...`. `text-body`는 1rem이라 iOS 입력 확대 문제가 없다.
- [사실] 포커스 링은 전부 `focus-visible:outline-2 focus-visible:outline-white`, 터치 영역은 `min-h-44`(데스크톱 `md:min-h-0` 사용 사례 있음)다.
- [사실] 색은 `white` 투명도(`/10`, `/25`, `/50`)와 `danger` 토큰만 쓴다. 오류 표시에 `text-danger`는 쓰지 않는다. `FieldShell`도 오류를 일반 텍스트 `오류: ...`로 표시하고 `text-danger`는 글자 수 초과에만 쓴다. 검색 오류는 `text-danger`를 쓰지 않고 `text-white/50` 이상의 일반 톤 + 문구로 구분한다 [제안].
- [사실] `src/components/common/`에는 검색 입력, 모달, 드롭다운, 스위치, 툴팁 등 인터랙티브 공통 컴포넌트가 없다(Glob 확인: `back-link`, `category-tabs`, `external-link`, `hero-section`, `markdown-body`, `page-header`, `pagination`, `post-row`, `project-card`, `resume-section`, `talk-preview`, `word-cycler`). `src/components/admin/`에는 `admin-button`, `confirm-dialog`, `text-fields` 등이 있으나 검색 입력과 맞지 않는다.
- [사실] `CategoryTabs`, `Pagination`, `PostRow`는 hook이 없다.
- [미확인] `src/components/ui/button.tsx` 내용은 읽지 않았다. 아래 "다시 시도" 버튼은 기존 링크 톤(`text-small underline`)에 맞춰 설계했으므로 의존하지 않는다.
- [미확인] `admin-console-shell.tsx`의 콘텐츠 최대 너비는 읽지 않았다. 관리자 입력 폭은 아래 "폭" 항목을 구현 시 확인한다.

## 2. 사용자 흐름

1. `/blog` 진입 (초기). `?q=`가 있으면 입력창에 정규화된 q가 채워지고 해당 결과가 첫 HTML에 포함된다(AC20, AC21).
2. 사용자가 입력 -> 300ms 대기 -> URL의 `q` 갱신(replace, `page` 제거) -> 결과 갱신.
3. 결과가 있으면 개수 줄 + 목록 + `Pagination`, 없으면 0건 안내 + 검색 초기화 링크.
4. 카테고리 탭 클릭은 페이지 이동(링크)이며 현재 `q`를 유지한다(AC27). 입력 중에도 탭의 `q`는 URL 기준이다.
5. 입력 지우기/Esc/입력 비움은 `q`를 URL에서 제거하고 전체 목록(또는 선택된 카테고리 목록)으로 돌아간다(AC18).

## 3. 배치

### 3.1 공개 `/blog`

검색 블록은 `.posts` 헤딩 행과 `CategoryTabs` 사이에 둔다 [제안]. 검색은 범위를 가장 크게 좁히는 도구이고 카테고리는 그 결과를 다시 좁히는 탭이라, 위에서 아래로 "검색 -> 카테고리 -> 결과" 순서가 된다.

```
section (기존 padding 유지)
  div.space-y-32.md:space-y-40 (기존)
    .posts 헤딩 행 (기존)
    [신규] BlogSearchBox
    CategoryTabs (기존, categories가 없으면 null)
    결과 영역 (BlogSearchResults)
```

| 구간 | 배치 |
| --- | --- |
| 모바일 (<768px, Tailwind 기본 `md` 기준) | 입력 `w-full`. 지우기 버튼은 입력 안 오른쪽. 높이 `min-h-44`. |
| 태블릿 (md 이상, 768px~) | 입력 폭을 제한: `md:max-w-480` [추측: v4에서 `max-w-<숫자>`가 `--spacing: 1px` 기준 480px로 해석되는지 구현 시 확인]. 좌측 정렬. |
| 데스크톱 (lg 이상, 1024px~) | 태블릿과 동일 (폭 480px, 좌측 정렬). 별도 breakpoint 규칙을 추가하지 않는다. |

- 기존 Framer 브레이크포인트(`container-padding`의 810/1024/1440)는 건드리지 않는다. 입력은 이미 `container-padding` 안에 있으므로 별도 좌우 여백이 없다.
- 입력 블록과 `CategoryTabs` 사이 간격은 부모 `space-y-32 md:space-y-40` 그대로 쓰면 둘이 너무 멀다. 검색과 탭을 하나로 묶고 내부 간격을 `space-y-16 md:space-y-20`으로 둔다 [제안, 기존 코드에서 쓰이는 px 값 16/20 재사용].

### 3.2 관리자 `/admin/blog`

```
AdminPageHeader (기존, "새 글" 버튼 유지)
[신규] div.mb-16 > BlogSearchBox
div.mb-32 > CategoryTabs (기존, 카테고리가 있을 때만)
결과 영역 (BlogSearchResults)
```

- 검색 블록은 카테고리가 0개여도 항상 표시한다. 기존 `categories.length > 0 &&` 분기는 탭 래퍼에만 적용된다.
- 반응형은 공개와 같다: 모바일 `w-full`, `md` 이상 `md:max-w-480` 좌측 정렬 [추측: 관리자 콘텐츠 폭 미확인].
- "새 글" 버튼과 목록 행 마크업은 변경하지 않는다(AC33).
- 사이 간격 `mb-16`은 [제안]이며 기존 탭 래퍼 `mb-32`는 유지한다.

### 3.3 공용화 판단

- 입력 블록(`BlogSearchBox`)과 결과 영역(`BlogSearchResults`)은 공개/관리자가 같은 동작이므로 `src/components/common/`에 하나씩 둔다. 차이는 prop(`basePath`, `variant`)으로만 만든다.
- `inputClassName`은 `src/components/admin/text-fields.tsx`에서 export되지만 admin 전용 모듈이다. common이 admin을 import하지 않도록 같은 클래스 값을 `blog-search-box.tsx` 안에 정의하고(값 복제), 중복이 문제면 T05에서 공통 위치로 옮길지 판단한다 [제안].
- Radix UI는 필요 없다. 이유: 이번 UI는 일반 `input`, `button`, `a`로 충분하며 모달, 드롭다운, 선택 입력, 체크박스, 스위치, 툴팁이 없다.

## 4. 컴포넌트 목록

모든 파일명은 kebab-case.

| 컴포넌트 | 경로 | 서버/클라이언트 | 역할 |
| --- | --- | --- | --- |
| `BlogSearchBox` | `src/components/common/blog-search-box.tsx` | 클라이언트 (`"use client"`) | `role="search"` 래퍼 + label + `input type="search"` + 지우기 버튼. debounce, IME, URL replace 담당. |
| `BlogSearchResults` | `src/components/common/blog-search-results.tsx` | 클라이언트 (`"use client"`) | 개수 줄, 목록, 로딩, 0건, 오류, `Pagination`, sr-only 알림 영역. 데이터 연결 방식은 T04. |
| `AdminPostRow` | `src/components/admin/admin-post-row.tsx` | hook 없음, 클라이언트 번들에 포함 | `admin/(console)/blog/page.tsx` 인라인 `li`를 마크업 변경 없이 추출. `BlogSearchResults`의 admin 행으로 사용(AC33). |
| `CategoryTabs` (수정) | 기존 `src/components/common/category-tabs.tsx` | 서버 유지 | 새 prop `query?: Record<string, string>`으로 `q` 유지. 빈 객체/미지정이면 기존 동작. |
| `Pagination` (수정 없음) | 기존 `src/components/common/pagination.tsx` | 유지 | `query`에 `{ category?, q? }`를 호출부가 구성. |
| `PostRow` (재사용) | 기존 `src/components/common/post-row.tsx` | 유지 | 공개 행. |

### 4.1 `BlogSearchBox` props

| prop | 타입 | 설명 |
| --- | --- | --- |
| `basePath` | `string` | `"/blog"` 또는 `"/admin/blog"`. URL replace 대상 경로. |
| `query` | `string` | 서버가 URL에서 해석한 정규화된 q. 입력 초기값과 URL 동기화 기준. |
| `category` | `string \| undefined` | 선택된 카테고리. replace 시 URL에 유지. |

- 라벨, placeholder, maxLength(100)는 컴포넌트 내부 고정이라 prop으로 받지 않는다.
- `query` prop이 바뀌면(뒤로/앞으로가기, 초기화 링크 클릭) 입력창 값을 그 값으로 동기화한다. 단, 자신의 replace로 생긴 변경이거나 IME 조합 중이면 덮어쓰지 않는다.

### 4.2 `BlogSearchResults` props

| prop | 타입 | 설명 |
| --- | --- | --- |
| `variant` | `"public" \| "admin"` | 행 컴포넌트(`PostRow` / `AdminPostRow`), 빈 상태 문구 톤(`text-white/50` / `opacity-70`), `Pagination` label, `prefetch={false}` 적용 여부(공개와 admin의 기존 값 유지)를 결정. |
| `basePath` | `string` | `Pagination`, 초기화 링크 경로. |
| `query` | `string` | 정규화된 q. 빈 문자열이면 검색 아님. |
| `category` | `string \| undefined` | 선택된 카테고리. |
| `page` | `number` | 현재 페이지. |

- `q`가 비어 있으면 기존 문구와 기존 마크업 그대로 렌더한다(AC30, AC34). 즉 이 컴포넌트가 비검색 상태의 목록도 같은 모양으로 그린다.

## 5. 상태별 화면

개수 줄, 목록, `Pagination`의 클래스와 간격은 4장 사실 항목의 기존 값을 그대로 쓴다.

### 5.1 초기 (q 없음)

- 입력창 비어 있음, placeholder 표시, 지우기 버튼 없음.
- 아래는 현행 `/blog`, `/admin/blog`와 동일(개수 줄 `총 N개 중 a-b번째`, 목록, `Pagination`).

### 5.2 초기 (q 있음, 직접 진입)

- 입력창에 정규화된 q가 채워져 있다. 지우기 버튼 표시.
- 결과 영역은 결과 상태(5.5) 또는 0건(5.6)으로 첫 HTML에 포함(AC21).
- 포커스는 자동으로 입력에 주지 않는다(스크린리더 사용자가 페이지 제목부터 읽도록).

### 5.3 입력 중 (debounce 대기)

- 입력창은 즉시 입력값을 반영한다.
- 지우기 버튼은 입력값이 1자 이상이면 즉시 나타난다.
- 결과 영역은 시각적으로 변하지 않는다(요청 전). 로딩 표시도 아직 켜지 않는다.
- IME 조합 중에도 동일. 조합이 끝난 시점부터 300ms 카운트(6장).

### 5.4 로딩 (요청 진행 중, 이전 결과 유지)

- 이전 결과(개수 줄, 목록, `Pagination`)를 그대로 둔다. 목록 영역에 `opacity-50`을 적용한다 [제안: 기존 코드에서 쓰는 투명도 값]. 새 애니메이션, spinner, skeleton은 추가하지 않는다(Framer 애니메이션 보존 원칙, 검증된 아이콘 없음).
- 개수 줄 자리에 `검색 중...` 문구를 `text-small text-white/50`로 표시한다(이전 개수 줄을 대체). 이전 결과가 없는 첫 요청이면 목록 자리에도 같은 문구만 표시.
- 결과 영역 래퍼에 `aria-busy="true"`. 이 상태에서는 sr-only 알림을 내보내지 않는다(키 입력마다 낭독되는 소음 방지, 결과 도착 시에만 알림).
- 로딩 표시 지연(예: 150ms 후 표시)은 두지 않는다. 필요하면 T05 이후 판단 [제안].
- 응답이 느려 입력값이 다시 바뀌면 이전 요청 결과는 버리고 최신 입력의 결과만 표시한다(AC22).

### 5.5 결과 있음

- 개수 줄(`text-small text-white/50`): 형식은 0장 4번, AC28.
  - 카테고리 없음: `"{q}" 검색 결과 총 N개 중 a-b번째`
  - 카테고리 있음: `{카테고리} 카테고리 "{q}" 검색 결과 총 N개 중 a-b번째`
  - q 없음(기존 유지): `총 N개 중 a-b번째`, 카테고리 있으면 `{카테고리} 카테고리 총 N개 중 a-b번째`
- `{q}`는 정규화된 값(trim, 공백 축약, 100자 절단 후)을 쓴다. 입력창의 원문이 아니라 URL 기준이다. 길 때를 대비해 개수 줄에 `break-words`를 적용한다 [제안].
- 목록: 공개는 `PostRow`, 관리자는 `AdminPostRow`. 기존 `ul` 클래스 유지.
- `Pagination`: 총 페이지가 2 이상일 때만(기존 동작). `query`는 `{ category?, q? }`, 값이 있는 키만 포함.

### 5.6 0건

- 목록과 `Pagination`은 렌더하지 않는다(AC29).
- 구조: `div.space-y-12` > `p.text-body`(공개 `text-white/50`, 관리자 `opacity-70`) + `Link.text-small.underline`.
- 문구:
  - 카테고리 없음: `"{q}"에 대한 검색 결과가 없습니다.`
  - 카테고리 있음: `{카테고리} 카테고리에서 "{q}"에 대한 검색 결과가 없습니다.`
- 링크 문구: `검색 초기화`. href는 `q`만 제거하고 `category`는 유지: `basePath` 또는 `basePath?category=...`(`encodeURIComponent`). 공개 링크는 `prefetch={false}`(기존과 동일), 관리자는 기존처럼 prefetch 생략.
- q가 있는 0건에서는 기존 "전체 보기" 링크를 표시하지 않는다(링크 2개가 혼동됨). 하나의 링크만 둔다.
- 링크 클릭 후 입력창은 비워지고 포커스가 입력창으로 이동한다(7장).

### 5.7 오류 (요청 실패)

- 이전 결과는 숨긴다(현재 q와 일치하지 않는 목록이 보이면 오해를 준다). 입력값은 그대로 유지(AC24).
- 구조는 0건과 같다: `div.space-y-12` > `p.text-body`(`role="alert"`) + `button.text-small.underline`.
- 문구: `검색 결과를 불러오지 못했습니다.` / 버튼 `다시 시도`.
- 버튼 스타일: 링크 톤에 맞춰 `text-small underline min-h-44 focus-visible:outline-2 focus-visible:outline-white` (버튼은 `type="button"`) [제안].
- 재시도 클릭 시 로딩 상태(5.4)로 전환. 로딩 중에는 버튼을 숨긴다.
- 입력을 다시 바꾸면 새 요청으로 오류가 해제된다.
- `text-danger` 토큰은 쓰지 않는다. 이유: `tailwind.md`는 `--danger`를 삭제/오류 지시색으로 정의하고 있어 쓸 수는 있으나, 기존 admin 오류 표시가 일반 텍스트 + `오류:` 접두라서 같은 톤을 따른다 [제안, 사용자가 원하면 변경].

### 5.8 카테고리 + 검색 조합

- URL: `?category=X&q=Y[&page=n]`.
- 개수 줄, 0건 문구에 카테고리명이 들어간다(5.5, 5.6).
- 탭 링크: `전체`는 `basePath?q=Y`, 카테고리는 `basePath?category=X&q=Y`. 활성 탭 표시(`aria-current="page"`, `underline opacity-100`)는 기존 그대로.
- 입력 변경 시 `category`는 URL에 유지되고 `page`만 제거(AC16, AC19).
- 선택된 카테고리와 검색이 모두 있는 상태에서 입력을 지우면 `?category=X`로 돌아간다.

### 5.9 입력 제한 표시

- `maxLength={100}`(AC6). 글자 수 카운터는 표시하지 않는다(검색 입력에 과함). 100자에 도달하면 브라우저가 추가 입력을 막는다.
- [추측] 붙여넣기 시 브라우저의 UTF-16 단위 절단과 서버의 문자 단위 절단이 이모지 등에서 다를 수 있다. 서버가 항상 재절단하므로 표시만 미세하게 다를 수 있음.

## 6. 인터랙션 명세

| 항목 | 동작 |
| --- | --- |
| debounce | 마지막 입력 후 300ms 지나면 URL과 요청을 갱신. 연속 입력 중간 값으로는 요청 없음(AC14). 입력이 바뀔 때마다 대기 타이머를 다시 시작. |
| IME | `compositionstart` ~ `compositionend` 사이에는 타이머를 시작하지 않고 URL, 요청도 갱신하지 않음. `compositionend`의 값으로 300ms 카운트 시작(AC15). 조합 중에는 지우기 버튼 노출은 값 기준으로 유지. |
| 정규화 전 비교 | 입력값(trim, 공백 축약 후)이 현재 URL의 q와 같으면 URL 갱신과 요청을 하지 않음. 예: 공백만 추가한 입력. |
| 빈 값 | 입력이 trim 후 비면 `q`를 URL에서 제거(전체 목록 경로). 별도의 빈 검색 요청 없음(AC18). 빈 값 전환은 debounce를 기다린다. 단, 지우기 버튼/Esc는 즉시 처리(아래). |
| URL 갱신 | 항상 replace. 히스토리 항목이 쌓이지 않음(AC17). `page`는 제거, `category`는 유지. |
| 지우기 버튼 | 입력에 값이 있을 때만 표시. 클릭 시 입력값 즉시 비움, 대기 중인 debounce 취소, `q`를 즉시 URL에서 제거, 포커스를 입력창으로 이동. |
| Esc | 입력에 포커스가 있고 값이 있으면 지우기 버튼과 동일하게 동작. 값이 없으면 아무것도 하지 않음. IME 조합 중(`event.nativeEvent.isComposing`)에는 무시. 브라우저 기본 search 입력의 Esc 동작과 이중 실행되지 않도록 `preventDefault` 처리. |
| Enter | 폼 제출 없음(제출형 form이 아님). 즉시 검색도 하지 않는다. 이유: AC14가 debounce 이전 요청을 금지한다. 모바일 키보드 힌트는 `enterKeyHint="search"`를 둔다. |
| 뒤로/앞으로가기 | URL의 q가 바뀌면 입력창을 그 값으로 동기화하고 결과도 URL 기준으로 표시. 대기 중이던 debounce 타이머는 취소(AC20). |
| 카테고리 탭, 페이지 링크 클릭 | 대기 중인 debounce가 있으면 입력의 최종값이 URL과 다를 수 있다. 링크 이동 시 이동한 URL이 우선이며 입력창은 새 URL의 q로 동기화된다. |
| 요청 경합 | 최신 입력의 응답만 표시(AC22). |

### 포커스 관리

- 타이핑 중 결과가 바뀌어도 포커스는 입력창에 남는다. 결과 영역으로 자동 이동하지 않는다.
- 지우기 버튼 클릭/Esc 후: 입력창에 포커스. (버튼이 사라지므로 포커스가 body로 빠지는 것을 방지)
- `검색 초기화` 링크 클릭 후: 입력창으로 포커스 이동 [제안].
- `다시 시도` 성공 후: 오류 블록이 사라지므로 입력창으로 포커스 이동 [제안].
- 페이지 이동(`Pagination`)은 기존 동작 유지.
- 지우기 버튼은 Tab 순서에서 입력 다음, `CategoryTabs` 앞이다(DOM 순서와 시각 순서 일치).
- 입력창은 자동 포커스(`autoFocus`)하지 않는다.

## 7. 접근성

| 항목 | 명세 |
| --- | --- |
| 래퍼 | `div role="search"` (제출형 form이 아니므로) + `aria-label` 불필요(랜드마크 이름은 label로 충분하지 않으므로 `aria-label="블로그 검색"` 부여) [제안]. |
| label | 연결된 `<label htmlFor>`, 문구 `블로그 글 검색`. 시각적으로는 숨기고(`sr-only`) placeholder는 보조일 뿐 label을 대체하지 않는다(AC13). |
| 입력 | `type="search"`, `name="q"`, `autoComplete="off"`, `enterKeyHint="search"`, `maxLength={100}`, `spellCheck={false}` [제안]. |
| placeholder | `제목, 본문 검색` (`placeholder:text-white/50` [추측: 기존 코드에서 placeholder 변형 사용 여부 미확인]). |
| 지우기 버튼 | `type="button"`, `aria-label="검색어 지우기"`, 눈에 보이는 텍스트는 `지우기`(`text-small`), 터치 영역 `min-h-44 min-w-44`. 아이콘(x)은 사용하지 않는다(확정된 아이콘 없음). 브라우저 기본 search 취소 버튼은 숨겨 중복을 막는다 [구현 방법은 T05, 예: webkit 의사 요소 처리, 추측]. |
| 결과 알림 | 항상 마운트된 sr-only `div role="status" aria-live="polite" aria-atomic="true"`. 결과가 도착해 확정된 시점에만 텍스트를 갱신(로딩 중 갱신 금지). 문구는 아래 8장. |
| 로딩 | 결과 영역 래퍼 `aria-busy="true"`(AC23). |
| 오류 | 오류 `p`에 `role="alert"`(즉시 낭독). |
| 개수 줄 | 시각용. 낭독 중복을 피하기 위해 sr-only 알림과 같은 내용을 두 번 읽지 않도록 개수 줄은 `aria-hidden`을 쓰지 않고, 알림 문구를 개수 줄보다 짧게(범위 생략) 둔다 [제안]. |
| 대비 | 기존과 같은 `white`/`white/50`/`white/25` 조합. 새 색 없음. |
| 키보드 | 모든 요소 Tab 접근 가능, 포커스 링은 `focus-visible:outline-2 focus-visible:outline-white`. |
| 모션 | 새 애니메이션 없음. `prefers-reduced-motion` 대응 불필요. |
| 터치 | 입력 `min-h-44`, 지우기와 재시도 버튼 `min-h-44`. 입력 폰트 `text-body`(16px)라 iOS 자동 확대 없음. |

## 8. 문구 확정안

| 위치 | 문구 |
| --- | --- |
| label (sr-only) | `블로그 글 검색` |
| 랜드마크 `aria-label` | `블로그 검색` |
| placeholder | `제목, 본문 검색` |
| 지우기 버튼 | 보이는 텍스트 `지우기`, `aria-label` `검색어 지우기` |
| 로딩 | `검색 중...` |
| 개수 (카테고리 없음) | `"{q}" 검색 결과 총 N개 중 a-b번째` |
| 개수 (카테고리 있음) | `{카테고리} 카테고리 "{q}" 검색 결과 총 N개 중 a-b번째` |
| 0건 (카테고리 없음) | `"{q}"에 대한 검색 결과가 없습니다.` |
| 0건 (카테고리 있음) | `{카테고리} 카테고리에서 "{q}"에 대한 검색 결과가 없습니다.` |
| 0건 링크 | `검색 초기화` |
| 오류 | `검색 결과를 불러오지 못했습니다.` |
| 재시도 | `다시 시도` |
| sr-only 알림 (결과) | `"{q}" 검색 결과 N개` (카테고리 있으면 앞에 `{카테고리} 카테고리 `) |
| sr-only 알림 (0건) | 0건 문구와 동일 |
| sr-only 알림 (검색 해제) | `검색을 해제했습니다. 총 N개` |
| q 없는 기존 문구 | `아직 작성한 글이 없습니다.`, `이 카테고리에 글이 없습니다.`, 관리자 `작성한 글이 없습니다.`, `전체 보기` 모두 그대로(AC30) |

- 따옴표는 직선 큰따옴표(`"`)를 쓴다(0장 4번 표기 그대로).
- 문구에 em-dash를 쓰지 않는다.

## 9. 구현 시 확인할 사항 (T04, T05 전달)

1. `md:max-w-480`이 `--spacing: 1px` 기준으로 480px가 되는지, 관리자 콘텐츠 폭 안에서 어울리는지 [추측].
2. `placeholder:` 변형과 search 취소 버튼 숨김은 기존 코드에서 사용례를 확인하지 못했다. 빌드와 화면에서 검증.
3. `AdminPostRow` 추출은 마크업과 클래스가 기존과 같아야 한다(AC33). 클라이언트 컴포넌트가 import하는 파일은 `server-only`를 포함하면 안 된다.
4. 로딩 중 개수 줄을 `검색 중...`으로 바꾸는 것과 `aria-busy` 동작은 데이터 패칭 방식(T04)이 정해진 뒤 상태 소스(pending, error, data)에 맞춰 연결한다.
5. 서버 페이지가 `searchParams` 변경으로 재렌더될 때 입력창이 리마운트되지 않아야 한다(포커스, IME 상태 유지). `BlogSearchBox`가 페이지 렌더 사이에 유지되는 위치에 있어야 한다.
6. 검색 해제 알림(`검색을 해제했습니다.`)은 q가 있다가 없어지는 전환에서만 낸다.

## 10. 사용자 확인 필요 항목

없음. 위 [제안] 값(검색 위치, 폭 480px, `opacity-50` 로딩 표시, 일반 톤 오류 표시)은 구현 후 화면 확인 단계에서 조정 가능하다.
