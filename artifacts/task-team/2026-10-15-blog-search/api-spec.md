# api-spec: 블로그 포스트 검색 (T04)

- 입력: `artifacts/task-team/requirements.md` (0장 확정 결정, 6장 도입 검토)
- 표기: [사실] 이번에 코드에서 읽어 확인, [결정] 이 문서가 확정하는 설계, [권장] 근거 있는 제안, [미확인] 확인하지 못한 항목
- DB 스키마 변경 없음. 인덱스는 별도 작업.

## 0. 확인 한계

- [미확인] 이 worktree에는 `node_modules`가 없다. `node_modules/next/dist/docs/`를 읽지 못했으므로 아래 Next 16 동작은 문서로 검증하지 못했다: `useSearchParams`와 `window.history.replaceState` 동기화, `router.replace`의 서버 재렌더 여부, `generateMetadata`의 `robots` 렌더링 결과, Route Handler GET 캐싱 기본값, `useSearchParams`의 Suspense 요구 조건.
- [미확인] `@suspensive/react-query-5`의 정확한 export 이름과 `QueriesHydration` props. requirements 6.1(웹 문서, context7)의 `queries`(각 항목 `queryKey`, `queryFn`)와 선택적 `queryClient`만 근거로 쓴다.
- [미확인] 새 패키지의 Next 16.3.6 / React 19.3.0 / TypeScript 7.0.2 호환성. 설치 후 `pnpm type-check`와 `pnpm build`로 검증하고, 막히면 대안으로 자동 전환하지 않고 중단 후 보고한다 (0장 6번).
- [미확인] 통합 전에는 T05와 T06 어느 쪽도 단독으로 type-check가 통과하지 않는다 (8장 의존성 참고).

## 1. 코드에서 확인한 사실

- [사실] `listPosts(page, pageSize, category?)`는 `cache`로 감싼 `server-only` 함수다. 반환은 `PostPage`(`items, total, page, pageSize, totalPages`).
- [사실] `parsePageParam`, `normalizeCategoryParam`은 `blog-service.ts`(`server-only`)에서 export된다. 클라이언트가 쓰려면 server-only가 아닌 파일로 옮겨야 한다.
- [사실] `src/app/api/admin/posts/route.ts`는 `POST`만 export한다. `adminRoute`는 GET에 Origin 검사와 쓰기 쿼터를 적용하지 않고 `requireAdmin`만 호출한다.
- [사실] `src/proxy.ts` matcher는 `/admin/:path*`, `/api/admin/:path*`. 인증 실패 시 `/api/*`는 401 JSON(`CustomData<ApiErrorBody>`), 통과 시 `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`를 붙인다.
- [사실] `ok(data, status)`는 헤더 인자가 없다. `fail(error)`는 `ApiError.headers`를 지원한다.
- [사실] `ApiErrorCode`에 `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_ERROR`가 이미 있다. 새 코드 추가 불필요.
- [사실] `src/app/(public)/blog/page.tsx`는 `export const metadata`를 쓰고 `canonical: "/blog"`를 가진다. 관리자 페이지는 `requireAdminPage()` 후 같은 `listPosts`를 호출한다.
- [사실] `CategoryTabs`는 링크에 `category`만 붙이고, `Pagination`은 `query` prop으로 쿼리를 유지한다.
- [사실] 기존 영향 테스트: `__tests__/utils/blog-category-param.test.ts`(`normalizeCategoryParam` import), `__tests__/utils/blog-excerpt-page.test.ts`(`parsePageParam` import), `tests/e2e/blog.spec.ts`(카테고리 탭 링크와 URL).

## 2. 검색어 정규화와 서비스 변경

### 2.1 신규 파일 `src/utils/blog-query-params.ts` (server-only 아님)

