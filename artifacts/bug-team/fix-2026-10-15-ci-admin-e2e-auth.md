# 수정 요약 2026-10-15-ci-admin-e2e-auth

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `tests/e2e/admin-tabs.spec.ts` | 폼 초기 fixture 값 표시를 기다린 뒤 저장값과 payload 기준을 읽도록 보완 |
| `.github/workflows/ci.yml` | `verify` job에 테스트용 `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_GITHUB_ID` 추가 |

## 수정 내용

### `.github/workflows/ci.yml`

- 변경 전: E2E 서버와 Playwright 프로세스에 데이터베이스·Blob 값만 전달되어 NextAuth secret 및 allowlist ID가 비어 있었다.
- 변경 후: job 공통 환경에 `NEXTAUTH_URL=http://127.0.0.1:3100`, CI 전용 `NEXTAUTH_SECRET`, `ADMIN_GITHUB_ID=123456789`를 설정해 서버와 테스트가 같은 값을 사용한다.

## 검증

- YAML 파싱 및 job 공통 인증 값/단계별 덮어쓰기 없음 assert 통과.
- 기본 Turbopack 프로덕션 빌드 및 TypeScript 통과. 로컬 빌드 migration은 기존 정책으로 생략됐으며 E2E 전용 DB 사용, 운영 DB 제외 확인.
- Biome 테스트 파일 검사 및 git diff --check 통과.
- 원본 전체 E2E 시도: fixture 썸네일의 /_next/image 요청 대기로 공개 home/projects에서 30초 timeout. 전체 실행 중단했으므로 원본 전체 통과가 아님.
- 보조 전체 E2E: 임시 복사본에서만 /_next/image 응답을 원격 fixture의 관찰값인 HTTP 400으로 고정. 최초 87 passed / 1 failed로 폼 초기값 로딩 대기 누락 확인. 수정 후 88 passed (26.9s), 0 skipped, 재시도 없이 통과.
- 보조 명령: CI=true NEXTAUTH_SECRET=ci-e2e-only-secret-not-for-production ADMIN_GITHUB_ID=123456789 NEXTAUTH_URL=http://127.0.0.1:3100 BLOB_READ_WRITE_TOKEN=ci-dummy-token NEXT_PUBLIC_BLOB_HOSTNAME=ci-test.public.blob.vercel-storage.com pnpm test:e2e --workers=2
- 로컬 Node 26.5.1, CI Node 24 차이 존재. 실제 OAuth, 이미지 다운로드 성공, 원격 GitHub Actions는 미검증.
- 검증 과정 공유 node_modules 링크 변경을 발견해 원래 경로를 복구하고 오프라인 캐시 누락으로 일반 잠금파일 재설치로 복구 완료 (460 packages, 잠금파일 변경 없음). 임시 복사본은 이후 의존성을 독립 복사해 사용.

## 미해결 항목

- 수정본 커밋/푸시 및 GitHub Actions 원본 전체 통과 확인은 미실행.
- 이미지 응답 고정은 임시 검증본에만 적용했으며 저장소 테스트에는 반영하지 않음.
- 원본 Team/Task 도구 미지원으로 파일 기록과 collaboration 도구를 사용.
