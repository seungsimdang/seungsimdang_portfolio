# security-review-3: T08 사이클 전체 최종 보안 리뷰

- 대상: 브랜치 `feature/blog` 사이클 변경 파일 전체 (HEAD 9758445 기준 작업 트리)
- 제외: SEC-03~06 기각분, 정적 CSP의 `script-src 'unsafe-inline'`(사용자 결정), F-1 단위 테스트(T09)
- 판정: 배포 승인 (Critical 0, High 0, Medium 0, Low 0, Info 2)

## 1. 중점 항목 점검 결과

### 1.1 XSS 경로 (render-markdown.tsx, components 오버라이드 포함)

- 파이프라인 순서가 remarkParse, remarkGfm, remarkRehype(allowDangerousHtml), rehypeRaw, rehypeSanitize, rehypeHighlight 순서라 raw HTML이 sanitize 앞에서 정규화된 뒤 걸러짐 (`render-markdown.tsx:89-95`).
- sanitize 스키마는 defaultSchema 기반이며 `style`, `on*`, `script`, `iframe` 등이 허용 목록에 없음. `img`는 src, alt, width, height만, `code`는 `language-*` 정규식 className만 허용 (`:13-25`).
- 프로토콜 제한: src는 https만, href는 http, https, mailto만. `javascript:`, `data:`, `vbscript:` 링크와 이미지는 sanitize에서 제거됨.
- rehypeHighlight는 sanitize 뒤에 있으나 입력 className이 `language-*` 정규식으로 이미 제한되고 출력은 lowlight가 만든 `hljs-*` span뿐이라 신규 속성 주입 경로 없음. 주석(`:97`)이 순서 불변을 명시함.
- components 오버라이드 점검 (재작업 F-2로 추가된 `pre`, `table` 포함):
  - `pre`: props를 그대로 펼치고 `tabIndex={0}`만 추가. 이미 sanitize를 통과한 hast props만 들어오므로 새 속성 경로 없음.
  - `table`: `section`(className, tabIndex, aria-label 고정값)이 감싸고 `table`에 sanitize된 props만 전달. 사용자 제어 문자열이 section 속성으로 가지 않음.
  - `heading`: sanitize의 id clobber 접두사(`user-content-`)가 유지된 props를 전달. DOM clobbering 완화 유지.
  - `a`: href는 sanitize 통과 값, 외부(http/https) 링크에만 `target=_blank`와 `rel="noopener noreferrer"`를 붙임. `//host` 형태는 새 창을 열지 않아 탭내빙 없음.
  - `img`: src가 `https://`로 시작하지 않으면 텍스트 span으로 대체(alt는 React가 이스케이프). `<Image unoptimized>`는 sanitize에서 이미 걸러진 https URL만 받음. width, height는 0 고정이라 사용자 값이 전달되지 않음.
- 렌더 실패 폴백 `<pre>{source}</pre>`는 React 텍스트 노드라 이스케이프됨.
- 코드베이스 전체에서 `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` 사용 없음(grep 확인).
- 제목, 카테고리, 태그, slug는 전부 JSX 텍스트로 출력되며 링크는 `encodeURIComponent` 처리 (`post-row.tsx:10`, `blog/page.tsx:74`, `blog/[slug]/page.tsx:29`).
- 결론: 렌더러 오버라이드가 sanitize를 우회하거나 약화하지 않음. 신규 XSS 경로 없음.

### 1.2 인증, 인가

- 쓰기 API 전부(`posts`, `posts/[slug]` PUT/DELETE, `uploads/post-image`, `uploads/thumbnail`)가 `adminRoute`로 감싸짐. 순서는 Origin 검사, `requireAdmin`(세션과 allowlist), 쓰기 쿼터, 핸들러이며 쿼터 조회 실패는 500으로 닫힘(fail-closed) (`admin-route.ts:64-86`).
- admin 페이지 3종(`blog`, `blog/new`, `blog/[slug]`)이 모두 `requireAdminPage()`를 먼저 호출함.
- 비공개 글 노출 방지: 공개 조회는 `published = true` 조건을 항상 포함 (`blog-service.ts:114-117`), 공개 카테고리 집계도 `published`만 대상 (`:92-104`). `generateMetadata`도 같은 로더라 비공개 제목이 메타에 새지 않음.
- 편집 API의 slug는 URL 파라미터이고 `postUpdateInputSchema`가 strictObject라 본문으로 slug 변경 불가(과다 필드 주입 차단).
- SEC-02(`new` 금지)는 `postSlugSchema` refine 한 곳에서 생성, 수정, 삭제, 두 페이지, 폼, 이관 스크립트(`postCreateInputSchema` 경유)에 모두 적용됨.

### 1.3 업로드 검증 (F-6 모듈 분리 이후)