서버 페이지, Route Handler, 클라이언트(`useSearchParams`)가 같은 규칙을 공유해 서버 prefetch key와 클라이언트 key가 항상 일치하게 한다. 기존 `parsePageParam`, `normalizeCategoryParam`을 `blog-service.ts`에서 이 파일로 옮긴다(동작 불변). `blog-service.ts`에는 재export를 남기지 않는다(knip).

```ts
export function parsePageParam(raw: string | string[] | undefined): number;
export function normalizeCategoryParam(raw: string | string[] | undefined): string | undefined;

// 첫 값 -> 제어문자/연속 공백을 공백 1개로 축약 -> NFC -> trim -> 100 코드포인트 절단 -> trimEnd
// 결과가 빈 문자열이면 undefined
export function normalizeSearchQuery(
  raw: string | string[] | null | undefined,
): string | undefined;

// 모든 LIKE 메타문자를 문자 그대로 일치시키기 위한 이스케이프, 순서: 역슬래시 먼저
// "\" -> "\\", "%" -> "\%", "_" -> "\_"
export function escapeLikePattern(value: string): string;

export interface BlogListParams {
  page: number; // parsePageParam 결과, 1 이상
  category?: string; // normalizeCategoryParam 결과
  q?: string; // normalizeSearchQuery 결과
}

// URLSearchParams와 ReadonlyURLSearchParams가 모두 만족하는 구조적 타입
// get()은 같은 이름이 여러 개여도 첫 값을 돌려주므로 "배열이면 첫 값" 규칙과 일치함
export function parseBlogListParams(searchParams: {
  get(name: string): string | null;
}): BlogListParams;
```

규칙 상세 [결정]:

1. 입력이 배열이면 첫 요소만 쓴다 (AC4).
2. `/[\s\u0000-\u001F\u007F]+/g`를 공백 1개로 치환한다. NUL(`\u0000`)은 PostgreSQL text 파라미터에서 오류를 내므로 반드시 제거한다. 탭/개행/NBSP는 공백으로 축약된다.
3. `.normalize("NFC")` 후 `trim()`. NFC를 절단보다 먼저 적용해 NFD 입력이 부풀려진 길이로 잘리지 않게 한다 (AC5).
4. 절단은 코드포인트 기준 100 (`Array.from(value).slice(0, POST_SEARCH_MAX).join("")`), 이후 `trimEnd()`. 오류를 내지 않는다 (AC6). 서로게이트 쌍이 중간에서 잘리지 않는다.
5. 최소 길이 1. 빈 문자열은 `undefined` (AC2, AC18).
6. 상수 `POST_SEARCH_MAX = 100`을 `src/constants/blog.ts`에 추가한다. 입력창 `maxLength`도 이 상수를 쓴다.

LIKE 이스케이프 [결정]: 이스케이프는 `listPosts` 내부에서만 적용한다. 호출자는 이스케이프되지 않은 정규화 값을 넘긴다. PostgreSQL LIKE/ILIKE의 기본 이스케이프 문자가 역슬래시이므로 별도 `ESCAPE` 절은 필요 없다 [일반 지식, DB로 실행해 확인하지 않음 [미확인]]. 값은 항상 바인딩 파라미터다 (AC8).

### 2.2 `listPosts` 시그니처 (T06, `src/services/blog/blog-service.ts`)

```ts
export const listPosts = cache(
  async (
    page: number,
    pageSize: number,
    category?: string,
    query?: string, // normalizeSearchQuery를 거친 값만 받음
  ): Promise<PostPage>
);
```

- 4번째 인자는 선택이므로 기존 3개 인자 호출은 그대로 동작한다.
- 조건: `and(categoryCondition, searchCondition)` (`and`는 undefined를 무시). `searchCondition = or(ilike(posts.title, pattern), ilike(posts.content, pattern))`, `pattern = "%" + escapeLikePattern(query) + "%"` (구절 일치). `query`가 없으면 `undefined`.
- 개수 쿼리와 목록 쿼리에 같은 `where`를 쓴다 (AC10). `content`는 select하지 않는다. 정렬 `published_at desc, slug desc`, 범위 초과 page 보정은 기존 그대로 (AC11).
- `cache`는 인자 비교로 메모이즈하며 `query`가 인자에 포함되므로 검색어별로 분리된다.
- [권장] `query`가 비어 있지 않은 문자열이면 방어적으로 `query.trim() === ""`도 검색 없음으로 취급한다.

