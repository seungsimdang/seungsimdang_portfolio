# security-review-3: about 이력서 재구성 (T08, 3차)

- 작성일: 2026-10-13
- 작성자: Security Reviewer (T08)
- 브랜치: `feature/about-resume`, 검토 HEAD `e6e0e5b`
- 방식: 정적 읽기 검토만 수행. 코드 수정, DB 접속, 테스트 실행은 하지 않았다.

## 최종 판정

**배포 승인** (Critical 0, High 0, Medium 0, Low 1, Info 2). 차단 조건에 해당하지 않는다.
orchestrator 9-1 게이트가 모든 finding을 재검토하므로 Low/Info의 재작업 여부는 orchestrator가 결정한다.

## 1. 검토 범위

(a) security-review-2의 L-4 해결 여부, I-5~I-7의 유효성.
(b) 커밋 `e6e0e5b`: `src/services/admin/rate-limit-service.ts`, `src/db/schema/portfolio.ts`(adminRateLimits.prevCount), `drizzle/0002_blushing_toro.sql`, `drizzle/meta/0002_snapshot.json`, `drizzle/meta/_journal.json`. 호출부는 `admin-route.ts:77-79`와 `api-error.ts:58-64`의 사용 방식만 확인했다.

## 2. 이전 finding 해결 여부

| finding | 판단 |
| --- | --- |
| L-4 고정 윈도 경계 2배 버스트 | 부분 해결(실용상 해결로 판단). 경계를 가로지르는 짧은 버스트는 상한이 생겼다. 단 슬라이딩 카운터의 근사 한계로 60초 구간 전체의 최악 총량은 여전히 2배에 가깝다(I-8). |
| I-5 마이그레이션 전 배포 시 500 | 유효. 0002가 새 테이블 생성이고 코드가 즉시 의존하므로 동일하게 적용된다. `migrate.mjs --build`가 Vercel preview/production에서 먼저 적용한다. 0002가 어느 DB에도 적용된 적이 없으므로 컬럼 불일치(구 0002 적용 DB) 위험은 없다. 이미 구 0002_small_famine이 적용된 DB가 있다면 `prev_count` 컬럼이 없어 실패하므로, "미적용" 전제를 배포 전에 확인할 것. |
| I-6 거부 요청도 DB 쓰기 | 유효. 행이 계정당 1개라 저장소 증가는 없다. 다만 새 구현은 거부 요청이 count를 올리는 점이 Retry-After 정확도에 영향을 준다(L-5). |
| I-7 `now()`가 트랜잭션 시작 시각 | 유효하고 새 구현에서는 영향이 조금 더 크다(I-9). |

## 3. 신규 finding

### Low

**L-5. Retry-After가 실제 허용 시점보다 약 1초 이르다 (거부 요청의 count 증가 미반영)**

- 근거: `rate-limit-service.ts:48-56`. RETURNING의 `row.count`는 이번 요청을 이미 포함한다. 클라이언트가 Retry-After 후 보내는 다음 요청은 count를 한 번 더 올리므로 허용 조건은 `prev*(rem/W) + count + 1 <= 60`이다. 코드는 `(MAX - count)/prev`로 임계를 계산해 `+1`이 빠졌다.
- 수치 예: prev=60, count=1, elapsed=0이면 추정치 61, 계산된 대기는 1초. t=1초에 재요청하면 count=2, 추정치 59+2=61로 다시 거부된다. 실제 허용은 t=2초다. 오차는 약 `W/prev`초(prev=60이면 1초, prev가 작을수록 커진다).
- 같은 계열: `row.count > MAX`이면 대기를 `remainingInBucket`로 계산한다(`:49-50`). 다음 버킷 시작 시 prev=count(>60), count=1이라 추정치가 60을 넘어 버킷 경계에서도 한 번 더 거부된다. 이후 새 버킷의 분기로 짧은 대기가 다시 계산되므로 수렴한다.
- 영향: 보안 영향 없음. Retry-After를 지키는 정상 클라이언트가 429를 한 번 더 받고 그때마다 count가 오를 뿐이다. 거부 요청이 count를 올리므로 거부 중 재시도를 계속하면 다음 버킷의 prev가 커져 스스로 잠기는 시간이 길어지지만, 대상은 인증된 admin 본인 계정뿐이다.
- 수정 제안: 임계에서 한 건을 더 예약한다. `(MAX - row.count - 1) / row.prevCount`로 바꾸고, count가 MAX 이상이면 대기 계산을 `remainingInBucket`로 유지하되 문서에 "다음 버킷 초반 재거부 가능"을 명시한다. 조치하지 않아도 배포 차단 사유는 아니다. 클라이언트가 현재 429 문구를 고정 표시하므로(`use-admin-form.ts`) 사용자 체감도 작다.

