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
| T07 코드 리뷰, T08 보안 리뷰, T09 QA | - | - | blocked (사용자 지시: 구현 커밋·push 후 hold) |
| 운영 DB 마이그레이션·시드·skills 갱신 | orchestrator | - | blocked (사용자 승인 완료, 적용 직전 다른 세션과 조율 필요) |

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