## 3. 공개 GET 엔드포인트 (T06)

`GET /api/blog/posts` - 파일 `src/app/api/blog/posts/route.ts`. 인증 없음.

### 쿼리 파라미터

| 이름 | 타입 | 해석 |
| --- | --- | --- |
| `q` | string | `normalizeSearchQuery`. 없거나 정규화 후 빈 값이면 검색 없음 |
| `category` | string | `normalizeCategoryParam`. 50자 초과/빈 값은 필터 없음 |
| `page` | string | `parsePageParam`. 잘못된 값은 1, 범위 초과는 마지막 페이지로 보정 |

- 같은 이름이 여러 개면 첫 값만 쓴다. 잘못된 값은 400이 아니라 페이지와 같은 관용 규칙(무시/보정)으로 처리해 서버 렌더와 결과를 일치시킨다. 따라서 `VALIDATION_FAILED`는 이 엔드포인트에서 쓰지 않는다.
- 페이지 크기는 서버 고정 `POST_PAGE_SIZE`(20). 클라이언트가 지정할 수 없다.

### 응답

`CustomData<PostPage>` (`ok(result)`):

```json
{
  "data": {
    "items": [{ "slug": "", "title": "", "publishedAt": "YYYY-MM-DD", "categories": [], "tags": [] }],
    "total": 0, "page": 1, "pageSize": 20, "totalPages": 1
  },
  "status": 200
}
```

- `items`는 `PostSummary`(content 제외)뿐이다. 관리자 전용 정보 없음 (AC32). `posts`에 초안 컬럼이 없으므로 공개와 관리자의 데이터 차이는 페이지 크기와 인증뿐이다.
- 검색 결과 판정에 잘린 목록 외 별도 필드가 필요하지 않다: `total`이 전체 집합 기준이고 `MAX_*` 상한으로 목록을 자르는 구조가 아니다 (페이지 단위 조회).

### 캐시 정책 [결정]

- 응답 헤더 `Cache-Control: no-store`. 이유: 서버 prefetch(SSR)는 항상 최신인데 CDN 캐시가 남으면 글 작성 직후 검색 결과가 서로 달라질 수 있고, 클라이언트 중복 요청은 react-query `staleTime`(60초)이 줄인다.
- 구현: `const response = ok(result); response.headers.set("Cache-Control", "no-store"); return response;` (`ok`에 헤더 인자가 없으므로).
- [미확인] Next 16 Route Handler GET의 기본 캐싱. `request.url`을 읽으므로 동적으로 취급될 것으로 추정한다. 빌드 출력에서 해당 라우트가 동적(`ƒ`)인지 T06이 확인한다. 정적으로 표시되면 `export const dynamic = "force-dynamic"`을 추가한다.
- GET 핸들러에 DB write 없음 (`nextjs.md` 6번). 능동 트리거 없음: 호출 주체는 사용자 타이핑뿐 (`nextjs.md` 7번).

### 오류 코드

| 상태 | code | 조건 |
| --- | --- | --- |
| 200 | - | 정상 (0건도 200, `items: []`) |
| 500 | `INTERNAL_ERROR` | DB 오류 등. `console.error`에 이름/메시지만 남기고 `fail(apiErrors.internal())` |
| 405 | - | GET 외 메서드 (Next 기본) |

`adminRoute`를 쓰지 않으므로 핸들러가 직접 `try/catch`로 500 변환한다. 원본 오류 상세는 응답에 포함하지 않는다.

### 위험 [권장, 보안 리뷰 참고]

