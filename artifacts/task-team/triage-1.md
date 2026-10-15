# triage-1: 1차 리뷰 재판단 (orchestrator)

대상: `code-review-1.md`, `security-review-1.md`, 커밋 8af467f. 모든 finding을 실제 코드로 대조함.

## 재작업 대상 (1차 리뷰 기준, 심각도 무관)

| ID | 심각도 | 판단 근거 |
| --- | --- | --- |
| F-02 | Medium | `blog-search-results.tsx` 본문 분기에서 `data.items.length === 0`이 `busy`보다 먼저 판정되어 placeholder 0건이 EmptyState로 렌더됨을 확인 |
| F-03 | Medium | `ResultList`의 `paginationQuery`는 새 `params`, `page`/`totalPages`는 이전 `data`에서 가져옴을 확인 |
| F-04 | Low | `SearchAnnouncer` effect가 `busy`/`data` 변화마다 실행되어 같은 q의 재조회·페이지 이동에서도 문구를 다시 씀을 확인 |
| F-05 | Low | IME 조합 중 외부 URL 변경 시 입력값 역동기화가 건너뛰어짐 (리뷰 서술과 코드 일치) |
| F-06 | Low | 두 테스트가 이제 `@/utils/blog-query-params`, `@/constants/blog`, `@/lib/blog/excerpt`만 import하므로 `server-only`, `@/db` mock이 불필요함을 확인 |
| S-02 | Low | `node_modules/drizzle-orm/errors.js`의 `DrizzleQueryError` 메시지가 `params: ${params}`를 포함함을 확인. 공개 라우트는 `error.message`를 그대로 로그에 남기므로 검색어가 기록되고 주석이 사실과 다름 |
| S-03 | Low | `src/app/api/admin/posts/route.ts` GET에 `Cache-Control` 미설정, proxy에만 의존 |

## 사용자 결정 필요

| ID | 심각도 | 내용 |
| --- | --- | --- |
| S-01 | Medium | 인증 없는 본문 전문 ILIKE에 rate limit 없음. 해결 방식(인프라 rate limit, 최소 길이 변경, statement_timeout 등)이 승인된 요구사항 또는 인프라 결정을 바꾸므로 사용자 결정 필요 |
| S-05 연계 | High (사이클 diff 밖) | `pnpm audit --prod` 결과 신규 의존성(@tanstack/react-query, @suspensive/react-query-5) 경로의 취약점은 없음. 기존 `next` 16.3.6(<16.3.8, high 1·moderate 4·low 1), `sharp` <0.35.5(high), `source-map-js` <1.2.2(high)가 검출됨. 이번 사이클이 만든 문제가 아니므로 포함/백로그 결정 필요 |

## 기각

| ID | 기각 사유 |
| --- | --- |
| F-01 | Task 계약상 T05/T06은 새 테스트를 작성하지 않고 신규 테스트는 T09 QA가 작성함. 지적한 정규화·LIKE 이스케이프·서비스 조건 테스트는 T09 지시문에 포함 |
| S-04 | 서버는 `QueriesHydration` 기본값 `queryClient = new QueryClient()`로 렌더마다 새 클라이언트를 만듦을 설치 패키지(`QueriesHydration.mjs`)에서 확인. 브라우저 캐시가 로그아웃 후 남는 점은 사실이나 관리자 목록 응답이 공개 목록과 같은 필드·데이터라 노출되는 정보가 없음 |
| S-05 (신규 의존성) | 신규 의존성은 정확한 버전 고정, audit 경로에 없음 |
