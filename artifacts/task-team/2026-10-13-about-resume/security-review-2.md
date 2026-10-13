# security-review-2: about 이력서 재구성 (T08, 2차)

- 작성일: 2026-10-13
- 작성자: Security Reviewer (T08)
- 브랜치: `feature/about-resume`, 검토 HEAD `13b214f`
- 방식: 정적 읽기 검토만 수행. 코드 수정, DB 접속, 테스트 실행은 하지 않았다.

## 최종 판정

**배포 승인** (Critical 0, High 0, Medium 0, Low 1, Info 3). 차단 조건에 해당하지 않는다.
orchestrator 9-1 게이트가 모든 finding을 재검토하므로 Low/Info의 재작업 여부는 orchestrator가 결정한다.

## 1. 검토 범위

(a) security-review-1의 finding 해결 여부와 `triage-2.md`의 기각 사유 타당성.
(b) 커밋 `13b214f`가 만든 코드: `rate-limit-service.ts`, `admin-route.ts`, `api-error.ts`, `response.ts`, `api-types.ts`, `use-admin-form.ts`, `db/schema/portfolio.ts`(adminRateLimits), `drizzle/0002_small_famine.sql`, `drizzle/meta/_journal.json`. 테스트 2개는 mock 추가 여부만 확인(`admin-route.test.ts:5`에서 `@/services/admin/rate-limit-service` mock 확인). 재작업 주변 기존 코드는 새로 훑지 않았고, 키 출처 확인을 위해 `require-admin.ts`와 배포 순서 확인을 위해 `scripts/migrate.mjs` 상단만 읽었다.

## 2. 이전 finding 해결 여부

| finding | 처리 | 판단 |
| --- | --- | --- |
| L-1 정렬 SELECT와 UPDATE batch 사이 경합 | orchestrator 기각 | 동의. sort_order에 unique 제약이 없고(생성은 insert 시점 `max+1`, 삭제는 0행 UPDATE, 동시 정렬은 단일 트랜잭션 batch 단위로 마지막이 이김), kind 경계는 `assertSameSet`과 UPDATE의 kind 조건이 막는다. 제가 1차에서 적은 영향("순번이 어긋날 수 있음")은 상대 순서만 의미가 있다는 전제에서 무해하다. 반박 근거 없음. |
| L-2 admin 쓰기 rate limit 부재 | 재작업 (`13b214f`) | 해결. 세부 검증은 3절 참고. 신규 finding 참고. |
| L-3 시드 스크립트 `--yes` 호스트 미검증 | orchestrator 기각 | 동의. api-spec 10절이 `--yes`를 명시했고 쓰기가 모두 조건부(삭제 없음)이며 운영 적용이 이미 완료됐다. 1차에서도 "현 상태로 허용 가능"이었다. |
| I-1 ~ I-4 | 조치 없음 | 동의. I-1은 summary.md의 운영 적용 기록으로 확인됐다고 triage에 기재(이 검토에서 재확인하지 않음). |

## 3. 신규 finding

### Low

**L-4. 고정 윈도 방식이라 윈도 경계에서 최대 2배 버스트 허용 (재작업 코드, 설계 한계)**

- 근거: `rate-limit-service.ts:18,25-26`. `window_start`가 만료되면 count를 1로 리셋하는 고정 윈도다.
- 영향: 윈도 끝 직전 60건 + 새 윈도 직후 60건 = 짧은 시간에 최대 약 120건이 통과한다. 인증된 admin만 도달 가능하고 kind별 50건 상한과 256KiB 본문 상한이 총량을 묶으므로 실질 영향은 낮다. 한도 초과 요청도 count를 증가시키지만(`:26`) int 오버플로에 닿으려면 비현실적인 요청량이 필요하다.
- 수정 제안: 조치 불필요. 엄격히 필요하면 윈도를 줄이고 한도를 낮추거나 슬라이딩 윈도로 바꾼다.

### Info

**I-5. 마이그레이션 전 코드 배포 시 모든 admin 쓰기가 500 (배포 순서)**

- 근거: `admin-route.ts:75-81`에서 쿼터 조회 실패는 catch로 넘어가 500이 된다(`:98-102`). 테이블이 없으면 쓰기 전체가 실패한다.
- 완화: `scripts/migrate.mjs --build`가 Vercel preview/production 빌드에서 마이그레이션을 먼저 적용한다(`migrate.mjs:7-13`, VERCEL_ENV가 preview/production일 때만). 로컬 개발 DB와 `vercel env pull`로 개발 환경을 쓰는 경우에는 자동 적용되지 않으므로 `db:migrate`를 먼저 실행해야 한다. 운영 DB에 선적용하는 절차(이력 마이그레이션과 같은 방식)를 쓰면 위험이 없다.
- 판단: 의도된 fail-closed 동작이며 결함이 아니다. 읽기 경로와 GET 라우트는 영향받지 않는다.

**I-6. 한도 초과 요청도 DB 쓰기를 발생시킴**

