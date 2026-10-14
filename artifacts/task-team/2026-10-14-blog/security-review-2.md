# security-review-2: T08 보안 재리뷰

- 대상: 재작업 커밋 81a9553 (`next.config.ts`, `src/schemas/blog.schema.ts`), 브랜치 `feature/blog`
- 범위: (a) SEC-01, SEC-02 해결 여부, (b) 두 파일이 새로 만든 문제. SEC-03~06 기각분과 Info는 범위 밖.
- 판정: 배포 승인 (Critical 0, High 0, Medium 0, Low 0, Info 3)

## 1. 이전 finding 해결 여부

| ID | 판정 | 근거 |
| --- | --- | --- |
| SEC-01 | 해결 (사용자 결정 트레이드오프 반영) | `next.config.ts:8-22`에서 `default-src`, `script-src`, `object-src 'none'`, `base-uri`, `form-action`, `frame-ancestors 'none'`, `img-src`, `connect-src` 지정. 공개 경로와 admin 경로 양쪽에 적용. `script-src 'unsafe-inline'`은 결정 사항이라 finding으로 올리지 않음. |
| SEC-02 | 해결 | `blog.schema.ts:19`에서 `postSlugSchema`에 `.refine((v) => v !== "new")` 추가. 아래 2절 적용 범위 확인. |

## 2. SEC-02 적용 범위

- 생성 API: `src/app/api/admin/posts/route.ts:13`이 `postCreateInputSchema`를 사용하며 `slug: postSlugSchema`를 포함함. 적용됨.
- 수정 API: `postUpdateInputSchema`에는 slug 필드가 없고(strictObject라 주입 불가) slug는 URL 파라미터임. `src/app/api/admin/posts/[slug]/route.ts:14`가 `postSlugSchema.safeParse(slug)`로 같은 refine을 거침. 삭제 핸들러도 같은 파일의 같은 검사 경로를 사용함.
- admin 페이지 `blog/[slug]/page.tsx:29`, 공개 페이지 `blog/[slug]/page.tsx:18`도 같은 스키마 사용. `new`는 모두 404.
- 클라이언트 폼 `blog-form.tsx:103`이 같은 스키마로 사전 검증함.
- refine 순서: max, regex 통과 후 refine이라 비용 증가 없음. `/u` 플래그 정규식에 백트래킹 문제 없음.

## 3. 재작업이 새로 만든 문제 점검

### 3.1 header source 패턴 `/((?!admin(?:/|$)).*)`

- `/admin`, `/admin/...`: 부정 전방탐색으로 제외. admin 규칙 `/admin/:path*`이 `/admin`(path 0개)과 하위를 모두 담당하므로 누락 없음.
- `/administrator`, `/admin-foo`: `admin` 뒤가 `/`나 끝이 아니므로 전방탐색을 통과해 공개 CSP 적용. 의도대로 포함됨(해당 경로는 admin 보호 대상 아님).
- 두 규칙이 상호배타적이라 CSP 중복 헤더 없음. orchestrator의 `curl -I` 실측(1개)과 일치.
- `/api/admin/*`: 공개 규칙에 포함되어 `form-action 'self'` CSP가 JSON 응답에도 붙음. 해가 없고 인증은 `proxy.ts`와 `adminRoute`가 담당. 정상.
- 대소문자: Next 라우트는 대소문자 구분이라 `/Admin`은 페이지가 없어 404. admin 우회 경로 아님.

### 3.2 지시어 누락

- `frame-src`, `worker-src`, `manifest-src`, `media-src`, `child-src`는 `default-src 'self'`로 폴백됨. 폰트와 iframe을 쓰지 않는다는 주석 전제와 일치하고, 제한이 오히려 안전한 쪽임.
- `frame-ancestors 'none'`은 `X-Frame-Options: DENY`와 일관됨.
- `img-src https:`는 본문 외부 이미지 유지 결정(F3-6)과 일치함.

### 3.3 `upgrade-insecure-requests`

- 운영은 HTTPS 전용이라 영향 없음. 개발 환경(http://localhost)에서는 같은 출처 하위 리소스가 https로 올려질 수 있으나 Chromium과 Firefox는 localhost를 예외 처리함. Safari 로컬 개발만 주의(차단 아님). orchestrator 실측에서 위반 0건.

### 3.4 GitHub OAuth 로그인 흐름

- `login-panel.tsx:54`는 next-auth `signIn("github")`을 사용함. 이 함수는 fetch로 CSRF 확인 후 `window.location`으로 이동하는 방식이라 `form-action` 대상이 아님.
- 그럼에도 admin 규칙에 `form-action 'self' https://github.com`을 넣어 폼 제출 방식이 쓰일 때를 대비함. `pages.signIn`이 `/admin/login`이라 next-auth 기본 로그인 폼(`/api/auth/signin`)은 노출되지 않음. 콜백 `/api/auth/callback/github`는 GET 탐색이라 CSP 제약 대상 아님.
- 결론: 로그인 흐름 차단 요인 없음. e2e 50개 통과와 일치.

## 4. 새 finding

없음 (Critical/High/Medium/Low 0건).

## 5. Info (조치 불필요, 기록)

- INFO-1: `script-src 'unsafe-inline'`은 정적 유지를 위한 결정 사항이다. 이 때문에 CSP는 인라인 스크립트 주입을 막지 못하고, 외부 스크립트 로드 차단, `object-src`, `base-uri`, `frame-ancestors`, 외부 전송 차단(`connect-src 'self'`)만 방어함. 마크다운 sanitize(`render-markdown.tsx`)가 여전히 XSS 1차 방어선이므로 sanitize 회귀 단위 테스트(`<img onerror>`, `javascript:`, `<script>`, `style` 속성) 추가를 후속 과제로 권장. 이전 SEC-01 제안과 동일하며 차단 아님.
- INFO-2: `style-src 'unsafe-inline'`과 `img-src https:`는 CSS 기반 데이터 유출과 임의 https 이미지 요청을 허용함. 본문 이미지 유지와 Tailwind/Next 인라인 스타일 때문이며 결정 범위 내.
- INFO-3: slug `new` 금지가 `[slug]` 경로 전체(공개 포함)에 적용되므로, 이미 DB에 slug `new`인 글이 있다면 공개·admin 모두 404가 됨. 이관 대상에 해당 slug가 있는지는 이번 리뷰에서 DB를 조회하지 않아 미확인. 이전 리뷰(SEC-02)에서 존재 사실은 언급되지 않았으므로 낮은 가능성.

## 6. 판정

- 배포 승인. SEC-01, SEC-02 해결 확인, 재작업 두 파일이 만든 새 취약점 없음.
- 코드 수정 없음 (리뷰 전용).
