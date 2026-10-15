# 결함 위치 분석 2026-10-15-ci-admin-e2e-auth

## 결함 위치와 근거

- `.github/workflows/ci.yml`: `verify` job의 `pnpm test:e2e` 단계에는 `DATABASE_URL`, Blob 값만 설정되어 `NEXTAUTH_SECRET`, `ADMIN_GITHUB_ID`, `NEXTAUTH_URL`이 없다.
- `playwright.config.ts`: webServer가 `pnpm start --hostname 127.0.0.1 --port 3100`으로 서버를 띄우며 테스트 baseURL도 `http://127.0.0.1:3100`이다.
- `src/lib/auth/auth-options.ts`: NextAuth secret은 `process.env.NEXTAUTH_SECRET`에서 읽는다.
- `tests/e2e/admin-tabs.spec.ts`: 인증 테스트는 `NEXTAUTH_SECRET`과 `ADMIN_GITHUB_ID`가 없으면 skip한다. 로그인 페이지 상태 검사는 skip되지 않고 `/admin/login`에서 200을 기대한다.
- 제공된 CI 로그는 `MissingSecretError`와 HTTP 500을 직접 기록한다.

## 근본 원인

CI의 E2E job이 NextAuth가 요구하는 테스트 환경 설정을 제공하지 않아 로그인 화면 렌더링이 500으로 실패하고, 관리자 인증 테스트도 환경 변수 검사에서 skip된다.

## 수정 방향

`.github/workflows/ci.yml`의 `verify` job에 E2E 전용 `NEXTAUTH_SECRET`, `ADMIN_GITHUB_ID`, `NEXTAUTH_URL`을 설정한다. 실제 OAuth 검증은 이 티켓 범위에 포함하지 않는다.

## 범위와 한계

- 수정 범위: CI verify job 환경변수 설정.
- 확인하지 않은 항목: 전체 CI 재실행 결과, GitHub OAuth 실인증.
- Task Team/Bug Team 원본 `Team*`·`Task*` 도구는 이 세션에서 사용할 수 없어 파일 산출물로 진행 상태를 기록한다.
