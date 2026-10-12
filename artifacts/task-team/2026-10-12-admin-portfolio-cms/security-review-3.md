# Security Review 3 (T08, 3차)

**사이클 전체 최종 리뷰** (admin-portfolio-cms 사이클 종료 시점의 전체 표면 재검토)

- 브랜치: feature/admin-portfolio-cms (HEAD 466e2fe)
- 방식: 정적 코드 검토 (코드 수정 없음)
- 기준: requirements.md, api-spec.md, security-review-1/2.md, triage-1/2.md (기각된 SEC-003 rate limit은 재제기하지 않음)

## 판정

**배포 승인** (Critical 0, High 0, Medium 0, Low 1, Info 3)

## 이전 finding 최종 상태

| ID | 상태 | 근거 |
| --- | --- | --- |
| SEC-001 | 해결 | `next.config.ts:14-32` HSTS + `/admin/:path*` CSP(frame-ancestors/base-uri/form-action/object-src) |
| SEC-002 | 해결 | `admin-route.ts:22-51` x-forwarded-host 미사용, NEXTAUTH_URL host + ADMIN_ALLOWED_HOSTS 비교 |
| SEC-003 | 기각 유지 | triage-1 결정 |
| SEC-004 | 해결 | `portfolio-service.ts:28-40` 읽기 시점 http/https 필터 (project.link, talk.link, experience.links) |
| SEC2-01 | 해결 | `toProfile`(`portfolio-service.ts:102`)이 `safeHttpUrl(row.github)` 적용, `Profile.github?` optional, `contact/page.tsx:46`과 `footer.tsx:14`가 조건부 렌더 |

## 중점 점검 결과

### raw 조회가 공개 경로로 새는가: 새지 않음

- `raw=true` 호출은 4곳뿐이고 전부 admin 콘솔 페이지다 (`profile/page.tsx:13`, `projects/[slug]/page.tsx:23`, `talks/[slug]/page.tsx:23`) 및 admin 서비스 내부(`portfolio-admin-service.ts:77,89,128,224`의 쓰기 응답).
- 공개 경로(`layout`, `page`, `about`, `blog`, `contact`, `projects`, `work/[id]`)와 admin 목록/대시보드(`admin/(console)/page.tsx`, `projects/page.tsx`, `talks/page.tsx`)는 전부 기본값(raw=false)으로 호출한다.
- 기본값이 필터 적용이므로 인자를 빠뜨리면 안전한 쪽으로 동작한다 (fail-safe 방향).
- `React.cache`는 요청 단위 메모이제이션이며 인자(`raw`)가 키에 포함되어, 한 요청 안에서 raw 결과가 비raw 호출에 재사용되지 않고 요청 간 공유도 없다.
- admin 쓰기 응답(`ok(project)`)의 raw 값은 인증/인가/Origin 검사를 통과한 관리자에게만 반환된다.
- raw 값(비http 링크 포함)은 admin 폼에서 `<input value>`로만 쓰이고 `href`로 렌더되는 곳은 없다 (grep 확인: form/editor 컴포넌트에 링크 href 렌더 없음).

### ADMIN_ALLOWED_HOSTS 파싱: 안전 (fail-closed)

- `admin-route.ts:23-26`: 쉼표 분리, trim, 빈 토큰 제거. 비교 대상은 `new URL(origin).host`(소문자, 포트 포함).
- 와일드카드/정규식/접두 비교 없이 `includes` 정확 일치라 `evil.example.com.attacker.net` 류 우회 불가.
- NEXTAUTH_URL이 잘못된 값이면 `[]` 반환으로 전부 거부 (`:36-39`). NEXTAUTH_URL 없이 ADMIN_ALLOWED_HOSTS만 있어도 base가 `[]`가 되어 extra만 허용 (의도대로).
- 잘못 입력(스킴 포함, 대문자)은 불일치로 403이 되는 가용성 문제일 뿐 우회가 아니다 (SEC3-02).

### profile.github optional: 안전

