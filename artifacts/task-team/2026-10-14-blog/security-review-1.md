# 보안 리뷰 1차 (T08-security) - 블로그 DB 이관

- 브랜치: feature/blog
- 판정: 배포 승인 (Critical 0, High 0, Medium 1, Low 5, Info 4)
- 한계: Bash 실행 도구가 없어 `pnpm audit`와 런타임 테스트는 하지 못했고 코드 정독으로만 판단함. rehype-sanitize `defaultSchema`의 세부 값은 node_modules를 열어 확인하지 못해 공식 문서 기본값 기준으로 판단함.

## 1. 요약

| ID | 심각도 | 제목 | diff 안/밖 |
| --- | --- | --- | --- |
| SEC-01 | Medium | 공개·admin 페이지에 script-src CSP가 없어 마크다운 sanitize가 유일한 XSS 방어선 | 밖(설정), 새 공격면은 안 |
| SEC-02 | Low | blog slug에 `new`가 허용되어 admin 편집·삭제 화면이 가려짐 | 안 |
| SEC-03 | Low | 본문 이미지가 임의 https 호스트를 허용해 제3자 요청 유발 가능 | 안 |
| SEC-04 | Low | 업로드 Blob 고아 파일이 정리되지 않음 | 안 |
| SEC-05 | Low | Content-Length 없는 요청은 본문을 모두 읽은 뒤 크기를 검사함 | 안(maxBytes 확장) |
| SEC-06 | Low | 공개 `?category=` 임의 값마다 동적 DB 쿼리가 발생함 | 안 |
| SEC-07 | Info | 이관 스크립트 다운로드·DB 대상 가드의 한계 | 안 |
| SEC-08 | Info | 원본 저장소가 신뢰되지 않으면 `git -C`가 저장소 설정을 실행할 수 있음 | 안 |
| SEC-09 | Info | `HTML_IMG` 정규식이 비정상 입력에서 이차 시간 | 안 |
| SEC-10 | Info | 업로드 검증이 앞부분 시그니처만 보는 구조 | 안 |

## 2. 항목별 상세

### SEC-01 Medium: script-src CSP 부재

- 위치: `next.config.ts:34-42` (admin에만 `frame-ancestors`, `base-uri`, `form-action`, `object-src`), 공개 경로에는 CSP 없음.
- 근거: 본문은 `allowDangerousHtml` + `rehypeRaw`로 raw HTML을 파싱한 뒤 `rehypeSanitize`가 유일한 정화 단계다 (`src/lib/markdown/render-markdown.tsx:92-94`). 순서(parse, raw, sanitize, highlight)와 스키마는 안전하다 (아래 3절). 다만 sanitize 라이브러리나 스키마 회귀가 생기면 막는 2차 방어가 없다.
- 공격 시나리오: 라이브러리 업데이트나 스키마 수정 실수로 이벤트 핸들러 속성이 통과하면, 저장된 글이 공개 방문자와 admin 미리보기(`markdown-editor.tsx:205`, 인증 세션이 있는 같은 origin)에서 스크립트를 실행한다.
- 영향: 현재 코드 기준으로는 악용 경로를 확인하지 못함. 잠재 영향은 admin 세션으로 임의 쓰기 API 호출.
- 수정 제안: `script-src 'self'` 계열 nonce 기반 CSP를 공개·admin에 추가하고 `img-src 'self' https:`로 제한. 스키마 회귀를 잡는 단위 테스트(`<img onerror>`, `javascript:` 링크, `data:` src, `<script>`, `<iframe>`, `style` 속성) 한 벌을 `renderMarkdown`에 추가.
- diff 안/밖: CSP 설정은 이번 사이클 변경 밖(기존 설정). 새 사용자 입력 렌더링 경로가 생긴 것은 이번 사이클.

### SEC-02 Low: slug `new` 허용

- 위치: `src/schemas/blog.schema.ts:12-18`. 비교: `src/schemas/portfolio.schema.ts:97`은 `new`를 금지함.
- 근거: `/admin/blog/new` 정적 라우트가 동적 `[slug]`보다 우선하므로 slug `new`인 글은 admin UI로 열 수 없다. DB CHECK도 `new`를 막지 않는다 (`drizzle/0003_purple_blur.sql:13`).
- 공격 시나리오: 악용이라기보다 자기 유발 무결성 문제. 관리자가 `new`로 글을 만들면 편집·삭제가 UI에서 불가능해진다 (API로는 가능).
- 영향: 가용성(관리 불가), 데이터 손상 없음.
- 수정 제안: `postSlugSchema`에 `.refine((v) => v !== "new")` 추가 (portfolio와 동일). DB CHECK는 선택.
- diff 안/밖: 안.