- 공개 무인증 엔드포인트가 `content` 전문 ILIKE를 실행한다(인덱스 없음, 별도 작업). 완화: 100자 절단, `no-store`지만 클라이언트 debounce, 정규화. 서버 쪽 rate limit은 기존 `rate-limit-service`가 관리자 쓰기 전용이라 이번 범위에 넣지 않았다. 필요 여부는 T08/사용자 판단.

## 4. 관리자 GET 엔드포인트 (T06)

[결정] 기존 `src/app/api/admin/posts/route.ts`에 `GET`을 추가한다. 별도 경로(`/api/admin/posts/search` 등)는 만들지 않는다.

근거:
- `/api/admin/posts`는 posts 컬렉션이며 REST상 GET 목록 + POST 생성이 같은 경로다.
- `src/proxy.ts` matcher(`/api/admin/:path*`)가 이미 JWT 1차 인증, `Cache-Control: no-store`, `X-Robots-Tag`를 적용한다. 별도 경로도 같은 이점이지만 새 경로를 만들 이유가 없다.
- `[slug]/route.ts`와 경로 충돌 없음: 동적 세그먼트는 `/api/admin/posts/{slug}`이고 컬렉션은 `/api/admin/posts`.
- 공개 핸들러를 재사용하지 않는다(페이지 크기 50, 인증 경계가 다름).

```ts
export const GET = adminRoute(async ({ request }) => {
  const { page, category, q } = parseBlogListParams(new URL(request.url).searchParams);
  return ok(await listPosts(page, POST_ADMIN_PAGE_SIZE, category, q));
});
```

- 인증: 1차 `proxy.ts`(JWT 존재, 미인증 401), 2차 `adminRoute` -> `requireAdmin`(세션 + GitHub allowlist, 401/403). GET은 `MUTATING_METHODS`가 아니므로 Origin 검사와 쓰기 쿼터는 적용되지 않는다 [사실, `admin-route.ts`].
- 쿼리 파라미터와 응답은 3장과 같다(`CustomData<PostPage>`, `pageSize` 50). 페이지 크기는 서버 고정 `POST_ADMIN_PAGE_SIZE`.
- 오류: 200 / 401 `UNAUTHORIZED` / 403 `FORBIDDEN` / 500 `INTERNAL_ERROR` (모두 `adminRoute`가 변환).
- 캐시: 헤더는 proxy가 `no-store`를 이미 붙인다. 핸들러는 추가 헤더 없음.
- 기존 `POST` 동작은 변경하지 않는다. 같은 파일에 `GET` import(`listPosts`, `POST_ADMIN_PAGE_SIZE`, `parseBlogListParams`)만 추가한다.

## 5. react-query 설계 (T05)

### 5.1 패키지 [결정]

- `@tanstack/react-query` `5.104.3`, `@suspensive/react-query-5` `3.21.4` (requirements 6.1 registry 확인값, 저장소 관례에 맞춰 정확 버전 고정). 설치 시점에 `pnpm view`로 최신 5.104.x / 3.21.x인지 재확인한다.
- `axios`는 기존 의존성. `package.json`, `pnpm-lock.yaml`은 T05만 수정한다.
- 설치 전 게이트: peerDependencies가 React 19.3.0과 맞는지 확인하고, 설치 후 `pnpm type-check`/`pnpm build`가 막히면 중단 후 보고한다 (0장 6번).
- knip: `@suspensive/react-query-5`는 서버 페이지에서 `QueriesHydration`으로, `@tanstack/react-query`는 클라이언트에서 `useQuery`, `keepPreviousData`, `QueryClient`로 모두 실제 사용해야 한다.

### 5.2 구조와 Provider 위치 [결정]

- 루트 `layout.tsx`/`(public)/layout.tsx`/`admin/(console)/layout.tsx`는 수정하지 않는다. `QueryClientProvider`는 검색 목록이 있는 두 페이지(`/blog`, `/admin/blog`)에서만 감싼다. 다른 페이지 번들에 react-query가 들어가지 않는다. `blog/[slug]` 번들에도 들어가지 않도록 `blog/layout.tsx`도 만들지 않는다.
- 페이지(서버) 구성:

