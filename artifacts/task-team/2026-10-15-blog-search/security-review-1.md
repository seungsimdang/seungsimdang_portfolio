# Security Review 1 (T08, feature/blog-search)

## 판정

**조건부 통과 (재작업 권고 2건: S-01, S-02).** Critical/High 없음. 배포 차단 사유는 없으나 orchestrator 9-1 게이트 기준으로 Medium 1건, Low 3건은 재검토 대상.

## 검토 범위와 한계

- Read로 지정 파일 전부와 `src/db/schema/portfolio.ts`의 posts 정의를 확인함.
- Bash가 없어 `pnpm audit`, 실행 테스트, 동적 검증은 하지 못함 (미검증).
- `node_modules/@suspensive/react-query-5`가 로컬에 설치돼 있지 않아 `QueriesHydration` 내부(서버 QueryClient 생성 방식)는 읽지 못함 (미검증, S-04 참고).

## 확인된 안전 사항

- SQL 인젝션: `ilike(posts.title, pattern)`와 `ilike(posts.content, pattern)`은 Drizzle 바인딩 파라미터. category는 `sql` 템플릿 `${category}`로 바인딩됨. 문자열 연결 없음 (blog-service.ts:44-52).
- LIKE 와일드카드: `escapeLikePattern`이 `\`를 먼저, 이후 `%`, `_`를 치환. PostgreSQL 기본 ESCAPE가 `\`이므로 의도대로 동작 (blog-query-params.ts:46-48). `%`, `_`로 전체 스캔 결과를 끌어내는 악용 불가.
- NUL/제어문자 제거, NFC, 100 코드포인트 상한, page 6자리 상한이 서버 파서에서 강제됨 (blog-query-params.ts:7-42). 클라이언트 maxLength에 의존하지 않음.
- 비공개/초안/본문 노출 없음: posts 스키마에 draft/visibility 컬럼이 없어 목록 조회는 전체 공개 글이 대상이며, 공개 목록(페이지 SSR)과 새 API가 같은 `listPosts`를 씀. select 컬럼은 slug, title, publishedAt, categories, tags뿐이고 content는 응답에 없음 (blog-service.ts:64-70).
- 관리자 GET 인증: `/api/admin/*`는 proxy matcher(proxy.ts:38)와 `adminRoute`의 `requireAdmin`(admin-route.ts:67-74)으로 이중 보호됨. 401/403 분기 정상. GET은 Origin 검사/쓰기 쿼터 대상이 아니나 읽기 전용이므로 적절. 응답 데이터는 공개 목록과 동일해 관리자 전용 필드가 없음.
- 서버 QueryClient 공유: `getQueryClient()`는 서버에서 호출마다 새 인스턴스를 만듦 (get-query-client.ts:20). 공개 키(`blog-posts`)와 관리자 키(`admin-blog-posts`)가 분리돼 있고 hydrate 대상 데이터도 위 이유로 공개/관리자 동일. 요청 간 캐시 공유로 인한 관리자 데이터 누출 경로는 확인되지 않음.
- XSS: 검색어는 JSX 텍스트와 `textContent`로만 렌더됨 (blog-search-results.tsx:40-41, 61, 135, 198). `dangerouslySetInnerHTML`, `innerHTML` 사용 없음. 링크는 `encodeURIComponent` 적용 (category-tabs.tsx:34, admin-post-row.tsx:9). `generateMetadata`는 q를 출력에 넣지 않고 robots만 설정.
- Open redirect/URL 조작: 새 코드의 href는 고정 `basePath`(prop 상수)에 인코딩된 쿼리만 붙임. `replaceState`는 `window.location.href` 기준 같은 오리진 경로만 사용 (blog-search-box.tsx:47-59). proxy의 `from` 파라미터는 기존 코드이며 이번 변경과 무관 (이번 범위 밖, 로그인 후 사용처는 미검토).
- 캐시 헤더: 공개 API는 `no-store` (route.ts:17), 관리자 경로는 proxy가 `no-store`를 설정.
- 오류 응답: 클라이언트에는 `apiErrors.internal()` 일반 응답만 반환됨.
- 시크릿: 검토 파일에 키/토큰 하드코딩 없음.

## Findings

### S-01 Medium: 인증 없는 본문 전문 ILIKE에 rate limit/비용 방어 없음

- 위치: `src/app/api/blog/posts/route.ts:11-18`, `src/services/blog/blog-service.ts:50-57`, `src/app/(public)/blog/page.tsx:45-70`
- 근거: 누구나 `GET /api/blog/posts?q=...`로 `title ILIKE '%q%' OR content ILIKE '%q%'`를 실행할 수 있음. 본문은 글당 최대 300,000자(constants/blog.ts:4)이고 `%q%` 앞뒤 와일드카드라 인덱스를 못 써서 매 요청이 전 행 순차 스캔임. count 쿼리와 목록 쿼리 2회 실행되며 (라인 54-75) 같은 조건이 두 번 평가됨. `Cache-Control: no-store`라 CDN이 흡수하지 못하고, 서로 다른 q를 붙이면 캐시 우회도 필요 없음. 디바운스/staleTime은 클라이언트 쪽 완화일 뿐 공격자에게 영향 없음. 기존 rate-limit-service는 관리자 쓰기에만 적용됨. `/blog?q=` SSR 페이지도 같은 쿼리를 실행해 같은 경로가 열려 있음. 서버리스(Neon)에서는 DB 컴퓨트 비용과 커넥션 점유로 이어질 수 있음. 글 수가 적은 현재 규모에서는 영향이 작을 것으로 추정되나 실측하지 못함.
- 수정 제안 (우선순위순):
  1. IP 기준 rate limit 추가 (예: 공개 검색 요청에 분당 N회, 초과 시 429 + Retry-After). Vercel Firewall/WAF rate limit 규칙도 가능.
  2. 짧은 CDN 캐시 허용 검토: `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`. 서버 prefetch와 어긋남이 문제라면 관리자 revalidate 시점과의 허용 지연을 요구사항에서 확정.
  3. 최소 검색어 길이 상한/하한 정책 (예: 1글자 `%a%`는 거의 모든 행을 매칭).
  4. 규모 확대 시 `pg_trgm` GIN 인덱스(`content`, `title`) 또는 tsvector로 전환.
  5. 쿼리 타임아웃(`statement_timeout`)을 검색 경로에 적용.
  6. count와 목록을 한 번에 처리(`count(*) over()`)해 스캔 1회로 축소.

### S-02 Low: 오류 로그에 검색어가 남을 수 있고 주석과 불일치

- 위치: `src/app/api/blog/posts/route.ts:20-24`
- 근거: 주석은 "쿼리 값 등 상세가 로그에 남지 않도록 이름과 메시지만 기록"이라 하나, drizzle-orm 0.45.3의 쿼리 실패 오류는 메시지가 `Failed query: ${query}`로 시작함 (`node_modules/drizzle-orm/errors.js:12` 확인). 그 뒤에 params가 이어지는 것으로 보이나 이 부분은 확인하지 못함 (추정). 그 경우 `error.message`에 사용자 검색어(바인딩 값)가 로그에 그대로 기록됨. 응답에는 노출되지 않으므로 외부 유출은 아님.
- 수정 제안: `error.name`과 `error.cause`의 PG 에러 코드(`code`)만 기록하거나, message를 `Failed query:` 이전까지 자르기. 로그 수집 정책상 검색어가 문제 없다면 주석만 정정.

### S-03 Low: 관리자 GET에 명시적 Cache-Control 없음

- 위치: `src/app/api/admin/posts/route.ts:12-17`
- 근거: 현재는 proxy가 `/api/admin/*` 응답에 `no-store`를 붙여 안전함 (proxy.ts:8-12). 다만 핸들러 자체에는 헤더가 없어 proxy matcher가 바뀌면 보호가 조용히 사라짐. 현 시점 노출은 없음.
- 수정 제안: 핸들러에서도 `no-store`를 설정하거나, proxy 의존을 문서로 명시.

### S-04 Low: 브라우저 QueryClient 캐시가 로그아웃/계정 전환 후에도 유지되고 hydration 구현 미검증

- 위치: `src/lib/query/get-query-client.ts:21`, `src/components/common/query-provider.tsx`
- 근거: 브라우저는 단일 QueryClient를 재사용하며 관리자 목록(`admin-blog-posts`)이 메모리에 남음. 현재 관리자 목록 데이터는 공개 데이터와 동일하여 실제 기밀 노출은 없음. 향후 관리자 응답에 비공개 필드(초안 등)가 추가되면 로그아웃 후 같은 탭에서 캐시가 남는 문제가 됨. 또한 `@suspensive/react-query-5`의 `QueriesHydration`이 서버에서 요청마다 새 QueryClient를 쓰는지 소스를 읽지 못해 검증하지 못함 (패키지가 node_modules에 없음).
- 수정 제안: `pnpm install` 후 `QueriesHydration` 구현이 요청 단위 `new QueryClient()`를 쓰는지 확인. 관리자 로그아웃 시 `queryClient.removeQueries({ queryKey: ["admin-blog-posts"] })` 호출 검토. 관리자 전용 필드를 추가하기 전에 재평가.

### S-05 Low: 의존성 추가 검증 미수행

- 위치: `package.json:37-38`
- 근거: `@tanstack/react-query` 5.104.1, `@suspensive/react-query-5` 3.21.4는 정확한 버전 고정(범위 연산자 없음)이라 공급망 측면에서는 양호. 알려진 취약점 여부는 audit을 실행하지 못해 확인하지 못함. 로컬에 suspensive 패키지가 없어 lockfile/설치 상태도 확인하지 못함.
- 수정 제안: 병합 전 `pnpm install --frozen-lockfile && pnpm audit --prod` 실행.

## 차단 조건 점검

- Critical 미수정: 없음.
- 인증 로직 확인 불가: 아님 (admin-route.ts, proxy.ts 확인함).

## 권고 조치

S-01은 orchestrator 게이트에서 재작업 여부를 결정할 항목임. 개인 포트폴리오 규모와 서버리스 비용 측면에서 최소한 1번(rate limit) 또는 3번(최소 길이)을 권고. S-02는 주석 정정만으로도 해소 가능.
