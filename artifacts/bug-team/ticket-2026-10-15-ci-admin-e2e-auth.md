# 티켓: CI 관리자 E2E가 인증 설정 누락으로 실패

- 심각도: Medium (CI에서 로그인 E2E desktop·mobile 2건 실패, 인증 관리자 시나리오 22건 건너뜀)
- 중복 여부: 신규 (기존 `production-build`, `admin-save-feedback`, `image-fill-sticky-parent` 티켓과 증상·원인이 다름)
- 상태: CI 인증 환경과 이미지 fixture 경로 수정, 로컬 전체 E2E 90개 통과; 원격 CI 재실행 대기

## 사용자 설명

CI `pnpm test:e2e` 실행에서 `/admin/login`이 HTTP 500을 반환하고 NextAuth가 `NO_SECRET`을 기록함. 인증 관리자 테스트는 필요한 변수가 없어 건너뜀.

## 관찰된 결과

- 제공된 CI 로그: desktop·mobile 로그인 테스트 각각 실패, 응답 기대값 200 / 실제값 500.
- 제공된 CI 로그: NextAuth `MissingSecretError`, `Please define a 'secret' in production`.
- 제공된 CI 로그: 64 passed, 22 skipped, 2 failed.

## 추가 CI 실패 (run 38689573723)

- CI 결과: 76 passed, 11 failed, 1 flaky.
- 실패 11건은 public 홈/프로젝트 화면에서 `page.goto`가 `load` 이벤트를 30초 기다리다 timeout된 건이다.
- flaky 1건은 mobile `about/contact 저장 요청`에서 입력 초기값 준비 전에 편집해 첫 시도에 실패하고 retry에서 통과했다.
- CI run 로그만으로는 이미지 요청의 실제 URL과 실패 원인을 직접 확인할 수 없었다.

## 로컬 격리 재현

- 운영과 호스트가 다른 E2E DB를 읽기 전용으로 조회했다. `fixture-alpha.thumbnail`은 `/images/projects/globber/thumbnail.png`였다.
- Playwright trace에서 문서와 나머지 리소스는 응답했지만 `/_next/image?url=%2Fimages%2Fprojects%2Fglobber%2Fthumbnail.png...` 요청이 pending으로 남고 `page.goto`의 `load` 대기를 막는 것을 확인했다.
- 수정 후 Node 24.21.0, 2 worker 전체 E2E가 90 passed로 끝났다. 로그는 로컬 Next server 및 테스트 환경으로 실제 GitHub Actions run과는 구분된다.

## 기대 동작

CI E2E 서버와 Playwright 테스트 프로세스가 동일한 테스트 전용 NextAuth secret 및 관리자 ID를 사용하고, 인증 관리자 테스트가 실행된다.
