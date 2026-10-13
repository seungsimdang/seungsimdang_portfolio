# 보안 리뷰 2 (T08) - 사이클 전체 최종 리뷰

이 문서는 admin UI 개선 및 Blob 썸네일 업로드 사이클의 **사이클 전체 최종 리뷰**다. 1차 finding 처리 확인과, 1차에서 본문을 읽지 못한 파일의 직접 검토를 함께 수행했다. 코드는 수정하지 않았다.

## 판정

**통과** (Critical 0, High 0, Medium 0, Low 3, Info 3). 배포 차단 사유 없음.
1차 Medium 2건 중 M-1은 수정으로 해소, M-2는 수정 안 함 사유가 타당함.

## 1. 1차 finding 처리 결과 대조

| ID | triage 판정 | 코드 확인 | 의견 |
| --- | --- | --- | --- |
| M-1 대상 DB 미표시 | 수정 | `scripts/migrate.mjs:24`, `scripts/migrate-thumbnails.mjs:23`에서 호스트만 출력 확인 | 해소. `--apply`가 명시적 확인 역할이라는 판단도 타당함. 신규 Low L-A 참고 |
| M-2 chunked 본문 | 수정 안 함 | `route.ts:64-84`는 그대로. `adminRoute`가 인증/Origin을 핸들러보다 먼저 실행 | 사유 타당. 플랫폼 4.5MB 제한 + 관리자 전용. 수용 |
| L-1 Origin scheme | 수정 안 함 | `admin-route.ts` 미변경 | 사유 타당. 이번 사이클 변경 밖이고 HSTS 환경. 별도 백로그 권고 |
| L-2 헤더 바이트만 검증 | 수정 안 함 | `route.ts:96-109`, `contentType`을 서버 판별값으로 고정 | 사유 타당. 단일 관리자 전제에서 수용 |
| L-3 고아 Blob | 수정 안 함 | `api-spec.md` 3절 "저장 전에 페이지를 나가면 Blob 고아 파일은 범위 밖" 명시 확인 | 사유 타당 (명세로 결정됨) |
| L-4 업로드 빈도 제한 | 수정 안 함 | - | 사유 부분 타당. 관리자 전용이나 비용 유발 경로는 남음. 수용 가능, 백로그 권고 |
| L-5 `/thumbnails/` 접두 | 수정 | `portfolio.schema.ts:24` `url.pathname.startsWith("/thumbnails/")` 확인. `new URL`이 `..`/`%2e%2e`를 정규화하므로 우회 불가. `isOwnBlobUrl`도 같은 함수라 삭제 대상이 `thumbnails/`로 한정됨 | 해소 |
| I-1 Preview 대상 | 해당 없음 | `api-spec.md` 5절 "환경 분리"에 Preview branch 분리 기록 | 타당 (코드로는 검증 불가, 문서 근거) |
| I-2 CI secret | 미확인 | - | 값 확인 불가하므로 수용. 운영자가 `E2E_DATABASE_URL`이 전용 Neon branch인지 1회 확인 필요 |
| I-3 e2e URL 동일 검사 | 수정 | `run-e2e-local.sh:11-14` 확인 | 해소. 단 비교 강도 약함, L-B 참고 |
| I-4 slug 404 | 해당 없음 | `project-form.tsx:156-165`, `talk-form.tsx:109-120` 에서 변경 전 confirm 확인 | 타당 |