- `sniffImage`가 `image-signature.ts`로 분리된 뒤에도 업로드 경로(`image-upload.ts:75`)와 이관 스크립트(`migrate-blog.ts:175,440`)가 같은 함수를 쓰며 동작 차이로 인한 약화 없음.
- 검증 계층: multipart Content-Type, Content-Length 상한, 단일 `file` 필드, 0바이트와 4MB 상한, 매직바이트 판별, 확장자와 판별 결과 일치, 클라이언트 제공 `file.type`과 판별 결과 일치. SVG와 HTML은 시그니처에서 걸러짐. 썸네일은 GIF 비허용.
- 저장 시 확장자와 contentType을 서버 판별값으로 확정하고 `addRandomSuffix: true`. 반환 URL은 `isValidUrl`(호스트, 접두 경로, userinfo, 포트, 쿼리 검사)을 통과하지 못하면 삭제 후 500.
- 파일명은 경로에 쓰이지 않아 경로 조작 불가. 확장자 계산에서 `.`이 없는 이름은 마지막 한 글자가 되어 어차피 불일치로 거부됨.

### 1.4 CSP, 헤더 (SEC-01 재작업)

- security-review-2에서 확인한 구성이 현재도 동일함(`next.config.ts`). admin 제외 패턴과 admin 규칙이 상호배타적이라 CSP 중복 없음. `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `connect-src 'self'` 유지.
- 사용자 결정된 `unsafe-inline`은 제외. 그 때문에 sanitize가 1차 방어선인데 1.1에서 약화 요인이 없음을 확인함.

### 1.5 이관 스크립트 가드 (`migrate-blog.ts`)

- 기본 dry-run, `--apply`일 때만 Blob 업로드와 DB 쓰기. `--apply`는 `--report`, Blob 토큰, Blob 호스트, `DATABASE_URL`을 모두 요구하고 대상 DB 호스트를 출력한 뒤 `--yes`가 없으면 확인을 받음.
- 삽입은 `onConflictDoNothing`과 사전 slug 조회로 기존 행을 바꾸지 않음. 입력은 `postCreateInputSchema`로 검증한 뒤에만 삽입.
- 경로 탈출 방어: `resolveLegacyImage`가 `..` 세그먼트를 거부하고, `readInside`가 `realpath` 결과를 원본 루트 접두로 검사해 심볼릭 링크 탈출을 막음. git 호출은 인자 배열과 `--` 구분자 사용(셸 미경유).
- 네트워크: 다운로드 대상은 `RECOVERIES` 하드코딩 3건뿐이고 파일명과 호스트가 모두 맞아야 함. 타임아웃과 크기 상한, 시그니처와 확장자 일치 검사 있음. 임의 URL 입력 경로가 없어 SSRF 불가.
- `allowOverwrite: true`는 `blog/images/legacy/`와 `recovered/` 하위 결정적 경로에만 쓰이며 관리자 업로드 경로(`blog/images/image-<난수>`)와 겹치지 않음.

### 1.6 기타

- SQL: 카테고리 필터는 `array[${normalized}]::text[]` 바인딩, 나머지는 drizzle 조건. 문자열 결합 SQL 없음. 마이그레이션 `0003`은 slug 형식과 길이 CHECK로 DB 수준 방어선을 추가함.
- 입력 상한: 본문 300,000자와 2MB 요청 상한, 제목 200, 라벨 50, 카테고리 10, 태그 20. 페이지 파라미터는 정규식으로 6자리 정수만 허용.
- 시크릿: 소스에 하드코딩된 키, 토큰 없음. 스크립트는 환경 변수로만 읽음.
- 의존성: `rehype-raw`, `rehype-sanitize`, `yaml`, `hast-util-to-jsx-runtime` 등 모두 고정 버전. frontmatter는 `schema: "core"`로 커스텀 태그를 막음.

## 2. 새 finding

없음 (Critical/High/Medium/Low 0건).

## 3. Info (조치 불필요, 기록)

- INFO-1: 이관 스크립트의 tcpschool 복구는 `http://` 평문으로 내려받음(`migrate-blog.ts:39`). 중간자가 PNG를 바꿔치기할 수 있으나 일회성 실행이고 시그니처와 확장자 검사를 통과한 이미지만 올라가며 스크립트 주체가 결과를 검수함. 실행 전 해당 URL이 https를 지원하면 교체를 권장하되 차단 아님.
- INFO-2: 렌더러 sanitize 회귀 테스트(`<img onerror>`, `javascript:`, `<script>`, `style`, 오버라이드 이후 출력)는 `unsafe-inline` 결정 때문에 방어 비중이 큰 항목이며 T09 범위로 이미 합의된 후속 과제임. 새 finding 아님.

## 4. 판정

- 배포 승인. 재작업(F-2 표, pre 래퍼 / F-6 시그니처 모듈 분리 / SEC-01 CSP / SEC-02 slug)이 원 구현과 얽혀 만든 보안 문제 없음.
- 코드 수정 없음 (리뷰 전용).