### SEC-03 Low: 본문 이미지 임의 https 호스트

- 위치: `src/lib/markdown/render-markdown.tsx:73-85` (`src.startsWith("https://")`만 검사, `unoptimized`).
- 근거: Blob 호스트로 제한하지 않아 마이그레이션에서 의도적으로 남긴 외부 이미지도 렌더된다. `next.config.ts`의 `remotePatterns`는 `unoptimized` 때문에 적용되지 않는다.
- 공격 시나리오: 작성자가 외부 이미지를 넣으면 방문자 브라우저가 제3자 서버에 요청해 IP와 Referer(origin)를 노출한다. 작성자는 admin 1인이라 외부 공격자가 직접 삽입할 경로는 없다.
- 영향: 방문자 프라이버시(제3자 추적), 외부 이미지 삭제·교체로 인한 본문 변조 가능성.
- 수정 제안: 정책 결정 사항. 허용하려면 현 상태 유지하고 SEC-01의 `img-src`로 범위를 정함. 막으려면 Blob 호스트(`NEXT_PUBLIC_BLOB_HOSTNAME`)만 허용.
- diff 안/밖: 안.

### SEC-04 Low: 업로드 Blob 고아 파일

- 위치: `src/lib/api/image-upload.ts:93-100`, `src/services/blog/blog-admin-service.ts:42-48`.
- 근거: 업로드 성공 후 글을 저장하지 않거나 글을 삭제해도 Blob은 남는다. `addRandomSuffix: true`라 중복 덮어쓰기는 없다.
- 공격 시나리오: 관리자 계정 탈취 시 쓰기 쿼터 내에서 4MB 파일을 반복 업로드해 스토리지 소모.
- 영향: 비용·스토리지 증가. 공개 URL이 비공개 글의 이미지를 계속 노출할 수 있음.
- 수정 제안: 당장은 불필요. 삭제 시 본문 내 Blob URL 정리 또는 주기 정리 스크립트를 후속 과제로.
- diff 안/밖: 안.

### SEC-05 Low: 본문 크기 검사 시점

- 위치: `src/lib/api/parse-body.ts:23-29`, `src/lib/api/image-upload.ts:52-63`.
- 근거: Content-Length가 없으면 `request.text()`/`formData()`로 전체를 읽은 뒤 바이트를 비교한다. 상한은 플랫폼 요청 제한(4.5MB)에 의존한다고 주석에 명시되어 있고, 인증과 Origin 검사, 쓰기 쿼터 이후에만 도달한다 (`admin-route.ts:64-81`).
- 영향: 인증된 관리자만 도달하므로 외부 DoS 경로는 아님. maxBytes 2MB 확장으로 메모리 사용 상한이 커졌으나 허용 범위.
- 수정 제안: 필요 시 `request.body` 스트림을 읽으며 누적 바이트 초과 시 중단. 현재는 수용 가능.
- diff 안/밖: 안(`POST_BODY_MAX_BYTES` 도입).

### SEC-06 Low: 공개 category 쿼리 증폭

- 위치: `src/app/(public)/blog/page.tsx:31-40`, `src/services/blog/blog-service.ts:43-53`.
- 근거: `?category=` 값을 SQL 파라미터로 바인딩하므로 SQL injection은 없다 (`sql\`...array[${normalized}]::text[]\``). 다만 값 길이 50자 이하이면 어떤 문자열이든 동적 렌더와 COUNT 쿼리가 실행되고 `categories`에 GIN 인덱스가 없다.
- 공격 시나리오: 비인증 방문자가 임의 category 값을 바꿔 가며 반복 요청해 DB 쿼리를 유발.
- 영향: 글 수가 약 300건 수준이라 영향 낮음. 플랫폼 방화벽·rate limit이 1차 방어.
- 수정 제안: 허용 카테고리 목록(`listPublicCategories`) 안의 값만 필터로 인정하거나, 현 규모에서는 수용.
- diff 안/밖: 안.

