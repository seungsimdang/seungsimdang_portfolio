# 인계 - 프로젝트 썸네일 확장 사이클

- 작성: orchestrator (2026-10-16)
- 브랜치: `feature/project-thumbnails` (develop `72f8aa0`에서 분기)
- 인계 이유: designer에 `WebSearch`/`WebFetch`를 추가했으나 에이전트 정의가 세션 시작 때 고정되어 현재 세션에 반영되지 않음. 사용자가 세션 재시작 후 designer 재실행을 선택함.

## 먼저 읽을 것

1. `artifacts/task-team/00-input.md`: 요청 원문
2. `artifacts/task-team/requirements.md`: 11절(A1~A7, E1~E4 확정)과 13절(D1~D4 확정)이 8·9절 제안보다 우선
3. `artifacts/task-team/api-spec.md`: 끝의 "부록. 사용자 결정 반영"이 본문보다 우선(0006 컬럼 제거를 이번 브랜치에 포함)
4. `artifacts/task-team/design-spec.md`: 1차본. D3·D4 미반영
5. `artifacts/task-team/orchestrator-web-research.md`: orchestrator 독립 웹 검색 기록

## 단계 상태

| Task | 상태 | 비고 |
| --- | --- | --- |
| T01 입력 | done | |
| T02 요구사항 | done | 사용자 게이트 통과 |
| T03 디자인 | 재작업 필요 | 1차본 완료. D3·D4 보완은 웹 검색 필수라 새 세션에서 재실행 |
| T04 API 명세 | done | |
| T05 프론트 | pending | T03 보완 후 시작 |
| T06 백엔드 | 구현 완료, 미병합 | 아래 worktree에 미커밋 상태로 보관 |
| T07~T09 | pending | |

## 새 세션에서 할 일 (순서)

1. 세션 시작 직후 Agent 목록에서 designer 도구에 `WebSearch`, `WebFetch`가 있는지 orchestrator가 직접 확인한다. 없으면 진행하지 말고 사용자에게 보고한다.
2. designer에 T03 보완을 지시한다. 지시 내용은 아래 "T03 보완 지시" 그대로.
3. designer 결과가 나오면 `orchestrator-web-research.md`의 "대조" 절에 designer 검색 결과와 항목별로 대조한다(일치, 불일치, 한쪽에만 있는 출처, 검색어 차이). 사용자 지시 사항.
4. T05를 `Agent(subagent_type: "frontend-developer", isolation: "worktree", name: "task-t05-frontend")`로 스폰한다. 범위는 api-spec.md 범위 분담의 T05 목록 + `/projects` 16:9(D3) + `src/app/globals.css` 토큰(필요 시). T06 worktree의 계약 export(`THUMBNAIL_LIST_MAX`, `projectFormSchema`, `projectFormKeepThumbnailsSchema`, `Project.thumbnails`, `Project.mobileThumbnails`)를 쓰므로, T05 스폰 전에 T06 변경을 feature 브랜치에 먼저 병합하는 편이 안전하다(아래 T06 병합 참고).
5. T05·T06 병합 후 `pnpm type-check`, `pnpm exec vitest run`, `pnpm exec biome check .`, `pnpm knip`, `pnpm test:e2e:local`로 재검증하고 T07/T08 → T09로 진행한다.
6. QA 통과 후, 사용자 승인을 받아 SEMT·Candanta 데이터를 반영한다(아래 데이터 작업).

## T06 백엔드 결과 (미병합)

- 위치: worktree `/Users/leeseunghyun/Documents/GitHub/seungsimdang_portfolio/.claude/worktrees/agent-a45838eda616dac95`, 브랜치 `worktree-agent-a45838eda616dac95`, 기준 커밋 `b4ae761`. 변경은 전부 미커밋.
- 미커밋으로 둔 이유: 프론트 호출부가 아직 옛 `thumbnail` 필드를 써서 `tsc`가 실패하고, `THUMBNAIL_LIST_MAX`가 아직 쓰이지 않아 `knip`(pre-commit)이 실패한다. 훅 우회 없이는 커밋할 수 없음.
- 병합 방법 제안: T05 결과와 함께 병합하거나, T05 스폰 전에 worktree 변경을 feature 브랜치로 옮긴다. 이 경우 커밋은 T05 병합 뒤 검증이 통과한 시점에 한다. worktree는 정리하지 말 것(`git worktree remove` 금지, 변경 유실).
- 변경 요약
  - DB: `thumbnails`, `mobile_thumbnails` (`text[] NOT NULL DEFAULT '{}'`), check `projects_thumbnails_max`, `projects_mobile_requires_base`. 마이그레이션 `drizzle/0005_project_thumbnails_expand.sql`(추가와 이전), `drizzle/0006_project_thumbnails_contract.sql`(재동기화 후 `thumbnail` 제거).
  - 스키마·서비스·타입: api-spec.md대로. `projectFormKeepThumbnailSchema`(단수) 삭제, `LEGACY_THUMBNAIL_PATTERN` 삭제.
  - 삭제: `scripts/migrate-thumbnails.mjs`, `package.json`의 `portfolio:thumbnails:migrate`(범위 밖 수정이지만 죽은 참조 제거).
  - 기존 unit 테스트 4개 갱신. "새 테스트 작성 금지" 지시와 달리 케이스 몇 개를 추가함(모바일만 남는 상태 거부, 23514 변환, 다른 목록으로 이동한 URL 보호). T09 QA 판단 대상.
  - 보고된 검증: `vitest` 38파일 469개 통과, `biome` 통과, `tsc`는 프론트 호출부 오류만, `knip`은 `THUMBNAIL_LIST_MAX` 미사용 1건. orchestrator는 아직 재검증하지 않음.
