# summary: Jekyll 블로그 DB 이관과 블로그 기능

- work-id: `2026-10-14-blog`
- 브랜치: `feature/blog` (기준 `origin/develop` ac2e26b)
- 상태: **hold** (T06 병합 재검증 후 사용자 지시로 중단, T07 이후 미착수)

## 단계 상태

| Task | 담당 | 상태 | 산출물·커밋 |
| --- | --- | --- | --- |
| T01-input | orchestrator | done | `00-input.md` (878cc13) |
| T02-requirements | project-manager | done, 사용자 승인 | `requirements.md` (878cc13) |
| T03-design | designer | done | `design-spec.md` (58cf8a9) |
| T04-api-spec | backend-developer | done | `api-spec.md` (58cf8a9) |
| T06-backend | backend-developer (worktree) | done, 병합 재검증 통과 | 94738c5 |
| T05-frontend | frontend-developer (worktree) | done, 병합 재검증 통과 | 8f9c209 |
| T07-code-review | code-reviewer | pending (hold) | - |
| T08-security | security-reviewer | pending (hold) | - |
| T09-qa | qa-engineer | pending (hold) | - |

## 병합·재검증 (orchestrator)

- 두 worktree diff를 메인 체크아웃에 적용. 파일 겹침 0건.
- `pnpm type-check`, `pnpm exec vitest run`(247 통과), `pnpm check`, `pnpm knip`, `pnpm harness:test`(43 통과) 모두 통과.
- `pnpm test:e2e:local` 50개 통과 (E2E DB, 운영 DB와 다른 호스트 확인).
- E2E DB에 posts fixture 4건 seed 후 빌드 서버 확인: `/blog` 200, `/talks` 200, `/blog?page=99` 200, 공개 fixture 상세 3건(한글 slug 포함) 200, 없는 slug 404.
- pre-commit react-doctor(`--blocking warning`) 지적 4건을 orchestrator가 직접 수정 후 커밋.
  - `markdown-editor.tsx` 렌더 중 ref 변경을 `useEffect` 동기화로 이동.
  - 업로드 응답 상태 확인을 본문 해석 앞으로 이동 (썸네일 업로드와 같은 순서).
  - `describedBy`를 `src/lib/admin-client/described-by.ts`로, `formatPostDate`를 `src/utils/format-post-date.ts`로 이동 (컴포넌트 파일의 비컴포넌트 export 제거).

## 이관 dry-run (T06 보고, 원본 297개)

- INSERT 297 / SKIP 0 / FAIL 0. slug 충돌 0.
- 이미지: 로컬 124, git 복원 4, 다운로드 3, 외부 유지 6, 미해결 0.
- `DATABASE_URL` 없이 실행해 SKIP 수는 운영 기준이 아님. `--apply` 승인 전 `DATABASE_URL`을 준 dry-run 재실행 필요.

## 재개 시 확인 사항

- e2e 실행 중 서버 로그에 `The destination stream closed early` (digest 4263652532) 다수 출력. 테스트는 통과했고 단독 서버 확인에서는 재현되지 않음. 기존 develop에서도 나는지 미확인이라 T07에서 원인 확인 대상.
- 표 가로 스크롤은 CSS만 적용되어 키보드 스크롤 불가 (T05 보고). T07 판단 대상.
- 이관 `--apply`, Blob 업로드, 운영 DB 마이그레이션은 사용자 승인 전 실행 금지. `user-attachments` 원본 2건은 `--apply` 직전 재확인.
- `feature/blog` push 시 Vercel Preview 빌드가 Preview DB에 `posts` 테이블 생성 마이그레이션을 적용함 (추가만, drop/alter 없음).
