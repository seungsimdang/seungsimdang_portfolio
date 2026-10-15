# 티켓: CI 관리자 E2E가 인증 설정 누락으로 실패

- 심각도: Medium (CI에서 로그인 E2E desktop·mobile 2건 실패, 인증 관리자 시나리오 22건 건너뜀)
- 중복 여부: 신규 (기존 `production-build`, `admin-save-feedback`, `image-fill-sticky-parent` 티켓과 증상·원인이 다름)
- 상태: 수정 완료, 로컬 보조 검증 88개 통과; 원격 CI 미실행

## 사용자 설명

CI `pnpm test:e2e` 실행에서 `/admin/login`이 HTTP 500을 반환하고 NextAuth가 `NO_SECRET`을 기록함. 인증 관리자 테스트는 필요한 변수가 없어 건너뜀.

## 관찰된 결과

- 제공된 CI 로그: desktop·mobile 로그인 테스트 각각 실패, 응답 기대값 200 / 실제값 500.
- 제공된 CI 로그: NextAuth `MissingSecretError`, `Please define a 'secret' in production`.
- 제공된 CI 로그: 64 passed, 22 skipped, 2 failed.

## 기대 동작

CI E2E 서버와 Playwright 테스트 프로세스가 동일한 테스트 전용 NextAuth secret 및 관리자 ID를 사용하고, 인증 관리자 테스트가 실행된다.
