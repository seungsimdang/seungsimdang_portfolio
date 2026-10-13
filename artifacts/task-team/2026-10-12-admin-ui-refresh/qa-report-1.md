# QA 리포트 1: admin UI 개선 및 썸네일 업로드

- 작성: QA Engineer (T09)
- 브랜치: feature/admin-ui-refresh (HEAD 0cb79cc, 신규 테스트는 미커밋)
- 전체 판정: 조건부 통과 (자동화한 범위는 전부 통과, F1-F6 admin UI 동작은 자동 검증 수단이 없어 미검증)

## 실행 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm test` | 15 files, 187 tests 통과 (신규 4 files 포함) |
| `pnpm type-check` | 통과 (신규 테스트 타입 오류 2건은 수정 후 재실행해 통과) |
| `pnpm check` | `Checked 123 files ... No fixes applied.` 통과 |
| `pnpm knip` | 출력 없이 통과 |
| `pnpm test:e2e:local` | `50 passed (19.2s)` (desktop, mobile, E2E 전용 DB로 빌드와 실행, Production DB 미사용) |

## 신규 테스트 파일

모두 실제 소스를 import해 호출한다. 로직 복사 없음.

- `__tests__/api/thumbnail-upload-route.test.ts` (26 tests): `POST` from `src/app/api/admin/uploads/thumbnail/route.ts`. `@vercel/blob`과 next-auth는 기존 `admin-route.test.ts` 방식으로 mock.
- `__tests__/utils/portfolio-admin-service.test.ts` (10 tests): `updateProject`, `deleteProject`, `updateTalk`, `SlugConflictError`. DB는 큐 기반 체인 대역으로 mock하고 `.set()` 인자와 `del` 호출을 검증.
- `__tests__/utils/portfolio-thumbnail-read.test.ts` (13 tests): 실제 `loadProjects`를 통해 공개 읽기 썸네일 필터 검증.
- `__tests__/utils/migrate-script.test.ts` (8 tests): `scripts/migrate.mjs`를 자식 프로세스로 실행해 출력과 종료 코드 확인.

수정한 기존 파일은 없다.

## 검증 내용

### 업로드 route (F7 AC2, AC3, AC9)

- 세션 없음 401, allowlist 밖 403, Origin 없음/불일치 403, 모두 `put` 미호출.
- multipart 아님 415, Content-Length 4.5MB 초과 413, 파일 필드 둘 400, 필드명 오류 400, 문자열 값 400, 빈 파일 400.
- 4MB 초과 413, 정확히 4MB 통과.
- 확장자 허용 밖, 확장자 없음, 시그니처와 확장자 불일치(PNG/JPG 교차), 비이미지 시그니처, MIME 불일치, MIME 비어 있음 모두 400.
- png/jpg/jpeg 확장자/webp 정상 200과 `{ url }` 응답. `put`은 `access: "public"`, `addRandomSuffix: true`, 감지한 contentType으로 호출.
- 사용자 파일명(`../../evil name.png`)이 저장 키에 쓰이지 않음 (`thumbnails/image.png`).
- `put` 실패 500, 허용 호스트 밖 URL이면 `del` 호출 후 500.

### 서비스 (F7 AC10, AC11, F9 AC3)

- 편집 시 thumbnail 생략: `set` 인자에 `thumbnail` 키 없음, Blob 삭제 없음.
- `""`: `thumbnail: null` 저장, 이전 Blob 삭제.
- URL 교체: 새 URL 저장, 이전 Blob 삭제.
- 다른 행이 이전 URL을 참조하면 삭제 안 함.
- 이전 값이 `/images/...`면 삭제 대상 아님.
- `del` 실패해도 저장 성공.
- 프로젝트 삭제: Blob 썸네일은 삭제, `/images`는 미삭제.
- slug unique 위반(23505, `cause.code` 래핑 포함)을 프로젝트 편집과 발표 편집 모두 `SlugConflictError`로 변환.

### 공개 읽기 필터 (F7 AC7)

- `/images/...`와 Blob URL 그대로 반환.
- `..` 포함, 공백 포함, 다른 경로, `javascript:`, 외부 호스트, 호스트 접미사 위장, `http:` 는 썸네일만 생략 (렌더 중단 없음).
- `raw=true`는 원값 유지. Blob 호스트 환경변수가 비어도 `/images`는 읽힘.

### migrate.mjs (F10)

