# requirements: 블로그 포스트 검색 (rev.2, 사용자 결정 반영)

- 입력: `artifacts/task-team/00-input.md`
- 작업 브랜치: `feature/blog-search`
- 표기: [사실] 코드/문서에서 확인, [권장] 근거 있는 제안, [확인 필요] 추측이라 사용자 결정이 필요한 항목, [미확인] 이번 조사에서 확인하지 못한 항목

## 0. 사용자 결정 (확정)

1. 검색 대상: 제목+본문 (`title`, `content`).
2. 범위: 공개 `/blog` + 관리자 블로그 목록(`/admin/blog`) 둘 다.
3. 동작: 입력 중 자동 검색(debounce). 제출형 GET form이 아니다. 데이터 패칭은 `@tanstack/react-query` + `@suspensive/react-query`의 `QueriesHydration`(서버 prefetch 후 hydrate) 패턴과 axios 클라이언트 도입을 "검토한 뒤" 작업한다. 검토 결과는 6장.
4. 이전 제안안 승인: 100자 절단, 최소 1자, 구절 일치, 개수 문구 `"{q}" 검색 결과 총 N개 중 a-b번째`, 0건 시 결과 없음 문구 + 초기화 링크, 인덱스는 별도 작업.
5. 카테고리 탭 이동 시 `q` 유지, debounce 300ms, 0건 화면 초기화 링크는 `category` 유지하고 `q`만 제거.
6. 라이브러리 호환성은 context7로 사전 확인 후 작업 (6.1 참고). 설치 후 type-check/빌드에서 막히면 대안으로 자동 전환하지 않고 중단 후 사용자에게 보고.
7. 검색 읽기 호출은 axios 인스턴스 사용 (기존 `admin-request.ts`는 유지).
8. 공개 `/blog`에서 `q`가 있으면 `robots: noindex`를 추가. `q`가 없으면 현행 메타데이터 유지.
9. 관리자 검색 API 경로(기존 `admin/posts/route.ts`에 GET 추가 대 별도 경로)는 T04 설계에서 결정.

## 1. 코드에서 확인한 사실

- [사실] 공개 `/blog`(`src/app/(public)/blog/page.tsx`)는 서버 컴포넌트이며 `searchParams`의 `page`, `category`만 읽고 `listPosts`, `listCategories`를 직접 호출한다.
- [사실] `listPosts(page, pageSize, category)`(`src/services/blog/blog-service.ts`)는 `react` `cache`로 감싸져 있고 `server-only`다. 범위 초과 `page`는 마지막 페이지로 보정한다. 정렬은 `published_at desc, slug desc`. 공개(20건)와 관리자(50건) 목록이 함께 쓴다.
- [사실] `posts` 컬럼: `slug, title, content(최대 300,000자), categories[], tags[], published_at, created_at, updated_at`. 요약 컬럼은 없다. 목록 쿼리는 `content`를 select하지 않는다.
- [사실] `normalizeCategoryParam`(배열이면 첫 값, trim, NFC, 50자 초과는 필터 없음)이 쿼리 해석 선례다.
- [사실] `CategoryTabs`는 링크에 `category`만 붙이고 다른 쿼리를 유지하지 않는다. `Pagination`은 `query` prop으로 쿼리를 유지하며 hook 없는 Link 기반 컴포넌트다.
- [사실] 관리자 목록(`src/app/admin/(console)/blog/page.tsx`)은 `requireAdminPage()` 후 같은 `listPosts`와 `CategoryTabs`, `Pagination`을 사용한다.
- [사실] `package.json`: `axios ^1.20.0`은 이미 의존성, `next 16.3.6`, `react 19.3.0`, `typescript 7.0.2`, `knip`, `react-doctor` 사용. `@tanstack/*`, `@suspensive/*`는 없다(`node_modules/@tanstack`, `node_modules/@suspensive` 글롭 결과 없음).
- [사실] `src/app/api` 아래에는 `admin/*`와 `auth/[...nextauth]`만 있다. 공개 API Route Handler는 없다. `admin/posts/route.ts`, `admin/posts/[slug]/route.ts`가 존재한다(내용은 읽지 않음).
- [사실] 관리자 클라이언트 요청은 `src/lib/admin-client/admin-request.ts`의 `adminRequest(method: "POST" | "PUT" | "DELETE", ...)`가 네이티브 `fetch`로 처리한다. GET은 지원하지 않는다.
- [미확인] `src` 안에서 axios가 `HttpStatusCode` enum 외 용도로 쓰이는지는 내용 검색 도구가 없어 직접 확인하지 못했다. `project-structure.md` 4번 규칙(HttpStatusCode 사용)과 요청자 확인으로는 enum 용도로만 쓰는 것으로 보인다.
- [사실] `docs/agent-rules/nextjs.md` 5번: 읽기는 서버 컴포넌트에서 `services/`를 직접 호출하고 자신의 Route Handler를 HTTP로 다시 호출하지 않는다. 6번: Route Handler GET에 DB write 금지.

