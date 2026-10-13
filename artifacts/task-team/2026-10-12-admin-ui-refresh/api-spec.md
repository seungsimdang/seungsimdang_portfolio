# 관리자 UI 개선 API 및 데이터 계약

- 작성일: 2026-10-12
- 담당: T04 Backend Developer
- 입력: `requirements.md`, 현재 API/서비스/스키마 코드, 로컬 Next.js 16.3.6 문서
- 범위: API 계약, DB 영향, Blob 설정, migration 실행 및 운영 절차

## 1. 결론

- 기존 `profile`, `projects`, `experiences`, `tech_talks` 테이블을 유지한다. 이번 변경으로 DB 컬럼이나 새 테이블을 추가하지 않는다.
- 관리자 인증은 기존 `adminRoute`의 세션 검사와 same-origin 검사를 계속 사용한다. 성공 응답은 `{ data, status }`, 오류는 `{ data: { code, message, fieldErrors? }, status }` 형식이다.
- 새 API는 `POST /api/admin/uploads/thumbnail` 하나다. 구현에 `@vercel/blob` dependency를 추가한다. 프로젝트 편집 PUT에 `slug`를 추가하고 썸네일 필드의 생략/빈 값 의미를 고정한다.
- `/images` 썸네일이 남아 있는 배포 직후 호환을 위해 편집 요청에서 `thumbnail` 생략은 기존 DB 값을 유지한다. `thumbnail: ""`은 제거하여 `null` 저장, 허용된 Blob URL은 교체다.
- 공개 Blob 호스트는 비밀이 아니며 `NEXT_PUBLIC_BLOB_HOSTNAME` 하나로 클라이언트 URL 검사와 `next/image` 허용 목록을 설정한다. 쓰기 토큰은 서버 전용 `BLOB_READ_WRITE_TOKEN`이다.
- slug 충돌은 프로젝트와 발표 각각의 기존 DB unique 제약을 최종 판정자로 두고 HTTP 409 `SLUG_CONFLICT`로 반환한다.
- 빌드 migration에는 동시 실행 방지가 필요하다. 현재 Drizzle PostgreSQL migrator는 마지막 migration 기록 조회 후 트랜잭션을 열며 DB advisory lock을 사용하지 않는다. 이 호출을 그대로 동시 실행 안전하다고 간주하지 않는다.

## 2. 현재 데이터베이스

`src/db/schema/portfolio.ts`에 정의된 스키마가 그대로 유지된다.

| 테이블 | 관련 컬럼 | 변경 |
| --- | --- | --- |
| `profile` | `id`, `name`, `title`, `tagline`, `description`, `email`, `github`, `skills`, `updated_at` | 없음. Production의 `name` 데이터 변경은 별도 승인된 작업 |
| `projects` | `id`, `slug` unique, `thumbnail` nullable text, `sort_order`, 나머지 프로젝트 필드 | 컬럼·제약 변경 없음. 편집 API만 slug 변경 허용 |
| `experiences` | `project_id` FK (`projects.id`, cascade), `sort_order`, 상세 필드 | 없음. 프로젝트 slug와 무관하게 연결 유지 |
| `tech_talks` | `id`, `slug` unique, `sort_order`, 발표 필드 | 컬럼·제약 변경 없음. 편집 API만 slug 변경 허용 |

프로젝트와 발표의 slug는 각 테이블 안에서만 고유하다. slug 형식은 영문 소문자/숫자를 하이픈으로 구분하며 64자 이하, `new` 금지다. 기존 DB 형식 check와 unique 제약을 유지한다. slug 리다이렉트 이력 테이블은 추가하지 않는다.

F6 순서 저장은 현재와 같이 프로젝트/발표별 전체 slug 배열을 받으며 별도 스키마 변경은 없다. F8 프로필 이름 변경과 F11 이미지 이전은 운영 데이터 작업이며 별도의 REST endpoint를 만들지 않는다. F10의 migration도 런타임 API가 아니다.

## 3. API 계약

