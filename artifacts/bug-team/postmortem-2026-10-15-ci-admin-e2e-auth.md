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