```tsx
<QueryProvider>                      {/* client, QueryClientProvider */}
  <QueriesHydration queries={[{ queryKey, queryFn }]}>  {/* server, async */}
    <PublicBlogList categories={...} />   {/* client, useQuery */}
  </QueriesHydration>
</QueryProvider>
```

  서버 컴포넌트(`QueriesHydration`)를 클라이언트 컴포넌트(`QueryProvider`)의 `children`으로 넘기는 구성이다. `QueriesHydration`의 `queryClient` prop은 생략한다(생략 시 요청마다 새 QueryClient, requirements 6.1). 서버 QueryClient가 요청 간 공유되지 않는다.
- Provider가 `HydrationBoundary`보다 바깥에 있어야 한다.

### 5.3 `getQueryClient` - `src/lib/query/get-query-client.ts`

```ts
// 서버는 호출마다 새 클라이언트, 브라우저는 모듈 싱글턴
export function getQueryClient(): QueryClient;
```

- `isServer`(`@tanstack/react-query` export)로 분기한다. 서버 분기에서는 매번 `new QueryClient(...)`. 브라우저 분기는 모듈 변수에 보관.
- 기본 옵션: `queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false }`. SSR hydrate 직후 재요청을 막으려면 `staleTime > 0`이어야 한다 (TanStack Advanced SSR 가이드, requirements 6.1).
- `server-only`는 붙이지 않는다(클라이언트 `QueryProvider`가 import). 서버 요청 간 공유는 서버 분기가 싱글턴을 쓰지 않으므로 발생하지 않는다.
- 공개와 관리자가 같은 브라우저 싱글턴을 쓰며 key 네임스페이스로 분리한다. [권장] `suspensive`의 `createGetQueryClient` 사용 가능 여부는 [미확인]이므로 자체 구현을 기본으로 한다.

### 5.4 queryKey 팩토리 - `src/lib/query/blog-posts-keys.ts`

```ts
import type { BlogListParams } from "@/utils/blog-query-params";

export const blogPostsKeys = {
  list: (params: BlogListParams) => ["blog-posts", "list", params] as const,
};
export const adminBlogPostsKeys = {
  list: (params: BlogListParams) => ["admin-blog-posts", "list", params] as const,
};
```

- `params`는 항상 `parseBlogListParams`/페이지의 정규화 함수를 거친 값이다. `undefined` 필드는 key 해시에서 제외되므로 `category`, `q`가 없을 때 필드를 생략해 서버와 클라이언트 key를 같게 만든다 (`{ page, ...(category && { category }), ...(q && { q }) }` 형태).
- 이 파일은 `server-only` 모듈을 import하지 않으므로 서버 페이지와 클라이언트 양쪽이 import해도 안전하다.

### 5.5 queryFn 분리 (server-only 차단) [결정]

- 서버 prefetch `queryFn`은 각 `page.tsx`(서버 컴포넌트) 안에 인라인으로 둔다: `queryFn: () => listPosts(params.page, POST_PAGE_SIZE, params.category, params.q)` (관리자는 `POST_ADMIN_PAGE_SIZE`). `blog-service`(server-only)는 `page.tsx`만 import한다. 공용 파일에 서버 queryFn을 두지 않는다.
- 클라이언트 `queryFn`은 `src/lib/query/blog-posts-queries.ts`(client 번들 가능, `server-only` 미사용)에서 axios로 호출한다:

```ts
export function publicPostsQueryOptions(params: BlogListParams) {
  return queryOptions({
    queryKey: blogPostsKeys.list(params),
    queryFn: ({ signal }) => fetchPosts("/blog/posts", params, signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
export function adminPostsQueryOptions(params: BlogListParams) { /* "/admin/posts", staleTime 10_000 */ }
```

