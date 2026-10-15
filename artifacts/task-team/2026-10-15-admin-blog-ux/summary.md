# summary: admin·블로그 UX 개선

- work-id: `2026-10-15-admin-blog-ux`
- 브랜치: `feature/admin-blog-ux` (기준 `develop` 8bd8030)
- 상태: **done**. A 단계 `main` 병합(74f7604)과 운영 배포 확인 완료. B 단계(0004)는 `feature/drop-posts-published`에서 진행, 운영 적용 승인 대기.

## 단계 상태

| Task | 담당 | 상태 | 산출물·커밋 |
| --- | --- | --- | --- |
| T01-input | orchestrator | done | `00-input.md` (e6221f8) |
| T02-requirements | project-manager | done, 사용자 승인 | `requirements.md` (e6221f8) |
| T03-design | designer | done | `design-spec.md` (6aee747) |
| T04-api-spec | backend-developer | done | `api-spec.md` (6aee747) |
| T06-backend | backend-developer (worktree) | done | ec4d3f2 |
| T05-frontend | frontend-developer (worktree) | done | 754a208 |
| T07·T08 1차 | code-reviewer, security-reviewer | 재작업 / 배포 승인 | `code-review-1.md`, `security-review-1.md`, `triage-1.md` (1eab77e) |
| 1차 재작업 | frontend-developer (worktree) | done | 5555433 |
| T07 재리뷰 | code-reviewer | 통과, Low 3 사용자 결정으로 포함 | `code-review-2.md`, `triage-2.md` (e72d974), 00e738b |
| 사이클 전체 최종 리뷰 | code-reviewer, security-reviewer | 통과·배포 승인, Low 4 사용자 결정으로 포함 | `code-review-3.md`, `security-review-2.md`, `triage-3.md` (f1e02c5), 352ba6c |
| 최종 수정분 재리뷰 | code-reviewer, security-reviewer | 통과·배포 승인, Low 1 사용자 결정으로 포함 | `code-review-4.md`, `security-review-3.md`, `triage-4.md`, ef7d8ef (9-1 예외로 orchestrator 수정) |
| T09-qa | qa-engineer | 조건부 통과 (admin 화면 미검증) | `qa-report-1.md` |

## 주요 결정

- 요청 3: 목록 링크는 상단 하나, 글 하단은 이전/다음 글 (GOV.UK Back link, NICE Previous next).
- 요청 11: 편집 저장은 화면 유지, 생성은 만든 항목 편집 화면으로 이동, 결과는 토스트 (Mirakl Form edition mode, Grafana Save pattern). 이동 동작 변경 없음.
- 요청 6: 공개 여부 기능 삭제와 DB 컬럼 제거. 선행 requirements의 전제("원본에 `published: false` 글 존재")가 틀렸음(원본 0건, 운영 DB 297행 모두 true).
- 토스트는 admin 전체 결과 알림에 적용. `FormStatus`와 저장바 알림 문구, `?saved`·`?deleted` 쿼리 제거. 위치는 저장바 실제 높이 위(`--admin-action-bar-h`), 결과 피드백을 행동 영역과 같은 하단 고정 영역에 두는 Bug Team 기준 충족.
- `window.confirm` 6곳을 `ConfirmDialog` 기반 모달로 통일. 새로고침·탭 닫기(`beforeunload`)만 브라우저 기본 창.
- 기록 이동(뒤로·앞으로·여러 단계) 가로채기는 Navigation API `navigate` 이벤트 취소로 구현. Next 라우터의 popstate 리스너가 먼저 실행되어 popstate 단계에서는 막을 수 없음. MDN 기준 Navigation API는 Baseline 2026(2026-01부터 주요 브라우저 최신 버전). 미지원 브라우저에서는 기록 이동을 가로채지 않고 `window.confirm` 폴백도 두지 않음(requirements 7-6).
- 영어화는 admin 탭과 목록 제목·metadata만. 하위 화면 제목·버튼·안내는 한글 유지.

## 배포 순서 (컬럼 제거)

- `package.json` build가 `migrate.mjs --build`를 `next build`보다 먼저 실행하고 Vercel Preview·Production에서 자동 적용함. 0004를 코드와 같이 배포하면 빌드 중 컬럼이 먼저 삭제되어 서비스 중인 이전 코드가 실패함.
- A 단계(이번 브랜치): 코드·스키마만. 컬럼이 있는 DB와 없는 DB 모두에서 동작.
- B 단계(별도): A가 Production에 배포된 뒤 `pnpm db:generate` 산출물만 커밋. 롤백 SQL은 `api-spec.md` 3.2절.
- 운영 적용 승인 게이트는 B 커밋의 `main` 병합 직전. Preview와 Production은 다른 DB(선행 사이클에서 `feature/blog`·`develop` push 후에도 운영 DB에 `posts`가 없었고 `main` push 후 생성됨).
- 운영 DB `published=false` 0건 (2026-10-15 읽기 전용 조회). B 직전 재확인. 그 전까지 운영 DB 수동 수정 금지.
- A 배포 직후 이전 번들을 연 admin 탭에서 저장하면 `published` 키 때문에 400, 새로고침으로 해소.