### Info

**I-8. 슬라이딩 카운터의 근사 한계로 60초 구간 총량은 최대 약 2배 (L-4 잔여 범위)**

- 경계 직후 버스트 상한 추론은 맞다. 직전 버킷 허용량 p, 새 버킷 경과 τ일 때 새 버킷 허용량 c는 `p*(1-τ/60) + c <= 60`을 따르므로 `p + c <= 60 + p*τ/60 <= 60 + τ`다. 경계를 가로지르는 구간에서 새 버킷 쪽 길이가 τ초면 총량은 60+τ 이하이며, 고정 윈도의 "경계 직후 즉시 60건 추가"는 사라졌다. 직전 버킷 허용량도 자체 추정식 때문에 60 이하다.
- 한계: 직전 버킷 요청이 끝 쪽에 몰려 있고 새 버킷에서 τ≈59 근처에 몰아 보내면 실제 60초 구간에 약 119건이 들어갈 수 있다. 평균 속도는 버킷당 60건이라 장기 총량은 묶인다.
- 판단: 인증된 admin 한정이고 kind별 50건과 256KiB 본문 상한이 별도로 있어 영향은 낮다. 조치 불필요.

**I-9. 락 대기 요청의 `now()`가 더 과거일 때 카운트가 리셋될 수 있는 극히 좁은 경합**

- 근거: `:31-32`. 저장된 `window_start`가 현재 버킷도 직전 버킷도 아니면(미래 버킷 포함) count=1, prev=0으로 초기화하고 `window_start`를 되돌린다. 버킷 경계에서 선행 요청이 새 버킷 값을 쓴 직후, 락 대기하던 이전 버킷 `now()`의 요청이 이 분기로 들어가면 한 번 리셋된다.
- 영향: 경계의 수 ms 구간에서 동일 계정의 동시 요청이 겹쳐야 하고 손실도 최대 한 버킷분이다. 동시 요청 수는 allowlist된 인증 계정이 제어하므로 의미 있는 우회가 아니다. 조치 불필요. 엄밀히 하려면 `windowStart > bucket`일 때 윈도를 되돌리지 않도록 `greatest`를 쓸 수 있다.

## 4. 확인했으나 결함 없는 항목

