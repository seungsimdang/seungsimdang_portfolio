# QA 리포트 1차: about 이력서 재구성

- 브랜치 `feature/about-resume`, HEAD `fa3a08f`, 작성 시점 미커밋 변경은 아래 파일 목록 참조
- 판정: 신규 테스트 전부 통과, 소스 로직 결함 없음. 단 e2e, DB 통합, 브라우저 시각 확인은 미검증이므로 "조건부 통과"

## 1. 실행한 명령과 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm exec tsc --noEmit` | 오류 없음 |
| `pnpm exec vitest run` | 19 파일, 247 테스트 통과 (기존 188 + 신규 59) |
| `pnpm exec biome check` | 140 파일, 문제 없음 |
| `pnpm exec knip` | 출력 없음(통과). `secondsUntilNextAllowed` export 추가 후에도 통과 |
| `node scripts/check-comment-line-breaks.mjs` | 출력 없음(통과) |
| 테스트 파일 em-dash grep | 없음 |
| `pnpm test:e2e` | 미실행 (`E2E_DATABASE_URL` 미설정) |

## 2. 추가한 파일

소스 변경은 1건뿐이다. `src/services/admin/rate-limit-service.ts`의 `secondsUntilNextAllowed`에 `export`만 추가했고 로직은 그대로다.

### `__tests__/schemas/resume-schema.test.ts` (신규, 실제 스키마 import)

- 생성 스키마: 6개 kind 각각 통과, 허용 밖 kind(`experience`, 빈 값, 대문자, undefined, 숫자) 거부, kind 누락 거부, 미정의 필드(`gpa`) 거부
- 수정 스키마: 빈 period/subtitle 허용, 공백만 있는 period는 빈 값으로 trim, period 100자 통과/101자 거부, title 빈 값/공백 거부, title/subtitle 200/201자 경계, details 50/51개 경계, details 빈 문자열/201자 항목 거부, 수정에 kind 포함 시 거부
- 정렬 스키마: 정상 통과, 잘못된 kind, 빈 목록, 비 uuid, 중복 id, 상한(50) 통과/51 거부, `RESUME_KIND_MAX === 50`

### `__tests__/utils/resume-admin-service.test.ts` (신규, 기존 DB 프록시 mock 방식)

- `reorderResumeEntries`: 같은 집합의 다른 순서는 통과하고 id 수만큼 UPDATE 실행, id 누락/초과/동수 다른 id/빈 kind 모두 `OrderMismatchError`이며 batch 미호출
- `createResumeEntry`: batch 마지막 행을 `ResumeEntry`로 변환, 상한 검사 쿼리가 요청 kind(`award`)와 상한 50을 파라미터로 가짐(`PgDialect`로 SQL 직렬화해 확인), 코드 22012와 cause 22012는 `LimitExceededError`, 23505는 `SlugConflictError`, 그 밖 오류는 그대로 재던짐
- `updateResumeEntry`/`deleteResumeEntry`: 비 uuid id는 DB 호출 없이 `NotFoundError`, 없는 id는 `NotFoundError`, 존재하면 삭제 성공

### `__tests__/utils/rate-limit-service.test.ts` (신규)

- `secondsUntilNextAllowed` 직접 호출: 현재 버킷 내 해소(31초, 경과 10초면 21초), 직전 횟수 0이면 버킷 잔여, count>=61 다음 버킷 합산, count==60 경계, count==59 + prev>0 경계, 매우 큰 count 상한(120초 이하)
- `consumeAdminWriteQuota` (db를 mock하고 실제 함수 호출): 추정치 정확히 60은 허용, 61은 거부, 가중치 반영 허용 경계, Retry-After 올림 정수, 최소 1초, 거부 후 대기 시간이 지나면 추정치가 상한 이하임을 검증

### `__tests__/api/admin-route-rate-limit.test.ts` (신규)

- POST/PUT/PATCH/DELETE 거부 시 429 + `Retry-After: 37` + `RATE_LIMITED`, 핸들러 미실행
- 쿼터는 인증된 githubId로 소비
- GET은 쿼터 미소비이며 거부 상태여도 200
- Origin 불일치, 미인증, 비허용 계정의 쓰기는 쿼터 미소비
- 쿼터 조회 실패는 500이고 핸들러 미실행, 오류 메시지 미노출(fail-closed)

호출 확인: `secondsUntilNextAllowed(`, `consumeAdminWriteQuota(`, `reorderResumeEntries(`, `createResumeEntry(`, `adminRoute(`가 각 테스트에서 실제로 호출된다. 검증 대상은 모두 소스에서 import하며 로직 복사는 없다.

## 3. 수용 기준 분류

"통과"는 이번 QA에서 실행한 테스트 또는 실제 요청으로 확인된 것만 표시했다.

