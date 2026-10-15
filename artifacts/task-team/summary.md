# 블로그 검색 사이클 요약

## 요청과 범위

- 사용자 요청: "블로그 포스트들 검색 기능을 추가해줘".
- 확정 범위: 공개 `/blog`와 관리자 블로그 목록, 제목+본문 대소문자 무시 부분 일치, 입력 중 자동 검색(300ms debounce), react-query + suspensive `QueriesHydration` + axios, 검색어가 있는 공개 목록 noindex.
- 사이클 중 사용자 결정: 검색 쿼리 statement_timeout 2초(rate limit은 백로그), 기존 의존성 취약점(next·sharp·source-map-js) 포함, `@tanstack/react-query` 5.104.1 유지, 재리뷰 확인 훅 삭제, 최종 리뷰 Low 3건과 S2-01 포함, 기존 e2e 실패(글 상세 목록 링크 이름) 테스트 갱신.

## 단계 상태

| 단계 | 상태 | 산출물·근거 |
| --- | --- | --- |
| T01 | done | `00-input.md` |
| T02 | done | `requirements.md`, 사용자 확인 게이트 2회 |
| T03 | done | `design-spec.md` |
| T04 | done | `api-spec.md` |
| T05·T06 | done | 구현 커밋 `8af467f` |
| T07 | done | `code-review-1~3.md`, 사이클 최종 리뷰 조건부 통과(남은 Medium은 T09 테스트로 해소) |
| T08 | done | `security-review-1~3.md`, 최종 배포 승인 |
| 재판단 | done | `triage-1~3.md` |
| T09 | done | `qa-report-1.md`, 통과(일부 AC 미검증) |
| develop·main 병합 | done | 사용자 지시로 `--no-ff` 병합 |

## 확인한 검증 (orchestrator 직접 실행)

- `pnpm verify` 통과: harness:check 차이 0, harness:test 47개, knip, biome, type-check, `test:e2e:local` e2e 120건(fixture DB, 3100 포트).
- 전체 Vitest 37파일·466개 통과.
- `pnpm build` 통과, `/api/blog/posts`·`/blog` 동적 라우트. 로컬 빌드는 `migrate.mjs`가 Vercel·CI 외 환경에서 건너뜀.
- 운영 DB 읽기 스모크(3123 포트): 전체 378개, `q=react` 49개, 첫 HTML에 결과 포함, 검색어가 있을 때만 `noindex, follow`, 공개 API `no-store`, 비인증 관리자 GET 401 + `no-store`.
- 운영 DB 읽기 전용 확인: 트랜잭션 안 `set_config('statement_timeout','2000',true)`는 그 트랜잭션에서만 2s, 같은 트랜잭션의 `pg_sleep(3)`은 57014로 취소.
- `pnpm audit --prod` 취약점 0.

## 커밋 (`288f7a5..014abde`, 이 요약 갱신 커밋 제외)

- `cf9bb36`, `d78fdfc`: 요구사항, 디자인·API 명세.
- `8af467f`: 블로그 검색 구현.
- `154d5e0`: next 16.3.8, sharp·source-map-js override.
- `20c836f`: 1차 리뷰 지적 수정.
- `13cf1ff`: 산출물 사이클 폴더 이동, 2차 리뷰.
- `df8569f`: 재리뷰 확인 훅 삭제(사용자 지시, 하네스).
- `42ab6ba`: 관리자 라우트 오류 로그에서 SQL 파라미터 제외.
- `0458d5a`, `5d7409a`: 최종 리뷰 기록과 Low 3건 수정.
- `9dde941`: 단위·e2e 테스트와 QA 결과.
- `a374090`: 기존 글 상세 e2e 기대값 갱신.
- `cb2f5b3`: 사이클 요약과 개선 기록.
- `014abde`: 사이클 폴더 이동 롤백, 산출물을 `artifacts/task-team/` 최상위로 되돌림(사용자 지시).

## 검증 경계와 백로그

- 미검증 AC: AC9(XSS 렌더 e2e), AC22(오래된 응답 무시), AC24(오류·재시도 UI), AC25(낭독 문구 내용), AC26(페이지네이션의 q 유지, fixture 3건 한계), AC30(q 없는 빈 상태), AC33(관리자 행 마크업 불변), AC34(픽셀 레이아웃). 근거는 `qa-report-1.md`.
- SSR 경로 DB 시간 초과 폴백은 라이브러리 코드(`QueriesHydration.mjs`의 `skipSsrOnError` 기본값)로만 확인, 실행 재현 없음.
- 백로그: 공개 검색 API rate limit(S-01 잔여 위험), 검색용 DB 인덱스(pg_trgm 등), `@tanstack/react-query` 5.104.3 이상 갱신.
- CodeRabbit은 최종 리뷰에서 미실행.
- `artifacts/bug-team/postmortem-*.md` 2건은 Task Team 피드백 섹션이 없어 반영 항목 없음, git 추적 파일이라 삭제하지 않음.