1. **ON CONFLICT SET의 갱신 전 값 의미론**: PostgreSQL은 SET의 모든 식을 갱신 전 행 값으로 평가한다. `count`(`:31`)와 `prevCount`(`:32`)가 참조하는 `window_start`, `count`, `prev_count`는 모두 갱신 전 값이고, `windowStart: bucket`(`:30`) 대입이 다른 SET 식에 영향을 주지 않는다. 현재 버킷이면 count+1과 prev 유지, 직전 버킷이면 prev=기존 count와 count=1, 그 외는 prev=0과 count=1로 세 분기가 상호 배타적이며 전이가 맞다. 미삽입 첫 요청은 INSERT 값(count=1, prev=0)이다.
2. **버킷 정렬과 시각 일관성**: `date_bin(make_interval(secs => 60), now(), 'epoch'::timestamptz)`는 epoch 기준 60초 정렬이다. INSERT 값, 두 분기 판정, SET, RETURNING이 모두 한 문장의 같은 `now()`를 쓴다. 직전 버킷 판정 `bucket - interval`은 초 단위 interval이라 DST 영향이 없다. `date_bin`은 PostgreSQL 14 이상이 필요하며 Neon에서 충족한다.
3. **RETURNING의 elapsed**: RETURNING은 갱신 후 행을 읽으므로 `window_start`는 항상 현재 `bucket`이다. 따라서 `now() - window_start`는 `[0, 60)` 범위이고 `remainingInBucket`은 `(0, 60]`이다. 분모는 상수 60이다. `extract(...)::float8`을 `Number()`로 변환해 문자열 반환 드라이버에서도 안전하다.
4. **추정치와 허용 판정**: `prev*(remaining/W) + count <= 60`은 표준 슬라이딩 윈도 카운터 식이고 현재 요청을 count에 포함한다. 61번째 요청이 거부되는 것은 prev=0 기준으로 맞다.
5. **0으로 나누기 없음**: else 분기(`count <= 60`)에 도달하려면 추정치>60이어야 하므로 `prev*(rem/W) > 0`, 즉 `prev > 0`이다. `remainingInBucket > 0`도 보장된다.
6. **Retry-After 음수 없음**: 같은 부등식에서 `W*(1-(60-count)/prev) > elapsed`가 도출되어 else 분기 대기는 양수이고, `Math.min(remainingInBucket, ...)`과 `Math.max(1, Math.ceil(...))`로 최소 1초 정수다. 사용자 입력이 섞이지 않아 헤더 인젝션 경로가 없다(`api-error.ts:64`).
7. **값 바인딩**: 사용자 유래 값은 `githubId` 하나이며 drizzle 파라미터로 바인딩된다. 60은 `${...}::double precision` 바인딩이다. `sql.raw` 사용이 없고, 식별자는 drizzle 컬럼 참조다. 키는 서버 세션과 allowlist를 통과한 값이다(2차 검토 확인 사항과 동일, 변경 없음).
8. **스키마와 SQL 일치**: `portfolio.ts:116-121`의 `prevCount integer notNull default(0)`와 `0002_blushing_toro.sql`의 `"prev_count" integer DEFAULT 0 NOT NULL`이 일치한다. 스냅샷 `0002_snapshot.json`의 `prev_count`도 동일하다.
9. **0002 재생성의 안전성**: `drizzle/` 아래에 `admin_rate_limits`를 언급하는 파일은 0002 SQL과 0002 스냅샷뿐이다. 0000/0001 SQL과 스냅샷에는 해당 없음. `0002_snapshot.json`의 `prevId`(`903996e9-...`)가 `0001_snapshot.json`의 `id`와 일치해 체인이 이어진다. 저널 idx 2의 `when`(1791899247818)이 idx 1(1791884082871)보다 크고 태그가 파일명과 일치한다. 구 `0002_small_famine.sql`은 `drizzle/`에 남아 있지 않다. 0002는 CREATE TABLE 한 문장이고 drop/alter가 없는 추가 전용이다.
10. **fail-closed**: `[row]`가 undefined이거나 쿼리가 실패하면 예외로 이어져 admin-route의 catch에서 500이 되고 핸들러는 실행되지 않는다(2차 검토 확인 사항과 동일, 호출부 `admin-route.ts:77-79` 변경 없음).
11. **시크릿/의존성**: 신규 환경변수, 시크릿, 의존성 추가 없음.

## 5. 검토 한계

- 정적 검토만 수행했다. 실제 생성 SQL(drizzle가 onConflict SET 안의 컬럼을 테이블 한정으로 렌더링하는지, RETURNING에서 갱신 후 값을 읽는지)은 PostgreSQL 의미론과 drizzle 동작에 대한 추론이다. 통합 테스트로 (1) 연속 호출 count 증가, (2) 61번째 거부, (3) 버킷 경과 후 prev 이월, (4) 두 버킷 이상 경과 후 prev=0을 한 번 확인하기를 권한다.
- 호스트 앞단의 IP 단위 제한은 범위 밖이다.