- 근거: 거부 요청마다 upsert가 실행된다(`:19-32`).
- 영향: 인증된 admin이 과다 요청하면 자기 행 하나에만 쓰기가 몰린다. 행이 allowlist 크기로 한정되어 저장소가 늘지 않는다. 조치 불필요.

**I-7. `now()`는 트랜잭션 시작 시각이라 락 대기 요청의 시각이 약간 과거일 수 있음**

- 근거: 동시 요청이 같은 행에서 대기하면 대기 쪽의 `now()`가 선행 요청이 쓴 `window_start`보다 미세하게 이를 수 있다(READ COMMITTED).
- 영향: 윈도 리셋이 밀리초 단위로 늦어질 뿐이고 `greatest(1, ceil(...))`가 Retry-After를 최소 1초로 보장한다. 우회나 오차 누적 없음. 조치 불필요.

## 4. 확인했으나 결함 없는 항목

1. **upsert 원자성**: `rate-limit-service.ts:19-32`는 `INSERT ... ON CONFLICT (github_id) DO UPDATE` 단일 문장이다. PK 충돌 시 행 락으로 직렬화되므로 동시 요청이 카운트를 잃지 않는다. SELECT 후 UPDATE 패턴이 아니다.
2. **윈도 리셋 정확성**: 만료 판정(`:18`)과 `window_start`/`count` 갱신(`:25-26`)이 같은 `expired` 식을 쓰며 한 문장 안에서 같은 행 값을 본다. 한 쪽만 리셋되는 불일치가 없다.
3. **시계 기준이 DB `now()`**: 삽입 값(`:21`), 만료 판정, 갱신, Retry-After 계산(`:31`) 모두 DB 시각이다. 애플리케이션 인스턴스 간 시계 차이의 영향이 없다. RETURNING의 `window_start`는 갱신 후 값이므로 Retry-After가 새 윈도 기준으로 계산된다.
4. **카운트 키 위조 불가**: 키는 `requireAdmin`이 반환한 `githubId`다(`require-admin.ts:19-23`). 서버 세션(`getServerSession`)에서 오며 allowlist(`isAllowedGithubId`)를 통과한 값만 쓴다. 요청 헤더/본문/쿼리 유래 값이 아니다. 비인증/비허용 요청은 쿼터 단계에 도달하지 않아 행을 만들 수 없다.
5. **검사 순서**: Origin(`admin-route.ts:64`) -> `requireAdmin`(`:67`) -> rate limit(`:75-81`) -> handler(`:82`). 비인증 요청이 DB 쓰기를 유발하지 않고, 변이 메서드에만 적용된다(`MUTATING_METHODS`).
6. **fail-closed**: 쿼터 조회 예외는 catch에서 500으로 처리되고 핸들러가 실행되지 않는다(`:75-77` 주석, `:98-102`). `[row]` 구조분해가 undefined면 TypeError로 역시 500이다. 500 응답 문구는 고정이고 로그는 `name: message`만 남긴다.
7. **Retry-After**: `greatest(1, ceil(extract(epoch from ...)))::int`로 1 이상 정수이며 `String()`으로 헤더화된다(`api-error.ts:64`). 사용자 입력이 섞이지 않아 헤더 인젝션 경로가 없다.
8. **SQL 바인딩**: 값은 `githubId`와 상수 60뿐이며 모두 drizzle 바인딩 파라미터다(`make_interval(secs => $n::double precision)`). `sql.raw` 사용 없음. 테이블/컬럼은 drizzle 식별자 보간이다.
9. **헤더 전달의 부작용 없음**: `ApiError.headers`는 선택 인자이며 `rateLimited`만 설정한다(`api-error.ts:11,64`). `fail()`의 `headers: error.headers`(`response.ts:18`)는 다른 에러에서 undefined라 응답이 이전과 동일하다.
10. **클라이언트 처리**: `use-admin-form.ts:34,81`은 429를 고정 문구로 표시한다. 서버 메시지나 헤더를 DOM에 삽입하지 않는다.
11. **마이그레이션 추가 전용**: `0002_small_famine.sql`은 `CREATE TABLE "admin_rate_limits"` 한 문장뿐이고 drop/alter가 없다. 저널 항목 idx 2의 `when`이 이전보다 크고 `0002_snapshot.json`이 존재한다. 스키마(`portfolio.ts:115-118`)와 SQL이 일치한다. 기존 행 영향 없음.
12. **시크릿/의존성**: 신규 환경변수, 시크릿, 의존성 추가 없음.

## 5. 검토 한계

- 정적 검토만 수행했다. 동시 요청 재현, 실제 생성 SQL 확인(drizzle가 RETURNING에서 컬럼을 테이블 한정 참조로 렌더링해 갱신 후 값을 읽는다는 점은 PostgreSQL 의미론에 근거한 추론), 테스트 실행은 하지 않았다. 통합 테스트로 두 번 연속 호출 시 count 증가와 61번째 거부를 한 번 확인하면 좋다.
- 호스트 앞단(Vercel, 프록시)의 IP 단위 rate limit은 이 검토 범위가 아니다. 이 구현은 인증된 계정 단위 제한이다.