| 기준 | 결과 | 근거 |
| --- | --- | --- |
| F1-2 kind 6개만 허용 | 통과(스키마 층) | 스키마 테스트. DB check 제약은 미검증 |
| F1-1, 1-3, 1-4 마이그레이션 파일, 기존 테이블 무변경, 식별자 | 미검증 | DB 쓰기 금지, 마이그레이션 적용 불가 |
| F2-3 정렬 집합 불일치 거부 | 통과 | resume-admin-service 테스트 |
| F2-4 새 항목은 kind 마지막 | 미검증 | sort_order는 SQL 서브쿼리라 DB 필요 |
| F2-5 Zod 스키마(period 선택, 길이 상한, details 상한) | 통과 | resume-schema 테스트 |
| F2-1, 2-2 읽기 서비스, server-only, 정렬 순 | 미검증 | 읽기 정렬 순서 DB 필요(`toResumeEntry` 변환만 간접 확인) |
| F3 admin 화면 전체 | 미검증 | 브라우저/DB 쓰기 금지, e2e 미실행 |
| F4-1 adminRoute 감쌈, 401/403 | 부분 통과 | 기존 admin-route 테스트와 신규 테스트가 adminRoute 동작 확인. 개별 라우트 파일의 래핑은 미검증 |
| F4-2, 4-5 라우트 입력 검증, 프로필 tools 저장 | 부분 통과 | 스키마 단위만 확인(`profileInputSchema.tools` 존재는 기존 스키마 테스트 범위). 라우트 통합 미검증 |
| F5 공개 about 렌더 | 부분 통과 | 사용자 dev 서버(3000)에 읽기 GET `/about` 200, `<h3 class="text-h3">`로 경력/학력/활동 제목 렌더 확인. 섹션 순서, 숨김, 학점 미표시, 모바일 가로 스크롤은 미검증(브라우저 미설치) |
| F6 시드 | 미검증 | DB 쓰기 금지 |
| F7-1 단위/통합 테스트 | 통과 | 정렬, ORDER_MISMATCH, 삭제, 스키마 경계 신규 테스트. "빈 kind에 새 항목 마지막 순서"는 DB 필요로 미검증 |
| F7-2 e2e | 미검증 | `E2E_DATABASE_URL` 없음 |
| F7-3 lint, knip, 주석 규칙 | 통과 | 위 명령 결과(전체 `pnpm verify`는 e2e 포함이라 미실행) |
| F7-4 회귀 | 부분 통과 | 기존 188 테스트 통과. 홈 히어로/기타 admin 화면 렌더는 미검증 |
| 비기능 쓰기 rate limit(triage-4 M-1) | 통과 | 위 rate-limit, admin-route-rate-limit 테스트 |

## 4. 이관 항목 처리

- Low-5(스키마, 정렬, 상한): 위 신규 테스트로 해소. kind별 상한은 "SQL이 요청 kind와 상한 50으로 개수를 센다"와 "22012 → `LimitExceededError`"까지 확인했다. 실제 51번째 INSERT 거부는 DB가 필요해 미검증.
- M-1(Retry-After 경계, 429 헤더, GET 미소비): 해소.
- Low-2(`text-h3` 시각 확인): 부분. `.text-h3`는 `clamp(1.5rem, 3vw, 2rem)`(24px~32px), line-height 1.75이고 about 활동 제목 `h3`에 적용됨을 서버 HTML로 확인했다. 브라우저가 설치되어 있지 않아(`playwright install` 필요, 네트워크 설치는 하지 않음) 실제 렌더 크기/스크린샷은 미확인.

## 5. 발견한 결함

- 차단급 결함 없음.
- Low(정보): `createResumeEntry`가 `mapCreateError`를 공유해 코드 23505를 `SlugConflictError`로 변환한다. `resume_entries`에는 unique 제약이 없어 현재 도달 불가이고 동작 영향은 없다. 테스트가 현 동작을 고정하고 있으므로 정리 시 해당 케이스도 함께 갱신 필요.
- 참고: `reorderResumeEntries`는 확인 SELECT와 batch UPDATE 사이 경합 한계를 주석에 이미 명시하고 있고 단독 편집자 전제다. 결함으로 보지 않음.

## 6. 미검증 항목과 사유

- e2e 전체(`pnpm test:e2e`): `E2E_DATABASE_URL` 미설정
- DB 통합(마이그레이션 check 제약, sort_order 부여, 시드 중복 방지, 상한 실제 거부, 읽기 정렬): 로컬 `DATABASE_URL`이 운영 DB라 쓰기/마이그레이션 금지
- admin 화면과 API 실동작: 운영 DB에 `admin_rate_limits` 없음 + 운영 데이터 변경 위험으로 실행하지 않음
- 브라우저 시각/반응형(`text-h3` 크기, 모바일 가로 스크롤, 섹션 간격): playwright 브라우저 미설치
- dev 서버: 3000번에 이미 사용자 서버가 있어 별도 포트로 새 서버를 띄우지 못했고(Next가 동일 디렉터리 중복 실행 거부), 내가 띄운 프로세스는 없다. 읽기 GET만 3000에 수행했다.

## 7. 변경 파일 (미커밋)

- `src/services/admin/rate-limit-service.ts` (`secondsUntilNextAllowed` export 추가만)
- `__tests__/schemas/resume-schema.test.ts`
- `__tests__/utils/resume-admin-service.test.ts`
- `__tests__/utils/rate-limit-service.test.ts`
- `__tests__/api/admin-route-rate-limit.test.ts`