모든 변경 요청은 같은 origin에서 보내며 admin session이 필요하다. `adminRoute`가 세션 없는 요청에는 401, 권한 거부에는 403, 허용되지 않은 Origin에는 403을 반환한다. 입력 형식 오류는 400, 충돌은 409, 대상 없음은 404다.

### 기존 endpoint 유지

| 메서드와 경로 | 계약 |
| --- | --- |
| `POST /api/admin/projects` | 프로젝트 생성. 현재 slug 및 본문 검증을 유지한다. 썸네일 `thumbnail` 생략 또는 `""`은 null, 허용된 Blob URL은 저장한다. 성공 201. |
| `PUT /api/admin/project-order` | `{ "slugs": string[] }`로 전체 프로젝트 순서를 교체한다. 이동 중 요청은 없고 저장 버튼에서 1회 호출한다. slug 집합 불일치 409 `ORDER_MISMATCH`. |
| `PUT /api/admin/talk-order` | 발표 순서에 같은 규칙을 적용한다. |
| `PUT /api/admin/profile` | 기존 프로필 갱신 및 성공 후 `revalidatePath("/", "layout")` 동작을 유지한다. |
| `DELETE /api/admin/projects/{slug}` | 프로젝트와 experiences 삭제 성공 후 기존 응답을 유지한다. 삭제한 프로젝트의 이전 Blob은 공유 참조가 없을 때만 best-effort로 삭제한다. |
| `DELETE /api/admin/talks/{slug}` | 발표 삭제, 성공 응답 및 기존 캐시 무효화를 유지한다. |

### 썸네일 업로드

`POST /api/admin/uploads/thumbnail`

- 인증/출처: 기존 `adminRoute` 보호를 적용한다. public Blob URL이라도 업로드 권한은 관리자에게만 준다.
- 요청: `multipart/form-data`; 단일 `file` 필드의 `File` 값만 받는다. JSON, 누락된 필드, 여러 파일은 400 또는 415로 거부한다.
- 한도: 파일 크기는 `4 * 1024 * 1024` bytes 이하, 0 bytes는 거부한다. Vercel Functions 요청 본문 상한은 4.5 MB이므로 4 MiB 파일과 multipart 경계를 포함한 요청이 그 상한 아래에 있다. `Content-Length`가 있으면 상한 초과를 먼저 거부하고, 실제 `File.size`도 다시 확인한다.
- 형식: PNG signature, JPEG signature, RIFF/WEBP signature를 서버에서 검사한다. 클라이언트가 보낸 MIME과 파일명만 신뢰하지 않는다. 감지된 형식을 Blob `contentType`에 사용한다. 확장자와 signature가 불일치하면 거부한다.
- 저장: 서버에서 `@vercel/blob`의 `put()`을 사용하고 `access: "public"`, 고정한 콘텐츠 타입, `addRandomSuffix: true`를 지정한다. 사용자 파일명은 pathname으로 사용하지 않는다. 모든 업로드는 프로젝트 slug와 무관한 `thumbnails/` 경로에 저장한다.
- 응답 200:

```json
{
  "data": {
    "url": "https://<NEXT_PUBLIC_BLOB_HOSTNAME>/thumbnails/<generated-name>.webp"
  },
  "status": 200
}
```

- 상태: 잘못된 파일은 400 `VALIDATION_FAILED`와 `fieldErrors.file`, 잘못된 미디어 형식은 415 `UNSUPPORTED_MEDIA_TYPE`, 파일/요청 크기 초과는 413 `PAYLOAD_TOO_LARGE`로 기존 오류 모양을 따른다. Blob 서비스 장애는 500 `INTERNAL_ERROR`로 처리하며 토큰이나 원본 파일명은 응답/로그에 싣지 않는다.
- 폼 저장과 업로드는 별개다. 업로드 응답은 폼 draft의 URL만 갱신하며 `projects.thumbnail`은 프로젝트 생성/편집 PUT 성공 전까지 그대로다. 저장 전에 페이지를 나가면 Blob 고아 파일은 범위 밖이다.