- `--build`: 환경 신호 없음, `VERCEL_ENV=development`, `CI=false`는 `Skipping build migration` 출력 후 종료 코드 0.
- `--build`: `VERCEL_ENV=preview|production`, `CI=true`, `MIGRATE_ON_BUILD=1`은 건너뛰지 않고 다음 단계(DATABASE_URL 확인)로 진행.
- `--build` 없이는 게이트 없이 동작.
- 잘못된 DATABASE_URL: `DATABASE_URL is not a valid URL`만 출력하고 종료 코드 1, 비밀번호 원문 미노출.

## 요구사항별 판정

| ID | 판정 | 근거 |
| --- | --- | --- |
| F1 | 미검증 | admin 화면 DOM(공개 Navbar/Footer 부재)을 검사하는 테스트가 없다. e2e는 공개 경로만 다룬다. 공개 경로 URL/렌더 불변(AC2, AC3)은 e2e 50건 통과(`navigation.spec.ts`, `real-project-data.spec.ts`)와 빌드 성공으로 확인. admin 쪽(AC1, AC5)은 로그인 세션이 필요해 자동화 수단이 없다. |
| F2 | 미검증 | 헤더 UI와 `profile.name` 표시는 컴포넌트/e2e 테스트가 없다. |
| F3 | 미검증 | `/admin` 리다이렉트는 인증 흐름이라 e2e 미작성. |
| F4 | 미검증 | 버튼 크기는 시각 요소, 자동 검증 없음. |
| F5 | 미검증 | 위계, aria-label, 터치 대상 자동 검증 없음. |
| F6 | 미검증 | draft 저장, 이탈 경고는 컴포넌트 테스트와 e2e가 없다(서버 API 계약은 변경 없음, 기존 admin-route 테스트 통과). |
| F7 | 통과(서버 범위) / 미검증(UI, 실제 Blob) | 통과: 업로드 route 26건, 서비스 썸네일 처리 7건, 읽기 필터 13건, 기존 스키마 테스트의 Blob URL 쓰기 검증. 미검증: 폼 UI(AC1, AC4, AC5), `next/image` Blob 표시(AC8)의 실제 로드, 실제 Blob 업로드/삭제(운영 확인 대상). 업로드 `put` 성공 후 `isValidThumbnail` 재검증은 mock 응답으로만 확인. |
| F8 | 미검증 | Production DB UPDATE는 실행 금지 대상, 운영 확인 대상. |
| F9 | 부분 통과 | 통과: slug unique 위반 409 변환(프로젝트, 발표). 미검증: slug 편집 UI, 경고 대화상자, replace 이동, 구 주소 404, 사전 중복 조회 UX. |
| F10 | 통과(허용 조건, 원문 미노출) / 미검증(실제 적용) | 통과: 빌드 허용 조건과 잘못된 URL 처리 8건, 로컬 e2e의 `MIGRATE_ON_BUILD=1` 빌드가 E2E DB에서 성공(`pnpm test:e2e:local` 빌드 단계 통과). 미검증: 적용할 마이그레이션이 있을 때의 실제 적용, 동시 빌드 락, Vercel Preview가 `ep-snowy-dew-b88kcy4t`를 쓰는지(requirements 265행 미확인 항목). 실제 DB 접속 경로는 지시에 따라 제외. |
| F11 | 미검증 | `scripts/migrate-thumbnails.mjs`는 Production DB와 Blob 쓰기가 필요해 실행하지 않았다. 운영 확인 대상. |

## 미검증 항목 요약과 사유

- F1-F6 admin UI: 저장소에 컴포넌트 테스트 환경(`__tests__/components`)이 없고 e2e는 인증 세션 없이 공개 경로만 다룬다. 수동 확인 또는 인증 우회 e2e 설계가 필요하다.
- 실제 Blob 업로드/삭제, `next/image`의 Blob 이미지 실제 로드: 토큰과 네트워크 필요, 지시에 따라 제외.
- F8, F11 Production DB 쓰기: 지시에 따라 제외.
- F10 마이그레이션 실제 적용과 Vercel Preview DB 분리 확인: 운영 확인 대상.

## 비고

- 서비스 테스트 초기 작성 시 DB 대역의 결과 큐가 한 칸 모자라 "Blob 삭제" 단언 2건이 실패했고, 큐를 보강해 해결했다(구현 결함 아님). "삭제하지 않음" 단언만 있는 테스트가 우연히 통과할 수 있어, 삭제 호출을 양성으로 확인하는 케이스를 함께 두었다.
- 구현 코드의 결함은 발견하지 못했다.
