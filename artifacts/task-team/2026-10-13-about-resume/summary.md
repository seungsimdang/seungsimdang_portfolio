# summary: about 페이지 이력서 기반 재구성 (DB + admin 편집)

- 작업 브랜치: `feature/about-resume` (develop `24d9331`에서 진행, 명세 커밋 `97fc808`)
- orchestrator: Claude 메인 세션 (seungsimdang-portfolio-af)
- 갱신일: 2026-10-13

## 단계 상태

| 단계 | 담당 | 산출물 | 상태 |
| --- | --- | --- | --- |
| T01 intake | orchestrator | `00-input.md` | done |
| T02 요구사항 | project-manager | `requirements.md` | done (사용자 결정 반영, 확인 필요 항목 없음) |
| T03 디자인 | designer | `design-spec.md` | done |
| T04 API 명세 | backend-developer | `api-spec.md` | done |
| T05 프론트엔드 | frontend-developer (worktree 격리) | `src/` | done (`b1ff602`) |
| T06 백엔드 | backend-developer (worktree 격리) | `src/`, `drizzle/`, `scripts/` | done (`6c96417`) |
| 병합·재검증·커밋·push | orchestrator | `feature/about-resume` | 병합·재검증·커밋 done, push는 아래 조율 후 |
| T07 코드 리뷰 | code-reviewer | `code-review-1~3.md`, `triage-1.md`, `triage-4.md` | done (3차 통과, 3차는 사용자 결정으로 rate limit 코드만) |
| T08 보안 리뷰 | security-reviewer | `security-review-1~4.md`, `triage-2~4.md` | done (4차 통과, 배포 승인) |
| T09 QA | qa-engineer | `qa-report-1.md` | 조건부 통과로 종료 (DB·e2e·브라우저 항목은 사용자 결정으로 Preview 확인 생략, 아래 참고) |
| 운영 DB 마이그레이션·시드·skills 갱신 | orchestrator | 운영 DB | done (2026-10-13, 아래 기록) |

## 사용자 지시 (2026-10-13)

- 프론트엔드·백엔드 구현이 끝나면 병합·재검증 후 커밋하고 push한 뒤 hold한다. 리뷰·QA·운영 DB 적용은 다음 지시 전까지 진행하지 않는다.

## push 전 확인 사항 (이어받는 세션 필독)

- `feature/about-resume`을 push하면 Vercel Preview 빌드가 실행되고, `package.json`의 `build`가 `scripts/migrate.mjs --build`를 거쳐 Preview 환경의 `DATABASE_URL`에 마이그레이션을 자동 적용한다.
- 자동 적용 조건은 `scripts/migrate.mjs`의 `VERCEL_ENV`가 `preview`/`production`이거나 `CI=true` 또는 `MIGRATE_ON_BUILD=1`인 경우다.
- 따라서 push 시 Preview DB에 `resume_entries` 테이블과 `profile.tools` 컬럼이 생긴다. 운영 DB와 시드(`db:resume:seed`, `db:resume:profile`)에는 영향이 없다. 시드와 데이터 변경 스크립트는 빌드에서 실행되지 않는다.
- Preview DB는 다른 세션(seungsimdang-portfolio-b5)이 tech_talks 작업에 쓴 Neon preview 브랜치(프로젝트 `dawn-rice-73098836`, 브랜치 `br-winter-frost-b8ysl2y3`)일 가능성이 높다. push 직전에 그 세션과 `SendMessage`로 조율한다(대상 브랜치, 생기는 테이블·컬럼, push 시점).
- CI(`.github/workflows/ci.yml`)도 push 때 실행되지만 e2e 전용 DB(`secrets.E2E_DATABASE_URL`)를 쓰므로 Preview·운영 DB와 무관하다.
- develop에 병합해 push하면 같은 방식으로 develop Preview 배포에서도 마이그레이션이 적용된다. main 병합 후 push하면 Production 빌드가 운영 DB에 마이그레이션을 적용하므로, 운영 반영 순서(마이그레이션 -> 시드 -> 배포)는 그 시점에 다시 조율한다.

