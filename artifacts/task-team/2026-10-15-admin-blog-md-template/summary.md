# summary: admin 블로그 새 글 .md 템플릿 다운로드

- work-id: `2026-10-15-admin-blog-md-template`
- 브랜치: `feature/admin-blog-md-template` (기준 `develop` ced4e6f)
- 작업 위치: `/private/tmp/portfolio-blog-md-template`. 메인 체크아웃을 다른 세션이 미커밋 변경과 함께 사용 중이라 분리.
- 상태: **done**. QA 조건부 통과(프로덕션 CSP 실측 미검증).

## 단계 상태

| Task | 담당 | 상태 | 산출물·커밋 |
| --- | --- | --- | --- |
| T01-input | orchestrator | done | `00-input.md` (9af750d) |
| T02-requirements | project-manager | done, 사용자 승인 | `requirements.md` (9af750d) |
| T03-design | designer | done | `design-spec.md` (9af750d) |
| T04-api-spec, T06-backend | - | skipped | 서버 변경 없음 확정 |
| T05-frontend | frontend-developer (worktree) | done | e9b7cb5 |
| T07·T08 1차 | code-reviewer, security-reviewer | 재작업(Medium 1) / 배포 승인 | `code-review-1.md`, `security-review-1.md`, `triage-1.md` |
| 1차 재작업 | frontend-developer (worktree) | done | 3420e58 |
| T07 재리뷰 | code-reviewer | 통과 | `code-review-2.md` |
| 사이클 전체 최종 리뷰 | code-reviewer, security-reviewer | 통과 / 배포 승인 | `code-review-3.md`, `security-review-2.md` (efd50df) |
| T09-qa | qa-engineer | 조건부 통과 | `qa-report-1.md` |

## 주요 결정

- 새 글 화면에만 "템플릿 다운로드". 편집 화면에는 가져오기가 없어 제외.
- 템플릿은 코드 상수(`src/lib/blog/post-template.ts`), date만 클릭 시점 Asia/Seoul 오늘.
- 파일명 `blog-post-template.md` 고정. 날짜 접두 파일명은 frontmatter date보다 우선해 혼동을 만듦.
- frontmatter는 title·date·categories·tags. 안내는 YAML `#` 주석이라 가져온 본문에 남지 않음.
- 클라이언트 Blob 다운로드, object URL 해제는 `setTimeout`으로 지연.

## 절차 차이

- `TeamCreate`가 없어 팀원별 Agent로 실행.
- 구현자 isolation worktree가 메인 체크아웃 HEAD(main)에서 분기되어, 병합 대신 변경 파일만 작업 브랜치로 옮긴 뒤 diff 동일 여부 확인.
- 재리뷰 확인 훅이 이 사이클 폴더를 보지 못해 이전 사이클 리뷰 수로 확인을 요청함. `feature/review-hook-cycle-dir`(1c7f99c)에서 수정.

## 검증 (orchestrator)

- `pnpm type-check`, `pnpm exec vitest run`(33 파일 431 통과), `pnpm check`, `pnpm knip`, 주석 검사 통과.
- QA E2E 3건은 dev 서버(headless)에서 통과(qa-report-1).

## 미검증

- 프로덕션 빌드 CSP 아래 실제 다운로드, Safari·Firefox·모바일 다운로드.
- 편집 화면 미노출 육안 확인.
- 예시 카테고리·태그와 안내 주석 문구는 사용자 확인 대상.
