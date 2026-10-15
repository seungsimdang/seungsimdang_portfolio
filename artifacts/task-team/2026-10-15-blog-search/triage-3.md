# triage-3: 사이클 전체 최종 리뷰 재판단 (orchestrator)

대상: `code-review-3.md`, `security-review-3.md`, 사이클 diff `288f7a5..42ab6ba`.

## 판단

| ID | 심각도 | 판단 근거 | 처리 |
| --- | --- | --- | --- |
| F3-01 | Medium | 사실임. 검색 로직(`normalizeSearchQuery`, `escapeLikePattern`, `parseBlogListParams`, `summarizeErrorForLog`) 테스트가 없음. 다만 Task 계약상 신규 테스트 작성은 T09 담당이고 triage-1 F-01에서 이미 T09로 넘김 | 개발자 재작업 대상 아님. T09 완료 조건으로 명시 |
| F3-02 | Low | `blog-service.ts:36` 주석이 시간 초과를 Route Handler 500 경로로만 설명함을 확인. 리뷰의 "서버 컴포넌트 경로는 error.tsx로 감" 서술은 사실과 다름. 설치된 `QueriesHydration.mjs:85-95`가 `fetchQuery` 실패를 catch하고 기본값 `skipSsrOnError = true`로 `ClientOnly`에 폴백함 | 주석 보완 여부 사용자 결정 |
| F3-03 | Low | 두 서버 페이지가 `parsePageParam`·`normalizeCategoryParam`·`normalizeSearchQuery`로 params를 직접 조립하고 `category`, `q`가 없을 때 `undefined` 키를 남김. `parseBlogListParams`는 키를 생략함. 현재는 TanStack 키 해시가 `undefined` 값을 무시해 같은 키가 됨 | 정리 여부 사용자 결정 |
| S3-01 | Low | `get-query-client.ts`의 기본 `retry: 1`을 확인. 검색 시간 초과 시 SSR 1회, 클라이언트 1회, 재시도 1회로 느린 쿼리가 최대 3회 실행됨 | 처리 여부 사용자 결정 |
| S3-02 | Info | 브라우저 QueryClient의 관리자 목록 캐시 유지, 공개 데이터와 동일 | 조치 없음 |
| S3-03 | Info | `QueriesHydration` experimental 표시 | 조치 없음 |

## 기타

- CodeRabbit은 이번 최종 리뷰에서 미실행. 리뷰어가 사유를 확인하지 않았다고 보고함.
