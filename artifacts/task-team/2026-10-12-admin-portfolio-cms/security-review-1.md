# Security Review 1 (T08, 1차)

- 브랜치: feature/admin-portfolio-cms
- 기준: requirements.md "T02 게이트 사용자 결정", api-spec.md
- 방식: 정적 코드 검토 (코드 수정 없음)

## 판정

배포 승인 (Critical 0, High 0, Medium 1, Low 3, Info 2)

## 점검 결과 요약 (통과 항목)

- 인증/인가: proxy 매처 `/admin/:path*`, `/api/admin/:path*`가 전체 admin 표면을 덮고 `/api/auth`는 next-auth 자체 처리. proxy는 JWT 존재만 보고, 인가는 `requireAdmin()`이 매 요청 allowlist를 재검사한다 (adminRoute 7개 라우트 전부 경유, 콘솔 페이지 9개와 layout 모두 `requireAdminPage()` 호출 확인).
- allowlist: 숫자 id만 허용, 정확 일치(`includes`), env 비면 전원 거부(fail-closed), signIn 콜백과 매 요청 이중 검사. 계정 제거 시 기존 JWT도 즉시 403.
- 세션: JWT 8시간 만료, `NEXTAUTH_SECRET` 없으면 proxy가 토큰 null 처리(fail-closed). scope는 `read:user` 최소.
- CSRF: 변경 메서드는 Origin 필수(없으면 거부) + Host 비교, Content-Type application/json 강제, 쿠키 SameSite 기본값(Lax).
- 입력 검증: zod strictObject, 길이/개수 상한, 본문 256KB 상한, 링크 http/https만 검증(`new URL` 프로토콜), github는 https만, 썸네일은 `/images/` 정규식 + `..` 차단, slug 정규식(+ DB check 제약).
- XSS: `dangerouslySetInnerHTML` 사용 0건. 링크는 React href 속성으로만 렌더, 서버에서 스킴 제한.
- SQL 인젝션: 모든 쿼리 drizzle 파라미터 바인딩. `sql.raw`는 `db/schema/portfolio.ts:15`의 상수 정규식 문자열 한 곳뿐(사용자 입력 무관). `sql` 템플릿 서브쿼리는 테이블 참조만 포함.
- 에러 노출: 응답은 고정 메시지 + code, 500은 일반 메시지, 상세는 서버 로그에만. error.tsx/admin error.tsx는 error 객체를 렌더하지 않음.
- 헤더: admin 응답에 `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`(proxy), admin layout `robots` 메타, 전역 X-Frame-Options DENY / nosniff / Referrer-Policy.
- 시크릿: `.env.example`는 빈 값뿐이고 `.env*`는 gitignore(`!.env.example`만 예외). `NEXT_PUBLIC_` 사용 없음. 서버 모듈(db, auth, services, lib/api)은 `server-only`. 클라이언트 컴포넌트는 `next-auth/react`, `admin-request`만 사용.
- open redirect: login `from`은 `/admin` 또는 `/admin/` 접두 + `//`, `\` 배제. next-auth 기본 redirect 콜백도 동일 출처만 허용.
- 의존성 정책 예외: 아래 INFO-1 참고.

## Findings

### SEC-001 (Medium) admin 및 인증 응답에 CSP 없음

- 위치: `next.config.ts:5-14`
- 근거: X-Frame-Options, nosniff, Referrer-Policy만 설정하고 Content-Security-Policy 와 HSTS가 없음. admin은 저장 가능한 자유 텍스트 편집 화면이라 XSS 발생 시 피해(관리자 세션으로 CRUD)가 큼.
- 공격 시나리오: 현재 저장형 XSS 경로는 확인되지 않았음. 그러나 향후 렌더 방식 변경이나 의존성 취약점으로 스크립트가 주입되면 CSP 부재로 완화 수단이 없다. HSTS 부재로 최초 접속 다운그레이드 여지도 있음(Vercel은 기본 HTTPS 리다이렉트 제공).
- 수정 제안: `/admin/:path*`에 `Content-Security-Policy`(`default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`, Next 인라인 스크립트 때문에 nonce 또는 최소 `frame-ancestors`/`base-uri`/`form-action`부터) 추가, `Strict-Transport-Security: max-age=31536000` 추가. 배포 차단 사유 아님, 후속 작업 권장.

### SEC-002 (Low) Origin 비교가 `x-forwarded-host`를 우선 신뢰

- 위치: `src/lib/auth/admin-route.ts:23-26`
- 근거: Origin host를 `x-forwarded-host ?? host`와 비교. Vercel은 이 헤더를 플랫폼이 설정하므로 실질 위험은 낮으나, 프록시 없이 직접 노출되는 환경(self-host)에서는 공격자가 두 헤더를 일관되게 조작할 수 있음.
- 공격 시나리오: 브라우저 CSRF 공격자는 `x-forwarded-host`를 설정할 수 없으므로 현재 구성에서는 악용 불가. 비브라우저 클라이언트는 어차피 세션 쿠키가 없음.
- 수정 제안: 허용 출처를 `NEXTAUTH_URL`의 host와 비교하거나 Vercel 외 배포 시 `x-forwarded-host` 사용을 제거.

### SEC-003 (Low) 쓰기 API에 rate limit 없음

- 위치: `src/app/api/admin/**/route.ts`, `src/lib/auth/admin-route.ts`
- 근거: 인증된 allowlist 사용자만 호출 가능하나 호출 빈도 제한이 없음. 프로젝트에는 `lib/utils/rate-limit.ts` 규칙(project-structure)이 있으나 admin 경로에 적용되지 않음.
- 공격 시나리오: 탈취된 세션(8시간 유효)으로 대량 쓰기/`revalidatePath("/", "layout")` 반복 호출 시 DB와 재생성 비용 증가.
- 수정 제안: 단일 관리자 규모에서는 후순위. 필요 시 adminRoute에 githubId 키 기반 제한 추가.

### SEC-004 (Low) 링크 스킴 검증이 쓰기 시점에만 존재

- 위치: `src/schemas/portfolio.schema.ts:30-53`, 렌더 `src/app/work/[id]/page.tsx:109,157`, `src/app/contact/page.tsx:48`
- 근거: DB 직접 수정, 마이그레이션, 향후 다른 쓰기 경로로 `javascript:` 값이 들어가면 읽기/렌더 쪽에는 방어가 없음. DB에도 링크 스킴 check 제약이 없음(slug만 있음).
- 공격 시나리오: 현재는 allowlist 관리자 + 서버 검증으로 차단됨. DB 자격증명 유출 등 별도 침해가 선행되어야 함.
- 수정 제안: 읽기 매핑(`toProject`/`toTalk`)에서 http/https 외 스킴이면 null 처리하거나, DB check 제약(`link ~ '^https?://'`) 추가. 후속 작업 권장.

### INFO-1 jose@4.15.9 trustPolicyExclude 예외는 타당

- 위치: `pnpm-workspace.yaml:9-10`
- 근거: next-auth 4.24.15의 전이 의존성이며 정확한 버전 한 개로만 예외 처리(범위 아님), `minimumReleaseAge: 10080`은 그대로 유지됨. 4.15.9는 CVE-2024-28176(jose 4.15.5 미만) 수정 이후 버전. 사유 주석(pnpm/pnpm#10202)이 명시되어 있음.
- 권고: next-auth 또는 jose 업그레이드 시 예외 항목을 재평가하고 불필요하면 제거.

### INFO-2 서버 로그에 오류 메시지 기록

- 위치: `src/lib/auth/admin-route.ts:64-67`
- 근거: `error.name: error.message`만 기록(스택 제외). DB 드라이버 메시지에 값이 섞일 수 있으나 클라이언트에는 노출되지 않음. 로그 보관 정책만 유의.

## 배포 결정

배포 승인. Critical/High 없음, 인증 로직 확인 완료. SEC-001은 후속 사이클에서 처리를 권장하며, orchestrator 9-1 게이트는 모든 finding(Medium/Low 포함)의 재작업 여부를 별도로 판단한다.
