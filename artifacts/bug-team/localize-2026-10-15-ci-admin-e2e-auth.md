# 결함 위치 분석 2026-10-15-ci-admin-e2e-auth

## 수정 전 결함 위치와 근거

- `.github/workflows/ci.yml`: `verify` job의 `pnpm test:e2e` 단계에는 `DATABASE_URL`, Blob 값만 설정되어 `NEXTAUTH_SECRET`, `ADMIN_GITHUB_ID`, `NEXTAUTH_URL`이 없다.
- `playwright.config.ts`: webServer가 `pnpm start --hostname 127.0.0.1 --port 3100`으로 서버를 띄우며 테스트 baseURL도 `http://127.0.0.1:3100`이다.
- `src/lib/auth/auth-options.ts`: NextAuth secret은 `process.env.NEXTAUTH_SECRET`에서 읽는다.
- `tests/e2e/admin-tabs.spec.ts`: 인증 테스트는 `NEXTAUTH_SECRET`과 `ADMIN_GITHUB_ID`가 없으면 skip한다. 로그인 페이지 상태 검사는 skip되지 않고 `/admin/login`에서 200을 기대한다.
- 제공된 CI 로그는 `MissingSecretError`와 HTTP 500을 직접 기록한다.

## 수정 전 근본 원인

CI의 E2E job이 NextAuth가 요구하는 테스트 환경 설정을 제공하지 않아 로그인 화면 렌더링이 500으로 실패하고, 관리자 인증 테스트도 환경 변수 검사에서 skip된다.

## 최초 수정 방향

`.github/workflows/ci.yml`의 `verify` job에 E2E 전용 `NEXTAUTH_SECRET`, `ADMIN_GITHUB_ID`, `NEXTAUTH_URL`을 설정한다. 실제 OAuth 검증은 이 티켓 범위에 포함하지 않는다.

## 최초 수정 범위와 한계

- 수정 범위: CI verify job 환경변수 설정.
- 확인하지 않은 항목: 전체 CI 재실행 결과, GitHub OAuth 실인증.
- Task Team/Bug Team 원본 `Team*`·`Task*` 도구는 이 세션에서 사용할 수 없어 파일 산출물로 진행 상태를 기록한다.

## 후속 CI timeout 분석 (2026-10-15)

### 관찰된 사실

- Actions run `38689573723` 로그: 11개 실패가 `page.goto`의 `waiting until "load"` 30초 timeout, 1개 mobile about/contact 요청 테스트가 첫 시도에 실패하고 retry에서 통과.
- 해당 Actions 로그에는 이미지 요청 URL이나 optimizer 응답 상태를 확인할 trace 정보가 포함되어 있지 않다.
- 격리된 로컬 환경에서 E2E DB의 `fixture-alpha.thumbnail`을 읽은 결과는 `/images/projects/globber/thumbnail.png`였다. DB 쓰기는 수행하지 않았다.
- 로컬 Playwright trace에서 page HTML과 앱 리소스는 빠르게 응답했지만 `/_next/image?url=%2Fimages%2Fprojects%2Fglobber%2Fthumbnail.png...` 요청만 pending이었고 `page.goto`가 `load`에서 기다렸다.
- `portfolio-service.ts`는 `/images/...` 경로를 legacy local thumbnail로 통과시킨다. 실제 렌더링 요청은 이 로컬 URL이었다.

### 원인 판단

CI의 11개 timeout이 이 이미지 경로 때문에 발생했다는 직접적인 CI trace는 없다. 다만 같은 E2E 테스트 구성 및 전용 DB로 재현했을 때 page load를 막는 유일한 요청이 프로젝트 썸네일의 Next image optimizer 요청임을 확인했다. 따라서 수정은 fixture가 소유하는 썸네일 URL을 로컬 자산으로 고정하고, 이 정확한 fixture 원본에 대해서만 테스트 PNG를 돌려준다. Next image optimizer 내부가 pending된 원인 자체는 미확정이며 수정 범위에 포함되지 않는다.

### flaky 테스트 원인

mobile `about/contact 저장 요청`은 페이지 전환 직후 값을 채웠다. `react-hook-form`의 서버 기본값이 입력에 반영되기 전에 fill하면 초기화가 값을 덮을 수 있으므로, 스킬 첫 항목과 이메일이 기대 기본값이 될 때까지 기다린 후 입력하도록 수정했다.