- `fetchPosts`는 `apiClient.get<CustomData<PostPage>>(url, { params: { q, category, page: page > 1 ? page : undefined }, signal })` 후 `response.data.data`를 반환한다 (axios는 undefined 파라미터를 직렬화하지 않음).
- 서버 queryFn 반환(`PostPage`)과 클라이언트 queryFn 반환(`CustomData<PostPage>.data`)이 같은 타입이므로 같은 key로 교체 가능하다. 둘 다 JSON 직렬화 가능한 값만 포함한다.
- 검증: 클라이언트 번들에서 `server-only` 오류가 나면 위 규칙 위반이다. `pnpm build`로 확인.

### 5.6 클라이언트 사용 [결정]

- 목록 클라이언트 컴포넌트는 `useSearchParams()`로 현재 `page/category/q`를 `parseBlogListParams`에 넘겨 key를 만든 뒤 `useQuery(publicPostsQueryOptions(params))`를 쓴다. 입력 전 서버 prefetch key와 같으므로 첫 렌더는 hydrate된 데이터를 즉시 쓰고 `staleTime` 이내에는 재요청이 없다 (AC21).
- `useSuspenseQuery`는 쓰지 않는다: `placeholderData`를 지원하지 않아 검색어 변경 시 이전 결과 유지(AC23)와 충돌하고 Suspense fallback으로 목록이 사라진다.
- 로딩 표시: `isPlaceholderData || isFetching`일 때 이전 목록을 유지한 채 목록 영역에 `aria-busy="true"`. 오류: `isError`일 때 문구 + `refetch()` 버튼, 입력값 유지 (AC24).
- AbortSignal: 위 `queryFn`의 `{ signal }`을 axios `signal` 옵션으로 전달한다. 키가 바뀌면 react-query가 이전 요청을 취소하고, key 기준으로 최신 입력만 화면에 반영해 오래된 응답이 덮어쓰지 않는다 (AC22). axios는 1.x에서 `signal` 옵션 지원 [일반 지식, 설치 버전으로 확인하지 않음 [미확인]].
- 페이지/카테고리 변경은 기존 `Link`(서버 이동)이다. 이동하면 서버 페이지가 새 key를 prefetch하고 `HydrationBoundary`가 브라우저 싱글턴에 병합한다.

### 5.7 URL 동기화 방식 [결정, 검증 필요]

- 입력은 debounce(300ms, IME 조합 중 제외)된 값만 URL에 반영한다. URL 갱신은 `router.replace`가 아니라 `window.history.replaceState(null, "", url)`을 권장한다.
  - 이유: 검색어 변경마다 `router.replace`는 서버 컴포넌트 페이지를 다시 렌더(RSC 요청 + 서버 prefetch)해서, 같은 변경에 대해 axios 요청과 서버 요청이 이중으로 나가고 react-query 클라이언트 요청의 의미가 없어진다 [추정, Next 문서로 확인하지 않음 [미확인]].
  - Next가 네이티브 `history.replaceState`를 `useSearchParams`와 동기화한다는 문서 내용이 있다고 알려져 있으나 이번에 확인하지 못했다 [미확인]. T05가 구현 전 `node_modules/next/dist/docs/`에서 확인한다.
- 폴백: `replaceState`가 `useSearchParams`를 갱신하지 않거나 뒤로가기가 깨지면, 자동 전환하지 않고 보고한다. `router.replace`(AC17 "또는 동등한 replace")로 바꾸면 서버 재렌더가 매번 생긴다는 trade-off를 사용자에게 제시한다.
- 입력값 state는 로컬, URL의 `q` 변화(뒤로/앞으로가기)는 입력값으로 역동기화(조합 중 제외). `q` 변경 시 `page` 파라미터 제거 (AC16), 입력 비움 시 `q` 제거 (AC18), `category` 유지 (AC19).
- 이 페이지는 `searchParams`를 쓰는 동적 페이지다. `useSearchParams`의 Suspense 경계 요구는 [미확인]이므로 `pnpm build` 경고를 확인하고 필요 시 목록 클라이언트 컴포넌트를 `Suspense`로 감싼다.

