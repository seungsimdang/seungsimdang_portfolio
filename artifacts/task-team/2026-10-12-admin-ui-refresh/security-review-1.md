# 보안 리뷰 1 (T08) - admin UI 개선 및 Blob 썸네일 업로드

## 판정

**통과** (Critical 0, High 0, Medium 2, Low 5, Info 4). 배포 차단 사유 없음.
Medium 2건은 재작업 게이트(orchestrator 9-1)에서 처리 여부를 결정할 것을 권고함.

검토 범위: 지시된 전체 파일을 읽기 전용으로 검토함. 코드는 수정하지 않음.
`api-spec.md` 3-6절은 제목 번호 검색에 걸리지 않아 원문 대조는 못 했고, 코드 동작 기준으로 점검함.

## 통과 확인 항목 (문제 없음)

- 업로드 인증/인가: `adminRoute`가 Origin 검사 -> `requireAdmin`(세션 + GitHub ID allowlist) 순으로 핸들러보다 먼저 실행됨. 미인증 401, 비허용 403. allowlist env가 비어 있으면 전부 거부(fail closed).
- CSRF: POST/PUT/PATCH/DELETE는 Origin 헤더 필수, 없으면 거부. `Origin: null`은 `new URL` 예외로 거부. `NEXTAUTH_URL`이 있으면 Host 헤더는 쓰지 않아 Host 위조로 우회 불가. `x-forwarded-host` 불신 처리도 적절함.
- 파일 형식: 확장자 + 매직 바이트(PNG/JPEG/WebP RIFF) + 클라이언트 MIME 3중 일치 검사. SVG/HTML은 허용 목록에 없음. 저장 경로는 `thumbnails/image{ext}` 고정에 `addRandomSuffix: true`, `contentType`은 서버 판별값 사용 -> 파일명 기반 경로 탐색/덮어쓰기 불가.
- 크기: Content-Length 선검사(4.5MB) + `file.size` 4MB 검사. 엔트리 1개 제한.
- Blob URL 검증(`isValidThumbnail`): https, `hostname === env`, 원문 authority가 hostname과 정확히 일치(userinfo, 포트, 백슬래시, 개행 삽입 우회 차단), username/password/port/search/hash 거부. env 미설정 시 false(fail closed). 대문자 호스트는 거부되어 안전 쪽으로 실패함.
- 오픈 리다이렉트: `safeCallbackUrl`은 `/admin` 또는 `/admin/` 접두 + `//`, `\` 금지라 항상 같은 origin 상대 경로. 외부 이동 불가.
- 비밀값: `BLOB_READ_WRITE_TOKEN`은 서버 코드(route, 스크립트)에서만 사용, 클라이언트 번들(`thumbnail-field.tsx`)에 없음. `NEXT_PUBLIC_BLOB_HOSTNAME`은 공개 값. 에러 로그는 `name: message`만 출력하고 DATABASE_URL/토큰을 출력하는 경로 없음. 마이그레이션 실패 로그는 `error.name`만 출력.
- 공개 읽기 필터: `safeThumbnail`은 `^/images/[A-Za-z0-9._/-]+$` 레거시 경로(+ `..` 금지) 또는 `isValidThumbnail`만 통과시킴. `javascript:`/`data:`/외부 호스트 URL은 공개 응답에서 제거됨. 관리자 UI에서 `dangerouslySetInnerHTML` 사용 없음 -> XSS 경로 없음. 서버가 임의 URL을 fetch하는 코드가 없어 SSRF 경로 없음(`next/image`는 `remotePatterns`로 단일 호스트 + port/search 제한).
- 경로 탐색(`migrate-thumbnails.mjs`): `/images/` 접두, `\`/`..` 금지, `realpath` 후 `public` 하위 포함 검사, 일반 파일/크기/매직 바이트 확인. 심볼릭 링크 탈출도 realpath로 차단됨. 기본은 dry-run이고 `--apply`가 있어야 쓰기 수행. UPDATE는 `WHERE id AND thumbnail = 원본`으로 경합 안전.
- Blob 삭제 대상: `isOwnBlobUrl`(= `isValidThumbnail`) 통과분만, 다른 프로젝트가 참조 중이면 보존. 삭제는 DB 커밋 이후이고 실패해도 요청은 성공 처리(데이터 손실 없음).
- 마이그레이션 대상 DB 오인 방지: `--build` 모드는 `VERCEL_ENV in {preview, production}`, `CI === "true"`, `MIGRATE_ON_BUILD=1`일 때만 실행. `vercel env pull`이 넣는 `VERCEL_ENV=development`에서는 건너뜀. 단일 트랜잭션 + advisory lock + 실패 시 ROLLBACK. `run-e2e-local.sh`는 프로세스 env로 DATABASE_URL을 덮어쓰고, `node --env-file`은 기존 프로세스 env를 덮어쓰지 않으므로 `.env.local`의 Production URL이 새어 들어가지 않음.

## 취약점 목록

### Critical
없음.

### High
없음.

### Medium

**M-1. 수동 `pnpm db:migrate` 및 `portfolio:thumbnails:migrate`가 `.env.local`(Production) DB를 확인 절차 없이 대상으로 삼음**
- 위치: `package.json:25`, `package.json:27`, `scripts/migrate.mjs:12-21`, `scripts/migrate-thumbnails.mjs:8-22`
- 시나리오: `--build` 가드는 빌드에만 적용됨. 개발자가 `pnpm db:migrate`를 실행하면(`--build` 없음) 가드를 우회하고 `.env.local`의 Production `DATABASE_URL`에 곧바로 마이그레이션을 적용함. 썸네일 이전도 `--apply` 한 번으로 Production 행을 갱신함. 대상 DB를 사람이 볼 수 있는 출력이 없어 잘못 실행해도 알아채기 어려움.
- 수정 제안: 시작 시 대상 DB의 호스트명(비밀번호 제외)을 출력하고, 수동 실행은 `--yes` 또는 `CONFIRM_DB_HOST=<host>` 일치 확인을 요구함. `--apply` 경로도 동일하게 적용함. 의도된 운영 절차라면 문서에 명시하고 Low로 하향 가능.

**M-2. 업로드 요청 본문이 크기 검증 전에 전부 메모리에 적재될 수 있음 (Content-Length 없는 chunked 요청)**
- 위치: `src/app/api/admin/uploads/thumbnail/route.ts:73-84`
- 시나리오: Content-Length 선검사는 헤더가 있을 때만 동작함. 헤더가 없거나 거짓이면 `request.formData()`가 본문 전체를 파싱한 뒤에야 `file.size` 검사가 실행됨. 탈취된 관리자 세션 또는 악성 확장프로그램이 대용량 chunked 요청을 보내면 함수 메모리/시간 소모 가능. 인증된 관리자만 도달 가능하고 Vercel 플랫폼 본문 제한(4.5MB)이 1차 방어하므로 영향은 제한적.
- 수정 제안: `request.body`를 스트림으로 읽어 누적 바이트가 `MAX_REQUEST_BYTES`를 넘으면 중단하는 래퍼를 두거나, 플랫폼 제한에 의존한다는 점을 주석/문서에 명시함.

### Low

**L-1. Origin 비교가 scheme을 확인하지 않음**
- 위치: `src/lib/auth/admin-route.ts:43-52`
- 시나리오: `http://<허용 host>` Origin도 통과함. 운영은 HSTS(`max-age=63072000`)가 있어 실사용 위험은 낮음. 수정 제안: `new URL(origin).protocol`이 NEXTAUTH_URL의 protocol과 같은지 함께 비교함.

