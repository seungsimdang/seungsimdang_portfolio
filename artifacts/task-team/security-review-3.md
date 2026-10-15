# Security Review 3 (T08 사이클 전체 최종 리뷰, feature/blog-search)

## 판정

**배포 승인.** Critical/High/Medium 없음. 신규 finding은 Low 1건(S3-01), Info 2건(S3-02, S3-03)이며 배포 차단 사유가 아님. 재작업 여부는 orchestrator 9-1 게이트가 결정.

## 검토 범위와 한계

- Read로 요청 목록의 파일 전부를 확인함: blog-query-params.ts, constants/blog.ts, blog-service.ts, api/blog/posts/route.ts, api/admin/posts/route.ts, admin-route.ts, safe-error-log.ts, api-client.ts, get-query-client.ts, blog-posts-keys.ts, blog-posts-queries.ts, query-provider.tsx, blog-list-view.tsx, blog-search-box.tsx, blog-search-results.tsx, category-tabs.tsx, admin-post-row.tsx, 공개/관리자 blog page.tsx, package.json, pnpm-workspace.yaml.
- 추가로 설치된 `@suspensive/react-query-5@3.21.4`의 `QueriesHydration.cjs`를 읽음.
- Bash 없음. 실행, `pnpm audit`, 실제 DB 동작, 브라우저 동작은 직접 검증하지 못함. audit 통과, statement_timeout 2s 및 57014 취소는 orchestrator 보고를 전제로 함 (미검증, 인용).
- lockfile 해석 버전, `src/proxy.ts`, `require-admin.ts`, `rate-limit-service.ts`는 이번에 읽지 않음 (이전 리뷰에서 확인된 범위를 따름).

## 이전 finding 종결 확인

| ID | 상태 | 근거 |
| --- | --- | --- |
| S-01 | 수용 (timeout만 적용, rate limit 백로그) | blog-service.ts:37-41, 66, 86. 사용자 결정대로 유지. |
| S-02, S-03 | 해결 | api/blog/posts/route.ts:20-23이 `summarizeErrorForLog`로 이름과 PG 코드만 기록. api/admin/posts/route.ts:18에서 `no-store` 직접 설정. |
| S2-01 | 해결 | admin-route.ts:99-100이 같은 헬퍼 사용. safe-error-log.ts는 메시지를 기록하지 않음. |
| S2-02 | 해결 (근거 보강) | `QueriesHydration.cjs:88-98`이 `fetchQuery` 실패를 catch하고 `skipSsrOnError` 기본값 true로 `ClientOnly` 폴백. SSR에서 DrizzleQueryError가 페이지 오류 경계로 전파되지 않아 검색어가 Next 서버 로그에 남는 경로가 없음. |

## 파일 간 상호작용 점검 결과 (문제 없음)

- 입력 정규화 일관성: 서버 페이지 2곳, 두 Route Handler, 클라이언트(`parseBlogListParams`, `normalizeSearchQuery`)가 같은 `blog-query-params.ts`를 사용. NUL 제거, NFC 후 코드포인트 절단, LIKE 이스케이프(`escapeLikePattern`, 역슬래시 우선)가 서비스 한 곳에서만 적용되고 값은 바인딩 파라미터로 전달됨. 우회 경로 없음.
- Query key 일치: 서버 prefetch의 params는 `category: undefined`, `q: undefined` 키를 가질 수 있고 클라이언트는 키를 생략하나, TanStack 키 해시는 undefined 속성을 무시하므로 같은 키가 됨 (라이브러리 일반 동작에 근거, 실행 미검증).
- 공개/관리자 데이터 분리: 키 접두사가 `blog-posts`/`admin-blog-posts`로 분리되고 URL도 분리됨. 관리자 페이지는 `requireAdminPage()` 후에만 prefetch하며 `/api/admin/posts` GET은 `adminRoute`(requireAdmin)로 보호됨. 관리자 데이터가 공개 키로 hydrate되는 경로 없음.
- XSS: 검색어와 카테고리는 JSX 텍스트, `textContent`로만 렌더. `dangerouslySetInnerHTML` 없음. href는 `encodeURIComponent` 조합(category-tabs.tsx:34, blog-search-results.tsx:133)이며 slug 링크도 `encodeURIComponent`(admin-post-row.tsx:9). `replaceState`는 `window.location.href` 기반 동일 오리진 경로.
- CSRF/캐시: 검색 API는 GET 읽기 전용이고 변경 메서드 Origin 검사(admin-route.ts:65)는 그대로. 두 API 모두 응답에서 `no-store` 설정. CORS 헤더를 추가하지 않아 교차 오리진 읽기는 브라우저가 차단.
- 서버 QueryClient 공유: `QueriesHydration`은 렌더마다 새 QueryClient를 쓰고 `getQueryClient()`는 서버에서 호출마다 새로 만들어 요청 간 캐시가 섞이지 않음.
- 시크릿: 클라이언트 번들로 가는 모듈(api-client.ts, get-query-client.ts, blog-posts-queries.ts, blog-query-params.ts, constants/blog.ts)은 환경변수나 server-only 모듈을 import하지 않음. blog-service.ts와 safe-error-log.ts는 `server-only`.
- 의존성: 새 런타임 의존성은 `@suspensive/react-query-5`, `@tanstack/react-query`이며 둘 다 정확한 버전 고정. override(`sharp`, `source-map-js`)와 `minimumReleaseAge`, `trustPolicy`는 2차 리뷰 판단 그대로. audit 통과는 orchestrator 보고 기준.