## 검증 (orchestrator, ef7d8ef + QA 테스트 기준)

- `pnpm type-check`, `pnpm exec vitest run`(30 파일 406 통과), `pnpm check`, `pnpm knip`, `pnpm harness:test`(45 통과) 통과.
- `__tests__/lint/no-window-dialogs.test.ts`에 임시로 `window.confirm` 호출 파일을 넣어 실패 확인 후 삭제.
- 구현 병합 직후 `pnpm test:e2e:local` 50 통과, QA 이후 64 통과(QA 실행), `destination stream closed early` 0건.

## 미검증으로 남은 항목 (qa-report-1)

- admin 화면 전체 (GitHub OAuth 필요): `qa-report-1.md` "사용자 수동 확인 체크리스트" 10항목.
- 토스트 provider와 `use-leave-confirm` 단위 테스트: vitest가 node 환경이고 jsdom 없음, 의존성 추가 금지.
- 공개 페이지네이션 category 유지(픽스처 3개), 카테고리 탭 줄바꿈 시 행 간격 실측.
- Navigation API 동작의 Firefox·Safari 실측.

## 후속 항목

- B 단계 마이그레이션 0004 (위 배포 순서).
- `feature/admin-form-feedback-guard`: `FormStatus` 삭제로 "FormStatus 사용 파일은 FormActionBar에 notice 전달" lint 불변식이 성립하지 않음. 토스트 기준으로 재정의 필요. 포스트모텀 `artifacts/bug-team/2026-10-13-admin-save-feedback/postmortem.md`는 미반영 항목이 남아 유지.
- seed가 기존 행을 건너뛰는 방식이라 픽스처에서 지운 행이 E2E DB에 남을 수 있음. 갱신형 seed 여부 검토.
- 토스트·이탈 확인 훅 단위 테스트를 위한 jsdom 도입 여부.
- develop이 `ead9225`(하네스 변경 병합)로 앞서 있음. 이 브랜치를 develop에 병합할 때 함께 반영됨.

## A 단계 배포 후 확인 (2026-10-15, 사용자 지시)

- `develop` 병합 ea986f0(다른 세션의 하네스 변경 ead9225와 충돌 없음), `main` 병합 74f7604. 병합 후 type-check, vitest 408, harness:test 47, biome, knip, e2e 64 통과, 스트림 오류 로그 0건.
- E2E DB의 픽스처 밖 옛 행 `2024-12-30-fixture-draft` 1행 삭제(사용자 지시, 운영 DB와 다른 호스트 확인). 이후 e2e 64 통과.
- 로컬 빌드(E2E DB)에서 가장 오래된 글은 "다음 글"만, 최신 글은 "이전 글"만 표시 확인.
- 운영 사이트: 공개 주요 경로 200, `/admin/blog` 307, 없는 글 404, 상세의 "blog 목록으로" 1개, 같은 날짜 글 `2024-10-20-lgect-1~3`이 slug 순으로 이전·다음 연결, 카테고리 탭 `min-h-44`, CSP 유지.
- 운영 DB 불변: 297행 모두 `published=true`, 적용 마이그레이션 4개.

## B 단계 (0004)

- 브랜치 `feature/drop-posts-published`(develop ea986f0 기준). `pnpm db:generate` 산출물 `drizzle/0004_polite_miek.sql`, `drizzle/meta/0004_snapshot.json`, `_journal.json`(idx 4, when 1792035592183). SQL은 생성 결과 그대로: `DROP INDEX "posts_list_idx"` 후 `(published_at desc, slug desc)`로 재생성, `DROP COLUMN "published"`.
- E2E DB에 빌드 마이그레이션으로 적용 확인: `posts` 컬럼에 `published` 없음, `posts_list_idx`가 `(published_at DESC NULLS LAST, slug DESC NULLS LAST)`. e2e 64 통과, 스트림 오류 0건.
- 롤백 SQL은 `api-spec.md` 3.2절, `DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1792035592183`.
- `develop` push 시 Preview 빌드가 Preview DB에 0004를 적용함. 운영 적용은 `main` 병합 직전 `published=false` 0건 재확인과 사용자 승인 후.