## 6. axios 인스턴스 (T05)

`src/lib/http/api-client.ts` (client 번들용, `server-only` 아님):

```ts
export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 10_000,
  headers: { Accept: "application/json" },
});
```

- 같은 오리진 상대 경로이므로 쿠키(next-auth 세션)가 자동 전송된다. 관리자 요청에 별도 `withCredentials` 불필요.
- 브라우저 전용이다. 서버 컴포넌트에서 이 인스턴스를 쓰지 않는다(`nextjs.md` 5번, 서버는 서비스 직접 호출). 상대 baseURL은 서버에서 동작하지 않는다.
- 인터셉터는 두지 않는다. 오류는 `isAxiosError(error)`로 `response?.status`와 `response?.data` (`CustomData<ApiErrorBody>`)를 호출부에서 해석한다.
- 기존 `admin-request.ts`는 변경하지 않는다 (0장 7번, 쓰기 전용 유지).

## 7. noindex (AC37, T05)

공개 `src/app/(public)/blog/page.tsx`의 `export const metadata`를 `generateMetadata({ searchParams })`로 바꾼다.

```ts
export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const q = normalizeSearchQuery((await searchParams).q);
  return {
    title: "blog",
    description: "개발하며 배운 것과 알고리즘 풀이를 정리한 글 목록",
    alternates: { canonical: "/blog" },
    ...(q ? { robots: { index: false, follow: true } } : {}),
  };
}
```

- [결정] `follow: true`: 검색 결과 페이지는 색인하지 않되 글 링크 발견은 허용한다. `canonical`은 `/blog` 유지.
- `q`가 없거나 공백/제어문자뿐이면 `normalizeSearchQuery`가 `undefined`이므로 `robots`를 넣지 않는다 (현행 메타데이터와 동일).
- [미확인] Next가 `robots: { index: false, follow: true }`를 `content="noindex, follow"`로 렌더하는지(AC37 문구는 `noindex` 포함 여부로 검증하는 편이 안전), 그리고 스트리밍 메타데이터가 헤더가 아닌 본문에 들어갈 수 있는지. 확인은 T09에서 응답 HTML로 한다.
- 관리자 페이지는 `proxy.ts`가 이미 `X-Robots-Tag: noindex, nofollow`를 붙이므로 변경 없음.

## 8. 파일 변경 목록과 담당

겹치는 파일 없음. 의존성(`package.json`, `pnpm-lock.yaml`)은 T05 단독.

### T06 (backend)

| 파일 | 변경 |
| --- | --- |
| `src/utils/blog-query-params.ts` | 신규. 2.1의 함수/타입. `parsePageParam`, `normalizeCategoryParam`을 이 파일로 이동 |
| `src/constants/blog.ts` | `POST_SEARCH_MAX = 100` 추가 |
| `src/services/blog/blog-service.ts` | `listPosts` 4번째 인자 `query`, 검색 조건. 이동한 두 함수와 그 전용 import(`POST_LABEL_MAX`) 제거 |
| `src/app/api/blog/posts/route.ts` | 신규. 공개 GET |
| `src/app/api/admin/posts/route.ts` | `GET` 추가 (POST 유지) |
| `__tests__/utils/blog-category-param.test.ts` | import 경로만 `@/utils/blog-query-params`로 갱신 (`vi.mock("server-only")`, `vi.mock("@/db")`는 그대로 두어도 무방) |
| `__tests__/utils/blog-excerpt-page.test.ts` | `parsePageParam` import 경로만 갱신 |

### T05 (frontend)