### SEC-07 Info: 이관 스크립트 가드의 한계

- 위치: `scripts/migrate-blog.ts:34-62, 180-192, 243-277, 372-378`.
- 확인한 양호 사항: 다운로드는 하드코딩된 3건(`RECOVERIES`)이고 파일명과 호스트가 모두 맞아야 실행되어 임의 URL SSRF가 불가하다. 기본 dry-run, `--apply`는 `--report`와 Blob 환경변수 필수, DB 호스트를 출력하고 `--yes`가 없으면 y/N 확인한다. 시그니처와 확장자가 `recovery.ext`와 일치해야 업로드한다.
- 한계: (a) `fetch`가 리다이렉트를 따르고 호스트 재검증이 없음. (b) `TCPSCHOOL_URL`이 `http://`라 경로상 변조 가능(이미지 시그니처만 통과하면 업로드됨). (c) 크기 검사가 전체 버퍼링 후라 메모리 상한이 약함. (d) 운영/개발 DB 구분은 사람이 호스트를 읽는 확인에 의존하며 `--yes`는 이를 우회. (e) `allowOverwrite: true`와 `addRandomSuffix: false`로 `blog/images/legacy`, `recovered` 경로는 재실행 시 덮어씀. (f) 스키마 검증 실패 글의 Blob은 이미 업로드되어 남음.
- 영향: 운영자 1회성 실행이라 위험 낮음.
- 수정 제안: `redirect: "error"` 설정, tcpschool을 https로 바꿀 수 있으면 변경, 응답 `content-length` 선검사. 운영 DB 호스트 확인은 현행 유지.
- diff 안/밖: 안.

### SEC-08 Info: 원본 저장소 git 실행

- 위치: `scripts/migrate-blog.ts:104-110, 150-170, 204-220`.
- 근거: `execFile`(셸 없음)로 인자 배열 전달, 경로는 `--` 뒤에 위치하고 `show`는 `<hash>:<path>` 형태라 인자 주입 불가. `resolveLegacyImage`가 `..`를 거부하고 `readInside`가 `realpath` 접두사로 저장소 밖 심볼릭 링크를 막는다 (`legacy-image-url.ts:36`, `migrate-blog.ts:113-117`).
- 잔여: 신뢰되지 않은 저장소를 `--source`로 주면 `git -C`가 그 저장소의 `.git/config`(예: `core.fsmonitor`)를 실행할 수 있음. 본인 저장소 전용이라는 전제를 스크립트 헤더에 한 줄 명시하면 충분.
- diff 안/밖: 안.

### SEC-09 Info: 정규식 이차 시간

- 위치: `src/lib/blog/migration/replace-image-urls.ts:28`.
- 근거: `/<img\b[^>]*>/gi`는 `>` 없는 `<img` 반복 입력에서 이차 시간이 될 수 있음. 이관 스크립트(신뢰된 원본)에서만 호출되며 런타임 경로(요청 처리, 렌더)에서는 쓰이지 않음. 다른 정규식(`FENCE`, `postSlugSchema`, `slugifyPostName`)은 선형이거나 모호성이 없는 구조.
- 수정 제안: 불필요.

### SEC-10 Info: 업로드 검증 구조

- 위치: `src/lib/api/image-upload.ts:75-89`, `src/lib/blog/image-signature.ts`.
- 근거: 앞 12바이트 시그니처 + 확장자 + 클라이언트 `file.type`이 모두 일치해야 하고, Blob에는 서버가 결정한 `contentType`과 확장자로 저장된다. Blob 경로는 서버 상수(`blog/images/image`)에 확장자만 붙여 경로 조작이 불가하다. SVG 등 스크립트 가능 형식은 시그니처에 없다. GIF는 post-image 라우트에서만 허용되고 thumbnail 라우트는 `allowGif: false`다. 반환 URL은 `isValidPostImage`/`isValidThumbnail`(호스트 정확 일치, 경로 접두사, 포트·쿼리·해시·userinfo 금지)로 검증하고 실패 시 `del` 시도 후 URL을 돌려주지 않는다.
- 잔여: 시그니처만 맞는 폴리글랏 파일은 막지 못하지만 `image/*`로만 서빙되고 앱 응답에는 `X-Content-Type-Options: nosniff`가 있다. Blob 도메인의 nosniff 여부는 확인하지 못함.