Vercel 문서는 서버 업로드에서 `put()`을 사용하고 Function body 한도를 4.5 MB로 명시한다. Blob SDK는 기본적으로 같은 pathname 덮어쓰기를 거부하며, `addRandomSuffix`와 `del(url)`을 제공한다. 공개 URL hostname은 `.public.blob.vercel-storage.com` 도메인에 온다. [Server Uploads](https://vercel.com/docs/vercel-blob/server-upload), [Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [Blob security](https://vercel.com/docs/vercel-blob/security)

### 프로젝트 생성/편집과 썸네일 값

`POST /api/admin/projects` 본문은 생성 `slug`를 포함한다. 썸네일 의미는 다음과 같다.

| 요청 `thumbnail` | 생성 POST | 편집 PUT |
| --- | --- | --- |
| 속성 생략 | `null` 저장 | 기존 값 유지 |
| `""` | `null` 저장 | `null` 저장, 썸네일 제거 |
| 허용된 Blob URL | 해당 URL 저장 | 해당 URL로 교체 |
| `/images/...` 또는 다른 host URL | 거부 | 거부 |

편집 PUT 본문에서 필드 생략은 F11 이전 기간 동안 `/images/...`를 가진 기존 항목의 나머지 필드를 정상 저장하기 위한 호환 규칙이다. 폼은 파일을 건드리지 않았으면 `thumbnail`을 생략하고, 제거를 명시했을 때만 빈 문자열을 보낸다. 서버의 프로젝트 수정 스키마에서 이 규칙을 구현하고 검증한다. 이 의미는 POST의 생략 규칙과 구분한다.

허용 URL 검증은 `https:` 및 `URL.hostname === NEXT_PUBLIC_BLOB_HOSTNAME`의 정확한 일치로 한다. 사용자 정보, 명시 port, query, fragment는 허용하지 않는다. 저장 URL은 SDK가 반환한 정규 URL만 받는다. UI 검증은 편의용이며 서버 스키마 검증이 신뢰 경계다. Next.js의 `remotePatterns`도 동일 host만 허용한다. 기존 공개 읽기 필터는 새 write schema와 분리해 `/images/...` 및 올바른 http(s) Blob URL을 계속 표시한다.

프로젝트 편집 `PUT /api/admin/projects/{oldSlug}` 본문에는 수정 후 `slug`가 포함된다. 성공은 수정된 프로젝트를 기존 `{data,status}` envelope로 돌려주며 응답 객체의 `slug`는 새 값이다. 삭제는 기존 slug를 그대로 사용한다.

### 발표 편집

`PUT /api/admin/talks/{oldSlug}` 본문에도 수정 후 `slug`를 포함한다. 성공 데이터의 `slug`가 새 주소다. 발표 slug는 목록 표시 순서에 영향을 주지 않는다. 공개 발표는 `/blog` 목록에 표시되며 slug별 공개 상세 경로는 현재 코드에서 확인되지 않았다. 따라서 편집 UI의 주소 변경 경고는 프로젝트의 `/work/{oldSlug}` 링크 단절을 발표에도 그대로 적용하지 않는다.

### Slug 충돌과 누락 대상

- 같은 유형의 다른 행이 이미 사용하는 slug, 또는 동시 요청이 먼저 점유한 slug는 409 `SLUG_CONFLICT`로 반환한다. 오류는 `fieldErrors.slug`에 "이미 사용 중인 주소입니다"를 담아 slug 필드에 연결한다.
- 프로젝트와 발표 각각의 기존 DB unique 제약을 최종 판정으로 사용한다. 사전 조회가 있다면 사용자 안내만 위한 것이며 unique violation PostgreSQL code `23505`도 반드시 409로 변환한다.
- 요청 경로의 기존 slug가 삭제되거나 바뀐 상태면 404 `NOT_FOUND`다. 다른 사용자가 자기 slug를 새 값으로 바꾼 직후 오래된 폼이 제출되는 경우도 포함한다.
- slug 변경 성공 후 `/`, `/projects`, `/work/{oldSlug}`, `/work/{newSlug}`, `/blog`를 포함하는 기존 `revalidatePath("/", "layout")`를 호출한다. 이전 slug 리다이렉트는 만들지 않는다.
- 프런트엔드는 성공 응답 slug를 사용해 편집 주소를 history replace로 교체한다.

## 4. Blob 설정과 삭제 규칙

| 변수 | 노출 범위 | 계약 |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | 서버 전용 | 업로드, 삭제, 이전 스크립트에 사용. `NEXT_PUBLIC_`로 만들지 않으며 값은 로그에 출력하지 않는다. 빌드와 서버 실행에 필수다. |
| `NEXT_PUBLIC_BLOB_HOSTNAME` | 공개 | Blob store의 hostname만 저장한다. scheme, slash, path 없이 예: `store-id.public.blob.vercel-storage.com`. 클라이언트 URL 검사와 `next/image.remotePatterns`에 같은 값을 사용한다. secret이 아니다. |

Vercel public Blob store `portfolio-thumbnails`가 `iad1`에 생성되어 `seungsimdang-portfolio` 프로젝트의 Production, Preview, Development 환경에 연결되었다. 공개 hostname은 `mrum5ebtffuytyov.public.blob.vercel-storage.com`이며 local `.env.local`에도 설정되어 있다. CI는 호출되지 않는 Blob 업로드에 실제 token을 넣지 않고 비밀이 아닌 dummy `BLOB_READ_WRITE_TOKEN`과 test 전용 공개 hostname을 쓴다. 실제 Blob 업로드는 아직 검증하지 않았다.

프로젝트 교체 또는 삭제 후 이전 값이 같은 다른 프로젝트 행에서 참조 중이면 해당 Blob을 지우지 않는다. 참조가 남지 않은 값이며 host 검증상 우리 Blob URL인 경우에만 DB 성공 이후 `del(url)`을 best-effort로 실행한다. 실패는 프로젝트 API 성공을 뒤집지 않으며 URL·token을 로그에 쓰지 않는다. 업로드 키는 매번 무작위 suffix를 가지므로 정상 폼 사용에서는 프로젝트 사이의 공유가 생기지 않지만, API에 수동으로 기존 URL을 보내는 경우를 위해 참조 검사는 둔다. `/images/...`는 Blob 삭제 대상으로 처리하지 않는다.

Vercel Blob 삭제는 URL 또는 pathname을 받으며 존재하지 않는 URL도 실패하지 않는다고 문서에 명시돼 있다. [Blob SDK `del`](https://vercel.com/docs/vercel-blob/using-blob-sdk#del)

## 5. Build migration

### 대상과 실행 위치

- `pnpm build`는 `next build`보다 앞서 migration을 수행한다. CI build/e2e, 로컬 E2E build, Vercel Preview/Production 모두 각각 그 실행 환경의 `DATABASE_URL`을 사용한다.
- 로컬 `scripts/run-e2e-local.sh`는 `DATABASE_URL`을 `E2E_DATABASE_URL`로 바꾼 뒤 build를 실행하므로 그 DB에 적용된다. migration 단계는 `knip`, `check`, `type-check`, `harness:*`의 `DATABASE_URL`이 없는 검사 경로에 붙이지 않는다.
- 기존 `drizzle-kit migrate` 이력(`drizzle.__drizzle_migrations`)과 `drizzle/` journal을 유지한다. 현재 사이클은 DB schema change가 없어서 새 migration 파일을 만들지 않는다.
- `DATABASE_URL`이 비어 있으면 build migration은 실패하고 secret 전체 URL은 출력하지 않는다. `BLOB_READ_WRITE_TOKEN` 누락도 요구사항에 따라 build/dev 진입에서 변수명만 표시해 실패시킨다. lint/type-check/knip는 앱 빌드 또는 런타임 진입이 아니므로 Blob token 검사를 실행하지 않는다.

### 동시 실행 안전

현재 설치된 Drizzle PostgreSQL migrator 코드는 migration journal의 최신 시간을 transaction 전에 조회하고, 이후 migration SQL과 이력 insert를 트랜잭션에서 실행한다. 이 과정에는 advisory lock이 없다. 따라서 같은 Preview Neon DB를 대상으로 여러 Preview build가 동시에 실행될 수 있는 상황을 이력 테이블만으로 해결했다고 가정하지 않는다.

구현 계약은 같은 DB 트랜잭션 안에서 고정된 `pg_advisory_xact_lock`을 먼저 획득하고, lock 보유 중 적용된 migration을 다시 읽어 pending migration과 journal 기록을 적용하는 것이다. lock을 획득하는 SQL과 migration apply는 반드시 같은 DB transaction/session이어야 한다. `drizzle-kit migrate` 프로세스 앞에서 별도 연결로 lock만 보유하는 wrapper는 자식 프로세스와 lock을 공유하지 않으므로 해결책이 아니다. 현재 앱 DB는 `drizzle-orm/neon-http`을 쓰므로 선택할 runner가 Neon HTTP transaction과 기존 journal 포맷을 함께 지원하는지 구현 단계에서 확인한다. transaction/advisory lock으로 감쌀 수 없는 migration이 추가될 때는 migration을 별도 배포 job으로 단일화한다.

### 환경 분리와 실행 순서

1. Vercel Production `DATABASE_URL`은 production Neon branch, Preview `DATABASE_URL`은 `ep-snowy-dew-b88kcy4t` Preview branch, CI/e2e는 `E2E_DATABASE_URL`을 가리킨다. Production secret을 Preview로 복사하지 않는다.
2. Preview DB는 `main`에서 분기한 데이터 사본이다. 이후 Production F8/F11 변경은 Preview에 자동 복사되지 않는다.
3. 새 Preview 배포의 migration log 또는 연결 호스트로 Preview endpoint를 썼는지 확인한다. Secret이라 환경변수 값을 출력하지 않는다.
4. migration error면 빌드를 중단한다. 현재 schema 변경이 없으므로 적용 대상이 없는 실행이 성공해야 하며, pending migration 검증은 Production이 아닌 E2E/test DB에서 수행한다.
5. migration은 새 application version이 Production으로 활성화되기 전에 실행된다. 이후 migration은 기존 live code와 호환되는 additive 변경을 우선한다.

## 6. F8/F11 운영 rollout 및 dry-run

Production DB 쓰기는 코드와 API가 배포된 뒤 별도로 진행한다. dry-run 결과를 사용자에게 보여 주고 실행 승인을 받은 후에만 적용한다.

### F8 profile name

1. 대상 `profile.id = 1`의 현재 `name`과 새 값 `SeungHyun Lee`를 읽기 전용으로 보여 준다. 행이 하나가 아니거나 현재 값이 예상한 `이승현`과 다르면 중단한다.
2. 승인 뒤 `UPDATE profile SET name = 'SeungHyun Lee' WHERE id = 1 AND name = '이승현' RETURNING id, name`으로 이름만 조건부 변경한다. `updated_at`을 포함한 다른 컬럼은 수정하지 않는다. 반환 행이 정확히 1개인지 확인한다.
3. 원복 SQL은 당시 기록한 기존 값 `이승현`으로 `id = 1` 한 행의 name만 복원하는 것이다. 실행 전/후 값을 기록하되 다른 profile 필드는 기록하거나 덮지 않는다.

### F11 thumbnails

1. dry-run이 기본이다. DB에서 `thumbnail LIKE '/images/%'` 행을 나열하고 slug, 기존 URL, 파일 경로, 크기, sniff한 타입, 유효성 결과를 보고한다. 실제 업로드/DB 수정/파일 삭제는 하지 않는다.
2. 경로는 `public/` 아래로 정규화해 resolve하고 root 밖 경로, 누락 파일, 0 bytes, 4 MiB 초과, PNG/JPEG/WebP 이외 파일 또는 확장자/시그니처 불일치를 거부한다. 사용자 입력 path traversal을 허용하지 않는다.
3. 승인 후 각 행을 개별 처리한다. 업로드 성공 뒤 `projects.thumbnail`을 갱신하며, DB 갱신 직전 현재 값이 dry-run에서 확인한 옛 `/images/...` 값과 같은지 조건부 UPDATE한다. 한 행 실패는 나머지 행을 막지 않고 오류 목록을 남긴다. 다시 실행하면 Blob URL 행을 건드리지 않는다.
4. 보고서에는 slug, 이전 local path, 새 Blob URL, 성공/실패만 기록한다. 기존 경로 목록은 롤백을 위해 보존한다. Blob 업로드 뒤 DB conditional update 실패 시 고아 Blob 가능성을 보고한다.
5. 전체 성공 후 공개 화면 이미지 표시와 실패 목록을 확인한다. F8/F11 갱신 뒤 기존 authenticated `PUT /api/admin/profile`에 DB의 동일한 현재 profile payload를 보내 root layout을 재검증한 다음 공개 경로를 확인한다. 해당 PUT은 같은 profile 값을 다시 저장하므로 다른 필드를 변경하지 않도록 응답값과 요청값을 먼저 비교한다.
6. 성공 확인 전에는 기존 썸네일 원본 파일과 migration script를 삭제하지 않는다. 확인 후 이전된 프로젝트 썸네일 원본만 삭제하고, `public/images`의 다른 참조 자산은 사용처가 없음을 확인하기 전까지 보존한다. 삭제 후 문서화된 전체 품질 검증을 다시 실행한다.

### 작업 경계

- 프로필 UPDATE와 F11 production 이전은 명세/코드 승인으로 실행 승인까지 포함되지 않는다. 매 실행 직전 dry-run 결과를 제시하고 별도 사용자 승인을 기다린다.
- Vercel Blob store 생성/환경변수 변경은 인프라 작업이다. 이 명세는 생성된 store를 전제로 하며 직접 설정을 변경하지 않는다.

## 7. 기존 영향 테스트 목록

새 테스트 파일이나 새 테스트 케이스를 이 단계에서 작성하지 않는다. 구현 후 아래 기존 검증을 해당 동작에 맞춰 갱신한다.

| 기존 파일/명령 | 영향 |
| --- | --- |
| `__tests__/schemas/portfolio-schema.test.ts` | 수정 프로젝트/발표 slug 허용, Blob 전용 thumbnail write validation, thumbnail 생략과 빈 값 구분에 대한 현재 기대 갱신 |
| `__tests__/utils/portfolio-read-filter.test.ts` | 기존 `/images` DB값과 고정 host Blob URL 모두 공개 읽기에서 보존하는 현재 기대 갱신 |
| `__tests__/api/admin-route.test.ts` | update unique violation 409 변환과 기존 관리자 오류 envelope 검증 |
| `tests/e2e/fixtures/portfolio.ts` | 썸네일 fixture를 허용된 test Blob hostname으로 변경 |
| `tests/e2e/navigation.spec.ts`, `tests/e2e/real-project-data.spec.ts` | 이름 fixture와 페이지 기대값, 이미지 로드 성공에 의존하지 않는 기존 navigation/real-data 검증 확인 |
| `pnpm build`, `pnpm test:e2e:local` | migration 실행 순서와 E2E DB 격리 확인. 별도의 적용 대상 없는 build 및 pending migration은 E2E DB에서 확인 |

실제 Blob 업로드 또는 Production DB 업데이트 성공은 CI에서 검증하지 않는다. Blob store가 연결된 local 또는 Production 환경의 승인된 운영 확인에서 검증한다.

## 8. 구현에 전달할 변경 목록

- 새 route: `src/app/api/admin/uploads/thumbnail/route.ts`.
- 수정 route/schema/service: 프로젝트 PUT, 발표 PUT, 프로젝트 update/create schema, thumbnail schema, public read filter, Blob 삭제 후처리, Blob/Next image host 설정.
- `projects.thumbnail` update API 의미: 생략=유지, 빈 값=null, URL=교체.
- 프로젝트/발표 update unique violation을 기존 `SlugConflictError` 경로로 매핑하고 오류 field를 `slug`로 제공한다.
- 기존 `/api/admin/project-order`, `/api/admin/talk-order` body와 응답은 변경하지 않는다.
- 테스트 영향은 7절 파일만 확인한다. 새 테스트는 QA 단계 담당이다.
