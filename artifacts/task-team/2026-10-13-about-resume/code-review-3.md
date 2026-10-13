# 코드 리뷰 3차 (T07): admin 쓰기 rate limit

CodeRabbit: 재작업 재리뷰 지시이므로 생략

## 검토 범위

- 커밋 13b214f, e6e0e5b, c13ebde (`git show` 기준)
- 파일: `src/services/admin/rate-limit-service.ts`, `src/lib/auth/admin-route.ts`, `src/lib/api/api-error.ts`, `src/lib/api/response.ts`, `src/types/api-types.ts`, `src/lib/admin-client/use-admin-form.ts`, `src/db/schema/portfolio.ts`, `drizzle/0002_blushing_toro.sql`, `__tests__/api/admin-route.test.ts`, `__tests__/api/thumbnail-upload-route.test.ts`
- about 이력 재구성 코드와 보안 쟁점(버스트 근사 한계, I-9 등)은 제외

## Finding

### Medium

M-1. 새 rate limit 로직을 검증하는 테스트가 없음
- 근거: `__tests__/api/admin-route.test.ts:5`, `__tests__/api/thumbnail-upload-route.test.ts:5`는 `consumeAdminWriteQuota`를 항상 `{ allowed: true }`로 mock만 함. `grep`으로 확인한 결과 `rate-limit-service`를 실제로 다루는 테스트와 429 경로(`adminRoute`가 `Retry-After` 헤더와 함께 429를 내는지) 테스트가 없음
- 영향: 이번 사이클에서 가장 복잡한 계산인 `secondsUntilNextAllowed`(현재 버킷 분기, 다음 버킷 분기, `count + 1 <= MAX` 경계)가 회귀 시 감지되지 않음. 이 함수는 3번째 커밋에서 한 번 더 수정됐을 만큼 틀리기 쉬움
- 제안: `secondsUntilNextAllowed`를 export해 경계값(count = MAX - 1, count >= MAX, prevCount = 0)을 단위 테스트하고, `adminRoute`에 `allowed: false` mock으로 429, `Retry-After` 헤더, `fail`의 headers 전달을 검증하는 테스트 1건을 추가. 소스를 import해 검증해야 하며 계산식을 테스트에 복사하지 않을 것. DB 의존 upsert 분기는 mock으로 대체 불가하므로 QA 단계의 실DB 확인으로 보완해도 됨

### Low

L-1. 서버와 클라이언트의 429 문구가 이중 정의됨
- 근거: `src/lib/api/api-error.ts`(rateLimited 메시지)와 `src/lib/admin-client/use-admin-form.ts`의 `RATE_LIMITED_MESSAGE`가 같은 문구를 각각 가짐 (서버는 마침표 없음, 클라이언트는 마침표 있음)
- 영향: 기존 `FORBIDDEN_MESSAGE` 등 클라이언트가 상태 코드로 문구를 고정하는 패턴과는 일관됨. 문구가 갈라질 가능성만 있고 동작 문제는 없음
- 제안: 필수 아님. 유지해도 무방

L-2. 거부된 요청도 count를 올려 Retry-After 이후 재시도 시 차단이 길어질 수 있음
- 근거: `rate-limit-service.ts`의 upsert는 허용 여부와 무관하게 항상 count를 증가시킴. `secondsUntilNextAllowed`는 "다음 요청 1건"만 가정함
- 영향: 클라이언트가 Retry-After 전에 재시도하면 값이 실제보다 짧아질 수 있음. 동작 의도(거부 요청도 소비)로 보이며 보안 리뷰 범위와 겹치므로 참고용
- 제안: 함수 주석에 "거부된 요청도 count에 포함됨"을 한 줄 명시하면 이후 유지보수에 도움이 됨

## 결함 없음 확인 항목

- upsert 분기: SET 절의 `isCurrent`, `isPrevious`는 Postgres 규칙상 갱신 전 행 값을 참조하므로 현재 버킷 `count + 1`, 직전 버킷 `prev_count = count, count = 1`, 그 이상 오래됨 `prev_count = 0, count = 1`이 맞음. `windowStart`와 `prevCount`의 갱신 순서 의존 문제 없음
- RETURNING의 `windowStart`는 갱신 후 값이므로 `elapsedSeconds` 계산이 맞음. `now()`와 `date_bin`은 한 문장 안에서 같은 시각을 사용함
- 추정치 `prevCount * (remaining / W) + count`는 문서 주석의 공식과 일치함
- `secondsUntilNextAllowed` 수식을 직접 유도해 검증함: 현재 버킷 `t >= W * (1 - (MAX - count - 1) / prevCount)`, 다음 버킷 `u >= W * (1 - (MAX - 1) / count)`. `count + 1 <= MAX && prevCount > 0` 가드로 0 나눗셈 없음, count >= 1 이 보장되어 두 번째 나눗셈도 안전함. `Math.max(1, ceil())`로 최소 1초 보장
- 일관성: services 배치(`src/services/admin/`), `import "server-only"`, `fail`/`apiErrors`, `HttpStatusCode.TooManyRequests` 사용이 프로젝트 규칙과 맞음. 매직넘버 상태 코드 없음
- `ApiError`의 headers는 optional 마지막 인자이며 기존 호출부에 영향 없음. `response.ts`는 `headers: error.headers`만 추가해 undefined면 무시됨
- 카운터 조회 실패는 catch로 넘어가 500 처리, fail-closed임 (주석 명시). 순서는 Origin 검사, requireAdmin, rate limit이라 미인증 요청이 DB를 소비하지 않음
- 클라이언트 429 처리: `describeAuthFailure` 계열과 `describeFailure` 양쪽에 TooManyRequests 분기가 있고 기존 흐름(Unauthorized, Forbidden 이후, NOT_SEEDED 이전)과 맞음
- 마이그레이션 SQL, 스냅샷, 저널, 스키마(`prevCount` default 0 not null)가 서로 일치함
- 죽은 코드 없음. 내보낸 `WriteQuota` 타입은 `consumeAdminWriteQuota` 반환형으로 사용됨
- 주석 규칙: 대상 파일에서 em-dash 없음. 이번 사이클 한정 식별자(L-2, L-4, L-5, 요구사항 ID, 게이트 ID 등)를 인용한 주석을 grep으로 찾지 못함. 주석 종결은 명사형이며 한 줄 한 문장 형식을 따름. `rate-limit-service.ts` 상단 주석 중 "경쟁 조건 없이 원자적으로 처리함"은 `~함` 종결로 규칙에 맞음

## 최종 판정

통과 (조건부 권고). Critical/High 없음. M-1(테스트 부재)은 재작업 여부를 orchestrator 9-1 게이트에서 최종 결정하되, 최소한 `secondsUntilNextAllowed`와 429 응답 경로 테스트 추가를 권고함.
