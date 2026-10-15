# code-review-2: 블로그 검색 2차 재리뷰

- 작성: code-reviewer (T07). 리뷰어가 저장했다고 보고했으나 파일이 생성되지 않아 orchestrator가 반환 본문으로 기록함.
- 범위: code-review-1.md의 F-02~F-06 해결 여부, 재작업 diff `8af467f..20c836f`
- 판정: 통과

## 이전 finding

| ID | 결과 | 근거 |
| --- | --- | --- |
| F-01 | 제외 | triage-1.md에서 T09 담당으로 기각 |
| F-02 | 해결 | 빈 결과 분기에서 busy이면 LoadingText 렌더 |
| F-03 | 해결 | ResultPagination이 busy 동안 inert와 invisible로 차단 |
| F-04 | 해결 | SearchAnnouncer가 마지막 낭독 조건(category, q)을 ref에 두고 같으면 건너뜀 |
| F-05 | 해결 | committedRef가 입력값과 일치한 URL 값으로 갱신됨 |
| F-06 | 해결 | 테스트의 불필요한 mock 제거 |

## 재작업 diff 신규 코드

- Critical, High, Medium 없음.
- 쿼리 타임아웃: db.batch에 db.execute를 쓰는 방식이 설치된 drizzle neon-http 코드(`pg-core/query-builders/raw.js`, `neon-http/session.js`)에서 지원됨을 확인.
- 로그: Route Handler 로그는 error.name과 cause.code만 기록.
- admin GET: 응답에 Cache-Control no-store 설정.
- 의존성: next 16.3.8 갱신, sharp와 source-map-js override 추가.
- 주석: 이번 사이클 식별자(AC, F, S 번호 등) 인용 없음, em-dash 없음, 종결어미 규칙 준수.
- 실행: tsc 오류 없음, knip 위반 없음, `__tests__/lint` 48건 통과.

## 새 finding

- F2-01 (Low, 참고): 검색어가 있는 SSR 페이지 경로에서 DB 타임아웃 시 처리 방식은 diff 밖이라 읽지 않음. T09에서 확인 필요.

## 기타

- CodeRabbit: 재작업 재리뷰 지시에 따라 생략.
- 범위 밖: S-01(rate limit)과 S-05 연계는 사용자 결정 대상. F-01 서비스 레벨 테스트는 T09에서 작성.
