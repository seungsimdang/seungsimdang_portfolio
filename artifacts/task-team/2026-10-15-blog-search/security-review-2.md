# Security Review 2 (T08 재리뷰, feature/blog-search)

## 판정

**배포 승인.** Critical/High 없음. S-01(사용자 결정 범위), S-02, S-03 해결 확인. 신규 finding은 Low 1건(S2-01)과 Info 1건(S2-02)이며 배포 차단 사유가 아님. orchestrator 9-1 게이트의 재작업 여부는 S2-01에 대해 orchestrator가 결정.

## 검토 범위와 한계

- Read로 blog-service.ts, constants/blog.ts, api/blog/posts/route.ts, api/admin/posts/route.ts, pnpm-workspace.yaml, blog-search-results.tsx, blog-search-box.tsx, admin-route.ts(98-101행)를 확인함. package.json은 `next` 16.3.8 한 줄만 grep으로 확인함.
- Bash 없음. 실행, `pnpm audit`, 실제 DB 동작은 직접 검증하지 못함. set_config 동작(트랜잭션 안에서만 2s, 이후 0 복귀, pg_sleep(3)이 57014로 취소)과 audit "No known vulnerabilities found"는 orchestrator가 보고한 사실을 전제로 함 (미검증, 인용).
- lockfile의 실제 해석 버전(sharp, source-map-js)은 읽지 않음 (미검증).

## 1차 finding 해결 여부

| ID | 결과 | 근거 |
| --- | --- | --- |
| S-01 | 사용자 결정 범위 해결, 잔여 위험 수용 | blog-service.ts:37-41 `searchTimeout()`이 `set_config('statement_timeout','2000',true)`를 실행하고, 검색(pattern 있음) 경로의 count(66행)와 목록 쿼리(86행)가 각각 `db.batch([searchTimeout(), query])`로 같은 트랜잭션에서 실행됨. 값은 `String(POST_SEARCH_TIMEOUT_MS)`를 바인딩 파라미터로 전달해 인젝션 여지 없음. 검색어 없는 경로는 타임아웃 미적용이며 인덱스 사용 가능한 단순 쿼리라 의도에 부합. rate limit은 triage-1의 사용자 결정에 따라 백로그. |
| S-02 | 해결 | route.ts:19-31이 `error.message`를 기록하지 않고 `error.name`과 `cause.code`만 기록. DrizzleQueryError의 params 포함 메시지가 공개 라우트 로그에서 제거됨. 주석도 사실과 일치. |
| S-03 | 해결 | api/admin/posts/route.ts:17-18에서 핸들러가 직접 `Cache-Control: no-store` 설정. |

## 재작업 코드 점검 결과

- SQL 인젝션: 새 SQL은 `set_config`뿐이며 값이 바인딩 파라미터. 검색 패턴은 기존대로 `ilike` 바인딩. 문제 없음.
- 타임아웃 범위: `is_local=true`이므로 트랜잭션 종료 시 복귀해 다른 쿼리에 새지 않음 (orchestrator 실측과 일치). 커넥션 풀 세션 오염 경로 없음(neon-http, 요청별 HTTP).
- 타임아웃 후 동작: 57014는 공개 라우트에서 catch되어 일반 500(`apiErrors.internal()`)만 응답, 내부 정보 노출 없음.
- 클라이언트 변경(blog-search-results.tsx, blog-search-box.tsx): 검색어는 JSX 텍스트와 `textContent`로만 렌더, `dangerouslySetInnerHTML` 없음. href는 고정 `basePath`와 `encodeURIComponent` 조합. `replaceState`는 `window.location.href` 기반 같은 오리진 경로. 서버 상한은 파서가 강제하므로 클라이언트 `maxLength`에 의존하지 않음. 새 취약점 없음.
- 의존성: `next` 16.3.8 확인. pnpm-workspace.yaml의 overrides `sharp >=0.35.5`, `source-map-js >=1.2.2`는 triage-1이 보고한 audit 검출 항목을 정확히 대상으로 함. audit 통과는 orchestrator 보고 기준. 범위 연산자(`>=`) override는 향후 major 상승을 허용하는 특성이 있으나 `minimumReleaseAge: 10080`과 `trustPolicy: no-downgrade`가 함께 적용돼 있어 위험은 낮음.
- allowBuilds `sharp: false`는 기존 설정이며 이번 변경과 무관.

## 신규 Findings

### S2-01 Low: admin 라우트 오류 로그가 DB 오류 메시지(검색어 포함)를 기록

- 위치: `src/lib/auth/admin-route.ts:98-101`
- 근거: 이 핸들러는 `${error.name}: ${error.message}`를 기록함. `/api/admin/posts?q=...`가 타임아웃(57014) 또는 DB 오류로 실패하면 DrizzleQueryError 메시지(triage-1이 `params: ${params}` 포함을 확인함)가 로그에 남아 관리자가 입력한 검색어가 기록됨. 인증된 관리자 본인 입력이고 응답에는 노출되지 않아 외부 유출 아님. 공개 라우트에서 S-02를 고친 것과 불일치함. 이번 재작업 이전부터 있던 코드이나, 검색 타임아웃 도입으로 이 경로의 오류 발생 가능성이 새로 생김.
- 제안: admin-route.ts의 로그도 공개 라우트처럼 `error.name`과 `cause.code`만 기록하거나, 검색어 로그 허용을 수용하고 그대로 둠. 다른 admin 라우트 로그 형식에 영향이 있으므로 사용자 판단 권장.

### S2-02 Info: SSR `/blog?q=` 타임아웃 시 Next 기본 오류 처리에 위임

- 위치: `src/services/blog/blog-service.ts:66,86` (호출처 `/blog` 페이지)
- 근거: 공개 페이지의 서버 렌더에서 57014가 발생하면 `listPosts`가 throw하며 Next 오류 경계가 처리함. 프로덕션에서는 클라이언트에 상세가 노출되지 않는 것이 Next 기본 동작이나, 서버 로그에는 쿼리 파라미터가 포함될 수 있음(Next가 기록하는 형식은 확인하지 못함, 추정). 보안 영향은 낮고 기능 측면은 code-reviewer 범위.
- 제안: 조치 불필요. 필요하면 S2-01과 함께 로그 정책을 정함.

## 잔여 위험 (수용됨)

- 인증 없는 `%q%` ILIKE에 대한 rate limit 부재. 요청당 최대 약 2초 x 2쿼리로 DB 점유 시간은 제한되나 다수 동시 요청에 의한 비용 증가는 가능. triage-1 사용자 결정에 따라 백로그. 규모 확대 시 `pg_trgm` 인덱스 또는 Vercel Firewall rate limit 검토.

## 차단 조건 점검

- Critical 미수정: 없음.
- 인증 로직 확인 불가: 아님 (이전 리뷰에서 확인, 이번 변경에서 인증 코드 변경 없음).