## 신규 Findings

### S3-01 Low: 검색 실패 시 SSR과 클라이언트 재시도가 겹쳐 느린 쿼리가 요청당 최대 3회 실행됨

- 위치: `src/app/(public)/blog/page.tsx:59-72`, `src/lib/query/get-query-client.ts:11`, `src/lib/query/blog-posts-queries.ts:28-34`
- 근거: 느린 검색어(예: 큰 본문에 대한 `%q%` ILIKE)가 2초 timeout(57014)에 걸리면 `QueriesHydration`이 실패를 삼키고 `ClientOnly`로 폴백함(QueriesHydration.cjs:92-98). 그 뒤 브라우저가 `/api/blog/posts`를 호출하고 실패하면 `retry: 1`로 한 번 더 호출함. 결과적으로 페이지 1회 방문이 서버 쿼리 3회(SSR 1 + API 2)를 유발하며, 각 호출은 count 단계에서 최대 2초를 쓰므로 한 방문의 DB 점유가 최대 약 6초임. 또한 `QueriesHydration`에 `timeout`이 없어 SSR 응답이 최대 2초 지연됨. S-01 잔여 위험(rate limit 백로그)의 증폭 계수가 약 3배가 되는 점이 이번 사이클 파일 간 상호작용에서 새로 생긴 부분임. 인증 없이 도달 가능하나 동시 연결당 DB 점유 시간은 상한이 있고, 한 방문에서 증폭되는 양은 공격자가 직접 요청하는 것과 같은 수준이라 Low.
- 제안: 선택 사항. (1) `blog-posts-queries.ts`에서 5xx(특히 57014)에 대해 `retry: false`를 주거나 `retry` 함수로 4xx 외 재시도를 줄임. (2) rate limit 백로그 항목에 "SSR 폴백과 재시도로 3배 증폭" 사실을 함께 기록. 코드 변경 없이 백로그 기록만으로도 수용 가능.

### S3-02 Info: 브라우저 QueryClient 싱글턴이 관리자 목록 캐시를 같은 페이지 수명 동안 유지함

- 위치: `src/lib/query/get-query-client.ts:19-23`, `src/lib/query/blog-posts-queries.ts:46-53`
- 근거: 관리자 목록(제목, 슬러그, 날짜만 포함)이 `admin-blog-posts` 키로 브라우저 메모리에 남음. 로그아웃이 전체 페이지 이동이 아닌 클라이언트 내비게이션이면 같은 탭에서 캐시가 살아 있으나, 내용은 공개 목록과 동일한 필드이고 메모리 안에서만 존재하며 다른 사용자에게 노출되는 경로가 없음. 로그아웃 처리 코드는 이번 범위가 아니라 동작 확인은 못함.
- 제안: 조치 불필요. 로그아웃 시 `queryClient.clear()`를 호출하거나 전체 새로고침으로 이동하면 완전히 해소됨.

### S3-03 Info: `QueriesHydration`은 라이브러리가 experimental로 표시함

- 위치: `package.json:37`, `QueriesHydration.cjs:20`
- 근거: 공급망 위험이 아니라 API 안정성 문제. 정확한 버전 고정과 `minimumReleaseAge`가 있어 의도치 않은 상승 위험은 낮음. 보안 영향 없음.
- 제안: 조치 불필요. 버전 상승 시 SSR 오류 폴백(`skipSsrOnError`) 기본값이 유지되는지 확인.

## 잔여 위험 (수용됨)

- 인증 없는 `%q%` ILIKE에 대한 rate limit 부재. 요청당 쿼리별 2초 상한만 적용. 사용자 결정으로 백로그. 규모 확대 시 `pg_trgm` 인덱스 또는 Vercel Firewall rate limit 검토. S3-01의 증폭 계수를 함께 고려할 것.

## 차단 조건 점검

- Critical 미수정: 없음.
- 인증 로직 확인 불가: 아님. 이번 사이클에서 인증 코드의 의미 변경 없음(admin-route.ts는 오류 로그 형식만 변경, 가드 순서와 Origin 검사 유지).