## 3. 점검 결과 (문제 없음 확인)

- XSS 파이프라인: `remarkParse, remarkGfm, remarkRehype(allowDangerousHtml), rehypeRaw, rehypeSanitize(schema), rehypeHighlight` 순서. sanitize 이후에는 highlight만 있고 highlight는 `hljs-*` 클래스와 span만 추가한다 (`render-markdown.tsx:89-95`). 코드 블록 `className`은 `^language-[A-Za-z0-9_+-]+$`로 제한. 이벤트 핸들러, `style`, `script`, `iframe`은 기본 스키마가 제거. id/name은 기본 `clobberPrefix`로 DOM clobbering 완화.
- 링크: `href` 프로토콜이 `http, https, mailto`로 제한되어 `javascript:`, `data:`, `vbscript:` 제거. 외부 링크는 `target=_blank rel="noopener noreferrer"`. `target` 속성은 스키마에서 제거되므로 작성자가 임의로 넣을 수 없음.
- 이미지: `src` 프로토콜 `https` 한정, 컴포넌트에서 `https://`로 재검사하고 아니면 alt 텍스트 span (`//host/x`, `data:`, 상대 경로 모두 이미지 미렌더). 렌더 실패 시 `<pre>{source}</pre>`는 React 이스케이프.
- admin 미리보기: 같은 `renderMarkdown`을 사용하므로 공개 렌더와 동일한 정화를 받음 (SEC-01 참조).
- 인증·인가: 새 API 라우트 3개(`posts`, `posts/[slug]`, `uploads/post-image`)와 기존 thumbnail 라우트 모두 `adminRoute`로 감쌈. `adminRoute`는 unsafe method에 Origin 검사, 이어 `requireAdmin`(세션 + allowlist), 쓰기 쿼터 순서로 동작. 새 admin 페이지 3개는 모두 첫 줄에서 `await requireAdminPage()`. `proxy.ts`가 1차 방어.
- 비공개 글 노출: 공개 경로(`listPublicPosts`, `listPublicCategories`, `getPublicPost`)는 모두 `published = true` 조건을 포함. `getAdminPost`와 `listAdminPosts`는 admin 페이지에서만 import됨(grep 확인). 비공개 글 slug는 공개에서 `notFound()`이고 메타데이터도 빈 객체.
- 입력 검증: `postSlugSchema` 정규식은 하이픈 구분 구조라 백트래킹 없음, 길이 200 + DB CHECK 이중 방어. 본문 30만 자 + 요청 2MB. 스키마는 `strictObject`라 `id`, `createdAt` 주입 불가. `updatePost`는 slug를 변경하지 않음. 한글 slug는 `decodePostSlug`(한 번 디코딩, 실패 시 null, NFC)로 처리하고 디코딩 실패와 형식 위반은 DB 접근 없이 404. `parsePageParam`은 `^[1-9]\d{0,5}$`로 제한.
- SQL: 모든 쿼리가 Drizzle 파라미터 바인딩. `sql` 템플릿 사용처도 값이 바인딩됨.
- 시크릿: 변경 파일에 하드코딩 시크릿 없음. 이관 스크립트는 환경변수에서만 읽음. 오류 로그는 이름·메시지만 출력.
- 의존성: 새 패키지(`hast-util-to-jsx-runtime`, `rehype-highlight`, `rehype-raw`, `rehype-sanitize`, `remark-gfm`, `remark-parse`, `remark-rehype`, `unified`, `yaml`)는 모두 정확한 버전으로 고정됨. `yaml`은 `schema: "core"`로 파싱해 커스텀 태그를 사용하지 않음. `pnpm audit`는 미실행이므로 CI 또는 로컬에서 한 번 실행 권장.

## 4. 판정

- 배포 승인. Critical/High 없음, 인증 로직 확인 완료.
- 권장 후속(차단 아님): SEC-02(스키마 한 줄) 이번 사이클 내 반영 권장, SEC-01(CSP 및 sanitize 회귀 테스트)은 다음 사이클 과제로 등록 권장.
- orchestrator 9-1 게이트 참고: 재작업 대상 후보는 SEC-02(코드 한 줄, 위험 낮고 수정 비용 최소)이며 나머지는 정책 결정이나 후속 과제.