## 운영 DB 적용 시 확인 사항

- `profile.skills` 갱신 스크립트는 현재 값이 기존 9개(React, Vue 3, TypeScript, Next.js, TanStack Query, Zustand, Pinia, Tailwind CSS, Playwright)와 정확히 같을 때만 새 10개로 바꾼다. 이 9개는 화면 확인 기준 추정값이므로 적용 직전에 운영 값을 읽어 대조한다.
- 다른 세션이 운영 DB의 `profile`(예: `profile.name`)을 바꿀 수 있으므로 적용 직전에 대상과 순서를 메시지로 조율한다.
- 운영(main 브랜치) DB의 `profile.name`과 `projects.summary` 4건은 preview보다 최신 값이며, 사용자가 운영 값을 유지하기로 정했다(다른 세션 전달, 2026-10-13). 운영 반영 시 이 값들을 preview 값이나 fixture 값으로 덮어쓰지 않는다. `scripts/resume-data.ts`는 `resume_entries`, `profile.skills`, `profile.tools`만 다룬다.
- push 전 조율 완료: 다른 세션은 Preview DB(`br-winter-frost-b8ysl2y3`)에서 진행 중인 작업이 없고 이번 마이그레이션과 겹치지 않는다고 확인함.

## 병합 후 재검증 (메인 체크아웃, `b1ff602` 기준)

- `pnpm exec tsc --noEmit`, `pnpm exec vitest run`(188 통과), `pnpm exec biome check`, `pnpm exec knip`, `node scripts/check-comment-line-breaks.mjs` 모두 통과.
- 첫 프론트엔드 커밋 시도에서 pre-commit `react-doctor:staged`가 `sortable-list.tsx`의 `no-giant-component` 경고로 실패했다. frontend-developer가 같은 파일 안에서 `useLeaveGuard`, `SortableItem`, `SortableError`, `RemoveDescription`으로 분리해 해소했다.
- 실제 화면 확인은 하지 않았다. 로컬 `.env.local`의 `DATABASE_URL`이 운영 DB이고 운영 DB에는 아직 `resume_entries`가 없어 about이 오류를 낸다. Preview 배포 또는 T09 QA에서 확인한다.
- T07 코드 리뷰에서 볼 것: 활동 항목 제목의 `text-h3` 크기(design-spec 6절 열린 판단), `/admin/resume` 삭제 메시지를 work 섹션에만 표시하는 처리, `md:grid-cols-[200px_1fr]` 임의값.

## 커밋

- `97fc808` docs: about 이력 재구성 요구사항·디자인·API 명세 추가
- `6c96417` feat(portfolio): 이력 항목 테이블·서비스·admin API 추가
- `b1ff602` feat(portfolio): about 페이지를 이력서 기반으로 재구성하고 admin 이력 편집 화면 추가

## 운영 DB 적용 기록 (2026-10-13)

- 대상: Neon `dawn-rice-73098836` main 브랜치(`br-twilight-scene-b854ucg3`, 엔드포인트 `ep-holy-snow-b88v3ff4`). 로컬 `.env.local`의 `DATABASE_URL` 호스트와 일치 확인.
- 사전 확인: 운영 `profile.skills`가 `OLD_SKILLS` 9개와 정확히 일치, 다른 세션(seungsimdang-portfolio-b5)은 prod 쓰기 작업 없음 확인.
- 실행: `pnpm db:migrate`(0001 적용, 마이그레이션 기록 1 -> 2) -> `pnpm db:resume:seed --yes`(14건) -> `pnpm db:resume:profile --yes`(skills 10개, tools 5개).
- 결과: kind별 work 3, education 1, activity 7, award 1, certification 1, language 1. `profile.name`, projects, tech_talks 변경 없음.
- 영향: 지금 운영에 배포된 main 코드의 홈 히어로 순환 단어가 새 skills 10개로 즉시 바뀜(사용자 승인 사항).
- 로컬 dev 서버에서 about 렌더 확인(헤드리스 스크린샷). 경력 항목은 제목이 직함, 부제가 회사명으로 표시되며 이력서 표기("Frontend Developer · 회사")와 순서가 다르므로 T07에서 확인.