| 파일 | 변경 |
| --- | --- |
| `package.json`, `pnpm-lock.yaml` | 5.1의 두 패키지 추가 |
| `src/lib/http/api-client.ts` | 신규. axios 인스턴스 |
| `src/lib/query/get-query-client.ts` | 신규 |
| `src/lib/query/blog-posts-keys.ts` | 신규 |
| `src/lib/query/blog-posts-queries.ts` | 신규. 클라이언트 queryFn/옵션 |
| `src/components/common/query-provider.tsx` | 신규. `"use client"`, `QueryClientProvider` |
| 검색 입력, 목록 클라이언트 컴포넌트 | 신규(공개/관리자 각각). 입력 UI, debounce, IME, replaceState, `useQuery`, 개수/0건/오류 문구 (파일명과 UI는 designer/T05 확정) |
| `src/components/common/category-tabs.tsx` | `query?: Record<string, string>` prop 추가 (기본 동작 유지) |
| `src/app/(public)/blog/page.tsx` | `generateMetadata`, `QueryProvider` + `QueriesHydration` + 서버 prefetch queryFn, import 경로를 `@/utils/blog-query-params`로 변경 |
| `src/app/admin/(console)/blog/page.tsx` | 동일 구조. `requireAdminPage()` 유지, 행 마크업/"새 글" 버튼 불변 (AC33) |

### 의존성 [결정]

- T05는 T06이 만드는 `@/utils/blog-query-params`(함수, `BlogListParams`)와 `POST_SEARCH_MAX`, `listPosts` 4번째 인자에 의존한다. 위 시그니처가 계약이다. T05는 계약대로 코드를 쓰고, 병합 후 orchestrator가 `pnpm fix-all && pnpm type-check`와 전체 테스트를 재검증한다.
- T06이 먼저 끝나면 T05가 병합 기준 브랜치에서 type-check를 돌릴 수 있다. 병렬이면 각 worktree의 단독 type-check는 상대 쪽 심볼 때문에 실패할 수 있다.
- T05의 `pnpm install` 결과(`node_modules`)는 T06 worktree에 필요 없다(T06은 새 패키지를 import하지 않음).

## 9. 영향받는 기존 테스트 (신규 테스트는 T09 QA 담당)

- `__tests__/utils/blog-category-param.test.ts`: import 경로 변경으로 갱신 필요.
- `__tests__/utils/blog-excerpt-page.test.ts`: import 경로 변경으로 갱신 필요.
- `tests/e2e/blog.spec.ts`: 카테고리 탭 링크 href와 URL 확인. `q`가 없을 때 링크는 기존과 동일해야 하므로 변경 없이 통과해야 한다 (AC34).
- [미확인] `tests/e2e/admin-tabs.spec.ts`, `real-project-data.spec.ts`가 `/admin/blog`, `/blog` 목록 마크업에 의존하는지는 읽지 않았다. T05 구현 후 `pnpm test:e2e:local`로 확인한다.
- `__tests__/api/admin-route*.test.ts`는 `adminRoute` 자체를 검증하며 변경 없음.

## Orchestrator 확인 (main 체크아웃 node_modules 기준, next 16.3.6)

- [사실] `01-app/01-getting-started/04-linking-and-navigating.md` "Native History API": `window.history.pushState`/`replaceState` 호출은 Next.js Router와 통합되어 `usePathname`, `useSearchParams`와 동기화됨. `replaceState` 권장안 채택.
- [사실] `01-app/01-getting-started/15-route-handlers.md`: Route Handler는 기본적으로 캐시되지 않음. `GET`은 `dynamic = 'force-static'` 같은 설정으로만 캐시 opt-in.
- [사실] `01-app/03-api-reference/04-functions/generate-metadata.md`: `robots: { index, follow }` 필드 지원.
- [사실] `01-app/03-api-reference/04-functions/use-search-params.md`: 정적 페이지에서 클라이언트 컴포넌트가 `useSearchParams`를 호출하면 프로덕션 빌드 시 `Suspense` 경계가 필요함. 대상 페이지는 `searchParams`를 읽는 동적 페이지지만, 검색 입력 컴포넌트는 `Suspense` 경계 안에 두는 것을 구현 기준으로 함.