## 2. 모호 항목 결정 요약

| 항목 | 결정 |
| --- | --- |
| 1 위치 | 공개 `/blog` + `/admin/blog` (사용자 결정) |
| 2 대상 | `title` + `content`, 대소문자 무시 부분 일치 (사용자 결정) |
| 3 결합 | 카테고리와 AND, 검색어가 바뀌면 page 제거(1페이지), 페이지/카테고리 링크는 `q` 유지 |
| 4 방식 | 입력 중 자동 검색(debounce), URL `?q=`와 동기화, 데이터는 6장 검토안 |
| 5 처리 | trim, NFC, 연속 공백 축약, 대소문자 무시, 최소 1자, 최대 100자(절단), 구절 일치, 결과 없음/개수 문구는 4장 |

## 3. 기능 분해와 우선순위

| ID | 기능 | 우선순위 |
| --- | --- | --- |
| F1 | 검색어 해석 (배열이면 첫 값, trim, NFC, 공백 축약, 100자 절단, LIKE 이스케이프) | P0 |
| F2 | `listPosts`에 검색어 조건 추가 (카테고리와 AND, total/totalPages에 동일 조건) | P0 |
| F3 | 공개 검색 데이터 경로 (클라이언트가 호출할 읽기 전용 GET, 6장) | P0 |
| F4 | 공개 `/blog` 검색 입력 UI + debounce 자동 검색 + URL `q` 동기화 | P0 |
| F5 | 서버 prefetch + hydrate로 `?q=` 직접 진입 시 첫 응답에 결과 포함 | P0 |
| F6 | 관리자 `/admin/blog` 검색 (F1~F5와 같은 동작, 인증 보호 경로 사용) | P0 |
| F7 | 페이지네이션/카테고리 탭이 `q` 유지 | P0 |
| F8 | 로딩/에러/결과 없음/개수 안내 문구 | P1 |
| F9 | 접근성 (label, 결과 갱신 알림, IME) | P1 |

### props/값 전달

- `CategoryTabs`: 새 prop `query?: Record<string, string>`. 호출부(공개/관리자 목록)가 현재 `q`를 `{ q }`로 넘긴다. 호출부가 넘기지 않으면 기존 동작.
- `Pagination`: 기존 `query` prop에 호출부가 `{ category?, q? }`를 구성해 넘긴다.
- 검색 입력 초기값: 서버가 해석한 `q`를 URL `searchParams`에서 읽어 클라이언트 컴포넌트에 전달한다. `category`도 같은 방식으로 전달한다.
- 서비스: `listPosts(page, pageSize, category, query)`. 관리자 기존 호출(인자 3개)은 그대로 동작해야 한다.

### 유일성/트리거/배포

- 읽기 전용이라 중복 생성, 유일성 문제 없음. DB 스키마 변경 없음(인덱스는 별도 작업).
- 능동 트리거: 사용자의 타이핑이 유일한 트리거다. 크론, 신규 환경변수 불필요.