## 리뷰·QA 단계 기록 (2026-10-13)

- 보안 리뷰 1차 L-2(admin 쓰기 rate limit 없음, 사이클 밖)를 사용자 결정으로 포함해 DB 기반 rate limit 추가(`13b214f`). 이후 L-4(고정 윈도 버스트)로 슬라이딩 윈도 카운터 전환(`e6e0e5b`), L-5(Retry-After 오차) 수정(`c13ebde`), 코드 리뷰 3차 L-2 주석 추가(`2e24549`).
- 신규 마이그레이션 `drizzle/0002_blushing_toro.sql`(`admin_rate_limits` 테이블 생성, 추가 전용). 아직 어느 DB에도 적용되지 않음.
- QA 신규 테스트(`2d994a2`): vitest 19 파일 247 통과. 리포트 `335bbef`.
- 기각·이관 판단은 `triage-1.md`~`triage-4.md` 참고.

## 남은 확인 사항

- 운영 반영 순서: 0002 마이그레이션 적용 전에 rate limit 코드가 배포되면 모든 admin 쓰기가 500(fail-closed). Vercel 빌드는 `migrate.mjs --build`로 마이그레이션을 먼저 적용하므로 정상 배포 경로는 안전함.
- 로컬 dev 서버는 운영 DB를 바라보므로 운영에 0002가 적용되기 전에는 로컬 admin 저장이 500이 됨.
- QA 미검증 항목: F1(마이그레이션·DB check), F2-1/2-2/2-4(읽기 정렬·sort_order 부여), F3(admin 화면), F6(시드), F7-2(e2e), `text-h3` 실제 렌더 크기와 모바일 가로 스크롤. 운영 DB 쓰기 금지, `E2E_DATABASE_URL` 없음, playwright 브라우저 미설치가 사유.
- QA 정보성 지적: `createResumeEntry`가 `mapCreateError`를 공유해 23505를 `SlugConflictError`로 바꾸지만 `resume_entries`에 unique 제약이 없어 도달 불가. 조치 없음.

## 추가 커밋

- `02e818c`, `2c415d7`, `13b214f`, `67c628c`, `e6e0e5b`, `c13ebde`, `0ce6fc7`, `2e24549`, `fa3a08f`, `2d994a2`, `335bbef`

## push와 Preview 확인 (2026-10-13)

- 사용자 승인 후 `feature/about-resume`을 push(`e9cafb4..2580ae8`). 같은 체크아웃을 쓰던 세션(seungsimdang-portfolio-f6)과 사전 조율함.
- Vercel Preview 빌드 성공. Preview DB(Neon `br-winter-frost-b8ysl2y3`)에 마이그레이션 3건 기록, `admin_rate_limits`(github_id, window_start, count, prev_count) 생성 확인. 운영 DB는 변경 없음, 0002 미적용.
- Preview DB의 `resume_entries`는 0건(시드는 운영에만 적용).
- Preview 화면 확인은 Vercel Deployment Protection(SSO)과 자동화 브라우저의 Google 로그인 차단으로 진행하지 못했고, 사용자 결정으로 생략함. QA 미검증 항목은 그대로 남음.
- 이후 f6 세션이 같은 브랜치에 공개 페이지 UI 커밋 `46c6802`, `c551faa`를 추가하고 push함. `about/page.tsx`는 하단 CTA 제거만 포함.

## 운영 반영 시 순서

- `develop` 병합 후 push는 Preview DB에만 영향. `main` 병합 후 push 시 Production 빌드가 운영 DB에 0002를 먼저 적용하고 코드를 배포함.
- 그 전까지 로컬 dev 서버(운영 DB 사용)의 admin 저장은 500. 필요하면 `pnpm db:migrate`로 운영 DB에 0002만 먼저 적용 가능(테이블 추가 전용, 배포된 코드에 영향 없음).
- main 반영 전 미검증 항목(admin 이력 편집, about 표시 순서, text-h3, 모바일 가로 스크롤) 확인 권장.