- 쓰기: `profileInputSchema.github`는 https 필수(`schema:93`), DB `github`는 NOT NULL.
- 읽기: 비https/비http 값은 `undefined`로 떨어져 링크가 렌더되지 않는다. `contact/page.tsx:57`의 `profile.github.replace(...)`는 `profile.github &&` 가드 안쪽이라 undefined 접근이 없다.

## 전체 영역 점검 (통과)

- **인증/인가**: proxy 매처가 `/admin/:path*`, `/api/admin/:path*`를 덮고 JWT 존재만 확인. 인가는 `requireAdmin()`이 매 호출 allowlist를 재판정 (adminRoute 7개 라우트 전부 경유, 콘솔 layout과 페이지 모두 `requireAdminPage()`). `/admin/login` 예외는 정확 일치 한 경로뿐. allowlist는 숫자 토큰만 인정하고 비면 전원 거부. signIn 콜백과 요청마다 이중 검사라 allowlist에서 제거된 계정의 기존 JWT도 즉시 403. `NEXTAUTH_SECRET` 없으면 proxy가 토큰 null(fail-closed). 세션 8시간, scope `read:user`.
- **CSRF**: 변경 메서드(POST/PUT/PATCH/DELETE)는 Origin 필수 + 허용 host 일치, Content-Type `application/json` 강제(폼 기반 교차 출처 제출 불가), next-auth 쿠키 SameSite=Lax. admin GET 라우트는 존재하지 않아 상태 변경 GET 없음. Origin 검사가 가드보다 먼저 실행됨.
- **저장형 XSS**: `dangerouslySetInnerHTML` 사용 0건. 사용자 텍스트는 전부 React 텍스트 노드(`whitespace-pre-line`)로 렌더. 링크는 쓰기(zod http/https) + 읽기(`safeHttpUrl`) 이중 방어 후 `ExternalLink`/`Button`의 href로만 사용. `mailto:`는 `z.email`(쓰기)로 `?`/공백 등 불가.
- **SQL**: 전부 drizzle 파라미터 바인딩. `sql.raw`는 상수 정규식(`db/schema/portfolio.ts:15`) 한 곳, `sql` 템플릿은 테이블 참조 서브쿼리뿐. slug는 zod 정규식 + `getProjectBySlug`의 `SLUG_PATTERN` + DB check 제약.
- **입력 검증**: `strictObject`로 미지 필드 거부(mass assignment 차단: `updateProfile`의 `...input` 스프레드와 `createTalk`/`updateTalk`의 `...input` 스프레드는 strict 스키마 통과 값뿐), 길이/개수 상한, 본문 256KB 상한, thumbnail `/images/` 정규식 + `..` 차단, slug `new` 예약어 차단, reorder는 현재 집합과 정확 일치 검증.
- **정보 노출**: 응답은 고정 메시지 + code. 500은 일반 메시지, 로그는 `name: message`만(스택 제외). `error.tsx`/`global-error.tsx`/admin error는 error 객체를 렌더하지 않음. 로그인 거부 사유는 URL/화면에 구분 없이 고정 문구 (`error` 쿼리는 truthy 여부만 사용). 인증 실패 응답이 존재 여부를 구분 노출하지 않음(401/403은 세션 상태만 반영).
- **open redirect**: login `from`은 `/admin` 또는 `/admin/` 접두 + `//`, `\` 배제, 위반 시 `/admin`. next-auth 기본 redirect 콜백도 동일 출처만 허용. 클라이언트가 만드는 `from`은 `encodeURIComponent` 처리.
- **헤더**: 전역 X-Frame-Options DENY / nosniff / Referrer-Policy / HSTS, admin에 CSP(frame-ancestors 'none' 등)와 proxy의 `X-Robots-Tag`, `Cache-Control: no-store`. proxy의 401 JSON 응답에도 동일 헤더 적용.
- **시크릿**: `.env.example`는 빈 값뿐, `NEXT_PUBLIC_` 사용 없음, 서버 모듈 전부 `server-only`. seed는 접속 호스트명 확인(y/N) + 기존 행 있으면 건너뛰어 덮어쓰기 없음.
- **의존성/공급망**: 버전 고정(범위 연산자 없음), `minimumReleaseAge: 10080`, `trustPolicy: no-downgrade`, `allowBuilds` esbuild/sharp false. `jose@4.15.9` 예외는 정확 버전 1개로 한정되어 타당 (next-auth 또는 jose 업그레이드 시 재평가).

## Findings

### SEC3-01 (Low) 공개 읽기에서 thumbnail은 필터 없이 반환

- 위치: `src/services/portfolio/portfolio-service.ts:74`, 사용처 `src/app/work/[id]/page.tsx:44`, `src/components/common/project-card.tsx:37`
- 근거: `link`, `github`, `experience.links`는 읽기 시점에 `safeHttpUrl`로 걸러지지만 `thumbnail`은 `row.thumbnail ?? undefined`로 그대로 반환된다. 쓰기 시점 정규식(`/images/` + `..` 차단)에만 의존하며, 다른 URL 필드와 방어 수준이 비대칭이다.
- 공격 시나리오: DB 자격증명 유출 등 별도 침해로 임의 값(외부 URL 등)이 들어가면 `next/image` src와 OG 이미지 메타에 반영된다. `javascript:`는 img src로 실행되지 않고 `next/image`는 미허용 원격 호스트를 거부하므로 영향은 이미지 깨짐/OG 오염 수준. 현재 경로로는 악용 불가.
- 수정 제안: `toProject`에서 `/^\/images\/[A-Za-z0-9._/-]+$/` 불일치 시 `undefined` 처리 (스키마 `THUMBNAIL_PATTERN`을 공유). 후속 처리 가능.

### SEC3-02 (Info) ADMIN_ALLOWED_HOSTS 입력 형식 민감

- 위치: `src/lib/auth/admin-route.ts:23-26,47`
- 근거: 값은 host(포트 포함) 형식이어야 하며 스킴 포함(`https://x.com`)이나 대문자는 `new URL(origin).host`(소문자)와 불일치해 쓰기가 403이 된다. 보안상 fail-closed이며 우회는 없다. 또한 NEXTAUTH_URL과 ADMIN_ALLOWED_HOSTS가 둘 다 비면 Host 헤더와 Origin을 비교하는데, 교차 출처 브라우저는 Host를 위조할 수 없어 CSRF 방어는 유지되나 Production에서는 의미 있는 고정값이 아니다.
- 수정 제안: 필요 시 `.toLowerCase()` 추가. 배포 체크리스트에 "Production은 NEXTAUTH_URL 필수, 별칭은 host 형식으로 ADMIN_ALLOWED_HOSTS 설정, Preview URL은 쓰기 거부됨"을 기록 (SEC2-03과 동일 항목).

### SEC3-03 (Info) CSP에 script-src 없음 (이월)

- 위치: `next.config.ts:27-29`
- 근거: SEC-001 해결 시 합의된 최소안(Next 인라인 스크립트 때문에 nonce 미도입). 현재 저장형 XSS 경로가 없어 위험은 낮다. 향후 nonce 기반 CSP 도입 시 재평가.

### SEC3-04 (Info) 본문 크기 검사가 읽기 이후 수행 (이월 성격)

- 위치: `src/lib/api/parse-body.ts:22-28`
- 근거: Content-Length 선검사 후에도 chunked 요청은 `request.text()`로 읽은 뒤 크기를 재검사한다. 단 인증/인가/Origin 검사를 통과한 관리자 요청에만 도달하고 Vercel 플랫폼 본문 상한이 선행하므로 실질 영향 없음.

## 배포 결정

**배포 승인.** Critical/High/Medium 없음, 인증 로직 확인 완료. 2차 재작업(raw 조회 분리, ADMIN_ALLOWED_HOSTS, profile.github optional)에서 신규 취약점은 확인되지 않았다. SEC3-01(Low)은 후속 처리 가능하며 재작업 여부는 orchestrator 9-1 게이트가 별도 판단한다.
