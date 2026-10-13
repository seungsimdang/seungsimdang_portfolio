# Security Review 2 (T08, 2차)

- 브랜치: feature/admin-portfolio-cms
- 범위: triage-1.md 재작업 중 SEC-001/002/004 해결 여부 + 재작업 파일의 신규 결함 (정적 검토, 코드 수정 없음)

## 판정

배포 승인 (Critical 0, High 0, Medium 0, Low 1, Info 2)

## 이전 finding 해결 여부

| ID | 상태 | 근거 |
| --- | --- | --- |
| SEC-001 | 해결 | `next.config.ts:14-32`에 HSTS(`max-age=63072000; includeSubDomains`)와 `/admin/:path*` CSP(`frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://github.com; object-src 'none'`) 추가. `script-src`/`default-src`는 Next 인라인 스크립트 때문에 미포함이며 1차 제안의 최소안(frame-ancestors/base-uri/form-action)과 일치 |
| SEC-002 | 해결 | `admin-route.ts:21-33`에서 `x-forwarded-host` 제거. `NEXTAUTH_URL` host 우선, 없으면 `host` 헤더. `NEXTAUTH_URL`이 잘못된 값이면 `new URL`이 throw되어 catch에서 false(fail-closed) |
| SEC-004 | 부분 해결 | `portfolio-service.ts:27-35,38,64,79`의 `safeHttpUrl`이 project.link, talk.link, experience.links를 읽기 시점에 http/https로 제한. 단 `profile.github`는 미적용(SEC2-01) |
| SEC-003 | 기각 유지 | triage 기각 사유 타당 |

## 요청 확인 항목: CSP form-action과 next-auth v4 GitHub 로그인

차단하지 않음. 근거:

- 로그인은 `login-panel.tsx:54`의 `signIn("github", { callbackUrl })` 클라이언트 호출이다. next-auth v4 `signIn`은 `<form>` 제출이 아니라 `fetch`로 `/api/auth/csrf`, `POST /api/auth/signin/github`를 호출하고 응답 `url`로 `window.location.href`를 바꿔 GitHub로 이동한다. 네비게이션은 form-action 대상이 아니다.
- `/api/auth/*`는 `/admin/:path*` CSP 적용 범위 밖이다. OAuth 콜백(`/api/auth/callback/github`)도 동일.
- `pages.signIn/error`가 `/admin/login`이라 CSP가 로그인 화면에 적용되지만, 화면에 next-auth 기본 `<form>`은 없다.
- admin 폼 3종(`talk-form`, `project-form`, `profile-form`)은 `submit`에서 `event.preventDefault()` 후 fetch 처리하므로 `form-action 'self'`와 무관.
- 결론: `https://github.com` 허용은 현 흐름에서 불필요하나 무해하다(SEC2-02 참고).

## 신규 findings

### SEC2-01 (Low) profile.github 읽기 시점 스킴 검증 누락

- 위치: `src/services/portfolio/portfolio-service.ts:83-93`, 렌더 `src/app/contact/page.tsx:48`
- 근거: `toProfile`이 `github`를 그대로 반환하고 contact 페이지가 `href={profile.github}`로 렌더한다. SEC-004의 의도(읽기 방어)가 프로필에는 적용되지 않았다. 쓰기 시점에는 zod로 https만 허용된다.
- 공격 시나리오: DB 자격증명 유출 등 별도 침해로 `javascript:` 값이 들어가면 읽기 쪽 방어가 없다. 현재 경로로는 악용 불가.
- 수정 제안: `toProfile`에서 `github: safeHttpUrl(row.github)` 적용(타입이 필수면 빈 문자열 대체 또는 contact에서 조건부 렌더). 후속 처리 가능.

### SEC2-02 (Info) CSP form-action의 github.com 허용은 불필요

- 위치: `next.config.ts:29`
- 근거: 위 분석대로 현 로그인 흐름은 form 제출을 쓰지 않는다. 허용 범위를 줄이려면 `'self'`만 남겨도 되나, 향후 next-auth 기본 폼 사용 가능성 대비로 유지해도 위험은 없다.

### SEC2-03 (Info) HSTS includeSubDomains와 NEXTAUTH_URL 의존

- 위치: `next.config.ts:19`, `admin-route.ts:26-28`
- 근거: (1) `includeSubDomains`는 같은 도메인의 다른 서브도메인이 HTTP 전용이면 영향을 준다. preload 미사용이라 되돌릴 수 있다. (2) 프로덕션에서 `NEXTAUTH_URL`이 설정되어 있으면 Preview 배포 URL의 쓰기 요청은 Origin 불일치로 거부된다(가용성 영향, 보안상 fail-closed). T09에서 env 설정 확인 필요.

## 나머지 변경 파일 점검 (결함 없음)

- `api-error.ts`, `api-types.ts`: 고정 메시지와 코드만 보유, 내부 정보 노출 없음. `NOT_SEEDED` 매핑이 `admin-route.ts:67`에 연결됨.
- `talk-preview.tsx`: 텍스트는 React 이스케이프 렌더, `dangerouslySetInnerHTML` 없음, link는 서비스에서 스킴 제한된 값을 `ExternalLink`로 전달.
- `use-admin-form.ts`: 이탈 가드는 클릭 필터링만 변경. 로그인 링크의 `from`은 `window.location.pathname`을 `encodeURIComponent`로 인코딩하며 로그인 화면에서 `/admin` 접두 검증됨(1차 확인). 세션 만료 문구에 서버 응답 문자열을 직접 쓰지 않고 고정 문구 사용.
- `projects/page.tsx`, `talks/page.tsx`: `requireAdminPage()` 호출 유지, `?deleted=`는 truthy 여부만 사용하고 고정 문구로 표시(CR1-06 반영, 반사형 XSS/콘텐츠 주입 없음).

## 배포 결정

배포 승인. Critical/High/Medium 없음, 인증 로직 확인 완료. SEC2-01은 Low이며 orchestrator 9-1 게이트에서 재작업 여부를 별도 판단.