- 남은 프론트 타입 오류(T05 해결): `src/app/(public)/page.tsx`, `src/app/(public)/projects/page.tsx`, `src/app/(public)/work/[id]/page.tsx`(OG), `src/components/admin/project-form.tsx`.

## T03 보완 지시 (새 세션에서 designer에 그대로 전달)

- requirements.md 13절과 기존 design-spec.md를 읽고 갱신본을 같은 경로에 저장.
- D3: `/projects` lg 이상 카드를 16:9로(1440 기준 약 687×675 → 약 687×386). 홈 카드와 lg 미만은 그대로. 변경된 디자인에 맞는 UI best practice를 웹 검색으로 확인하고 출처 URL과 근거 표를 남길 것. 1차 출처 우선. 주제: 이미지 위 텍스트 대비(WCAG 1.4.3, 그라디언트 스크림), 작아진 카드의 제목 크기·패딩(컨테이너 쿼리나 `clamp()`를 쓸 때 rem 항 유지), `aspect-ratio`와 레이아웃 시프트, 2열 레이아웃의 카드·요약 정렬. 사용한 검색어 목록도 남길 것. `ProjectCard` 기본 클래스(`sticky top-160`, `h-card md:h-card-stuck`)와 `/projects` className, `tailwind-merge` 관계 고려. spacing 1 = 1px, 토큰 우선.
- D4: Candanta는 PC 세트에 새 16:9 이미지(일반 object-cover), 모바일 세트에 기존 썸네일 + `preserveThumbnailText`. `preserveThumbnailText`를 모바일 세트에만 적용(현재 1차본은 모든 세트 적용). PC·모바일이 같은 단일 세트일 때는 기존과 동일.
- AC-R2 픽셀 동일 기준에서 D3 의도 변경은 제외.
- 1차본 9절 1번(`/projects` 크롭 판단 요청)은 D3로 해소됐으니 갱신.

## 데이터 작업 (QA 후, 실행 전 사용자 승인)

- SEMT: 기본(PC) `/Users/leeseunghyun/Downloads/SEMT.png`(3840×2160, 2.07MB), 모바일(순서대로) `/Users/leeseunghyun/Desktop/SEMT-6.9-inch-Screens/03-03.png`, `02-02.png`, `04-04-Know-each-hospital.png`(각 1290×2796). Blob `thumbnails/`에 원본 업로드.
- Candanta: 기본(PC) `/Users/leeseunghyun/Downloads/Candanta 썸네일 1920×1080@2x.png`(3840×2160, 3.0MB), 모바일은 현재 썸네일 Blob URL 1장.
- 운영 DB 마이그레이션(0005·0006)은 빌드 시 자동 적용된다. 0006이 `thumbnail`을 지우므로 배포 사이 운영 화면 중단 위험이 있다(D1, 사용자가 알고 선택). main 배포 직전 재확인.

## 이번 세션에서 끝난 일

- 이전 블로그 검색 산출물을 `artifacts/archive/20261016/`로 이동(gitignore 대상이라 로컬에만 있음).
- Globber 썸네일을 Blob(`thumbnails/globber-JKaiE94xrSJKvR9gD37vdkdVbrEp0d.png`)으로 옮기고 운영 DB 갱신. 원본은 `~/Desktop/globber-thumbnail.png`.
- `public/images/` 삭제, E2E 응답 이미지를 `tests/e2e/fixtures/thumbnail.png`로 교체(`9b80c12`). 썸네일 E2E desktop·mobile 통과.
- designer에 `WebSearch`, `WebFetch` 추가(하네스 템플릿·manifest·CHANGELOG).
- 커밋: `b48f049`, `9b80c12`, `b4ae761`, 그리고 이 인계 커밋들.

## 주의

- lint-staged가 커밋 실패 때 남긴 자동 백업 stash 2개(`7937b1f`, `b1cdef0`)가 있다. orchestrator가 만든 것이 아니며 건드리지 않았다.
- `artifacts/bug-team/postmortem-*.md` 2건은 "Task Team 피드백 초안" 섹션이 없어 반영할 항목이 없었다. 삭제는 하지 않았다.
