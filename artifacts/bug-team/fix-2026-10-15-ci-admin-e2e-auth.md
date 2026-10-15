# 수정 요약 2026-10-15-ci-admin-e2e-auth

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `tests/e2e/admin-tabs.spec.ts` | home·about·contact 초기 fixture 값 표시를 기다린 뒤 입력 |
| `tests/e2e/fixtures/portfolio.ts` | 테스트 썸네일 기본 URL을 저장소 소유 로컬 이미지로 고정하고 기존 fake Blob URL을 별도 호환 값으로 기록 |
| `tests/e2e/fixtures/test.ts` | 두 알려진 fixture URL에 한해 저장소 PNG를 제공하는 공통 Playwright page fixture 추가 |
| `tests/e2e/{blog,navigation,real-project-data}.spec.ts` | 공통 page fixture 적용, 썸네일 렌더링 회귀 검사 추가 |
| `.github/workflows/ci.yml` | `verify` job에 테스트용 `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_GITHUB_ID` 추가 |

## 수정 내용

### `.github/workflows/ci.yml`

- 변경 전: E2E 서버와 Playwright 프로세스에 데이터베이스·Blob 값만 전달되어 NextAuth secret 및 allowlist ID가 비어 있었다.
- 변경 후: job 공통 환경에 `NEXTAUTH_URL=http://127.0.0.1:3100`, CI 전용 `NEXTAUTH_SECRET`, `ADMIN_GITHUB_ID=123456789`를 설정해 서버와 테스트가 같은 값을 사용한다.

## 검증 (인증 환경 수정 당시)

- YAML 파싱 및 job 공통 인증 값/단계별 덮어쓰기 없음 assert 통과.
- 기본 Turbopack 프로덕션 빌드 및 TypeScript 통과. 로컬 빌드 migration은 기존 정책으로 생략됐으며 E2E 전용 DB 사용, 운영 DB 제외 확인.
- Biome 테스트 파일 검사 및 git diff --check 통과.
- 원본 전체 E2E 시도: fixture 썸네일의 /_next/image 요청 대기로 공개 home/projects에서 30초 timeout. 전체 실행 중단했으므로 원본 전체 통과가 아님.
- 보조 전체 E2E: 임시 복사본에서만 /_next/image 응답을 원격 fixture의 관찰값인 HTTP 400으로 고정. 최초 87 passed / 1 failed로 폼 초기값 로딩 대기 누락 확인. 수정 후 88 passed (26.9s), 0 skipped, 재시도 없이 통과.
- 보조 명령: CI=true NEXTAUTH_SECRET=ci-e2e-only-secret-not-for-production ADMIN_GITHUB_ID=123456789 NEXTAUTH_URL=http://127.0.0.1:3100 BLOB_READ_WRITE_TOKEN=ci-dummy-token NEXT_PUBLIC_BLOB_HOSTNAME=ci-test.public.blob.vercel-storage.com pnpm test:e2e --workers=2
- 당시 로컬 Node 26.5.1, CI Node 24 차이가 있었음. 실제 OAuth, 이미지 다운로드 성공, 원격 GitHub Actions는 미검증.
- 검증 과정 공유 node_modules 링크 변경을 발견해 원래 경로를 복구하고 오프라인 캐시 누락으로 일반 잠금파일 재설치로 복구 완료 (460 packages, 잠금파일 변경 없음). 임시 복사본은 이후 의존성을 독립 복사해 사용.

## 인증 환경 수정 당시 미해결 항목 (후속 작업 전 기록)

- 수정본 커밋/푸시 및 GitHub Actions 원본 전체 통과 확인은 미실행.
- 당시 이미지 응답 고정은 임시 검증본에만 적용되어 있었음. 후속 작업에서 fixture 범위로 저장소 테스트에 반영함.
- 원본 Team/Task 도구 미지원으로 파일 기록과 collaboration 도구를 사용.

## 후속 CI timeout 수정

### 원인과 수정

- CI run `38689573723`은 `page.goto` load 대기 timeout 11건과 mobile about/contact 입력 경쟁 flaky 1건을 기록했다.
- 로컬 E2E 전용 DB에서 fixture 썸네일 경로를 읽고 trace를 확인했다. `/_next/image`로 요청된 `/images/projects/globber/thumbnail.png`가 pending되어 `load`를 막았다. 이 trace는 원격 CI의 요청 URL을 직접 증명하지 않는다.
- `portfolio.ts`의 표준 썸네일은 저장소 이미지 URL로 바꿨다. 기존 CI DB에 남아 있을 수 있는 fake Blob URL과 표준 로컬 URL 두 값만 `fixtures/test.ts`가 매칭해 실제 PNG로 응답한다. 다른 이미지 URL과 다른 네트워크 요청에는 개입하지 않는다.
- `real-project-data.spec.ts`에서 카드 이미지의 `naturalWidth > 0`을 확인해 이미지가 실제로 디코드되는지 검증한다.
- `about/contact` 입력은 기존 server default 값이 보일 때까지 기다린다.

### 검증 결과

- `fnm exec --using=24 pnpm build`: 통과 (Next.js 16.3.6, Turbopack; 비-Vercel/CI 빌드라 migration은 스크립트 정책에 따라 skip).
- `fnm exec --using=24 node node_modules/typescript/bin/tsc --noEmit`: 통과.
- Node 24.21.0 직접 Biome CLI로 변경한 6개 E2E 파일 검사: 통과.
- `CI=true fnm exec --using=24 node node_modules/@playwright/test/cli.js test --workers=2`: 90 passed (29.8s), retry 0, skip 0.
- 별도 orchestrator 검증: delivery worktree에서 기본 셸 Node 26.5.1로 Vitest 423 passed (32 files, 4.35s). 전체 E2E·빌드·최종 타입 검사는 Node 24.21.0으로 수행함.
- 추가 UI 검사: desktop/mobile 모두 썸네일 `naturalWidth > 0`; mobile about/contact 저장 요청도 retry 없이 통과.
- E2E DB URL 호스트는 production `DATABASE_URL`과 `-pooler.` 정규화 후 다름을 확인. DB는 row 조회만 수행.

### 미검증

- GitHub Actions 재실행 결과와 Actions용 E2E DB의 실제 썸네일 row 값.
- Next image optimizer 내부에서 요청이 pending된 원인. UI 검증은 정확한 fixture URL에 대해 저장소 PNG를 응답하도록 route하여 수행했으므로 optimizer 자체의 성공 증거가 아니다.
- 실제 GitHub OAuth 및 원격 이미지 다운로드.
