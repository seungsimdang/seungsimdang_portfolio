# code-review-4: T07 코드 재리뷰 (4차)

- 범위: triage-3 CR3-01~05 해결 여부 + `git diff d14534f 1c8e199 -- src` 신규 결함
- CodeRabbit: 재작업 재리뷰이므로 생략 (n=4, 사이클 전체 최종 리뷰 아님)
- 판정: **통과** (Critical/High/Medium 없음, Low 1건 + Info 2건)

## 이전 finding 해결 여부

| ID | 결과 | 근거 |
| --- | --- | --- |
| CR3-01 | 해결 | `use-admin-form.ts:54-64` 403 중 `FORBIDDEN_ORIGIN`은 별도 문구, `signOut: false` |
| CR3-02 | 해결 | `sortable-list.tsx` 순서 변경(76-80)·삭제(95-97) 모두 `describeAuthFailure`로 401/403 처리 |
| CR3-03 | 해결 | `SlugConflictError`/`NotFoundError`/`OrderMismatchError`/`LimitExceededError` 모두 `this.name` 설정 |
| CR3-04 | 해결 | `assertBelowLimit`가 `createProject`/`createTalk` 진입부에서 `ORDER_SLUGS_MAX`(100) 검사, 순서 입력 상한과 같은 상수 공유 |
| CR3-05 | 해결 | 실제 위치는 `require-admin.ts:20`, `!githubId`를 앞에 두어 타입 좁힘 후 `isAllowedGithubId` 호출 순서로 정리 |

## 재작업 diff 점검

- LIMIT_EXCEEDED 매핑 일관성: 서버 throw(`portfolio-admin-service.ts`) → `admin-route.ts:86` → `apiErrors.limitExceeded`(409) → `ApiErrorCode`(`api-types.ts:15`) → 클라이언트 `describeFailure`(`use-admin-form.ts:86`) → api-spec 반영까지 일관. `assertBelowLimit`는 try 밖이라 `SlugConflictError`로 오분류되지 않음.
- `isValidThumbnail` 공유: 쓰기 스키마와 읽기 필터가 같은 함수 사용. `raw`(admin) 경로는 필터 제외로 편집 화면에서 기존 값 확인 가능. 문제 없음.
- `describeAuthFailure` 사용처: `sortable-list`(순서·삭제), `project-form`·`talk-form`(삭제) 3곳 모두 적용. 누락 없음.
- `require-admin` 조건 순서 변경: 동작 동일(둘 다 falsy면 403), 의미 변화 없음.
- 주석: 신규 주석 모두 명사형 종결, em-dash 없음, 사이클 한정 식별자(CR/SEC/BUG 번호) 인용 없음.

## 신규 finding

### CR4-01 (Low) assertBelowLimit는 count 후 insert라 동시 요청에서 상한을 넘길 수 있음

- 파일: `src/services/portfolio/portfolio-admin-service.ts:117-122` (호출 `:127`, `:233`)
- 근거: `db.$count`와 insert가 별개 쿼리라 동시 생성 요청 둘이 99개 상태에서 모두 통과하면 101개가 됨. 이 경우 순서 변경 검증(`max(ORDER_SLUGS_MAX)`)에서 항상 400이 되어, 함수 주석의 "순서 변경 요청이 항상 통과" 보장이 깨짐.
- 완화 요인: allowlist된 단일 관리자 전용이라 실제 발생 가능성이 매우 낮음. DB 제약으로 막기는 어려워 보임.
- 제안: 현 구현 유지 가능. 소프트 상한임을 주석에 한 줄(`ponytail:` 형식 또는 일반 주석) 남기거나, 필요 시 insert 문에 `where (select count(*) ...) < 100` 조건을 합쳐 원자화.

### CR4-02 (Info) 순서 변경 `try/finally`가 불필요

- 파일: `src/components/admin/sortable-list.tsx:60-67`
- 근거: `adminRequest`는 내부 catch로 예외를 던지지 않고 `{ ok: false, status: 0 }`을 반환하므로 `finally` 없이 기존 직선 코드와 동작이 같음. 오히려 `let result: Awaited<ReturnType<...>>` 선언이 가독성을 낮춤.
- 제안: 이전 형태(`const result = await ...; setBusy(false);`)로 복원 가능. 조치 선택 사항.

### CR4-03 (Info) `describeAuthFailure`가 폼 훅 파일에 위치

- 파일: `src/lib/admin-client/use-admin-form.ts:25`
- 근거: `describeFailure`의 401/403 문구와 중복 상수를 공유하긴 하나, 폼과 무관한 `sortable-list`가 훅 파일에서 import함. 동작 문제 없음. 파일 분리는 후속 정리 후보.