추가 확인:
- `portfolio-service.ts:16,52` `LEGACY_THUMBNAIL_PATTERN = ^/images/[A-Za-z0-9._/-]+$` + `..` 금지. `%`, `:`, `\`, 공백이 클래스에 없어 `javascript:`/`data:`/외부 URL/인코딩된 탐색이 모두 걸러짐. 공개 읽기는 이 패턴 또는 `isValidThumbnail`만 통과. 관리자(raw)만 원문 노출이며 쓰기 경로는 스키마가 막음.
- `migrate.mjs:8-15` 빌드 허용 조건과 `package.json:7`의 `--build` 플래그 연결 확인. `db:migrate`(`package.json:27`)는 플래그 없이 항상 실행되는 수동 경로로 의도와 일치. 트랜잭션 + `pg_advisory_xact_lock` + 실패 시 ROLLBACK 유지.
- `migrate-thumbnails.mjs:84,97-150` 실패 행이 있으면 `exitCode = 1`. 조건부 UPDATE(`WHERE id AND thumbnail = 원본`) 유지.
- `sortable-list.tsx` `onClick`/`onPopState`: 취소 시 `preventDefault` + `stopImmediatePropagation`, `ignoreNextPopRef`와 `allowLeaving` tick 복원. 보안 영향 없음(UX 가드). 슬러그는 스키마 검증된 값이라 `Link href` 주입 불가.
- `thumbnail-field.tsx`, `admin-console-shell.tsx`는 이번 요청에서 변경 파일로 지정됐으나 지시된 신규 직접 읽기 대상이 아니라 1차 결론을 유지함(클라이언트 번들에 토큰 없음, `dangerouslySetInnerHTML` 없음).

## 2. 이번에 직접 읽은 파일 검토

- `src/app/layout.tsx`: 정적 셸, 문제 없음.
- `src/app/(public)/layout.tsx`: 공개 `getProfile()`은 비 raw 경로. 메타데이터는 React/Next가 이스케이프. 문제 없음.
- `src/app/admin/(console)/layout.tsx:8`: 레이아웃은 클라이언트 내비게이션 시 재실행되지 않으므로 레이아웃 가드만으로는 부족하다. 그러나 `(console)` 하위 8개 페이지 전부가 개별로 `requireAdminPage()`를 호출함을 grep으로 확인했고, `admin/login/page.tsx`는 `requireAdmin()`으로 별도 처리. API는 `adminRoute`가 보호. 인증 우회 경로 없음. 새 페이지 추가 시 같은 호출을 빠뜨리지 않도록 주의.
- `project-form.tsx`: 클라이언트 검증은 편의용이며 서버 스키마가 신뢰 경계(명세 일치). 썸네일 의미(생략=유지, `""`=제거, URL=교체)가 `toInput`(63-65행)과 서버 `updateProject`(197-199행)에서 일치. slug는 스키마 통과 값만 URL에 삽입. `uploadingRef`로 업로드 중 제출 차단. 문제 없음.
- `talk-form.tsx`: 링크는 `httpUrl`(http/https만)이라 `javascript:` 차단. 문제 없음.
- `route.ts`(업로드): 인증/Origin/형식/크기/고정 경로/랜덤 접미사/`contentType` 고정/반환 URL 재검증 후 실패 시 `del`. 명세 3절과 일치. 토큰/파일명 로그 출력 없음.
- `portfolio-admin-service.ts`: SQL은 Drizzle 파라미터화. 생성은 advisory lock + 개수 상한. 업데이트 `UNIQUE`(23505)는 409, FK는 404로 변환. Blob 삭제는 DB 커밋 후, 참조 검사 후, 실패 무시, URL/토큰 미로그. `updateTalk`는 strict 스키마라 mass assignment 불가. 명세 4절과 일치.
- `package.json`: 의존성은 `@vercel/blob` 외 신규 없음, 버전 고정(캐럿 없음). `engines`/`packageManager` 고정. `dev`/`build`에서 `check-upload-env.mjs`가 먼저 실행됨. `pnpm audit`는 이번에도 실행하지 않음.
- `api-spec.md` 3-6절 원문 직접 대조 완료. 불일치 항목 없음. 구현은 명세의 상태 코드(400/413/415/409/404), 4MiB/4.5MB 한도, `thumbnails/` 경로, 삭제 규칙, 빌드 마이그레이션 허용 조건, F11 조건부 UPDATE를 따름.

## 3. 취약점 목록

### Critical
없음.

### High
없음.

### Medium
없음.

### Low

**L-A. 잘못된 `DATABASE_URL`이면 Node 오류 출력에 URL 원문이 포함될 수 있음**
- 위치: `scripts/migrate.mjs:24`, `scripts/migrate-thumbnails.mjs:23` (`new URL(databaseUrl)`)
- 시나리오: 값이 URL 형식이 아니면 `new URL`이 `ERR_INVALID_URL`을 던지고, 잡히지 않은 예외로 출력될 때 Node가 `input` 속성(원문 값)을 함께 출력함. CI/Vercel 빌드 로그에 비밀번호 일부가 남을 수 있음. 형식이 틀린 값은 비밀번호를 포함한 불완전한 URL일 수 있어 가능성은 낮지만 영향은 비밀 노출.
- 수정 제안: `try { host = new URL(databaseUrl).hostname } catch { console.error("DATABASE_URL is not a valid URL"); process.exit(1) }`.

**L-B. `run-e2e-local.sh`의 동일 DB 비교가 문자열 완전 일치에 의존**
- 위치: `scripts/run-e2e-local.sh:5,11`
- 시나리오: 따옴표는 `"`만 제거하므로 `'`로 감싼 값, 줄 끝 공백/CR, 쿼리스트링 차이(`?sslmode=require` 유무)가 있으면 같은 DB여도 다른 값으로 판정되어 가드를 통과하고, 빌드 마이그레이션과 e2e fixture가 Production을 대상으로 실행될 수 있음. 설정 실수가 겹쳐야 하는 경우.
- 수정 제안: 두 URL에서 호스트(와 DB 이름)만 추출해 비교하거나 `tr -d "\"'\r "`로 정규화 후 비교.

**L-C. 1차 L-1, L-2, L-4 잔존 (수용)**
- Origin scheme 미비교, 헤더 바이트만 검증, 업로드 빈도 제한 없음. 모두 관리자 인증 뒤이고 영향이 제한적이라 수용함. 백로그에 두기를 권고.

### Info

- **I-A.** 위 M-2(chunked 본문)는 플랫폼 제한 의존임을 `route.ts` 주석이나 운영 문서에 한 줄 남기면 이후 런타임 변경(예: 자체 호스팅) 시 재검토 근거가 됨.
- **I-B.** `LEGACY_THUMBNAIL_PATTERN`은 F11 이전 완료 후 제거 예정으로 주석에 명시됨. dry-run 결과 `/images` 행이 요구사항의 5개가 아닌 1개(triage 기록)이므로 F11 실행 전 재확인 후 패턴 삭제 시점을 정할 것.
- **I-C.** I-2(CI `E2E_DATABASE_URL`이 전용 Neon branch인지)는 코드로 확인 불가하여 운영자 확인 항목으로 남음.

## 4. 결론

인증/인가(adminRoute + 페이지별 가드 + allowlist fail closed), CSRF(Origin 필수), 입력 검증(업로드 3중 검사, Blob URL 정확 일치 + `thumbnails/` 경로, slug/URL 스키마), 비밀 관리(서버 전용 토큰, 로그 미출력), SQL injection(Drizzle 파라미터화), XSS(`dangerouslySetInnerHTML` 없음, 링크 프로토콜 제한), SSRF 없음을 모두 확인함. 1차 지적은 처리되었고 수정 안 함 사유도 타당함. 신규 Low 2건(L-A, L-B)은 소규모 수정이 쉬우므로 재작업 게이트(9-1)에서 처리 여부를 결정할 것을 권고하며, 배포 승인에는 영향 없음.
