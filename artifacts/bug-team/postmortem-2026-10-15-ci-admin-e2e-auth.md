# 포스트모텀 2026-10-15-ci-admin-e2e-auth

## 버그 요약

- 관련 티켓: `ticket-2026-10-15-ci-admin-e2e-auth.md`
- 원인 분석: `localize-2026-10-15-ci-admin-e2e-auth.md`
- 수정: `.github/workflows/ci.yml`의 `verify` job에 테스트 전용 NextAuth 설정 추가.
- 영향: CI 로그인 페이지 테스트가 secret 누락으로 500을 반환했고, 인증 관리자 테스트가 환경 변수 부족으로 skip됐다.

## 원인 유형

- 분류: CI 환경 설정 누락.
- 근거: 제공된 Actions 로그의 `MissingSecretError` 및 `.github/workflows/ci.yml` E2E 단계 환경변수 목록.

## 재발 방지

- 담당: 저장소 CI 유지보수 담당.
- 항목: 인증을 사용하는 E2E가 CI에서 skip되지 않고 실제 실행되는지 확인한다.
- 검증 기준: Actions `pnpm test:e2e` 결과에서 관리자 인증 시나리오가 실행되고 `NO_SECRET` 오류 없이 통과한다.
- 후속 상태: 이번 수정 후 전체 CI 재실행 결과를 확인해야 완료로 판정할 수 있다.

## 추가 발견 및 결과

- E2E 폼 기본값이 채워지기 전 inputValue를 읽어 빈 문자열을 기준으로 잡는 경쟁 조건을 실제 실패 trace로 확인. fixture 값 표시 대기를 추가.
- 이미지 응답을 고정한 로컬 보조 검증은 수정 후 88개 통과, skip 없음. 원본 전체 실행은 이미지 요청 timeout으로 중단. GitHub CI 통과와 동일한 증거로 취급하지 않음.

## 후속 CI timeout 분석 및 조치

- run `38689573723`은 11개 테스트에서 `page.goto` load timeout, mobile about/contact 테스트에서 1회 flaky를 보였다.
- CI 출력만으로는 실패 당시 optimizer 요청을 직접 확인할 수 없어, 로컬 격리 재현과 CI 원인 판단을 구분했다. 실제 E2E DB에서 읽은 fixture 썸네일은 `/images/projects/globber/thumbnail.png`였다. 로컬 trace에서는 이 URL의 `/_next/image` 요청만 pending되며 page load를 막았다.
- 재발 방지 조치: E2E 썸네일 fixture는 저장소 자산을 표준 경로로 사용한다. 이미 존재하는 test DB의 과거 fake Blob 경로도 이 fixture에서만 같은 저장 PNG로 응답한다. 테스트는 홈 카드 이미지 `naturalWidth`가 양수인지 확인한다.
- flaky 방지 조치: `about/contact` 테스트는 사용자가 입력하기 전에 각 폼 기본값이 표시되는지 확인한다.
- 검증: Node 24.21.0에서 전체 E2E 90개가 retry/skip 없이 통과했다. 빌드, TypeScript, Biome도 통과했다.
- 한계: 실제 GitHub Actions 재실행은 수행하지 않았다. local route는 브라우저가 UI 이미지를 디코드하는지 확인하지만 Next image optimizer 자체의 원인을 검증하지 않는다.
