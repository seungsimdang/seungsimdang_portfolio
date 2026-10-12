# Security Review 4 (T08, 4차)

- 브랜치: feature/admin-portfolio-cms (HEAD 1c8e199)
- 방식: 정적 코드 검토 (코드 수정 없음)
- 범위: (a) SEC3-01 해결 여부, (b) 3차 재작업으로 바뀐 파일의 신규 결함. 주변 기존 코드는 재점검하지 않음

## 판정

**배포 승인** (Critical 0, High 0, Medium 0, Low 0, Info 2)

## 이전 finding 해결 여부

| ID | 상태 | 근거 |
| --- | --- | --- |
| SEC3-01 | 해결 | `portfolio-service.ts:44-50` `safeThumbnail`이 비raw 경로에서 `isValidThumbnail`을 적용하고, `toProject`(`:84`)가 사용. 쓰기 스키마(`portfolio.schema.ts:16-18,80`)와 같은 함수를 공유해 규칙이 어긋날 수 없음. raw=true는 관리 편집 화면과 admin 쓰기 응답에만 쓰이며 기본값이 필터 적용(fail-safe) |
| SEC3-02 ~ 04 | 조치 불필요 유지 | triage-3 결정 |

## 변경 파일 점검

- `portfolio.schema.ts`: `THUMBNAIL_PATTERN`(`/images/` + `[A-Za-z0-9._/-]`, 백슬래시/쿼리/스킴/공백 불가) + `..` 차단. 빈 문자열은 쓰기 스키마에서만 허용되고 읽기에서는 `!thumbnail`로 undefined 처리. `ORDER_SLUGS_MAX = 100`은 상수 export뿐이며 순서 입력 `.max()`에 적용. 결함 없음
- `portfolio-admin-service.ts`: `assertBelowLimit`은 `db.$count` 파라미터 바인딩 쿼리, 사용자 입력 미개입. `LimitExceededError`는 고정 메시지. 아래 SEC4-01(Info) 참고
- `admin-route.ts`: 에러 매핑은 고정 메시지/코드만 반환하고 알 수 없는 에러는 `name: message`만 로그, 500 일반 메시지(정보 노출 없음). Origin 검사가 `requireAdmin`보다 먼저 실행되는 순서 유지. `LimitExceededError`는 인증/인가/Origin 통과 후에만 도달
- `require-admin.ts`: 조건 순서 변경 후에도 fail-closed 유지. 세션/`user` 없음은 401, `githubId` 없음 또는 allowlist 불일치는 403, 두 조건 모두 통과해야 `ok: true`. `!githubId`가 먼저 평가되어 undefined가 `isAllowedGithubId`로 전달되지 않음. 허용 경로는 단 하나(`:23`)
- `api-error.ts`, `api-types.ts`: `LIMIT_EXCEEDED` 코드/문구 추가뿐이며 동적 값 삽입 없음
- `use-admin-form.ts`, `sortable-list.tsx`, `project-form.tsx`, `talk-form.tsx`: 403을 `FORBIDDEN_ORIGIN`과 일반 403으로 구분해 고정 문구만 표시(서버 message 미반영, XSS 경로 없음). `describeAuthFailure`는 상태/코드 비교만 수행. 삭제 시 404를 성공 취급하는 것은 멱등 처리이며 보안 영향 없음. `dangerouslySetInnerHTML` 없음. 경로에 쓰이는 slug는 서버가 정규식으로 보장한 값

## Findings

### SEC4-01 (Info) 생성 개수 상한 검사는 비원자적

- 위치: `src/services/portfolio/portfolio-admin-service.ts:118-122` (호출 `:127`, `:233`)
- 근거: count 조회와 insert 사이에 락이 없어 동시 요청 시 상한(100)을 소폭 초과할 수 있음. 초과해도 이후 순서 변경이 zod `.max(100)`으로 거부되는 관리자 본인 대상 가용성 문제에 그침
- 공격 시나리오: 인증된 관리자 본인만 가능한 자기 영향 시나리오. 외부 공격자 경로 없음
- 수정 제안: 조치 불필요. 편집자 1명 운영 전제는 `reorderProjects` 주석과 동일. 필요 시 상한 초과 시 순서 변경 상한을 현재 개수에 맞춰 완화

### SEC4-02 (Info) 썸네일 `..` 차단이 파일명 내 연속 점까지 거부

- 위치: `src/schemas/portfolio.schema.ts:17`
- 근거: `a..b.png` 같은 정상 파일명도 거부(과잉 차단). 보안상 안전한 방향이며 가용성 영향만 있음
- 수정 제안: 조치 불필요

## 배포 결정

**배포 승인.** SEC3-01 해결 확인. 3차 재작업 파일에서 신규 Critical/High/Medium/Low 없음. `requireAdmin` 조건 순서 변경은 fail-closed를 유지함. 인증 로직 확인 완료.