## 4. 수용 기준

### 검색 동작 (서버 로직)

- AC1. `q`가 있으면 `title` 또는 `content`에 대소문자 구분 없이 부분 일치하는 글만 `published_at desc, slug desc` 순으로 반환한다.
- AC2. `q`가 없거나 trim 후 빈 문자열이면 검색 조건이 없는 기존 목록과 동일한 결과를 반환한다.
- AC3. `category=X&q=Y`는 X를 포함하고 Y에 일치하는 글만 반환한다.
- AC4. `q`가 배열이면 첫 값만 쓴다.
- AC5. 좌우 공백 제거, 내부 연속 공백 하나로 축약, NFC 정규화. NFD 입력이 NFC 저장 제목과 일치한다.
- AC6. 100자 초과 입력은 앞 100자로 절단하여 검색한다. 오류가 아니다. 입력창 `maxLength`도 100.
- AC7. `%`, `_`, `\`는 문자 그대로 검색된다. `q=%`, `q=_`가 전체 글을 반환하지 않는다.
- AC8. SQL 구문 형태 입력은 바인딩 파라미터로 처리되어 오류/부작용이 없다.
- AC9. 검색어와 결과 제목은 React 기본 출력으로 이스케이프된다(`dangerouslySetInnerHTML` 금지).
- AC10. `total`, `totalPages`는 검색 조건이 적용된 값이다.
- AC11. 결과 수보다 큰 `page`는 마지막 페이지로 보정된다(오류 없음).
- AC12. 서비스 레벨 테스트가 AC1~AC8, AC10, AC11을 검증한다(테스트 제목 한글 규칙 준수).

### 자동 검색 UI

- AC13. 검색 입력은 `<input type="search">`이며 연결된 `<label>`(시각적으로 숨겨도 됨)이 있다.
- AC14. 마지막 키 입력 후 debounce 시간(제안 300ms, [확인 필요])이 지나기 전에는 요청이 나가지 않는다. 연속 입력 중 중간 값으로는 요청이 나가지 않는다.
- AC15. 한글 IME 조합 중(`compositionstart`부터 `compositionend`까지)에는 검색 요청과 URL 갱신이 발생하지 않고, 조합이 끝난 시점의 값으로 debounce를 시작한다.
- AC16. 검색어가 바뀌면 `page`를 제거하고 1페이지부터 보여준다.
- AC17. URL은 `router.replace` 또는 동등한 replace 방식으로 갱신되어 입력마다 브라우저 히스토리 항목이 쌓이지 않는다. 뒤로가기가 검색 이전 페이지로 이동한다.
- AC18. 입력창을 비우면 `q`가 URL에서 제거되고 전체 목록으로 돌아간다. 빈 값 검색 요청은 별도로 발생하지 않는다(전체 목록 조회와 동일 경로).
- AC19. `category`가 선택된 상태에서 입력해도 `category`가 URL과 요청에 유지된다.
- AC20. 새로고침, 링크 공유, 뒤로/앞으로가기 시 URL의 `q`로 같은 결과가 재현되고 입력창에 해석된 `q`가 채워져 있다.
- AC21. `?q=`로 직접 진입하면 JS 실행 전 첫 HTML에 해당 결과 목록이 포함된다(서버 prefetch 결과). [검토안 B 채택 시]
- AC22. 오래된 응답이 최신 입력의 결과를 덮어쓰지 않는다. 예: "ab" 요청 응답이 "abc" 응답보다 늦게 도착해도 화면은 "abc" 결과다.
- AC23. 요청 진행 중에는 이전 결과를 유지한 채 로딩 상태를 표시한다(목록이 빈 화면으로 깜박이지 않는다). 로딩 영역에 `aria-busy` 등 보조기기 알림이 있다.
- AC24. 요청 실패 시 오류 문구와 "다시 시도" 동작이 보이고, 입력값은 유지된다. 이후 입력/재시도로 복구된다.
- AC25. 결과가 갱신되면 결과 수가 보조기기에 전달된다(`aria-live="polite"` 영역).

### 페이지네이션/카테고리/문구

- AC26. 결과가 20건(공개)/50건(관리자)을 넘으면 `Pagination`이 표시되고 모든 링크가 `q`(와 `category`)를 유지한다.
- AC27. 카테고리 탭 링크는 현재 `q`를 유지한다 (사용자 미결정 항목, 권장안).
- AC28. 개수 문구: `"{q}" 검색 결과 총 N개 중 a-b번째`. 카테고리 선택 시 `{카테고리} 카테고리 "{q}" 검색 결과 총 N개 중 a-b번째`.
- AC29. 0건: `"{q}"에 대한 검색 결과가 없습니다.`(카테고리 선택 시 `{카테고리} 카테고리에서 "{q}"에 대한 검색 결과가 없습니다.`) + 검색 초기화 링크. 목록/`Pagination`은 렌더링하지 않는다. 초기화 링크는 `q`만 제거하고 `category`는 유지한다 [확인 필요].
- AC30. `q`가 없을 때 기존 문구("아직 작성한 글이 없습니다.", "이 카테고리에 글이 없습니다.")는 그대로다.

### 관리자

- AC31. `/admin/blog`에도 같은 입력/동작(AC13~AC30)이 적용된다. 페이지 크기는 50.
- AC32. 관리자 검색 데이터 경로는 인증되지 않은 요청에 거부 응답(401/403)을 반환한다. 공개 검색 경로에는 관리자 전용 정보가 노출되지 않는다.
- AC33. 관리자 목록의 행 마크업(제목 링크, 날짜)과 "새 글" 버튼은 변경되지 않는다.

### 회귀/규칙

- AC34. `/blog?page=2`, `/blog?category=X` 등 기존 URL 동작은 변하지 않는다. 검색어 없을 때 `/blog` 화면의 픽셀 레이아웃은 입력창 영역 추가 외에 변하지 않는다.
- AC35. 새 스타일은 `docs/agent-rules/tailwind.md`(px spacing, 토큰 색), 파일은 kebab-case, 서버 전용 모듈은 `server-only`, 미사용 export/의존성 금지(knip), 주석 규칙(em-dash 금지, 명사형 종결)을 따른다.
- AC36. `pnpm verify`가 통과한다(새 의존성이 knip에서 미사용으로 걸리지 않음).
- AC37. 공개 `/blog`에 정규화 후 비어 있지 않은 `q`로 진입하면 응답 HTML에 `<meta name="robots" content="noindex">`(follow 여부는 설계에서 결정)가 포함되고, `q`가 없거나 공백만이면 포함되지 않는다.

## 5. Edge case

| 입력/상황 | 기대 동작 |
| --- | --- |
| `?q=` 빈 값, `?q=%20%20` 공백만 | 검색 없음, 입력창 빈 값 (AC2, AC18) |
| `%`, `_`, `\` | 문자 그대로 검색 (AC7) |
| 300자 붙여넣기 | 앞 100자 (AC6) |
| 한글 조합 중 ("ㅅ" -> "소") | 조합 중 요청 없음 (AC15) |
| 빠른 연속 입력 후 느린 중간 응답 | 최신 입력 결과만 표시 (AC22) |
| 입력 중 네트워크 오류 | 오류 문구 + 재시도, 입력 유지 (AC24) |
| 카테고리 선택 + 검색 0건 | 카테고리 포함 결과 없음 문구 (AC29) |
| `?q=Y&page=999` | 마지막 페이지 보정 (AC11) |
| `?q=Y&page=abc` | 1페이지 (`parsePageParam`) |
| `?q=a&q=b` | `a`만 (AC4) |
| 검색 중 뒤로가기 | replace 사용으로 검색 이전 페이지 (AC17) |
| 입력 비움 | `q` 제거, 전체 목록 (AC18) |
| 검색 중 페이지 이동 후 새 검색어 입력 | page 제거, 1페이지 (AC16) |
| 글 0건 + 검색어 | 검색 결과 없음 문구 (AC29) |

## 6. 도입 검토 (react-query, suspensive QueriesHydration, axios)

### 6.1 확인된 근거와 한계

- [사실, 웹 문서] Suspensive `QueriesHydration`은 서버에서 여러 쿼리를 prefetch해 클라이언트 컴포넌트로 자동 hydrate하는 컴포넌트다. experimental(v3.14.0에서 추가)이며 인터페이스가 바뀔 수 있다. RSC 지원 프레임워크(Next.js 13+ App Router)에서만 동작하는 async 서버 컴포넌트다. `queryClient` prop은 선택이며 생략하면 새 QueryClient를 만든다. 각 쿼리는 `queryKey`가 필요하다. (https://suspensive.org/en/docs/react-query/QueriesHydration)
- [사실, 웹 문서] 서버에서 QueryClient를 요청 간 공유하면 사용자 간 데이터가 노출될 수 있으므로, `createGetQueryClient`로 서버는 요청마다 새 클라이언트, 브라우저는 싱글턴을 쓰라고 안내한다. (https://suspensive.org/en/docs/react-query/createGetQueryClient)
- [사실, 웹 문서] `@suspensive/react-query-4`는 TanStack Query v4용이며 v5는 `@suspensive/react-query-5` 계열이라는 검색 결과가 있다. 이 저장소에 설치할 정확한 패키지명/버전은 [미확인]이며 구현 시 npm 레지스트리와 공식 문서로 확인해야 한다.
- [미확인] `@suspensive/react-query`, `@tanstack/react-query`의 Next 16.3.6 / React 19.3.0 / TypeScript 7.0.2 호환성은 패키지가 설치되어 있지 않아 `node_modules`로 검증하지 못했다. peerDependencies 확인이 설치 전 필수 게이트다.
- [미확인] `window.history.replaceState`와 Next 16 `useSearchParams` 동기화 동작은 이번에 확인하지 않았다. 구현 전 `node_modules/next/dist/docs/` 확인이 필요하다.
- [미확인] `src/app/api/admin/posts/route.ts`가 GET을 지원하는지 읽지 않았다.

- [사실, context7 /toss/suspensive] `QueriesHydration`은 `@suspensive/react-query-5`에서 export되며 async Server Component로만 사용 가능(클라이언트 컴포넌트, pages router 불가). 클라이언트에서는 같은 `queryOptions`로 `useSuspenseQuery`를 호출해 hydrate된 데이터를 읽는 예시가 제공됨.
- [사실, context7 /tanstack/query] 공식 Advanced SSR 가이드는 서버에서는 요청마다 새 `QueryClient`, 브라우저에서는 싱글턴을 쓰고, SSR 시 `staleTime`을 0보다 크게 두어 hydrate 직후 재요청을 피하라고 안내함.
- [사실, npm registry 2026-10-15] `@tanstack/react-query` 최신 5.104.3, peer `react ^18 || ^19`. `@suspensive/react-query-5` 최신 3.21.4, peer `@tanstack/react-query *`, `react ^18 || ^19`. React 19.3.0은 peer 범위 안.
- [사실] `src/app/api/admin/posts/route.ts`는 현재 `POST`만 export함 (GET 없음).
- [사실] `src` 안의 `from "axios"` import는 모두 `HttpStatusCode` 용도.
- [미확인] context7 문서에 Next 16 동작이 명시되지 않음. context7의 TanStack 문서는 v5.90.3까지라 최신 5.104.3과 차이 가능. 설치 후 `pnpm type-check`와 `pnpm build`로 검증 필요.

### 6.2 필요한 변경 (도입 시)

| 항목 | 내용 |
| --- | --- |
| 공개 검색 API | **신설 필요.** 클라이언트가 debounce마다 호출할 읽기 전용 GET Route Handler (예: `src/app/api/blog/posts/route.ts`). `server-only` 서비스(`listPosts`)를 호출하고 `lib/api/response.ts`의 `ok`/`fail`로 `CustomData<T>` 응답. 쿼리 파라미터는 서버에서 F1 규칙으로 재해석한다. GET이므로 DB write 금지 규칙 준수. |
| 관리자 검색 API | 관리자 목록은 인증 필요. `adminRoute`로 감싼 GET 핸들러 신설 또는 `admin/posts/route.ts`에 GET 추가 [admin/posts GET 현황 미확인]. 공개 핸들러를 재사용하지 않는다(pageSize, 인증 경계가 다름). |
| QueryClientProvider 위치 | 루트 `layout.tsx`가 아니라 `(public)/blog` 구간과 `admin/(console)` 구간의 클라이언트 Provider로 한정하는 안을 권장. 다른 페이지 번들에 영향이 없다. 서버는 요청마다 새 QueryClient(`createGetQueryClient` 패턴), 브라우저는 싱글턴. 최종 위치는 designer/frontend 설계에서 확정. |
| 서버 prefetch + hydrate 흐름 | `page.tsx`(서버)가 `searchParams`를 해석 -> `QueriesHydration`에 `queryKey = ["blog-posts", { page, category, q }]` 쿼리를 넘겨 prefetch -> 클라이언트 `useSuspenseQuery`(또는 `useQuery`)가 같은 key로 hydrate된 데이터를 읽음. 주의: 서버 prefetch의 `queryFn`은 `nextjs.md` 5번에 따라 서비스를 직접 호출해야 하고, 클라이언트 `queryFn`은 HTTP 호출이어야 한다. 같은 `queryOptions`를 양쪽에서 쓸 수 없으므로 key만 공유하고 queryFn은 분리하는 설계가 필요하다(서버 `queryFn`을 클라이언트 번들에 넣으면 `server-only` 빌드 오류). |
| URL `?q=` 동기화 | URL이 단일 진실 원천. 입력 -> debounce -> `router.replace`(AC17) -> `searchParams` 변경 -> query key 변경. 입력창 값은 로컬 state(타이핑 즉시 반영) + debounce된 값만 URL/쿼리에 반영. 뒤로/앞으로가기 시 URL -> 입력창 동기화 필요. |
| 공유/SEO | URL이 `q`를 담으므로 공유/새로고침 재현 가능(AC20). 서버 prefetch 덕에 `?q=` 진입 시 첫 HTML에 결과 포함(AC21). `canonical`은 현재 `/blog` 고정이라 `?q=` 페이지는 `/blog`로 정규화된다. `q`가 있으면 `robots: noindex` 추가(0장 8번, AC37). |
| 관리자 적용 | 같은 구조를 `/admin/blog`에 적용하되 admin GET 핸들러 + 별도 query key 네임스페이스(`["admin-blog-posts", ...]`) 사용. 페이지 레벨 `requireAdminPage()`는 유지. 목록 행 마크업은 기존 유지(AC33). |
| 기존 `admin-request.ts`와의 관계 | `adminRequest`는 변경하지 않는다. 쓰기(POST/PUT/DELETE) 전용이고 GET 미지원이다. 읽기 검색은 새 경로로 처리하며 쓰기 요청을 react-query mutation 또는 axios로 바꾸는 작업은 범위 밖. |
| 의존성 | 신규: `@tanstack/react-query`, `@suspensive/react-query`(정확한 패키지/버전 [미확인]). `axios`는 이미 있음. 사용하지 않는 의존성은 knip이 막으므로 도입한 것만 실제 사용해야 한다. |

### 6.3 axios 인스턴스

- [사실] `axios`는 이미 의존성이다. 현재 `adminRequest`는 fetch를 쓴다.
- 장점: 이미 설치되어 추가 설치 없음, 공개 읽기 클라이언트에서 `baseURL`, 타임아웃, 에러 객체 일관성. react-query가 넘기는 `AbortSignal`을 지원하므로(일반 지식, 이번에 문서로 확인하지 않음 [미확인]) 경합 취소에 사용 가능.
- 단점: 브라우저 `fetch`로 충분한 단순 GET이라 번들 크기만 늘 수 있다. 기존 fetch 기반 `adminRequest`와 요청 계층이 둘로 갈라진다.
- [권장] 새 검색 읽기 호출에만 axios 인스턴스를 도입한다(사용자 요청에 부합, 기존 코드는 건드리지 않음). `adminRequest`의 axios 전환은 범위 밖이며 필요하면 별도 확인.
- [확인 필요] axios 대신 fetch 사용으로 충분한지는 사용자 선호 문제. 사용자 요청이 axios 도입 검토이므로 권장안은 axios 사용.

### 6.4 대안 비교

| 안 | 설명 | 장점 | 단점 |
| --- | --- | --- | --- |
| A. 서버 렌더 재요청 | 입력 debounce -> `router.replace` + `useTransition` -> 서버 컴포넌트가 새 `searchParams`로 재렌더. 신규 라이브러리/API 없음 | 변경 최소, `nextjs.md` 5번 규칙(서비스 직접 호출) 준수, 별도 공개 API 불필요, 경합은 Next 라우터가 처리 | 사용자가 지정한 react-query + QueriesHydration 패턴이 아님. 요청마다 RSC 전체 재렌더(카테고리 목록 등 포함) |
| B. react-query + QueriesHydration + 새 GET API + axios | 사용자 지정 패턴 | 사용자 요청과 일치, 클라이언트 캐시(같은 검색어 재입력 즉시 표시), `queryKey` 기반 경합 처리, 로딩/에러 상태 표준화 | 신규 의존성 2개, 공개/관리자 GET 핸들러 신설, queryFn 서버/클라이언트 분리 설계, experimental API 의존, 호환성 [미확인] |

- [권장] 사용자 결정에 따라 B로 진행하되 설치 전에 (1) 패키지 peerDependencies가 React 19.3 / Next 16.3.6과 맞는지, (2) `QueriesHydration`이 현재 안정 버전에서 experimental 표기를 유지하는지 확인한다. 하나라도 불가하면 작업을 멈추고 A로 대체할지 사용자에게 확인한다.
- 이유: 사용자가 해당 패턴을 명시했고, 이 저장소의 유일한 제약(서버 읽기는 서비스 직접 호출)은 queryFn 분리로 지킬 수 있다. 다만 A가 변경량과 위험이 더 작다는 점은 사실이며 최종 선택은 사용자 몫이다.

## 7. 비기능 요구사항

- 성능: 목록 쿼리는 `content`를 select하지 않고 검색 조건에만 사용. 총 개수와 목록 쿼리에 같은 조건 적용. 불필요한 요청 방지(debounce, 동일 key 캐시, 빈 값 요청 없음).
- 보안: 바인딩 파라미터, 공개 GET에 관리자 전용 데이터 없음, 관리자 GET은 `adminRoute`로 보호, 공개 경로에 대한 입력 길이 상한(서버에서 100자 절단 재적용).
- 접근성: AC13, AC15, AC23, AC25.
- 캐시: 서버 `listPosts`의 `cache`는 요청 단위이며 검색어가 인자에 포함되어야 한다. QueryClient는 서버에서 요청 간 공유 금지.

## 8. 범위 밖

- 기존 관리자 fetch 기반 코드(`admin-request.ts`, admin 폼 쓰기)의 axios/react-query 전환
- 관리자 쓰기 요청(POST/PUT/DELETE)의 mutation 전환
- 검색어 하이라이트, 본문 발췌, 관련도 정렬, 다중 키워드 AND/OR, 오타 보정, 자동완성
- 태그/카테고리 필드 검색
- 검색용 DB 인덱스(trigram, FTS) 추가 (별도 작업)
- 검색 로그, 인기 검색어
- 블로그 외 영역 검색

## 9. 남은 사용자 확인 항목

없음. 2026-10-15 사용자 확인으로 모두 0장에 확정 반영.
