# triage-4: code-review-3, security-review-4 재판단

- 작성: orchestrator, 2026-10-13
- 기준 커밋: `0ce6fc7`
- 리뷰 범위: 사용자 결정으로 사이클 전체 최종 리뷰 대신 rate limit 재작업 코드만 리뷰함(about 이력 코드는 code-review-2에서 통과)

## code-review-3

| finding | 타당성 | 처리 |
| --- | --- | --- |
| M-1 rate limit 로직 테스트 없음(`secondsUntilNextAllowed` 경계값, `adminRoute` 429 + Retry-After) | 타당 | T09 QA로 이관. Task Team 계약상 신규 테스트는 QA가 작성(triage-1 Low-5와 같은 처리) |
| L-1 429 문구가 서버와 클라이언트에 이중 정의 | 사실이나 기존 패턴과 같음 | 기각. 403 문구(`권한이 없습니다`, 출처 거부)도 `api-error.ts`와 `use-admin-form.ts`에 따로 정의되어 있고 클라이언트는 상태 코드별 고정 문구를 씀 |
| L-2 거부된 요청도 count를 올린다는 주석 없음 | 타당 | 사용자 결정으로 이번 사이클에 포함, orchestrator 직접 수정. 함수 주석에 한 줄 추가 |

## security-review-4

| finding | 타당성 | 처리 |
| --- | --- | --- |
| L-5 해결 확인 | - | 해결 |
| Info 2건(부동소수점 경계 추가 거부, I-9 보정) | 정보 | 조치 없음 |