**L-2. 업로드 파일 내용은 헤더 바이트만 검증함 (polyglot/손상 파일 허용)**
- 위치: `route.ts:96-98`
- 시나리오: PNG/JPEG/WebP 헤더 뒤에 임의 데이터를 붙인 파일이 통과함. Blob은 `contentType`이 image/*로 고정되고 `X-Content-Type-Options: nosniff`가 앱 응답에 설정돼 있어 스크립트 실행 위험은 낮음(Blob 도메인 응답 헤더는 앱이 통제하지 않음). 수정 제안: 필요 시 서버에서 `sharp` 등으로 디코드/재인코드. 현 수준은 단일 관리자 전제에서 수용 가능.

**L-3. 업로드 후 저장하지 않은 Blob이 정리되지 않고 누적됨 (고아 파일)**
- 위치: `route.ts:113`, `thumbnail-field.tsx:91`
- 시나리오: 업로드만 하고 폼을 저장하지 않으면 Blob이 남음. 반복 업로드 시 저장소 비용 증가. 수정 제안: 주기적 정리 스크립트(DB에 없는 `thumbnails/` 객체 삭제) 또는 업로드 레이트 리밋.

**L-4. 업로드 엔드포인트에 호출 빈도 제한이 없음**
- 위치: `route.ts:64`
- 시나리오: 관리자 세션 탈취 시 Blob 쓰기 반복으로 비용 유발. 프로젝트에 `src/lib/utils/rate-limit.ts`가 있다면 재사용을 권고함.

**L-5. `isValidThumbnail`이 스토어 내 임의 경로를 허용함 (`thumbnails/` 접두 미강제)**
- 위치: `src/schemas/portfolio.schema.ts:14-33`, `portfolio-admin-service.ts:228,242`
- 시나리오: 관리자가 같은 스토어의 다른 객체 URL을 썸네일로 지정한 뒤 교체/삭제하면 그 객체가 삭제됨. 스토어를 썸네일 전용으로 쓰는 한 영향 없음. 수정 제안: 경로가 `/thumbnails/`로 시작하는지도 검사함. 레거시 이전분(`thumbnails/migrated`)도 같은 접두라 호환됨.

### Info

- **I-1.** Preview 빌드(`VERCEL_ENV=preview`)는 Preview 환경의 `DATABASE_URL`에 마이그레이션을 적용함. Preview가 Production DB를 공유하면 미병합 브랜치의 마이그레이션이 Production에 적용되므로, Vercel Preview용 DATABASE_URL은 별도 Neon 브랜치로 분리할 것.
- **I-2.** `ci.yml`은 `E2E_DATABASE_URL` secret으로 `CI=true` 빌드(마이그레이션 포함)를 수행함. secret이 e2e 전용 Neon 브랜치를 가리키는지 확인 필요. fork PR에는 secret이 전달되지 않으므로 해당 PR은 빌드 단계에서 DATABASE_URL 부재로 실패함(보안상 안전).
- **I-3.** `run-e2e-local.sh`의 `E2E_DATABASE_URL`이 Production URL과 같은지 검사하지 않음, 따옴표 제거도 `"`만 처리함. 값이 같다면 e2e fixture가 Production을 오염시킴. 사람의 설정 실수에 의존하는 항목이라 M-1의 호스트 확인 출력으로 함께 완화 가능.
- **I-4.** slug 편집 허용으로 공개 URL이 바뀌면 이전 URL은 404가 됨(리다이렉트 없음). 보안 이슈는 아니며 슬러그는 `^[a-z0-9]+(-[a-z0-9]+)*$` 및 `new` 예약어 검증으로 경로 주입 불가.

## 의존성

신규 의존성 `@vercel/blob`은 서버 전용(route, 서비스)에서만 import되며 클라이언트 번들 노출 없음. 취약 버전 여부는 `pnpm audit`를 CI에 추가해 확인할 것을 권고함(이번 리뷰에서는 실행하지 않음).

## 권고 우선순위

1. M-1: 마이그레이션/이전 스크립트의 대상 DB 호스트 출력과 확인 절차 추가.
2. M-2: 본문 스트림 크기 제한 또는 플랫폼 제한 의존 명시.
3. L-5, L-1: 소규모 수정으로 방어 심도 보강.
